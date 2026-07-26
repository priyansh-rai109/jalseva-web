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

    let { data: existingCustomer } = await adminSupabase
      .from('customers')
      .select('id, name, phone')
      .eq('user_id', user.id)
      .maybeSingle()

    // Fallback: If user has a mock session but already has a provisioned test profile by phone
    const phoneToUse = user.phone || user.user_metadata?.phone || '9876543210'
    if (!existingCustomer && phoneToUse) {
      const { data: byPhone } = await adminSupabase
        .from('customers')
        .select('id, name, phone')
        .eq('phone', phoneToUse)
        .maybeSingle()
      if (byPhone) {
        existingCustomer = byPhone
      }
    }

    if (existingCustomer) {
      customerObj = existingCustomer
    } else {
      const name = user.user_metadata?.name || user.email?.split('@')[0] || 'Customer'
      
      const { data: createdCust, error: custErr } = await adminSupabase
        .from('customers')
        .insert({
          user_id: user.id,
          name,
          phone: phoneToUse,
          email: user.email,
        })
        .select('id, name, phone')
        .maybeSingle()

      if (custErr) {
        if (custErr.code === '23503') { // Foreign Key Violation
          console.log('[Orders API] FK violation for user_id. Provisioning mock auth user...')
          const { error: authErr } = await adminSupabase.auth.admin.createUser({
            phone: phoneToUse,
            password: 'MockUser123!',
            email_confirm: true,
            phone_confirm: true,
            user_metadata: { role: 'customer', name, phone: phoneToUse }
          })

          if (authErr && !authErr.message.includes('already registered')) {
            console.error('[Create Auth User Error]', authErr)
            return NextResponse.json({ error: 'Failed to provision test user: ' + authErr.message }, { status: 500 })
          }

          const { data: autoCreatedCust } = await adminSupabase
            .from('customers')
            .select('id, name, phone')
            .eq('phone', phoneToUse)
            .maybeSingle()

          if (!autoCreatedCust) {
            return NextResponse.json({ error: 'Customer auto-creation failed' }, { status: 500 })
          }
          customerObj = autoCreatedCust
        } else {
          console.error('[Create Customer Error]', custErr)
          return NextResponse.json({ error: 'Failed to create customer profile: ' + custErr.message }, { status: 500 })
        }
      } else if (createdCust) {
        customerObj = createdCust
      }
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
