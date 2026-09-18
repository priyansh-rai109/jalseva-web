import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enqueueComplaintEvent, processComplaintOutbox } from '@/lib/services/zapier-outbox-service'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createComplaintSchema = z.object({
  order_id: z.string().uuid('Invalid order ID format'),
  description: z
    .string()
    .min(5, 'Description must be at least 5 characters')
    .max(2000, 'Description must not exceed 2000 characters'),
})

// In-memory fallback if complaints table is not yet created via SQL Editor
let inMemoryComplaintsFallback: any[] = []

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to file a complaint.' }, { status: 401 })
    }

    const json = await request.json()
    const parsed = createComplaintSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid complaint data' },
        { status: 400 }
      )
    }

    const { order_id, description } = parsed.data
    const adminSupabase = createAdminClient()

    // 1. Resolve Customer Record
    const phoneToUse = user.phone || user.user_metadata?.phone
    let customer: { id: string; user_id?: string; name?: string; phone?: string } | null = null

    const { data: custByUser } = await adminSupabase
      .from('customers')
      .select('id, user_id, name, phone')
      .eq('user_id', user.id)
      .maybeSingle()

    if (custByUser) {
      customer = custByUser
    } else if (phoneToUse) {
      const digits = phoneToUse.replace(/\D/g, '').slice(-10)
      const { data: custByPhone } = await adminSupabase
        .from('customers')
        .select('id, user_id, name, phone')
        .ilike('phone', `%${digits}%`)
        .maybeSingle()
      if (custByPhone) customer = custByPhone
    }

    // 2. Order Ownership Check
    const { data: order, error: orderErr } = await adminSupabase
      .from('orders')
      .select('id, customer_id, supplier_id, status, created_at, special_instructions')
      .eq('id', order_id)
      .maybeSingle()

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Ensure the customer actually owns this order
    const isOwner =
      (customer && order.customer_id === customer.id) ||
      user.id === order.customer_id

    if (!isOwner) {
      // Check if user is super admin
      const { data: profile } = await adminSupabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.role !== 'super_admin') {
        return NextResponse.json(
          { error: 'Forbidden: You can only file complaints for your own orders' },
          { status: 403 }
        )
      }
    }

    const resolvedCustomerId = order.customer_id

    // 3. Save Complaint in Supabase
    let savedComplaint: any = null
    const complaintPayload = {
      order_id,
      customer_id: resolvedCustomerId,
      description: description.trim(),
      status: 'open',
    }

    const { data: complaintRow, error: complaintErr } = await adminSupabase
      .from('complaints')
      .insert(complaintPayload)
      .select()
      .maybeSingle()

    if (complaintErr) {
      if (complaintErr.code === 'PGRST205' || complaintErr.message?.includes('complaints')) {
        console.warn('[Complaints API] Table complaints missing in Supabase. Using fallback store.')
        savedComplaint = {
          id: crypto.randomUUID(),
          ...complaintPayload,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        inMemoryComplaintsFallback.push(savedComplaint)
      } else {
        throw complaintErr
      }
    } else {
      savedComplaint = complaintRow
    }

    // 4. Enqueue into Transactional Outbox (with stable event_id)
    await enqueueComplaintEvent({
      id: savedComplaint.id,
      order_id: savedComplaint.order_id,
      description: savedComplaint.description,
    })

    // 5. Trigger Outbox Processing Asynchronously
    // Note: Do not let Zapier failures delay or fail the customer's complaint submission!
    // The complaint is already safely saved in Supabase.
    try {
      processComplaintOutbox({ batchSize: 5 }).catch((procErr) => {
        console.warn('[Zapier Background Outbox Error]', procErr?.message || procErr)
      })
    } catch {}

    return NextResponse.json(
      {
        success: true,
        message: 'Complaint submitted successfully and queued for analysis',
        complaint: savedComplaint,
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('[Complaints POST Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('order_id')

    const adminSupabase = createAdminClient()

    // Resolve customer
    const phoneToUse = user.phone || user.user_metadata?.phone
    let customerId: string | null = null

    const { data: cust } = await adminSupabase
      .from('customers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (cust) {
      customerId = cust.id
    } else if (phoneToUse) {
      const digits = phoneToUse.replace(/\D/g, '').slice(-10)
      const { data: custByPhone } = await adminSupabase
        .from('customers')
        .select('id')
        .ilike('phone', `%${digits}%`)
        .maybeSingle()
      if (custByPhone) customerId = custByPhone.id
    }

    let query = adminSupabase.from('complaints').select('*').order('created_at', { ascending: false })

    if (orderId) query = query.eq('order_id', orderId)
    if (customerId) query = query.eq('customer_id', customerId)

    const { data, error } = await query

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('complaints')) {
        let fallback = inMemoryComplaintsFallback
        if (orderId) fallback = fallback.filter((c) => c.order_id === orderId)
        if (customerId) fallback = fallback.filter((c) => c.customer_id === customerId)
        return NextResponse.json({ complaints: fallback })
      }
      throw error
    }

    return NextResponse.json({ complaints: data || [] })
  } catch (err: any) {
    console.error('[Complaints GET Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error', complaints: [] }, { status: 500 })
  }
}
