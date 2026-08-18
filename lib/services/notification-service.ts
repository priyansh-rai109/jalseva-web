import { createAdminClient } from '@/lib/supabase/admin'

interface SendSmsOptions {
  toPhone: string
  message: string
}

export async function sendSMS({ toPhone, message }: SendSmsOptions) {
  const cleanPhone = toPhone.replace(/\D/g, '')
  console.log(`\n==================================================`)
  console.log(`📱 [SMS SERVICE DISPATCH]`)
  console.log(`TO MOBILE: ${toPhone} (${cleanPhone})`)
  console.log(`MESSAGE: "${message}"`)
  console.log(`==================================================\n`)

  const apiKey = process.env.FAST2SMS_API_KEY || process.env.SMS_API_KEY
  if (apiKey && cleanPhone.length >= 10) {
    try {
      const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route: 'q',
          message: message,
          language: 'english',
          numbers: cleanPhone.slice(-10)
        })
      })
      const json = await res.json()
      console.log('📱 [Fast2SMS API Response]', json)
    } catch (err) {
      console.error('📱 [Fast2SMS API Error]', err)
    }
  }
}

// 1. Notify Supplier on New Order Received
export async function notifySupplierNewOrder({
  orderId,
  supplierId,
  customerName,
  customerPhone,
  productName,
  totalAmount,
}: {
  orderId: string
  supplierId: string
  customerName: string
  customerPhone: string
  productName: string
  totalAmount: number
}) {
  try {
    const adminSupabase = createAdminClient()

    // 1. Get supplier row to obtain user_id & phone number
    let { data: supplier } = await adminSupabase
      .from('suppliers')
      .select('id, user_id, phone, business_name')
      .eq('id', supplierId)
      .maybeSingle()

    if (!supplier) {
      ;({ data: supplier } = await adminSupabase
        .from('suppliers')
        .select('id, user_id, phone, business_name')
        .eq('user_id', supplierId)
        .maybeSingle())
    }

    if (!supplier) {
      console.warn('[Notify Supplier] Supplier not found for ID:', supplierId)
      return
    }

    const shortId = orderId.slice(0, 8).toUpperCase()
    const title = `🚨 New Order #${shortId} Received!`
    const body = `New order from ${customerName} (${customerPhone || 'No phone'}) for ${productName} (Total: ₹${totalAmount}). Please confirm delivery.`

    // 2. In-App Notification (Insert for user_id and/or supplier.id)
    const targetUserId = supplier.user_id || supplier.id
    if (targetUserId) {
      const { error: notifErr } = await adminSupabase.from('notifications').insert({
        user_id: targetUserId,
        title,
        body,
        type: 'order',
        reference_id: orderId,
      })
      if (notifErr) {
        console.error('[Notify Supplier In-App Insert Error]', notifErr)
      } else {
        console.log('[Notify Supplier In-App Insert Success] for user:', targetUserId)
      }
    }

    // 3. SMS Notification to Supplier Mobile Number
    const supplierPhone = supplier.phone || '9876543210'
    const smsMessage = `[JalSeva] 💧 New Order #${shortId} received! Customer: ${customerName} (${customerPhone || 'N/A'}), Product: ${productName}, Amount: ₹${totalAmount}. Please check dashboard to confirm.`
    await sendSMS({ toPhone: supplierPhone, message: smsMessage })
  } catch (err) {
    console.error('[Notify Supplier Error]', err)
  }
}

// 2. Notify Customer when Order is Placed
export async function notifyCustomerOrderPlaced({
  orderId,
  customerId,
  userId,
  productName,
  quantity,
  totalAmount,
  supplierName,
}: {
  orderId: string
  customerId?: string
  userId?: string
  productName: string
  quantity: number
  totalAmount: number
  supplierName?: string
}) {
  try {
    const adminSupabase = createAdminClient()
    const targetUserId = userId || customerId
    if (!targetUserId) return

    const shortId = orderId.slice(0, 8).toUpperCase()
    const title = `💧 Order #${shortId} Placed!`
    const body = `Your order for ${productName} (Qty: ${quantity}, Total: ₹${totalAmount}) has been sent${supplierName ? ` to ${supplierName}` : ''}. Waiting for confirmation.`

    const { error: notifErr } = await adminSupabase.from('notifications').insert({
      user_id: targetUserId,
      title,
      body,
      type: 'order',
      reference_id: orderId,
    })
    if (notifErr) {
      console.error('[Notify Customer Placed In-App Error]', notifErr)
    } else {
      console.log('[Notify Customer Placed In-App Success] for user:', targetUserId)
    }
  } catch (err) {
    console.error('[Notify Customer Order Placed Error]', err)
  }
}

