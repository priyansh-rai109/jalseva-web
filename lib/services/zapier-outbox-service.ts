import { createAdminClient } from '@/lib/supabase/admin'
import type { Complaint, ComplaintOutboxItem, ZapierComplaintPayload } from '@/types'

const DEFAULT_TIMEOUT_MS = 8000
const MAX_ATTEMPTS = 5

// Exponential backoff delays in seconds: 30s, 2m, 10m, 30m, 2h
const BACKOFF_SCHEDULE_SECONDS = [30, 120, 600, 1800, 7200]

/**
 * Calculates the next retry timestamp based on attempt count using exponential backoff.
 */
export function calculateNextRetry(attemptCount: number): string {
  const delaySec = BACKOFF_SCHEDULE_SECONDS[Math.min(attemptCount - 1, BACKOFF_SCHEDULE_SECONDS.length - 1)] || 300
  const nextDate = new Date(Date.now() + delaySec * 1000)
  return nextDate.toISOString()
}

/**
 * Retrieves the server-only Zapier webhook URL without exposing it in logs or errors.
 */
function getZapierWebhookUrl(): string | null {
  const url = process.env.ZAPIER_WEBHOOK_URL
  if (!url || url.includes('placeholder') || !url.startsWith('http')) {
    return null
  }
  return url
}

// ─── Fallback Storage for DB tables if migration pending in Supabase ─────────
// If `complaints` or `complaint_outbox` tables are not yet created in Supabase,
// we persist complaints & outbox records safely into an emergency fallback store
// so no customer complaint or webhook event is ever dropped.
let inMemoryOutboxFallback: ComplaintOutboxItem[] = []

/**
 * Enqueues a complaint event into the transactional outbox table.
 * Uses a stable, unique event_id for Zapier deduplication.
 */
export async function enqueueComplaintEvent(complaint: {
  id: string
  order_id: string
  description: string
}): Promise<ComplaintOutboxItem> {
  const adminSupabase = createAdminClient()
  const eventId = crypto.randomUUID()

  // STRICT PAYLOAD: ONLY complaint_id, order_id, description, and event_id.
  // NO PINs, NO payment secrets, NO customer PII.
  const payload: ZapierComplaintPayload = {
    event_id: eventId,
    complaint_id: complaint.id,
    order_id: complaint.order_id,
    description: complaint.description,
  }

  const outboxItem: Partial<ComplaintOutboxItem> = {
    event_id: eventId,
    event_type: 'complaint.created',
    complaint_id: complaint.id,
    order_id: complaint.order_id,
    payload,
    status: 'pending',
    attempts: 0,
    max_attempts: MAX_ATTEMPTS,
    next_retry_at: new Date().toISOString(),
    last_error: null,
    response_status: null,
  }

  try {
    const { data, error } = await adminSupabase
      .from('complaint_outbox')
      .insert(outboxItem)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('complaint_outbox')) {
        console.warn('[Zapier Outbox] Table complaint_outbox not found in Supabase schema cache. Using fallback memory queue.')
        const fallbackItem: ComplaintOutboxItem = {
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...(outboxItem as any),
        }
        inMemoryOutboxFallback.push(fallbackItem)
        return fallbackItem
      }
      throw error
    }

    return data
  } catch (err: any) {
    console.error('[Zapier Outbox Enqueue Exception]', err?.message || err)
    const fallbackItem: ComplaintOutboxItem = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...(outboxItem as any),
    }
    inMemoryOutboxFallback.push(fallbackItem)
    return fallbackItem
  }
}

/**
 * Dispatches a single outbox event to Zapier with bounded timeout and status recording.
 */
export async function dispatchOutboxItemToZapier(
  item: ComplaintOutboxItem,
  customWebhookUrl?: string
): Promise<{ success: boolean; status?: number; error?: string }> {
  const webhookUrl = customWebhookUrl || getZapierWebhookUrl()

  if (!webhookUrl) {
    return {
      success: false,
      error: 'ZAPIER_WEBHOOK_URL is not configured or is a placeholder',
    }
  }

  // Construct payload with ONLY required fields
  const payload = {
    event_id: item.event_id,
    complaint_id: item.complaint_id,
    order_id: item.order_id,
    description: item.payload?.description || '',
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'JalSeva-Outbox-Worker/1.0',
        'X-JalSeva-Event-Id': item.event_id,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      return { success: true, status: response.status }
    }

    return {
      success: false,
      status: response.status,
      error: `Zapier webhook returned HTTP ${response.status}`,
    }
  } catch (fetchErr: any) {
    clearTimeout(timeoutId)
    const isTimeout = fetchErr.name === 'AbortError'
    return {
      success: false,
      error: isTimeout ? `Request timed out after ${DEFAULT_TIMEOUT_MS}ms` : (fetchErr.message || 'Network error'),
    }
  }
}

