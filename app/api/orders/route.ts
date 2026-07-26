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

    try {
      const phoneToUse = user.phone || user.user_metadata?.phone || '9876543210'

      // First try to find by exact user_id
      let { data: existingCustomer, error: findErr } = await adminSupabase
        .from('customers')
        .select('id, name, phone')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (findErr) console.warn('[Orders API] Find by user_id error:', findErr.message)

      // Fallback: Check by phone
      if (!existingCustomer && phoneToUse) {
        const { data: byPhone, error: phoneErr } = await adminSupabase
          .from('customers')
          .select('id, name, phone')
          .eq('phone', phoneToUse)
          .limit(1)
          .maybeSingle()
        if (phoneErr) console.warn('[Orders API] Find by phone error:', phoneErr.message)
        if (byPhone) existingCustomer = byPhone
      }

      if (existingCustomer) {
        customerObj = existingCustomer
      } else {
        // We MUST provision them. 
        const name = user.user_metadata?.name || user.email?.split('@')[0] || 'Customer'
        const dummyEmail = `test_${phoneToUse.replace('+', '')}@jalseva.demo`
        
        let realUserId = user.id
        
        // If it's a mock UUID, we MUST provision an auth user first
        if (realUserId.startsWith('00000000-0000-')) {
          console.log('[Orders API] Mock UUID detected. Auto-provisioning auth user for phone:', phoneToUse)
          const { data: newAuth, error: authErr } = await adminSupabase.auth.admin.createUser({
            phone: phoneToUse,
            email: dummyEmail,
            password: 'MockUser123!',
            email_confirm: true,
            phone_confirm: true,
            user_metadata: { role: 'customer', name, phone: phoneToUse }
          })

          if (authErr && !authErr.message.toLowerCase().includes('already registered')) {
            throw new Error(`Failed to provision auth user: ${authErr.message}`)
          }

          if (newAuth?.user?.id) {
            realUserId = newAuth.user.id
          } else {
            // They were already registered. We can find them in profiles by phone (safer than dummyEmail)
            const { data: profile } = await adminSupabase
              .from('profiles')
              .select('id')
              .eq('phone', phoneToUse)
              .limit(1)
              .maybeSingle()
            
            if (profile) realUserId = profile.id
            else throw new Error('Could not resolve existing user ID by phone')
          }
        }

        // Now we have a realUserId (or it was real to begin with). Create the customers row.
        const { data: manualCust, error: manualErr } = await adminSupabase
          .from('customers')
          .insert({
            user_id: realUserId,
            name,
            phone: phoneToUse,
            email: user.email || dummyEmail
          })
          .select('id, name, phone')
          .maybeSingle()

        if (manualErr) throw new Error(`Customer insert failed: ${manualErr.message}`)
        customerObj = manualCust
      }
    } catch (custErr: any) {
      console.error('[Orders API] Customer Resolution Error:', custErr)
      return NextResponse.json({ error: 'Customer setup failed: ' + custErr.message }, { status: 500 })
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
