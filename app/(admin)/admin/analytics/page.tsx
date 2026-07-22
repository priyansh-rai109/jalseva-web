import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  TrendingUp, ShoppingCart, Building2, Users,
  CheckCircle2, XCircle, BarChart3
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

export const metadata = { title: 'Analytics — Admin' }

export default async function AdminAnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin-login')

  const [
    { data: allOrders },
    { count: totalSuppliers },
    { count: totalCustomers },
    { count: approvedSuppliers },
  ] = await Promise.all([
    supabase.from('orders').select('status, total_amount, created_at'),
    supabase.from('suppliers').select('*', { count: 'exact', head: true }),
    supabase.from('customers').select('*', { count: 'exact', head: true }),
    supabase.from('suppliers').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
  ])

  const orders = (allOrders || []) as any[]
  const delivered = orders.filter((o: any) => o.status === 'delivered')
  const cancelled = orders.filter((o: any) => o.status === 'cancelled')
  const totalRevenue = delivered.reduce((s: number, o: any) => s + o.total_amount, 0)
  const deliveryRate = orders.length ? ((delivered.length / orders.length) * 100).toFixed(1) : '0'


  // Last 7 days data
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })

  const dailyData = last7.map(date => ({
    date,
    orders: orders.filter(o => o.created_at?.startsWith(date)).length,
    revenue: delivered
      .filter(o => o.created_at?.startsWith(date))
      .reduce((s, o) => s + o.total_amount, 0),
  }))

  const maxOrders = Math.max(...dailyData.map(d => d.orders), 1)
  const maxRevChart = Math.max(...dailyData.map(d => d.revenue), 1)

  const statsCards = [
    { label: 'Total Revenue', value: formatCurrency(totalRevenue), icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Total Orders', value: orders.length, icon: ShoppingCart, color: 'text-sky-400', bg: 'bg-sky-400/10' },
    { label: 'Delivered Orders', value: delivered.length, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10' },
    { label: 'Cancelled Orders', value: cancelled.length, icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
    { label: 'Active Suppliers', value: approvedSuppliers ?? 0, icon: Building2, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'Delivery Rate', value: `${deliveryRate}%`, icon: BarChart3, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
  ]

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Platform Analytics</h1>
        <p className="text-muted-foreground mt-1">JalSeva marketplace performance</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statsCards.map(s => (
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

      {/* Daily Orders Chart */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle style={{ fontFamily: 'Rajdhani, sans-serif' }}>Daily Orders — Last 7 Days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 h-40">
            {dailyData.map((d) => {
              const height = (d.orders / maxOrders) * 100
              const dayName = new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' })
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-muted-foreground">{d.orders > 0 ? d.orders : ''}</span>
                  <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                    <div
                      className="w-full rounded-t-lg transition-all duration-500"
                      style={{
                        height: `${Math.max(height, d.orders > 0 ? 8 : 2)}%`,
                        minHeight: d.orders > 0 ? '8px' : '2px',
                        background: d.orders > 0 ? 'linear-gradient(135deg, #0ea5e9, #06b6d4)' : 'hsl(var(--secondary))',
                        opacity: d.orders > 0 ? 1 : 0.3,
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{dayName}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Revenue Chart */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle style={{ fontFamily: 'Rajdhani, sans-serif' }}>Daily Revenue — Last 7 Days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 h-40">
            {dailyData.map((d) => {
              const height = (d.revenue / maxRevChart) * 100
              const dayName = new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' })
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-muted-foreground">
                    {d.revenue > 0 ? `₹${(d.revenue/1000).toFixed(0)}k` : ''}
                  </span>
                  <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                    <div
                      className="w-full rounded-t-lg transition-all duration-500"
                      style={{
                        height: `${Math.max(height, d.revenue > 0 ? 8 : 2)}%`,
                        minHeight: d.revenue > 0 ? '8px' : '2px',
                        background: d.revenue > 0 ? 'linear-gradient(135deg, #8b5cf6, #a78bfa)' : 'hsl(var(--secondary))',
                        opacity: d.revenue > 0 ? 1 : 0.3,
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{dayName}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Platform summary */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="glass-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="w-5 h-5 text-amber-400" />
              <h3 className="font-semibold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Supplier Stats</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Total Suppliers</span><span>{totalSuppliers}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Active/Approved</span><span className="text-green-400">{approvedSuppliers}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Inactive/Other</span><span className="text-red-400">{(totalSuppliers ?? 0) - (approvedSuppliers ?? 0)}</span></div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-5 h-5 text-sky-400" />
              <h3 className="font-semibold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Customer Stats</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Total Customers</span><span>{totalCustomers}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Active Orderers</span><span className="text-sky-400">{delivered.length > 0 ? new Set(delivered.map((o: any) => o.customer_id)).size : 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Avg Orders/Customer</span><span>{totalCustomers ? (orders.length / (totalCustomers || 1)).toFixed(1) : 0}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
