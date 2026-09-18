import { NextResponse } from 'next/server'
import { processComplaintOutbox } from '@/lib/services/zapier-outbox-service'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * Worker endpoint to process queued/retryable complaint outbox events for Zapier.
 * Can be triggered via cron service, worker script, or background job runner.
 * Authorization: Bearer token matching CRON_SECRET or authenticated super_admin.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET

    let isAuthorized = false

    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      isAuthorized = true
    } else {
      // Check if user is super_admin
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const adminSupabase = createAdminClient()
        const { data: profile } = await adminSupabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        if (profile?.role === 'super_admin') {
          isAuthorized = true
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized worker invocation' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const batchSize = parseInt(searchParams.get('batchSize') || '20', 10)

    const result = await processComplaintOutbox({ batchSize })

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    })
  } catch (err: any) {
    console.error('[Process Complaint Outbox Exception]', err)
    return NextResponse.json({ error: err.message || 'Worker error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  // Allow GET for simple ping/health check or cron triggers with bearer query or header
  return POST(request)
}
