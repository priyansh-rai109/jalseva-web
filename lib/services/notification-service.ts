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
    const { data: supplier } = await adminSupabase
      .from('suppliers')
      .select('user_id, phone, business_name')
      .eq('id', supplierId)
      .maybeSingle()

    if (!supplier) return

    const shortId = orderId.slice(0, 8).toUpperCase()
    const title = `🚨 New Order #${shortId} Received!`
    const body = `New order from ${customerName} (${customerPhone || 'No phone'}) for ${productName} (Total: ₹${totalAmount}). Please confirm.`

    // 2. In-App Notification
    if (supplier.user_id) {
      await adminSupabase.from('notifications').insert({
        user_id: supplier.user_id,
        title,
        body,
        type: 'order',
        reference_id: orderId,
      })
    }

    // 3. SMS Notification to Supplier Mobile Number
    const supplierPhone = supplier.phone || '9876543210'
    const smsMessage = `[JalSeva] 💧 New Order #${shortId} received! Customer: ${customerName} (${customerPhone || 'N/A'}), Product: ${productName}, Amount: ₹${totalAmount}. Please check dashboard to confirm.`
    await sendSMS({ toPhone: supplierPhone, message: smsMessage })
  } catch (err) {
    console.error('[Notify Supplier Error]', err)
  }
}

export async function notifyCustomerStatusChange({
  orderId,
  customerId,
  status,
  supplierName,
}: {
  orderId: string
  customerId: string
  status: string
  supplierName: string
}) {
  try {
    const adminSupabase = createAdminClient()

    // 1. Get customer row to obtain user_id & phone
    const { data: customer } = await adminSupabase
      .from('customers')
      .select('user_id, phone, name')
      .eq('id', customerId)
      .maybeSingle()

    if (!customer) return

    const shortId = orderId.slice(0, 8).toUpperCase()

    let title = ''
    let body = ''
    let smsMessage = ''

    if (status === 'confirmed') {
      title = `✅ Order #${shortId} Confirmed!`
      body = `Your water order #${shortId} has been confirmed by ${supplierName}.`
      smsMessage = `[JalSeva] 💧 Your Water Order #${shortId} has been CONFIRMED by ${supplierName}. Delivery preparation started.`
    } else if (status === 'out_for_delivery') {
      title = `🚚 Order #${shortId} Out for Delivery!`
      body = `Your water delivery #${shortId} from ${supplierName} is on its way!`
      smsMessage = `[JalSeva] 🚛 Your Water Order #${shortId} is OUT FOR DELIVERY by ${supplierName}! Executive will arrive shortly.`
    } else if (status === 'delivered') {
      title = `🎉 Order #${shortId} Delivered!`
      body = `Your water order #${shortId} has been marked as delivered by ${supplierName}.`
      smsMessage = `[JalSeva] 🎉 Your Water Order #${shortId} from ${supplierName} has been DELIVERED! Thank you for using JalSeva.`
    } else if (status === 'cancelled') {
      title = `❌ Order #${shortId} Cancelled`
      body = `Order #${shortId} from ${supplierName} has been cancelled.`
      smsMessage = `[JalSeva] ❌ Your Water Order #${shortId} from ${supplierName} was cancelled.`
    } else {
      return
    }

    // 2. In-App Notification
    if (customer.user_id) {
      await adminSupabase.from('notifications').insert({
        user_id: customer.user_id,
        title,
        body,
        type: 'order',
        reference_id: orderId,
      })
    }

    // 3. SMS Notification to Customer Mobile Number
    const customerPhone = customer.phone || '9876543210'
    await sendSMS({ toPhone: customerPhone, message: smsMessage })
  } catch (err) {
    console.error('[Notify Customer Error]', err)
  }
}
