import { NextResponse } from 'next/server'
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

    const { orderId, rating, comment } = await request.json()

    if (!orderId || !rating) {
      return NextResponse.json({ error: 'Missing orderId or rating' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // 1. Get order details
    const { data: order, error: orderErr } = await adminSupabase
      .from('orders')
      .select('id, customer_id, supplier_id, status')
      .eq('id', orderId)
      .maybeSingle()

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status !== 'delivered') {
      return NextResponse.json({ error: 'Reviews can only be submitted for delivered orders' }, { status: 400 })
    }

    // 2. Resolve customer_id
    let customerId = order.customer_id
    if (!customerId) {
      const { data: customer } = await adminSupabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (customer) customerId = customer.id
    }

    if (!customerId) {
      return NextResponse.json({ error: 'Customer record missing' }, { status: 400 })
    }

    // 3. Insert review
    const { data: newReview, error: insertErr } = await adminSupabase
      .from('reviews')
      .insert({
        order_id: order.id,
        customer_id: customerId,
        supplier_id: order.supplier_id,
        rating: Math.min(5, Math.max(1, Number(rating))),
        comment: comment || null,
      })
      .select()
      .single()

    if (insertErr) {
      console.error('[Review Insertion Error]', insertErr)
      return NextResponse.json({ error: insertErr.message || 'Failed to submit review' }, { status: 500 })
    }

    return NextResponse.json({ success: true, review: newReview })
  } catch (err: any) {
    console.error('[Review POST Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { reviewId, reply } = await request.json()

    if (!reviewId || !reply) {
      return NextResponse.json({ error: 'Missing reviewId or reply' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // Get current review
    const { data: review, error: getErr } = await adminSupabase
      .from('reviews')
      .select('id, comment')
      .eq('id', reviewId)
      .maybeSingle()

    if (getErr || !review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    const baseComment = (review.comment || '').split('\n\n[Supplier Reply]:')[0].trim()
    const updatedComment = `${baseComment}\n\n[Supplier Reply]: ${reply.trim()}`

    const { data: updated, error: updateErr } = await adminSupabase
      .from('reviews')
      .update({ comment: updatedComment })
      .eq('id', reviewId)
      .select()
      .single()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, review: updated })
  } catch (err: any) {
    console.error('[Review PATCH Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 })
  }
}
