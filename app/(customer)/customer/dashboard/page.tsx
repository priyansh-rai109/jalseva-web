import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  ShoppingCart,
  Droplets,
  Building2,
  Package,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Truck,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateTime, getOrderStatusColor, getOrderStatusLabel } from '@/lib/utils'
import Link from 'next/link'

export const metadata = { title: 'My Dashboard' }

export default async function CustomerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: customer }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('customers').select('*').eq('user_id', user.id).maybeSingle(),
  ])

  const [
    { data: activeOrders },
    { data: recentOrders },
    { count: totalOrders },
    { count: deliveredOrders },
    { data: suppliers }
  ] = await Promise.all([
    supabase
      .from('orders')
      .select(`
        id, total_amount, status, quantity, created_at,
        suppliers(business_name),
        water_products(name, type)
      `)
      .eq('customer_id', customer?.id)
      .in('status', ['pending', 'confirmed', 'out_for_delivery'])
      .order('created_at', { ascending: false }),

    supabase
      .from('orders')
      .select(`
        id, total_amount, status, quantity, created_at,
        suppliers(business_name),
        water_products(name, type)
      `)
      .eq('customer_id', customer?.id)
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customer?.id),

    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customer?.id)
      .eq('status', 'delivered'),

    supabase
      .from('suppliers')
      .select('*, zones(name)')
      .eq('status', 'approved')
      .order('rating', { ascending: false })
      .limit(4)
  ])

  const statusIcon = (status: string) => {
    if (status === 'pending') return <Clock className="w-4 h-4 text-yellow-400" />
    if (status === 'confirmed') return <CheckCircle2 className="w-4 h-4 text-blue-400" />
    if (status === 'out_for_delivery') return <Truck className="w-4 h-4 text-purple-400" />
    return null
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Welcome, {profile?.name?.split(' ')[0] || 'there'}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">Your water delivery dashboard</p>
        </div>
        <Link href="/customer/browse">
          <Button className="water-shimmer text-white">
            <Droplets className="w-4 h-4 mr-2" />
            Order Water
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Orders', value: totalOrders ?? 0, icon: ShoppingCart, color: 'text-sky-400', bg: 'bg-sky-400/10' },
          { label: 'Delivered', value: deliveredOrders ?? 0, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10' },
          { label: 'Active Orders', value: activeOrders?.length ?? 0, icon: Truck, color: 'text-purple-400', bg: 'bg-purple-400/10' },
        ].map((stat) => (
          <Card key={stat.label} className="glass-card">
            <CardContent className="p-5">
              <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="text-2xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Orders */}
      {activeOrders && activeOrders.length > 0 && (
        <Card className="glass-card border-sky-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              <Truck className="w-5 h-5 text-sky-400" />
              Active Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeOrders.map((order: any) => (
              <Link
                key={order.id}
                href={`/customer/orders/${order.id}`}
                className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
              >
                {statusIcon(order.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{(order.water_products as any)?.name}</p>
                  <p className="text-xs text-muted-foreground">{(order.suppliers as any)?.business_name}</p>
                </div>
                <div className="text-right">
                  <Badge className={`text-xs border ${getOrderStatusColor(order.status)}`}>
                    {getOrderStatusLabel(order.status)}
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">{formatCurrency(order.total_amount)}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Featured Suppliers */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Suppliers Near You
          </h2>
          <Link href="/customer/browse" className="text-sm text-sky-400 hover:text-sky-300 flex items-center gap-1">
            Browse all <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {!suppliers || suppliers.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground text-sm">No suppliers available in your area yet</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {suppliers.map((supplier: any) => (
              <Link key={supplier.id} href={`/customer/supplier/${supplier.id}`}>
                <Card className="glass-card hover:border-sky-500/30 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl water-shimmer flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{supplier.business_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{supplier.address}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-amber-400 flex items-center gap-0.5">
                            ★ {supplier.rating?.toFixed(1) || '0.0'}
                          </span>
                          <span className="text-xs text-muted-foreground">{supplier.total_orders} orders</span>
                          {supplier.zones && (
                            <Badge className="text-xs bg-sky-500/10 text-sky-400 border-sky-500/20">
                              {(supplier.zones as any).name}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Orders */}
      {recentOrders && recentOrders.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Recent Orders</CardTitle>
            <Link href="/customer/orders" className="text-sm text-sky-400 hover:text-sky-300 flex items-center gap-1">
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentOrders.map((order: any) => (
              <div key={order.id} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{(order.water_products as any)?.name}</p>
                  <p className="text-xs text-muted-foreground">{(order.suppliers as any)?.business_name} · {formatDateTime(order.created_at)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-semibold">{formatCurrency(order.total_amount)}</div>
                  <Badge className={`mt-1 text-xs border ${getOrderStatusColor(order.status)}`}>
                    {getOrderStatusLabel(order.status)}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