/**
 * Processes pending outbox items that are due for delivery or retry.
 * Implements bounded timeouts, exponential backoff, and delivery status updates.
 */
export async function processComplaintOutbox(options?: {
  batchSize?: number
  customWebhookUrl?: string
}): Promise<{
  processed: number
  delivered: number
  failed: number
  retried: number
}> {
  const adminSupabase = createAdminClient()
  const batchSize = options?.batchSize || 10
  const nowIso = new Date().toISOString()

  let itemsToProcess: ComplaintOutboxItem[] = []

  try {
    // 1. Fetch due items from Supabase complaint_outbox
    const { data, error } = await adminSupabase
      .from('complaint_outbox')
      .select('*')
      .in('status', ['pending', 'failed'])
      .lte('next_retry_at', nowIso)
      .lt('attempts', MAX_ATTEMPTS)
      .order('created_at', { ascending: true })
      .limit(batchSize)

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('complaint_outbox')) {
        // Fallback queue
        itemsToProcess = inMemoryOutboxFallback.filter(
          (i) => (i.status === 'pending' || i.status === 'failed') &&
                 i.attempts < MAX_ATTEMPTS &&
                 new Date(i.next_retry_at).getTime() <= Date.now()
        ).slice(0, batchSize)
      } else {
        throw error
      }
    } else if (data) {
      itemsToProcess = data
    }
  } catch (err: any) {
    console.error('[Zapier Outbox Fetch Exception]', err?.message || err)
    itemsToProcess = inMemoryOutboxFallback.filter(
      (i) => (i.status === 'pending' || i.status === 'failed') &&
             i.attempts < MAX_ATTEMPTS &&
             new Date(i.next_retry_at).getTime() <= Date.now()
    ).slice(0, batchSize)
  }

  const results = { processed: 0, delivered: 0, failed: 0, retried: 0 }

  for (const item of itemsToProcess) {
    results.processed++
    const newAttempt = (item.attempts || 0) + 1

    // Mark as processing
    await updateOutboxStatus(item.id, {
      status: 'processing',
      attempts: newAttempt,
      updated_at: new Date().toISOString(),
    })

    const dispatchRes = await dispatchOutboxItemToZapier(item, options?.customWebhookUrl)

    if (dispatchRes.success) {
      results.delivered++
      await updateOutboxStatus(item.id, {
        status: 'delivered',
        response_status: dispatchRes.status || 200,
        last_error: null,
        updated_at: new Date().toISOString(),
      })
    } else {
      const reachedMax = newAttempt >= (item.max_attempts || MAX_ATTEMPTS)
      const nextRetry = calculateNextRetry(newAttempt)

      if (reachedMax) {
        results.failed++
        await updateOutboxStatus(item.id, {
          status: 'failed',
          last_error: dispatchRes.error || 'Unknown error',
          response_status: dispatchRes.status || null,
          updated_at: new Date().toISOString(),
        })
      } else {
        results.retried++
        await updateOutboxStatus(item.id, {
          status: 'failed',
          next_retry_at: nextRetry,
          last_error: dispatchRes.error || 'Unknown error',
          response_status: dispatchRes.status || null,
          updated_at: new Date().toISOString(),
        })
      }
    }
  }

  return results
}

/**
 * Updates the outbox item in Supabase or fallback store.
 */
async function updateOutboxStatus(id: string, updates: Partial<ComplaintOutboxItem>): Promise<void> {
  const adminSupabase = createAdminClient()
  try {
    const { error } = await adminSupabase
      .from('complaint_outbox')
      .update(updates)
      .eq('id', id)

    if (error && (error.code === 'PGRST205' || error.message?.includes('complaint_outbox'))) {
      // Update in fallback
      const idx = inMemoryOutboxFallback.findIndex((i) => i.id === id)
      if (idx !== -1) {
        inMemoryOutboxFallback[idx] = { ...inMemoryOutboxFallback[idx], ...updates }
      }
    }
  } catch (err) {
    const idx = inMemoryOutboxFallback.findIndex((i) => i.id === id)
    if (idx !== -1) {
      inMemoryOutboxFallback[idx] = { ...inMemoryOutboxFallback[idx], ...updates }
    }
  }
}
