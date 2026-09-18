import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateDeliveryPin } from '@/lib/utils'
import { notifyCustomerStatusChange } from '@/lib/services/notification-service'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const adminSupabase = createAdminClient()

    const [{ data: order }, { data: tracking }, { data: review }, { data: complaints }] = await Promise.all([
      adminSupabase
        .from('orders')
        .select(`
          id, total_amount, status, quantity, payment_mode, payment_status, delivery_address, created_at, special_instructions,
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
      adminSupabase
        .from('complaints')
        .select('*')
        .eq('order_id', params.id)
        .order('created_at', { ascending: false }),
    ])

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({
      order,
      tracking: tracking || [],
      review: review || null,
      complaints: complaints || [],
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
    const body = await request.json()
    const { action, reason, pin } = body

    const adminSupabase = createAdminClient()

    // 1. Fetch current order
    const { data: existingOrder } = await adminSupabase
      .from('orders')
      .select('id, status, special_instructions, customer_id, supplier_id, suppliers(business_name)')
      .eq('id', params.id)
      .maybeSingle()

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // ── Driver PIN Verification & Delivery Completion ──
    if (action === 'verify_pin_and_deliver') {
      if (!pin || pin.trim().length < 4) {
        return NextResponse.json({ error: '4-digit delivery PIN is required' }, { status: 400 })
      }

      const isValid = validateDeliveryPin(params.id, pin.trim())
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid delivery PIN. Please ask the customer for their 4-digit code.' }, { status: 400 })
      }

      if (existingOrder.status === 'delivered') {
        return NextResponse.json({ success: true, message: 'Order is already delivered', order: existingOrder })
      }

      const deliveryNote = `Verified & Delivered via Driver Security PIN (${pin.trim()})`
      const updatedInstructions = existingOrder.special_instructions
        ? `${existingOrder.special_instructions} | [${deliveryNote}]`
        : `[${deliveryNote}]`

      const { data: updatedOrder, error: updateErr } = await adminSupabase
        .from('orders')
        .update({
          status: 'delivered',
          payment_status: 'paid',
          delivered_at: new Date().toISOString(),
          special_instructions: updatedInstructions,
        })
        .eq('id', params.id)
        .select()
        .single()

      if (updateErr) throw updateErr

      // Add to tracking
      try {
        await adminSupabase.from('order_tracking').insert({
          order_id: params.id,
          status: 'delivered',
          note: deliveryNote,
        })
      } catch (trackErr) {
        console.warn('[Order Tracking Insert Warning]', trackErr)
      }

      // Notify customer
      if (existingOrder.customer_id) {
        const supplierName = (existingOrder.suppliers as any)?.business_name || 'Water Supplier'
        try {
          await notifyCustomerStatusChange({
            orderId: params.id,
            customerId: existingOrder.customer_id,
            status: 'delivered',
            supplierName,
          })
        } catch (notifyErr) {
          console.warn('[Customer Delivery Notification Warning]', notifyErr)
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Order verified and delivered successfully!',
        order: updatedOrder,
      })
    }

    // ── Customer Order Cancellation ──
    if (action === 'cancel') {
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

      // Update order status to cancelled
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

      // Add to order tracking
      try {
        await adminSupabase.from('order_tracking').insert({
          order_id: params.id,
          status: 'cancelled',
          note: cancelReasonNote,
        })
      } catch (trackErr) {
        console.warn('[Order Tracking Insert Warning]', trackErr)
      }

      return NextResponse.json({
        success: true,
        message: 'Order cancelled successfully',
        order: updatedOrder,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: any) {
    console.error('[Single Order PATCH Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 })
  }
}
