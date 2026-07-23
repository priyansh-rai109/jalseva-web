import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyCustomerStatusChange } from '@/lib/services/notification-service'

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId, status } = await request.json()
    if (!orderId || !status) {
      return NextResponse.json({ error: 'Missing orderId or status' }, { status: 400 })
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

    // 3. Update order status as admin client
    const { data: updatedOrder, error: updateError } = await adminSupabase
      .from('orders')
      .update({ status })
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
