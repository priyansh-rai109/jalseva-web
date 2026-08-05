import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = await request.json()

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing Razorpay verification parameters' }, { status: 400 })
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || 'QEUwA7d1cV8AdBaloTJQClni'
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (generated_signature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // If an existing order ID was provided, update it to confirmed & append payment info
    if (orderId) {
      await adminSupabase
        .from('orders')
        .update({
          status: 'confirmed',
          payment_mode: 'online',
          payment_status: 'paid',
          special_instructions: `[Paid via Razorpay - Payment ID: ${razorpay_payment_id}]`,
        })
        .eq('id', orderId)

      try {
        await adminSupabase.from('order_tracking').insert({
          order_id: orderId,
          status: 'confirmed',
          notes: `Payment verified via Razorpay (ID: ${razorpay_payment_id})`,
        })
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: 'Razorpay payment verified successfully',
      paymentId: razorpay_payment_id,
    })
  } catch (err: any) {
    console.error('[Verify Razorpay Payment Exception]', err)
    return NextResponse.json({ error: err.message || 'Payment verification failed' }, { status: 500 })
  }
}
