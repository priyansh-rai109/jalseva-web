import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifySupplierNewReview } from '@/lib/services/notification-service'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const supplierId = searchParams.get('supplierId')
    const orderId = searchParams.get('orderId')
    const customerId = searchParams.get('customerId')

    const adminSupabase = createAdminClient()
    let query = adminSupabase
      .from('reviews')
      .select('*, customers(name, phone), orders(water_products(name, type))')
      .order('created_at', { ascending: false })

    if (orderId) {
      const { data: review, error } = await query.eq('order_id', orderId).maybeSingle()
      if (error) throw error
      return NextResponse.json({ review: review || null })
    }

    if (supplierId) {
      query = query.eq('supplier_id', supplierId)
    }

    if (customerId) {
      query = query.eq('customer_id', customerId)
    }

    const { data: reviews, error } = await query
    if (error) throw error

    return NextResponse.json({ reviews: reviews || [] })
  } catch (err: any) {
    console.error('[Review GET Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

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
      .select('id, customer_id, supplier_id, status, customers(name, phone), suppliers(business_name, user_id)')
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
    let customerName = (order.customers as any)?.name || 'Customer'
    if (!customerId) {
      const { data: customer } = await adminSupabase
        .from('customers')
        .select('id, name')
        .eq('user_id', user.id)
        .maybeSingle()
      if (customer) {
        customerId = customer.id
        if (customer.name) customerName = customer.name
      }
    }

    if (!customerId) {
      return NextResponse.json({ error: 'Customer record missing' }, { status: 400 })
    }

    const parsedRating = Math.min(5, Math.max(1, Number(rating)))

    // 3. Check if review already exists (allow upsert/update)
    const { data: existingReview } = await adminSupabase
      .from('reviews')
      .select('id')
      .eq('order_id', order.id)
      .maybeSingle()

    let savedReview: any = null

    if (existingReview?.id) {
      // Update existing review
      const { data: updatedReview, error: updateErr } = await adminSupabase
        .from('reviews')
        .update({
          rating: parsedRating,
          comment: comment || null,
        })
        .eq('id', existingReview.id)
        .select()
        .single()

      if (updateErr) throw updateErr
      savedReview = updatedReview
    } else {
      // Insert new review
      const { data: newReview, error: insertErr } = await adminSupabase
        .from('reviews')
        .insert({
          order_id: order.id,
          customer_id: customerId,
          supplier_id: order.supplier_id,
          rating: parsedRating,
          comment: comment || null,
        })
        .select()
        .single()

      if (insertErr) {
        console.error('[Review Insertion Error]', insertErr)
        return NextResponse.json({ error: insertErr.message || 'Failed to submit review' }, { status: 500 })
      }
      savedReview = newReview
    }

    // 4. Calculate & Update Supplier's Overall Average Rating in DB
    if (order.supplier_id) {
      try {
        const { data: supplierReviews } = await adminSupabase
          .from('reviews')
          .select('rating')
          .eq('supplier_id', order.supplier_id)

        if (supplierReviews && supplierReviews.length > 0) {
          const totalRating = supplierReviews.reduce((sum: number, r: any) => sum + Number(r.rating || 0), 0)
          const avgRating = Number((totalRating / supplierReviews.length).toFixed(1))

          await adminSupabase
            .from('suppliers')
            .update({ rating: avgRating })
            .eq('id', order.supplier_id)
        }
      } catch (ratingCalcErr) {
        console.warn('[Supplier Rating Recalculation Warning]', ratingCalcErr)
      }
    }

    // 5. Notify Supplier in realtime & in-app
    if (order.supplier_id) {
      try {
        await notifySupplierNewReview({
          orderId: order.id,
          supplierId: order.supplier_id,
          customerName,
          rating: parsedRating,
          comment,
        })
      } catch (notifErr) {
        console.warn('[Notify Supplier Review Warning]', notifErr)
      }
    }

    return NextResponse.json({ success: true, review: savedReview })
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
