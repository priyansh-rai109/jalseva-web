import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSupplierForUser } from '@/lib/supabase/supplier-helper'
import { notifyCustomerStatusChange } from '@/lib/services/notification-service'

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
        id, total_amount, status, quantity, payment_mode, delivery_address, created_at, special_instructions,
        customers(name, phone),
        water_products(name, type, capacity_liters)
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
    const { orderId, status, reason, paymentStatus } = body

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // 1. Get supplier row for this user
    const { data: supplier, error: supError } = await adminSupabase
      .from('suppliers')
      .select('id, business_name')
      .eq('user_id', user.id)
      .maybeSingle()

    if (supError || !supplier) {
      return NextResponse.json({ error: 'Supplier account not found' }, { status: 403 })
    }

    // 2. Verify order belongs to this supplier
    const { data: order, error: orderError } = await adminSupabase
      .from('orders')
      .select('id, supplier_id, customer_id')
      .eq('id', orderId)
      .maybeSingle()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.supplier_id !== supplier.id) {
      return NextResponse.json({ error: 'Not authorized to update this order' }, { status: 403 })
    }

    const updatePayload: any = {}
    if (status) updatePayload.status = status
    if (paymentStatus) updatePayload.payment_status = paymentStatus
    if (status === 'delivered') updatePayload.payment_status = 'paid'

    // 3. Update order status as admin client
    const { data: updatedOrder, error: updateError } = await adminSupabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId)
      .select()

    if (updateError) {
      console.error('[Supplier Orders PATCH Error]', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // 4. Trigger SMS & In-App Notification to Customer
    if (order.customer_id) {
      await notifyCustomerStatusChange({
        orderId,
        customerId: order.customer_id,
        status,
        supplierName: supplier.business_name || 'Water Supplier',
      })
    }

    return NextResponse.json({ order: updatedOrder?.[0] })
  } catch (err: any) {
    console.error('[Supplier Orders PATCH Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 })
  }
}