// 3. Notify Customer on Status Change (Confirmed, Out for Delivery, Delivered, Cancelled)
export async function notifyCustomerStatusChange({
  orderId,
  customerId,
  status,
  supplierName,
  driverName,
  driverPhone,
  vehicleNumber,
  estimatedMins,
}: {
  orderId: string
  customerId: string
  status: string
  supplierName: string
  driverName?: string
  driverPhone?: string
  vehicleNumber?: string
  estimatedMins?: string
}) {
  try {
    const adminSupabase = createAdminClient()

    // 1. Get customer row to obtain user_id & phone
    let { data: customer } = await adminSupabase
      .from('customers')
      .select('id, user_id, phone, name')
      .eq('id', customerId)
      .maybeSingle()

    if (!customer) {
      ;({ data: customer } = await adminSupabase
        .from('customers')
        .select('id, user_id, phone, name')
        .eq('user_id', customerId)
        .maybeSingle())
    }

    if (!customer) {
      console.warn('[Notify Customer] Customer not found for ID:', customerId)
      return
    }

    const shortId = orderId.slice(0, 8).toUpperCase()

    let title = ''
    let body = ''
    let smsMessage = ''

    if (status === 'confirmed') {
      title = `✅ Order #${shortId} Confirmed!`
      body = `Your water order #${shortId} has been confirmed by ${supplierName}. Preparation has started.`
      smsMessage = `[JalSeva] 💧 Your Water Order #${shortId} has been CONFIRMED by ${supplierName}. Delivery preparation started.`
    } else if (status === 'out_for_delivery') {
      const driverInfo = driverName ? ` with Driver ${driverName} (${driverPhone || 'N/A'}) in vehicle ${vehicleNumber || 'RJ-19'}` : ''
      const etaInfo = estimatedMins ? ` (ETA: ~${estimatedMins} mins)` : ''
      title = `🚚 Order #${shortId} Out for Delivery!`
      body = `Your water delivery #${shortId} from ${supplierName} is on its way${driverInfo}.${etaInfo}`
      smsMessage = `[JalSeva] 🚛 Water Order #${shortId} is OUT FOR DELIVERY by ${supplierName}! Driver: ${driverName || 'Assigned Driver'} (${driverPhone || 'N/A'}), Vehicle: ${vehicleNumber || 'RJ-19'}, ETA: ~${estimatedMins || '15-20'} mins.`
    } else if (status === 'delivered') {
      title = `🎉 Order #${shortId} Delivered!`
      body = `Your water order #${shortId} from ${supplierName} has been delivered! Please share your rating & review.`
      smsMessage = `[JalSeva] 🎉 Your Water Order #${shortId} from ${supplierName} has been DELIVERED! Thank you for choosing JalSeva.`
    } else if (status === 'cancelled') {
      title = `❌ Order #${shortId} Cancelled`
      body = `Your water order #${shortId} from ${supplierName} has been cancelled.`
      smsMessage = `[JalSeva] ❌ Your Water Order #${shortId} from ${supplierName} was cancelled.`
    } else {
      return
    }

    // 2. In-App Notification (Insert for user_id or customer.id)
    const targetUserId = customer.user_id || customer.id
    if (targetUserId) {
      const { error: notifErr } = await adminSupabase.from('notifications').insert({
        user_id: targetUserId,
        title,
        body,
        type: 'order',
        reference_id: orderId,
      })
      if (notifErr) {
        console.error('[Notify Customer Status In-App Error]', notifErr)
      } else {
        console.log('[Notify Customer Status In-App Success] for user:', targetUserId)
      }
    }

    // 3. SMS Notification to Customer Mobile Number
    const customerPhone = customer.phone || '9876543210'
    await sendSMS({ toPhone: customerPhone, message: smsMessage })
  } catch (err) {
    console.error('[Notify Customer Error]', err)
  }
}

// 4. Notify Supplier on New Review Received
export async function notifySupplierNewReview({
  orderId,
  supplierId,
  customerName,
  rating,
  comment,
}: {
  orderId: string
  supplierId: string
  customerName: string
  rating: number
  comment?: string | null
}) {
  try {
    const adminSupabase = createAdminClient()

    let { data: supplier } = await adminSupabase
      .from('suppliers')
      .select('id, user_id, phone, business_name')
      .eq('id', supplierId)
      .maybeSingle()

    if (!supplier) {
      ;({ data: supplier } = await adminSupabase
        .from('suppliers')
        .select('id, user_id, phone, business_name')
        .eq('user_id', supplierId)
        .maybeSingle())
    }

    if (!supplier) {
      console.warn('[Notify Supplier Review] Supplier not found for ID:', supplierId)
      return
    }

    const shortId = orderId.slice(0, 8).toUpperCase()
    const stars = '⭐'.repeat(Math.min(5, Math.max(1, rating)))
    const title = `${stars} New ${rating}-Star Review Received!`
    const body = `${customerName} rated Order #${shortId} with ${rating}/5 stars: "${comment || 'Verified Water Delivery'}"`

    // In-App Notification
    const targetUserId = supplier.user_id || supplier.id
    if (targetUserId) {
      await adminSupabase.from('notifications').insert({
        user_id: targetUserId,
        title,
        body,
        type: 'order',
        reference_id: orderId,
      })
    }

    // SMS to Supplier
    const supplierPhone = supplier.phone || '9876543210'
    const smsMessage = `[JalSeva] 🌟 New ${rating}-Star Review from ${customerName} for Order #${shortId}! "${comment || 'Order Delivered'}". Check your reviews in JalSeva.`
    await sendSMS({ toPhone: supplierPhone, message: smsMessage })
  } catch (err) {
    console.error('[Notify Supplier Review Error]', err)
  }
}

