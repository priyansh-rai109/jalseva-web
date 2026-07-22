import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  ShoppingCart, Clock, CheckCircle2, Truck, XCircle, ArrowUpRight, Droplets, Search
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDateTime, getOrderStatusColor, getOrderStatusLabel } from '@/lib/utils'
import Link from 'next/link'

export const metadata = { title: 'All Orders — Admin' }

export default async function AdminOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin-login')

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id, total_amount, status, quantity, payment_mode, created_at,
      customers(name, phone),
      suppliers(business_name),
      water_products(name, type)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  // Status counts
  const statusCounts = {
    all: orders?.length || 0,
    pending: orders?.filter((o: any) => o.status === 'pending').length || 0,
    confirmed: orders?.filter((o: any) => o.status === 'confirmed').length || 0,
    out_for_delivery: orders?.filter((o: any) => o.status === 'out_for_delivery').length || 0,
    delivered: orders?.filter((o: any) => o.status === 'delivered').length || 0,
    cancelled: orders?.filter((o: any) => o.status === 'cancelled').length || 0,
  }

  const totalRevenue = orders
    ?.filter((o: any) => o.status === 'delivered')
    .reduce((sum: number, o: any) => sum + o.total_amount, 0) || 0


  const productTypeIcons: Record<string, string> = { tanker: '🚛', can: '🫙', pouch: '💧' }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>All Orders</h1>
        <p className="text-muted-foreground mt-1">Platform-wide order management</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: statusCounts.all, color: 'text-sky-400', bg: 'bg-sky-400/10', icon: ShoppingCart },
          { label: 'Pending', value: statusCounts.pending, color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: Clock },
          { label: 'Delivered', value: statusCounts.delivered, color: 'text-green-400', bg: 'bg-green-400/10', icon: CheckCircle2 },
          { label: 'Total Revenue', value: formatCurrency(totalRevenue), color: 'text-purple-400', bg: 'bg-purple-400/10', icon: ArrowUpRight },
        ].map(s => (
          <Card key={s.label} className="glass-card">
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

      {/* Orders Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle style={{ fontFamily: 'Rajdhani, sans-serif' }}>Order History</CardTitle>
        </CardHeader>
        <CardContent>
          {!orders || orders.length === 0 ? (
            <div className="text-center py-12">
              <Droplets className="w-10 h-10 mx-auto text-muted-foreground opacity-20 mb-3" />
              <p className="text-muted-foreground text-sm">No orders yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order: any) => (
                <div key={order.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                  <div className="text-2xl">{productTypeIcons[(order.water_products as any)?.type] || '💧'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{(order.customers as any)?.name}</p>
                      <span className="text-muted-foreground text-xs">→</span>
                      <p className="text-xs text-muted-foreground truncate">{(order.suppliers as any)?.business_name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{(order.water_products as any)?.name} × {order.quantity}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(order.created_at)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold">{formatCurrency(order.total_amount)}</div>
                    <Badge className={`mt-1 text-xs border ${getOrderStatusColor(order.status)}`}>
                      {getOrderStatusLabel(order.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
