import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSupplierForUser } from '@/lib/supabase/supplier-helper'
import { notifyCustomerStatusChange } from '@/lib/services/notification-service'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') || 'all'

    const adminSupabase = createAdminClient()
    const supplier = await getSupplierForUser(user)

    if (!supplier) {
      return NextResponse.json({ orders: [] })
    }

    let query = adminSupabase
      .from('orders')
      .select(`
        id, total_amount, status, quantity, payment_mode, payment_status, delivery_address, created_at, special_instructions,
        customers(name, phone),
        water_products(name, type, capacity_liters, price)
      `)
      .eq('supplier_id', supplier.id)
      .order('created_at', { ascending: false })

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const { data: orders, error } = await query
    if (error) throw error

    return NextResponse.json({ orders: orders || [] })
  } catch (err: any) {
    console.error('[Supplier Orders GET Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { orderId, status, reason, paymentStatus, driverName, driverPhone, vehicleNumber, estimatedMins } = body

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // 1. Get supplier row for this user using comprehensive resolution
    const supplier = await getSupplierForUser(user)

    if (!supplier) {
      // Check if super_admin
      const { data: adminProfile } = await adminSupabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (adminProfile?.role !== 'super_admin') {
        return NextResponse.json({ error: 'Supplier account not found' }, { status: 403 })
      }
    }

    // 2. Fetch target order
    const { data: order, error: orderError } = await adminSupabase
      .from('orders')
      .select('id, supplier_id, customer_id, status, special_instructions')
      .eq('id', orderId)
      .maybeSingle()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (supplier && order.supplier_id && order.supplier_id !== supplier.id) {
      const { data: adminProfile } = await adminSupabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (adminProfile?.role !== 'super_admin') {
        return NextResponse.json({ error: 'Not authorized to update this order' }, { status: 403 })
      }
    }

    const updatePayload: Record<string, any> = {}
    if (status) updatePayload.status = status
    if (paymentStatus) updatePayload.payment_status = paymentStatus
    if (status === 'delivered') updatePayload.payment_status = 'paid'
    if (reason && status === 'cancelled') {
      updatePayload.special_instructions = order.special_instructions
        ? `${order.special_instructions} | [Cancelled by Supplier: ${reason}]`
        : `[Cancelled by Supplier: ${reason}]`
    }
    if (status === 'out_for_delivery' && driverName) {
      const driverTag = `[Driver: ${driverName} | Phone: ${driverPhone || ''} | Vehicle: ${vehicleNumber || ''} | ETA: ${estimatedMins || '15-20'} mins]`
      updatePayload.special_instructions = order.special_instructions
        ? `${order.special_instructions} ${driverTag}`
        : driverTag
    }

    // 3. Update order in database
    const { data: updatedOrder, error: updateError } = await adminSupabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId)
      .select()
      .single()

    if (updateError) {
      console.error('[Supplier Orders PATCH Error]', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // 4. Record order tracking event
    if (status) {
      const noteMap: Record<string, string> = {
        confirmed: 'Order confirmed by supplier. Preparation in progress.',
        out_for_delivery: driverName
          ? `Order dispatched with Driver ${driverName} (${driverPhone || 'N/A'}, Vehicle: ${vehicleNumber || 'N/A'}). ETA: ~${estimatedMins || '15-20'} mins.`
          : 'Order dispatched and is out for delivery.',
        delivered: 'Water order delivered successfully.',
        cancelled: reason ? `Order cancelled: ${reason}` : 'Order cancelled by supplier',
      }
      try {
        await adminSupabase.from('order_tracking').insert({
          order_id: orderId,
          status: status,
          notes: noteMap[status] || `Status updated to ${status}`,
        })
      } catch (trackErr) {
        console.warn('[Order Tracking Insert Warning]', trackErr)
      }
    }

    // 5. In-App Notification & SMS to Customer
    if (order.customer_id && status) {
      try {
        await notifyCustomerStatusChange({
          orderId,
          customerId: order.customer_id,
          status,
          supplierName: supplier?.business_name || 'Water Supplier',
          driverName,
          driverPhone,
          vehicleNumber,
          estimatedMins,
        })
      } catch (notifyErr) {
        console.warn('[Customer Notification Warning]', notifyErr)
      }
    }

    // 6. In-App Notification for Supplier
    const supplierUserId = supplier?.user_id || user.id
    if (supplierUserId && status) {
      try {
        const shortId = orderId.slice(0, 8).toUpperCase()
        const supplierTitleMap: Record<string, string> = {
          confirmed: `✅ Order #${shortId} Confirmed`,
          out_for_delivery: `🚚 Order #${shortId} Out for Delivery`,
          delivered: `🎉 Order #${shortId} Marked Delivered`,
          cancelled: `❌ Order #${shortId} Cancelled`,
        }
        if (supplierTitleMap[status]) {
          await adminSupabase.from('notifications').insert({
            user_id: supplierUserId,
            title: supplierTitleMap[status],
            body: `You updated order #${shortId} status to ${status.replace('_', ' ')}.`,
            type: 'order',
            reference_id: orderId,
          })
        }
      } catch (supNotifyErr) {
        console.warn('[Supplier Notification Warning]', supNotifyErr)
      }
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    })
  } catch (err: any) {
    console.error('[Supplier Orders PATCH Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 })
  }
}
