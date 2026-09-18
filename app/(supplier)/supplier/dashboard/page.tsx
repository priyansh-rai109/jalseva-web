import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
  XCircle,
  MapPin,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateTime, getOrderStatusColor, getOrderStatusLabel, formatDisplayName, isPlaceholderName, resolveRealName } from '@/lib/utils'
import Link from 'next/link'

import { getSupplierForUser } from '@/lib/supabase/supplier-helper'

export const metadata = { title: 'Supplier Dashboard' }
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SupplierDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminSupabase = createAdminClient()
  const emailDigits = user.email ? (user.email.match(/\d{10}/)?.[0] || '') : ''
  const rawPhone = user.phone || user.user_metadata?.phone || emailDigits
  let digits = rawPhone ? rawPhone.replace(/\D/g, '').slice(-10) : ''
  let phoneToUse = digits ? `+91${digits}` : rawPhone

  // 1. Fetch Profile by ID or by Phone
  let { data: profile } = await adminSupabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile && digits) {
    const { data: pByPhone } = await adminSupabase
      .from('profiles')
      .select('*')
      .or(`phone.eq.+91${digits},phone.eq.${digits},phone.ilike.%${digits}%`)
      .maybeSingle()
    if (pByPhone) profile = pByPhone
  }

  if (profile?.phone && !digits) {
    digits = profile.phone.replace(/\D/g, '').slice(-10)
    phoneToUse = `+91${digits}`
  }

  const rawSupplier = await getSupplierForUser(user)

  // 2. Resolve registered owner/personal name
  let authAdminName: string | null = null
  if (user.id && !user.id.startsWith('00000000-0000-')) {
    try {
      const { data: authUser } = await adminSupabase.auth.admin.getUserById(user.id)
      authAdminName = authUser?.user?.user_metadata?.name || authUser?.user?.user_metadata?.full_name || null
    } catch {}
  }

  const realRegisteredName = resolveRealName([
    rawSupplier?.business_name,
    rawSupplier?.owner_name,
    profile?.name,
    user.user_metadata?.name,
    user.user_metadata?.full_name,
    authAdminName,
  ]) || 'Supplier'

  const displayName = formatDisplayName(realRegisteredName, null, 'supplier')

  const businessName = rawSupplier?.business_name && !isPlaceholderName(rawSupplier.business_name)
    ? rawSupplier.business_name
    : ''

  const supplier = rawSupplier || {
    id: user.id,
    user_id: user.id,
    business_name: businessName || `${displayName}'s Water Supply`,
    owner_name: displayName,
    status: 'pending',
    rating: 0.0,
    address: 'Address Pending'
  }

  // Get orders and metrics in parallel
  const [
    { data: recentOrders },
    { count: pendingCount },
    { count: todayDelivered },
    { count: totalOrders },
    { count: productCount },
    { count: reviewCount }
  ] = await Promise.all([
    adminSupabase
      .from('orders')
      .select(`
        id, total_amount, status, quantity, created_at,
        customers(name, phone),
        water_products(name, type)
      `)
      .eq('supplier_id', supplier.id)
      .order('created_at', { ascending: false })
      .limit(6),

    adminSupabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_id', supplier.id)
      .eq('status', 'pending'),

    adminSupabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_id', supplier.id)
      .eq('status', 'delivered'),

    adminSupabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_id', supplier.id),

    adminSupabase
      .from('water_products')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_id', supplier.id)
      .eq('is_active', true),

    adminSupabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_id', supplier.id)
  ])

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
    <div className="space-y-5 sm:space-y-8">
      {/* Header with Grouped Supplier Identity, Status Badge, and Rating */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              Hey {displayName} 👋
            </h1>
            <Badge className={
              supplier.status === 'approved'
                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                : supplier.status === 'pending'
                ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            }>
              {supplier.status === 'approved' ? '✓ Approved' : supplier.status === 'pending' ? '⏳ Pending Approval' : '✗ Suspended'}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs sm:text-sm text-muted-foreground">
            {businessName && <span className="font-semibold text-foreground">{businessName}</span>}
            {businessName && <span>•</span>}
            <span>Supplier Dashboard</span>
            <span>•</span>
            <Link href="/supplier/reviews" className="inline-flex items-center gap-1 font-semibold text-amber-400 hover:underline">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span>{supplier.rating?.toFixed(1) || '0.0'} rating</span>
              <span className="text-muted-foreground font-normal">({reviewCount ?? 0} {reviewCount === 1 ? 'review' : 'reviews'})</span>
            </Link>
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

      {/* Main Content Grid: Recent Orders (2 cols) + Quick Actions (1 col) to eliminate wide horizontal gaps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Recent Orders - comfortable reading width for fast scanning */}
        <div className="lg:col-span-2">
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
                      className="flex items-center gap-4 p-3.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-sky-500/10 flex items-center justify-center flex-shrink-0">
                        <Truck className="w-4 h-4 text-sky-400" />
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-sm font-medium truncate">{(order.customers as any)?.name || 'Customer'}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {(order.water_products as any)?.name} × {order.quantity}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(order.created_at)}</p>
                      </div>
                      <div className="text-right flex-shrink-0 border-l border-border/40 pl-3">
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
        </div>

        {/* Quick Actions Sidebar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              Quick Actions
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
            {[
              { icon: Package, label: 'Add New Product', desc: 'Create & list fresh inventory', href: '/supplier/products/new', color: 'text-sky-400' },
              { icon: TrendingUp, label: 'View Analytics', desc: 'Inspect revenue and sales trends', href: '/supplier/analytics', color: 'text-green-400' },
              { icon: Star, label: 'Customer Reviews', desc: 'Read feedback and service ratings', href: '/supplier/reviews', color: 'text-amber-400' },
            ].map((action) => (
              <Link key={action.label} href={action.href}>
                <div className="glass-card p-4 hover:border-sky-500/30 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <action.icon className={`w-5 h-5 ${action.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{action.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{action.desc}</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
