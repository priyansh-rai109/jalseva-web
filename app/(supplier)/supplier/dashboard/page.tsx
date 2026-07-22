import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  ShoppingCart,
  Package,
  TrendingUp,
  Star,
  ArrowUpRight,
  Droplets,
  Clock,
  CheckCircle2,
  Truck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDateTime, getOrderStatusColor, getOrderStatusLabel } from '@/lib/utils'
import Link from 'next/link'

export const metadata = { title: 'Supplier Dashboard' }

export default async function SupplierDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get supplier record
  const { data: rawSupplier } = await supabase
    .from('suppliers')
    .select('*, zones(name)')
    .eq('user_id', user.id)
    .maybeSingle()

  const supplier = rawSupplier || {
    id: user.id,
    user_id: user.id,
    business_name: user.user_metadata?.name || 'Water Supplier',
    status: 'pending',
    rating: 0.0,
    address: 'Address Pending'
  }

  // Get orders
  const { data: recentOrders } = await supabase
    .from('orders')
    .select(`
      id, total_amount, status, quantity, created_at,
      customers(name, phone),
      water_products(name, type)
    `)
    .eq('supplier_id', supplier.id)
    .order('created_at', { ascending: false })
    .limit(6)

  const { count: pendingCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('supplier_id', supplier.id)
    .eq('status', 'pending')

  const { count: todayDelivered } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('supplier_id', supplier.id)
    .eq('status', 'delivered')
    .gte('created_at', new Date().toISOString().split('T')[0])

  const { count: totalOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('supplier_id', supplier.id)

  const { count: productCount } = await supabase
    .from('water_products')
    .select('*', { count: 'exact', head: true })
    .eq('supplier_id', supplier.id)
    .eq('is_active', true)

  const statCards = [
    {
      title: 'Pending Orders',
      value: pendingCount ?? 0,
      icon: Clock,
      color: 'text-yellow-400',
      bg: 'bg-yellow-400/10',
      href: '/supplier/orders?status=pending',
      urgent: (pendingCount ?? 0) > 0,
    },
    {
      title: 'Delivered Today',
      value: todayDelivered ?? 0,
      icon: CheckCircle2,
      color: 'text-green-400',
      bg: 'bg-green-400/10',
      href: '/supplier/orders',
    },
    {
      title: 'Total Orders',
      value: totalOrders ?? 0,
      icon: ShoppingCart,
      color: 'text-sky-400',
      bg: 'bg-sky-400/10',
      href: '/supplier/orders',
    },
    {
      title: 'Active Products',
      value: productCount ?? 0,
      icon: Package,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
      href: '/supplier/products',
    },
  ]

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {supplier.business_name}
          </h1>
          <p className="text-muted-foreground mt-1">Supplier Dashboard</p>
        </div>
        <div className="text-right">
          <Badge className={
            supplier.status === 'approved'
              ? 'bg-green-500/10 text-green-400 border-green-500/20'
              : supplier.status === 'pending'
              ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/20'
          }>
            {supplier.status === 'approved' ? '✓ Approved' : supplier.status === 'pending' ? '⏳ Pending Approval' : '✗ Suspended'}
          </Badge>
          <div className="flex items-center gap-1 mt-2 text-sm text-amber-400 justify-end">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span>{supplier.rating?.toFixed(1) || '0.0'} rating</span>
          </div>
        </div>
      </div>

      {/* Pending approval warning */}
      {supplier.status === 'pending' && (
        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <p className="text-sm text-yellow-300 font-medium">⏳ Your account is pending admin approval</p>
          <p className="text-xs text-yellow-400/70 mt-1">
            You can set up your products now. Orders will start once you&apos;re approved.
          </p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Link href={stat.href || '#'} key={stat.title}>
            <Card className={`glass-card hover:border-sky-500/30 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer ${stat.urgent ? 'border-yellow-500/30 animate-pulse-blue' : ''}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    {stat.value.toLocaleString()}
                  </div>
                  <div className="text-sm font-medium mt-0.5">{stat.title}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Orders */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Recent Orders
          </CardTitle>
          <Link href="/supplier/orders" className="text-sm text-sky-400 hover:text-sky-300 flex items-center gap-1">
            View all <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          {!recentOrders || recentOrders.length === 0 ? (
            <div className="text-center py-10">
              <Droplets className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="text-muted-foreground text-sm">No orders yet</p>
              <p className="text-xs text-muted-foreground mt-1">Orders will appear here once customers place them</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order: any) => (
                <Link
                  key={order.id}
                  href={`/supplier/orders/${order.id}`}
                  className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-sky-500/10 flex items-center justify-center flex-shrink-0">
                    <Truck className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{(order.customers as any)?.name || 'Customer'}</p>
                    <p className="text-xs text-muted-foreground">
                      {(order.water_products as any)?.name} × {order.quantity}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(order.created_at)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-semibold">{formatCurrency(order.total_amount)}</div>
                    <Badge className={`mt-1 text-xs border ${getOrderStatusColor(order.status)}`}>
                      {getOrderStatusLabel(order.status)}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { icon: Package, label: 'Add New Product', href: '/supplier/products/new', color: 'text-sky-400' },
          { icon: TrendingUp, label: 'View Analytics', href: '/supplier/analytics', color: 'text-green-400' },
          { icon: Star, label: 'Customer Reviews', href: '/supplier/reviews', color: 'text-amber-400' },
        ].map((action) => (
          <Link key={action.label} href={action.href}>
            <div className="glass-card p-4 hover:border-sky-500/30 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex items-center gap-3">
              <action.icon className={`w-5 h-5 ${action.color}`} />
              <p className="text-sm font-medium">{action.label}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
