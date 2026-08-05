import { NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { amount, orderId } = await request.json()

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid order amount' }, { status: 400 })
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_T34XmzvqjTeeXs'
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || 'QEUwA7d1cV8AdBaloTJQClni'

    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    })

    const options = {
      amount: Math.round(amount * 100), // Amount in paise
      currency: 'INR',
      receipt: orderId || `receipt_${Date.now()}`,
      notes: {
        userId: user.id,
        orderId: orderId || '',
      },
    }

    const razorpayOrder = await razorpay.orders.create(options)

    return NextResponse.json({
      success: true,
      id: razorpayOrder.id,
      currency: razorpayOrder.currency,
      amount: razorpayOrder.amount,
      key: razorpayKeyId,
    })
  } catch (err: any) {
    console.error('[Create Razorpay Order Exception]', err)
    return NextResponse.json({ error: err.message || 'Failed to create Razorpay order' }, { status: 500 })
  }
}
