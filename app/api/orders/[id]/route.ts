import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()

    const [{ data: order }, { data: tracking }, { data: review }] = await Promise.all([
      adminSupabase
        .from('orders')
        .select(`
          id, total_amount, status, quantity, payment_mode, delivery_address, created_at, special_instructions,
          customers(id, name, phone, email),
          suppliers(id, business_name, phone, owner_name),
          water_products(name, type, capacity_liters, price)
        `)
        .eq('id', params.id)
        .maybeSingle(),
      adminSupabase
        .from('order_tracking')
        .select('*')
        .eq('order_id', params.id)
        .order('created_at', { ascending: true }),
      adminSupabase
        .from('reviews')
        .select('*')
        .eq('order_id', params.id)
        .maybeSingle(),
    ])

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({
      order,
      tracking: tracking || [],
      review: review || null,
    })
  } catch (err: any) {
    console.error('[Single Order GET Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, reason } = await request.json()

    if (action !== 'cancel') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // 1. Fetch current order
    const { data: existingOrder } = await adminSupabase
      .from('orders')
      .select('id, status, special_instructions, customer_id')
      .eq('id', params.id)
      .maybeSingle()

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (existingOrder.status === 'cancelled') {
      return NextResponse.json({ error: 'Order is already cancelled' }, { status: 400 })
    }

    if (existingOrder.status === 'out_for_delivery' || existingOrder.status === 'delivered') {
      return NextResponse.json({ error: 'Cannot cancel order once it is out for delivery or delivered' }, { status: 400 })
    }

    const cancelReasonNote = reason ? `Cancelled by customer: ${reason}` : 'Cancelled by customer'
    const newInstructions = existingOrder.special_instructions
      ? `${existingOrder.special_instructions} | [${cancelReasonNote}]`
      : `[${cancelReasonNote}]`

    // 2. Update order status to cancelled
    const { data: updatedOrder, error: updateErr } = await adminSupabase
      .from('orders')
      .update({
        status: 'cancelled',
        special_instructions: newInstructions,
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateErr) throw updateErr

    // 3. Add to order tracking
    try {
      await adminSupabase.from('order_tracking').insert({
        order_id: params.id,
        status: 'cancelled',
        notes: cancelReasonNote,
      })
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully',
      order: updatedOrder,
    })
  } catch (err: any) {
    console.error('[Single Order PATCH Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 })
  }
}
