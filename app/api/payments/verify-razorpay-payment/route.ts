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

    // If an existing order ID was provided, mark payment as paid while keeping status pending for supplier confirmation
    if (orderId) {
      const { data: existingOrder } = await adminSupabase
        .from('orders')
        .select('special_instructions')
        .eq('id', orderId)
        .maybeSingle()

      const razorpayTag = `[Paid via Razorpay - Payment ID: ${razorpay_payment_id}]`
      const combinedInstructions = existingOrder?.special_instructions
        ? `${existingOrder.special_instructions} ${razorpayTag}`
        : razorpayTag

      await adminSupabase
        .from('orders')
        .update({
          status: 'pending',
          payment_mode: 'online',
          payment_status: 'paid',
          special_instructions: combinedInstructions,
        })
        .eq('id', orderId)

      try {
        await adminSupabase.from('order_tracking').insert({
          order_id: orderId,
          status: 'pending',
          note: `Payment verified via Razorpay (ID: ${razorpay_payment_id}). Awaiting supplier confirmation.`,
        })
      } catch (trackErr) {
        console.warn('[Order Tracking Insert Warning]', trackErr)
      }
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
