import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  Building2,
  Users,
  ShoppingCart,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  Droplets,
  MapPin,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDateTime, getOrderStatusColor, getOrderStatusLabel } from '@/lib/utils'
import Link from 'next/link'

export const metadata = { title: 'Admin Dashboard' }

async function getStats(supabase: Awaited<ReturnType<typeof createClient>>) {
  const [
    { count: totalSuppliers },
    { count: pendingSuppliers },
    { count: totalCustomers },
    { count: totalOrders },
    { data: recentOrders },
  ] = await Promise.all([
    supabase.from('suppliers').select('*', { count: 'exact', head: true }),
    supabase.from('suppliers').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('customers').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select(`
      id, total_amount, status, created_at,
      customers(name),
      suppliers(business_name),
      water_products(name)
    `).order('created_at', { ascending: false }).limit(5),
  ])

  return { totalSuppliers, pendingSuppliers, totalCustomers, totalOrders, recentOrders }
}

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin-login')

  const { totalSuppliers, pendingSuppliers, totalCustomers, totalOrders, recentOrders } = await getStats(supabase)

  const statCards = [
    {
      title: 'Total Suppliers',
      value: totalSuppliers ?? 0,
      icon: Building2,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      href: '/admin/suppliers',
      sub: `${pendingSuppliers ?? 0} pending approval`,
    },
    {
      title: 'Total Customers',
      value: totalCustomers ?? 0,
      icon: Users,
      color: 'text-sky-400',
      bg: 'bg-sky-400/10',
      href: '/admin/customers',
      sub: 'Registered users',
    },
    {
      title: 'Total Orders',
      value: totalOrders ?? 0,
      icon: ShoppingCart,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
      href: '/admin/orders',
      sub: 'All time',
    },
    {
      title: 'Platform Revenue',
      value: '₹—',
      icon: TrendingUp,
      color: 'text-green-400',
      bg: 'bg-green-400/10',
      href: '/admin/analytics',
      sub: 'View analytics',
    },
  ]

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">Platform overview — JalSeva Jodhpur</p>
      </div>

      {/* Pending supplier alert */}
      {(pendingSuppliers ?? 0) > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-300">
              {pendingSuppliers} supplier{(pendingSuppliers ?? 0) > 1 ? 's' : ''} waiting for approval
            </p>
            <p className="text-xs text-amber-400/70">Review and approve new supplier applications</p>
          </div>
          <Link href="/admin/suppliers" className="text-xs font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1">
            Review <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Link href={stat.href} key={stat.title}>
            <Card className="glass-card hover:border-sky-500/30 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                  </div>
                  <div className="text-sm font-medium mt-0.5">{stat.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.sub}</div>
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
          <Link href="/admin/orders" className="text-sm text-sky-400 hover:text-sky-300 flex items-center gap-1">
            View all <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          {!recentOrders || recentOrders.length === 0 ? (
            <div className="text-center py-10">
              <Droplets className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="text-muted-foreground text-sm">No orders yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order: any) => (
                <div
                  key={order.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {(order.customers as any)?.name || 'Customer'} → {(order.suppliers as any)?.business_name || 'Supplier'}
                    </p>
                    <p className="text-xs text-muted-foreground">{(order.water_products as any)?.name}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(order.created_at)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-semibold">{formatCurrency(order.total_amount)}</div>
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

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: CheckCircle2, label: 'Approve Suppliers', href: '/admin/suppliers', color: 'text-green-400' },
          { icon: MapPin, label: 'Manage Zones', href: '/admin/zones', color: 'text-sky-400' },
          { icon: XCircle, label: 'Suspended Accounts', href: '/admin/suppliers?status=suspended', color: 'text-red-400' },
          { icon: Clock, label: 'Analytics', href: '/admin/analytics', color: 'text-purple-400' },
        ].map((action) => (
          <Link key={action.label} href={action.href}>
            <div className="glass-card p-4 hover:border-sky-500/30 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer">
              <action.icon className={`w-5 h-5 ${action.color} mb-2`} />
              <p className="text-xs font-medium">{action.label}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}


