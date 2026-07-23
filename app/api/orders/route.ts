import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifySupplierNewOrder } from '@/lib/services/notification-service'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 })
    }

    const { items, deliveryAddress, paymentMode, specialInstructions } = await request.json()

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // 1. Resolve or auto-create Customer profile
    let customerObj: { id: string; name?: string | null; phone?: string | null } | null = null

    const { data: existingCustomer } = await adminSupabase
      .from('customers')
      .select('id, name, phone')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingCustomer) {
      customerObj = existingCustomer
    } else {
      const name = user.user_metadata?.name || user.email?.split('@')[0] || 'Customer'
      const phone = user.user_metadata?.phone || '9876543210'
      const { data: createdCust, error: custErr } = await adminSupabase
        .from('customers')
        .insert({
          user_id: user.id,
          name,
          phone,
          email: user.email,
        })
        .select('id, name, phone')
        .single()

      if (custErr || !createdCust) {
        return NextResponse.json({ error: 'Failed to create customer profile' }, { status: 500 })
      }
      customerObj = createdCust
    }

    if (!customerObj) {
      return NextResponse.json({ error: 'Customer profile missing' }, { status: 400 })
    }

    const customer = customerObj
    const placedOrders = []
    const errorsList = []

    // 2. Place orders and trigger Supplier Notification + SMS for each
    for (const item of items) {
      const unitPrice = item.product.price
      const totalAmount = unitPrice * item.quantity

      const { data: newOrder, error: insertErr } = await adminSupabase
        .from('orders')
        .insert({
          customer_id: customer.id,
          supplier_id: item.product.supplier_id,
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: unitPrice,
          total_amount: totalAmount,
          status: 'pending',
          payment_mode: paymentMode || 'cash_on_delivery',
          payment_status: 'pending',
          delivery_address: deliveryAddress,
          special_instructions: specialInstructions || null,
        })
        .select()
        .single()

      if (insertErr || !newOrder) {
        console.error('[Order Placement Error]', insertErr)
        errorsList.push(insertErr?.message || 'Order creation failed')
        continue
      }

      placedOrders.push(newOrder)

      // 3. Notify Supplier via SMS + In-App Notification
      await notifySupplierNewOrder({
        orderId: newOrder.id,
        supplierId: item.product.supplier_id,
        customerName: customer.name || 'Customer',
        customerPhone: customer.phone || 'N/A',
        productName: item.product.name,
        totalAmount,
      })
    }

    if (placedOrders.length === 0) {
      return NextResponse.json({ error: errorsList.join(', ') || 'Failed to place orders' }, { status: 500 })
    }

    return NextResponse.json({ success: true, orders: placedOrders })
  } catch (err: any) {
    console.error('[Orders POST Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
