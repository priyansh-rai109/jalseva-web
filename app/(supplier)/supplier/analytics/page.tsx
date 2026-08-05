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
import { AnimatedCounter } from '@/components/shared/AnimatedCounter'
import { SkeletonCard } from '@/components/shared/SkeletonCard'

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
      try {
        const res = await fetch('/api/supplier/analytics')
        const json = await res.json()
        if (res.ok) {
          setStats(json)
        }
      } catch (err) {
        console.error('Error fetching analytics:', err)
      }
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
          <SkeletonCard type="stat" count={6} />
        </div>
      ) : !stats ? null : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Total Orders', num: stats.totalOrders, isCurrency: false, icon: ShoppingCart, color: 'text-sky-400', bg: 'bg-sky-400/10' },
              { label: 'Delivered', num: stats.deliveredOrders, isCurrency: false, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10' },
              { label: 'Total Revenue', num: stats.totalRevenue, isCurrency: true, icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-400/10' },
              { label: 'Avg Order Value', num: Math.round(stats.averageOrderValue), isCurrency: true, icon: BarChart3, color: 'text-amber-400', bg: 'bg-amber-400/10' },
              { label: 'Avg Rating', num: stats.averageRating, decimals: 1, suffix: ' ★', icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
              { label: 'Cancelled', num: stats.cancelledOrders, isCurrency: false, icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
            ].map((s) => (
              <Card key={s.label} className="glass-card hover:border-sky-500/20 transition-all">
                <CardContent className="p-5">
                  <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <div className="text-2xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    <AnimatedCounter
                      value={s.num}
                      prefix={s.isCurrency ? '₹' : ''}
                      suffix={s.suffix || ''}
                      decimals={s.decimals || 0}
                    />
                  </div>
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
