'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  TrendingUp, ShoppingCart, CheckCircle2, XCircle,
  Star, Package, BarChart3, ArrowUpRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Stats {
  totalOrders: number
  deliveredOrders: number
  cancelledOrders: number
  pendingOrders: number
  totalRevenue: number
  averageOrderValue: number
  averageRating: number
  totalReviews: number
  topProducts: { name: string; type: string; count: number; revenue: number }[]
  recentRevenue: { date: string; amount: number }[]
}

export default function SupplierAnalyticsPage() {
  const supabase = createClient()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: supplier } = await supabase
        .from('suppliers')
        .select('id, rating')
        .eq('user_id', user.id)
        .single()
      if (!supplier) return

      const [
        { data: allOrders },
        { data: reviews },
        { data: products },
      ] = await Promise.all([
        supabase.from('orders')
          .select('status, total_amount, created_at, product_id, water_products(name, type)')
          .eq('supplier_id', supplier.id),
        supabase.from('reviews').select('rating').eq('supplier_id', supplier.id),
        supabase.from('water_products').select('id, name, type').eq('supplier_id', supplier.id),
      ])

      const orders = allOrders || []
      const delivered = orders.filter((o: any) => o.status === 'delivered')
      const totalRevenue = delivered.reduce((sum: number, o: any) => sum + o.total_amount, 0)

      // Top products by order count
      const productMap: Record<string, { name: string; type: string; count: number; revenue: number }> = {}
      orders.forEach((o: any) => {
        const pid = o.product_id
        if (!productMap[pid]) {
          productMap[pid] = {
            name: (o.water_products as any)?.name || 'Unknown',
            type: (o.water_products as any)?.type || 'can',
            count: 0, revenue: 0,
          }
        }
        productMap[pid].count++
        if (o.status === 'delivered') productMap[pid].revenue += o.total_amount
      })
      const topProducts = Object.values(productMap).sort((a, b) => b.count - a.count).slice(0, 5)

      // Last 7 days revenue
      const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (6 - i))
        return d.toISOString().split('T')[0]
      })
      const recentRevenue = last7.map(date => ({
        date,
        amount: delivered
          .filter((o: any) => o.created_at?.startsWith(date))
          .reduce((sum: number, o: any) => sum + o.total_amount, 0),
      }))

      const reviewsData = reviews || []
      const avgRating = reviewsData.length
        ? reviewsData.reduce((s: number, r: any) => s + r.rating, 0) / reviewsData.length
        : 0

      setStats({
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
      setLoading(false)
    }
    fetchStats()
  }, [])

  const productTypeIcons: Record<string, string> = { tanker: '🚛', can: '🫙', pouch: '💧' }

  // Max revenue for bar chart scale
  const maxRevenue = Math.max(...(stats?.recentRevenue.map(r => r.amount) || [1]), 1)

  const statCards = stats ? [
    { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingCart, color: 'text-sky-400', bg: 'bg-sky-400/10' },
    { label: 'Delivered', value: stats.deliveredOrders, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10' },
    { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Avg Order Value', value: formatCurrency(stats.averageOrderValue), icon: BarChart3, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'Avg Rating', value: `${stats.averageRating.toFixed(1)} ★`, icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { label: 'Cancelled', value: stats.cancelledOrders, icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
  ] : []

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Analytics</h1>
        <p className="text-muted-foreground mt-1">Your business performance overview</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="glass-card h-28 animate-pulse" />)}
        </div>
      ) : !stats ? null : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {statCards.map((s) => (
              <Card key={s.label} className="glass-card hover:border-sky-500/20 transition-all">
                <CardContent className="p-5">
                  <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <div className="text-2xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{s.value}</div>
                  <div className="text-sm text-muted-foreground">{s.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Revenue Bar Chart (CSS-based) */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Rajdhani, sans-serif' }}>Last 7 Days Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3 h-40">
                {stats.recentRevenue.map((r) => {
                  const height = maxRevenue > 0 ? (r.amount / maxRevenue) * 100 : 0
                  const dayName = new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short' })
                  return (
                    <div key={r.date} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-muted-foreground">{r.amount > 0 ? `₹${(r.amount/1000).toFixed(0)}k` : ''}</span>
                      <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                        <div
                          className="w-full rounded-t-lg water-shimmer transition-all duration-500"
                          style={{ height: `${Math.max(height, r.amount > 0 ? 8 : 2)}%`, minHeight: r.amount > 0 ? '8px' : '2px', opacity: r.amount > 0 ? 1 : 0.2 }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{dayName}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Rajdhani, sans-serif' }}>Top Products</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.topProducts.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No order data yet</p>
              ) : (
                <div className="space-y-3">
                  {stats.topProducts.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                      <span className="text-2xl">{productTypeIcons[p.type] || '💧'}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.count} orders</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-sky-400">{formatCurrency(p.revenue)}</p>
                        <p className="text-xs text-muted-foreground">revenue</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
