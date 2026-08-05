import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSupplierForUser } from '@/lib/supabase/supplier-helper'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()
    const supplier = await getSupplierForUser(user)

    if (!supplier) {
      return NextResponse.json({
        totalOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        pendingOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        averageRating: 0,
        totalReviews: 0,
        topProducts: [],
        recentRevenue: [],
      })
    }

    const [
      { data: allOrders },
      { data: reviews },
    ] = await Promise.all([
      adminSupabase
        .from('orders')
        .select('status, total_amount, created_at, product_id, water_products(name, type)')
        .eq('supplier_id', supplier.id),
      adminSupabase
        .from('reviews')
        .select('rating')
        .eq('supplier_id', supplier.id),
    ])

    const orders = allOrders || []
    const delivered = orders.filter((o: any) => o.status === 'delivered')
    const totalRevenue = delivered.reduce((sum: number, o: any) => sum + o.total_amount, 0)

    const productMap: Record<string, { name: string; type: string; count: number; revenue: number }> = {}
    orders.forEach((o: any) => {
      const pid = o.product_id || 'unknown'
      if (!productMap[pid]) {
        productMap[pid] = {
          name: (o.water_products as any)?.name || 'Water Product',
          type: (o.water_products as any)?.type || 'can',
          count: 0,
          revenue: 0,
        }
      }
      productMap[pid].count++
      if (o.status === 'delivered') productMap[pid].revenue += o.total_amount
    })
    const topProducts = Object.values(productMap).sort((a, b) => b.count - a.count).slice(0, 5)

    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return d.toISOString().split('T')[0]
    })
    const recentRevenue = last7.map((date) => ({
      date,
      amount: delivered
        .filter((o: any) => o.created_at?.startsWith(date))
        .reduce((sum: number, o: any) => sum + o.total_amount, 0),
    }))

    const reviewsData = reviews || []
    const avgRating = reviewsData.length
      ? reviewsData.reduce((s: number, r: any) => s + r.rating, 0) / reviewsData.length
      : Number(supplier.rating) || 0

    return NextResponse.json({
      totalOrders: orders.length,
      deliveredOrders: delivered.length,
      cancelledOrders: orders.filter((o: any) => o.status === 'cancelled').length,
      pendingOrders: orders.filter((o: any) => o.status === 'pending').length,
      totalRevenue,
      averageOrderValue: delivered.length ? totalRevenue / delivered.length : 0,
      averageRating: avgRating,
      totalReviews: reviewsData.length,
      topProducts,
      recentRevenue,
    })
  } catch (err: any) {
    console.error('[Supplier Analytics GET Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 })
  }
}
