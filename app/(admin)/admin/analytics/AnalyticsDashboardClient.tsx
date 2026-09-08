'use client'

import React, { useState, useMemo } from 'react'
import {
  TrendingUp,
  ShoppingCart,
  Building2,
  Users,
  CheckCircle2,
  XCircle,
  BarChart3,
  Calendar,
  Layers,
  ArrowUpRight,
  Droplets,
  CreditCard,
  Percent,
  Clock,
  Sparkles,
  Info,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AnimatedCounter } from '@/components/shared/AnimatedCounter'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { formatCurrency } from '@/lib/utils'

interface OrderItem {
  id: string
  status: string
  total_amount: number
  quantity?: number
  payment_mode?: string
  payment_status?: string
  created_at: string
  customer_id?: string
  supplier_id?: string
}

interface SupplierItem {
  id: string
  business_name?: string
  owner_name?: string
  status?: string
  rating?: number
  total_orders?: number
}

interface AnalyticsDashboardClientProps {
  orders: OrderItem[]
  suppliers: SupplierItem[]
  totalSuppliers: number
  approvedSuppliers: number
  totalCustomers: number
}

type TimeRange = 'all' | '30d' | '7d' | 'monthly'
type MetricType = 'orders' | 'revenue'
type ChartStyle = 'bar' | 'area'

export default function AnalyticsDashboardClient({
  orders = [],
  suppliers = [],
  totalSuppliers = 0,
  approvedSuppliers = 0,
  totalCustomers = 0,
}: AnalyticsDashboardClientProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('all')
  const [activeMetric, setActiveMetric] = useState<MetricType>('orders')
  const [chartStyle, setChartStyle] = useState<ChartStyle>('bar')
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Overall platform aggregations
  const deliveredOrders = useMemo(() => orders.filter(o => o.status === 'delivered'), [orders])
  const cancelledOrders = useMemo(() => orders.filter(o => o.status === 'cancelled'), [orders])
  const pendingOrders = useMemo(() => orders.filter(o => ['pending', 'confirmed', 'in_transit', 'assigned'].includes(o.status)), [orders])
  
  const totalRevenue = useMemo(
    () => deliveredOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
    [deliveredOrders]
  )

  const deliveryRate = orders.length > 0 ? ((deliveredOrders.length / orders.length) * 100).toFixed(1) : '0'
  const cancellationRate = orders.length > 0 ? ((cancelledOrders.length / orders.length) * 100).toFixed(1) : '0'
  const avgOrderValue = deliveredOrders.length > 0 ? Math.round(totalRevenue / deliveredOrders.length) : 0
  const totalLiters = useMemo(
    () => deliveredOrders.reduce((sum, o) => sum + (Number(o.quantity || 1) * 20), 0),
    [deliveredOrders]
  )

  // Time-filtered chart series generator
  const chartData = useMemo(() => {
    if (orders.length === 0) return []

    // 1. Monthly grouping
    if (timeRange === 'monthly') {
      const monthMap = new Map<string, { label: string; orders: number; delivered: number; cancelled: number; revenue: number }>()

      // Sort chronological
      const sorted = [...orders].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      sorted.forEach(o => {
        if (!o.created_at) return
        const d = new Date(o.created_at)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const label = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })

        const current = monthMap.get(key) || { label, orders: 0, delivered: 0, cancelled: 0, revenue: 0 }
        current.orders += 1
        if (o.status === 'delivered') {
          current.delivered += 1
          current.revenue += Number(o.total_amount || 0)
        } else if (o.status === 'cancelled') {
          current.cancelled += 1
        }
        monthMap.set(key, current)
      })

      return Array.from(monthMap.entries()).map(([key, val]) => ({
        dateKey: key,
        displayLabel: val.label,
        subLabel: `${val.orders} total`,
        orders: val.orders,
        delivered: val.delivered,
        cancelled: val.cancelled,
        revenue: val.revenue,
      }))
    }

    // 2. Last 7 Days (relative to today)
    if (timeRange === '7d') {
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (6 - i))
        return d.toISOString().split('T')[0]
      })

      return days.map(dayStr => {
        const d = new Date(dayStr)
        const dayOrders = orders.filter(o => o.created_at?.startsWith(dayStr))
        const dayDelivered = dayOrders.filter(o => o.status === 'delivered')
        const dayCancelled = dayOrders.filter(o => o.status === 'cancelled')
        const dayRevenue = dayDelivered.reduce((s, o) => s + Number(o.total_amount || 0), 0)

        return {
          dateKey: dayStr,
          displayLabel: d.toLocaleDateString('en-IN', { weekday: 'short' }),
          subLabel: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          orders: dayOrders.length,
          delivered: dayDelivered.length,
          cancelled: dayCancelled.length,
          revenue: dayRevenue,
        }
      })
    }

    // 3. Last 30 Days
    if (timeRange === '30d') {
      const days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (29 - i))
        return d.toISOString().split('T')[0]
      })

      return days.map(dayStr => {
        const d = new Date(dayStr)
        const dayOrders = orders.filter(o => o.created_at?.startsWith(dayStr))
        const dayDelivered = dayOrders.filter(o => o.status === 'delivered')
        const dayCancelled = dayOrders.filter(o => o.status === 'cancelled')
        const dayRevenue = dayDelivered.reduce((s, o) => s + Number(o.total_amount || 0), 0)

        return {
          dateKey: dayStr,
          displayLabel: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          subLabel: d.toLocaleDateString('en-IN', { weekday: 'short' }),
          orders: dayOrders.length,
          delivered: dayDelivered.length,
          cancelled: dayCancelled.length,
          revenue: dayRevenue,
        }
      })
    }

    // 4. All Time (Default — Groups across all active dates in order history)
    const dateMap = new Map<string, { orders: number; delivered: number; cancelled: number; revenue: number }>()
    const sorted = [...orders].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    sorted.forEach(o => {
      if (!o.created_at) return
      const dayStr = o.created_at.split('T')[0]
      const current = dateMap.get(dayStr) || { orders: 0, delivered: 0, cancelled: 0, revenue: 0 }
      current.orders += 1
      if (o.status === 'delivered') {
        current.delivered += 1
        current.revenue += Number(o.total_amount || 0)
      } else if (o.status === 'cancelled') {
        current.cancelled += 1
      }
      dateMap.set(dayStr, current)
    })

    return Array.from(dateMap.entries()).map(([dayStr, val]) => {
      const d = new Date(dayStr)
      return {
        dateKey: dayStr,
        displayLabel: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        subLabel: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        orders: val.orders,
        delivered: val.delivered,
        cancelled: val.cancelled,
        revenue: val.revenue,
      }
    })
  }, [orders, timeRange])

  // Highest values for chart scaling
  const maxOrders = useMemo(() => Math.max(...chartData.map(d => d.orders), 1), [chartData])
  const maxRevenue = useMemo(() => Math.max(...chartData.map(d => d.revenue), 1), [chartData])
  const totalChartOrders = useMemo(() => chartData.reduce((s, d) => s + d.orders, 0), [chartData])
  const totalChartRevenue = useMemo(() => chartData.reduce((s, d) => s + d.revenue, 0), [chartData])

  // Peak day computation
  const peakDay = useMemo(() => {
    if (chartData.length === 0) return null
    return [...chartData].sort((a, b) => (activeMetric === 'orders' ? b.orders - a.orders : b.revenue - a.revenue))[0]
  }, [chartData, activeMetric])

  // Payment Breakdown
  const paymentStats = useMemo(() => {
    let cod = 0
    let online = 0
    orders.forEach(o => {
      if ((o.payment_mode || '').toLowerCase().includes('cash') || (o.payment_mode || '').toLowerCase().includes('cod')) {
        cod++
      } else {
        online++
      }
    })
    return { cod, online }
  }, [orders])

  const statsCards = [
    {
      label: 'Total Platform Revenue',
      value: totalRevenue,
      isCurrency: true,
      icon: TrendingUp,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      sub: `${deliveredOrders.length} fulfilled orders`,
    },
    {
      label: 'Total Orders Placed',
      value: orders.length,
      isCurrency: false,
      icon: ShoppingCart,
      color: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/20',
      sub: 'All recorded bookings',
    },
    {
      label: 'Delivered Orders',
      value: deliveredOrders.length,
      isCurrency: false,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      sub: `${deliveryRate}% success rate`,
    },
    {
      label: 'Average Order Value (AOV)',
      value: avgOrderValue,
      isCurrency: true,
      icon: BarChart3,
      color: 'text-cyan-600 dark:text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      sub: 'Per delivered transaction',
    },
    {
      label: 'Active Water Suppliers',
      value: approvedSuppliers,
      isCurrency: false,
      icon: Building2,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      sub: `${totalSuppliers} registered suppliers`,
    },
    {
      label: 'Cancelled / Rejected',
      value: cancelledOrders.length,
      isCurrency: false,
      icon: XCircle,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      sub: `${cancellationRate}% cancellation rate`,
    },
  ]

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in-50 duration-300">
      {/* ── Top Header with Actions ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                Platform Analytics
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Live marketplace performance metrics, revenue analytics, and order trends
              </p>
            </div>
          </div>
        </div>

        {/* Global Filter Bar + Theme Switcher */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <ThemeToggle variant="compact" />
          <div className="flex flex-wrap items-center gap-1 bg-secondary p-1 rounded-xl border border-border">
            <Button
              variant={timeRange === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeRange('all')}
              className={`text-xs h-8 px-3 rounded-lg font-semibold transition-all ${
                timeRange === 'all' ? 'bg-sky-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles className="w-3 h-3 mr-1.5" />
              All Active History
            </Button>
          <Button
            variant={timeRange === 'monthly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTimeRange('monthly')}
            className={`text-xs h-8 px-3 rounded-lg font-semibold transition-all ${
              timeRange === 'monthly' ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Monthly
          </Button>
          <Button
            variant={timeRange === '30d' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTimeRange('30d')}
            className={`text-xs h-8 px-3 rounded-lg font-semibold transition-all ${
              timeRange === '30d' ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Last 30 Days
          </Button>
          <Button
            variant={timeRange === '7d' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTimeRange('7d')}
            className={`text-xs h-8 px-3 rounded-lg font-semibold transition-all ${
              timeRange === '7d' ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Last 7 Days
          </Button>
        </div>
      </div>
    </div>

      {/* Notice banner if 7d or 30d has 0 data */}
      {chartData.length > 0 && totalChartOrders === 0 && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              चुने गए समय सीमा ({timeRange === '7d' ? 'पिछले 7 दिन' : 'पिछले 30 दिन'}) में कोई नया ऑर्डर नहीं है। ऐतिहासिक रिकॉर्ड्स देखने के लिए
              <strong> &quot;All Active History&quot;</strong> चुनें।
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setTimeRange('all')}
            className="text-xs h-7 border-amber-400/40 text-amber-300 hover:bg-amber-400/10"
          >
            All Active History
          </Button>
        </div>
      )}

      {/* ── 1. KPI Top Summary Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {statsCards.map((s, idx) => (
          <Card
            key={s.label}
            className={`glass-card hover:border-sky-500/40 hover:-translate-y-0.5 transition-all duration-300 ${s.border}`}
          >
            <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>
                    <s.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${s.color}`} />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground/60">#0{idx + 1}</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  <AnimatedCounter
                    value={s.value}
                    prefix={s.isCurrency ? '₹' : ''}
                    decimals={0}
                  />
                </div>
                <div className="text-xs font-medium text-muted-foreground mt-0.5 line-clamp-1">{s.label}</div>
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground/80 pt-2 border-t border-sky-500/10 mt-3">
                {s.sub}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── 2. Primary Interactive Graph Card ───────────────────────────────── */}
      <Card className="glass-card border-sky-500/20 overflow-hidden shadow-xl shadow-sky-500/5">
        <CardHeader className="p-4 sm:p-6 pb-2 border-b border-sky-500/10 bg-secondary/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg sm:text-xl font-bold text-foreground" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  {activeMetric === 'orders' ? '📊 Order Volume & Delivery Trajectory' : '💰 Revenue & Transaction Trajectory'}
                </CardTitle>
                <Badge variant="outline" className="text-[10px] border-sky-500/30 text-sky-400 bg-sky-500/10">
                  {timeRange === 'all'
                    ? 'All Time Activity'
                    : timeRange === 'monthly'
                    ? 'Monthly Aggregates'
                    : timeRange === '30d'
                    ? '30-Day Window'
                    : '7-Day Window'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeMetric === 'orders'
                  ? `Showing ${totalChartOrders} total orders placed across selected period`
                  : `Showing ${formatCurrency(totalChartRevenue)} delivered revenue across selected period`}
              </p>
            </div>

            {/* Metric Switcher & Chart Style Switcher */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="flex items-center bg-background/80 p-0.5 rounded-lg border border-sky-500/20">
                <button
                  type="button"
                  onClick={() => setActiveMetric('orders')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    activeMetric === 'orders'
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Orders
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMetric('revenue')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    activeMetric === 'revenue'
                      ? 'bg-purple-500 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Revenue (₹)
                </button>
              </div>

              <div className="hidden sm:flex items-center bg-background/80 p-0.5 rounded-lg border border-sky-500/20">
                <button
                  type="button"
                  onClick={() => setChartStyle('bar')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    chartStyle === 'bar' ? 'bg-secondary text-foreground' : 'text-muted-foreground'
                  }`}
                  title="Bar View"
                >
                  Bars
                </button>
                <button
                  type="button"
                  onClick={() => setChartStyle('area')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    chartStyle === 'area' ? 'bg-secondary text-foreground' : 'text-muted-foreground'
                  }`}
                  title="Area Trendline View"
                >
                  Area
                </button>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar Under Chart Title */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
              <span className="text-muted-foreground">Total In Period:</span>
              <span className="font-bold text-foreground">
                {activeMetric === 'orders' ? `${totalChartOrders} Orders` : formatCurrency(totalChartRevenue)}
              </span>
            </div>

            {peakDay && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" />
                <span className="text-muted-foreground">Peak Day:</span>
                <span className="font-bold text-foreground">
                  {peakDay.displayLabel} (
                  {activeMetric === 'orders' ? `${peakDay.orders} orders` : formatCurrency(peakDay.revenue)})
                </span>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
              <span className="text-muted-foreground">Daily Average:</span>
              <span className="font-bold text-foreground">
                {chartData.length > 0
                  ? activeMetric === 'orders'
                    ? `${(totalChartOrders / chartData.length).toFixed(1)} / day`
                    : `${formatCurrency(Math.round(totalChartRevenue / chartData.length))} / day`
                  : '0'}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {/* Main Visual Chart Canvas */}
          {chartData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-sky-500/20 rounded-xl">
              <BarChart3 className="w-10 h-10 text-muted-foreground/40 mb-2 animate-bounce" />
              <p className="text-sm font-semibold text-foreground">No data points found for this range</p>
              <p className="text-xs text-muted-foreground mt-1">Try switching to &quot;All Active History&quot; to view all transactions.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Relative Y-Axis Labels & Grid Container */}
              <div className="relative h-64 sm:h-72 w-full pt-6 pb-2">
                {/* Horizontal Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                  <div className="border-b border-sky-400 border-dashed w-full" />
                  <div className="border-b border-sky-400 border-dashed w-full" />
                  <div className="border-b border-sky-400 border-dashed w-full" />
                  <div className="border-b border-sky-400 border-dashed w-full" />
                </div>

                {/* Y-axis indicator tags on right */}
                <div className="absolute right-0 top-0 text-[10px] font-mono text-muted-foreground/60 pr-1">
                  {activeMetric === 'orders' ? `Max: ${maxOrders}` : `Max: ${formatCurrency(maxRevenue)}`}
                </div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground/60 pr-1">
                  {activeMetric === 'orders' ? `Mid: ${Math.round(maxOrders / 2)}` : `Mid: ${formatCurrency(Math.round(maxRevenue / 2))}`}
                </div>
                <div className="absolute right-0 bottom-6 text-[10px] font-mono text-muted-foreground/60 pr-1">
                  0
                </div>

                {/* Bars or SVG Area visualization */}
                {chartStyle === 'bar' ? (
                  <div className="h-full flex items-end gap-2 sm:gap-3 px-2 sm:px-4">
                    {chartData.map((d, i) => {
                      const val = activeMetric === 'orders' ? d.orders : d.revenue
                      const maxVal = activeMetric === 'orders' ? maxOrders : maxRevenue
                      const pct = maxVal > 0 ? (val / maxVal) * 100 : 0
                      const isHovered = hoveredIndex === i

                      return (
                        <div
                          key={d.dateKey}
                          onMouseEnter={() => setHoveredIndex(i)}
                          onMouseLeave={() => setHoveredIndex(null)}
                          className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                        >
                          {/* Floating Tooltip Card */}
                          {isHovered && (
                            <div className="absolute -top-16 z-30 pointer-events-none bg-slate-900/95 backdrop-blur-md border border-sky-400/40 px-3 py-1.5 rounded-lg shadow-xl shadow-black/50 text-center min-w-[130px] animate-in fade-in-50 zoom-in-95">
                              <div className="text-[11px] font-semibold text-sky-400">{d.displayLabel}</div>
                              <div className="text-xs font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                                {activeMetric === 'orders' ? `${d.orders} Orders` : formatCurrency(d.revenue)}
                              </div>
                              <div className="text-[10px] text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
                                <span>{d.delivered} Delivered</span>
                                {d.cancelled > 0 && <span className="text-rose-400">• {d.cancelled} Cancelled</span>}
                              </div>
                            </div>
                          )}

                          {/* Data Value Badge Above Bar */}
                          <div
                            className={`text-[10px] font-bold mb-1 transition-all ${
                              val > 0 ? (isHovered ? 'text-sky-300 scale-110' : 'text-muted-foreground') : 'opacity-0'
                            }`}
                          >
                            {activeMetric === 'orders' ? val : `₹${val}`}
                          </div>

                          {/* Interactive Bar Element */}
                          <div className="w-full max-w-[48px] h-full flex items-end justify-center">
                            <div
                              className={`w-full rounded-t-lg transition-all duration-300 relative ${
                                isHovered ? 'brightness-125 shadow-lg shadow-sky-500/40 scale-x-105' : ''
                              }`}
                              style={{
                                height: `${Math.max(pct, val > 0 ? 8 : 3)}%`,
                                minHeight: val > 0 ? '12px' : '3px',
                                background:
                                  val > 0
                                    ? activeMetric === 'orders'
                                      ? 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)'
                                      : 'linear-gradient(180deg, #c084fc 0%, #7c3aed 100%)'
                                    : 'hsl(var(--secondary))',
                                opacity: val > 0 ? 1 : 0.25,
                              }}
                            >
                              {/* Inner Glass Highlight */}
                              {val > 0 && (
                                <div className="absolute inset-x-0 top-0 h-1.5 bg-white/40 rounded-t-lg" />
                              )}
                            </div>
                          </div>

                          {/* X-Axis Date Tag */}
                          <div className="text-center mt-2">
                            <span
                              className={`text-[11px] font-semibold block transition-colors ${
                                isHovered ? 'text-sky-400 font-bold' : 'text-muted-foreground'
                              }`}
                            >
                              {d.displayLabel}
                            </span>
                            <span className="text-[9px] text-muted-foreground/60 block -mt-0.5">
                              {d.subLabel}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  /* Smooth SVG Area Chart */
                  <div className="h-full w-full flex flex-col justify-end px-2">
                    <svg className="w-full h-[180px] overflow-visible" viewBox="0 0 1000 200" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={activeMetric === 'orders' ? '#0ea5e9' : '#8b5cf6'} stopOpacity="0.4" />
                          <stop offset="100%" stopColor={activeMetric === 'orders' ? '#0ea5e9' : '#8b5cf6'} stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Area Fill */}
                      {chartData.length > 1 && (
                        <polygon
                          fill="url(#areaGradient)"
                          points={`
                            0,200
                            ${chartData
                              .map((d, idx) => {
                                const val = activeMetric === 'orders' ? d.orders : d.revenue
                                const maxVal = activeMetric === 'orders' ? maxOrders : maxRevenue
                                const x = (idx / (chartData.length - 1)) * 1000
                                const y = 190 - (val / (maxVal || 1)) * 170
                                return `${x},${y}`
                              })
                              .join(' ')}
                            1000,200
                          `}
                        />
                      )}

                      {/* Polyline Curve */}
                      {chartData.length > 1 && (
                        <polyline
                          fill="none"
                          stroke={activeMetric === 'orders' ? '#38bdf8' : '#c084fc'}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={chartData
                            .map((d, idx) => {
                              const val = activeMetric === 'orders' ? d.orders : d.revenue
                              const maxVal = activeMetric === 'orders' ? maxOrders : maxRevenue
                              const x = (idx / (chartData.length - 1)) * 1000
                              const y = 190 - (val / (maxVal || 1)) * 170
                              return `${x},${y}`
                            })
                            .join(' ')}
                        />
                      )}

                      {/* Data Point Circles */}
                      {chartData.map((d, idx) => {
                        const val = activeMetric === 'orders' ? d.orders : d.revenue
                        const maxVal = activeMetric === 'orders' ? maxOrders : maxRevenue
                        const x = chartData.length > 1 ? (idx / (chartData.length - 1)) * 1000 : 500
                        const y = 190 - (val / (maxVal || 1)) * 170
                        const isHovered = hoveredIndex === idx

                        return (
                          <g key={d.dateKey} className="cursor-pointer" onMouseEnter={() => setHoveredIndex(idx)} onMouseLeave={() => setHoveredIndex(null)}>
                            <circle
                              cx={x}
                              cy={y}
                              r={isHovered ? 7 : 4}
                              fill={activeMetric === 'orders' ? '#38bdf8' : '#c084fc'}
                              stroke="#0f172a"
                              strokeWidth="2"
                              className="transition-all duration-200"
                            />
                          </g>
                        )
                      })}
                    </svg>

                    {/* Bottom Axis Labels */}
                    <div className="flex justify-between items-center pt-3 text-[11px] text-muted-foreground border-t border-sky-500/10">
                      {chartData.map((d, idx) => (
                        <span key={d.dateKey} className={hoveredIndex === idx ? 'text-sky-400 font-bold' : ''}>
                          {d.displayLabel}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 3. Platform Breakdown Grid (Status + Ecosystem + Suppliers) ─────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Order Fulfillment Status Card */}
        <Card className="glass-card border-sky-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center justify-between" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Order Fulfillment Status
              </span>
              <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                {deliveryRate}% Delivered
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            {/* Multi-segmented Visual Bar */}
            <div className="w-full h-3 bg-secondary/80 rounded-full overflow-hidden flex p-0.5 gap-0.5">
              <div
                style={{ width: `${(deliveredOrders.length / (orders.length || 1)) * 100}%` }}
                className="bg-emerald-500 rounded-l-full transition-all duration-500"
                title={`Delivered: ${deliveredOrders.length}`}
              />
              <div
                style={{ width: `${(pendingOrders.length / (orders.length || 1)) * 100}%` }}
                className="bg-sky-500 transition-all duration-500"
                title={`Pending/Confirmed: ${pendingOrders.length}`}
              />
              <div
                style={{ width: `${(cancelledOrders.length / (orders.length || 1)) * 100}%` }}
                className="bg-rose-500 rounded-r-full transition-all duration-500"
                title={`Cancelled: ${cancelledOrders.length}`}
              />
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="flex items-center gap-2 font-medium text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Delivered / Completed
                </span>
                <span className="font-bold text-foreground">
                  {deliveredOrders.length} <span className="text-muted-foreground">({deliveryRate}%)</span>
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-sky-500/10 border border-sky-500/20">
                <span className="flex items-center gap-2 font-medium text-sky-300">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  Active / Pending / In-Transit
                </span>
                <span className="font-bold text-foreground">
                  {pendingOrders.length}{' '}
                  <span className="text-muted-foreground">
                    ({orders.length ? ((pendingOrders.length / orders.length) * 100).toFixed(1) : 0}%)
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <span className="flex items-center gap-2 font-medium text-rose-300">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  Cancelled Orders
                </span>
                <span className="font-bold text-foreground">
                  {cancelledOrders.length} <span className="text-muted-foreground">({cancellationRate}%)</span>
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-sky-500/10 flex justify-between text-xs text-muted-foreground">
              <span>Total Volume Delivered:</span>
              <span className="font-bold text-sky-400">{totalLiters.toLocaleString()} Liters</span>
            </div>
          </CardContent>
        </Card>

        {/* Payment & Economics Card */}
        <Card className="glass-card border-sky-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center justify-between" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              <span className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-purple-400" />
                Payment & Order Economics
              </span>
              <Badge variant="outline" className="text-[10px] text-purple-400 border-purple-500/30">
                Monetization
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div className="text-xs text-muted-foreground">Total GMV</div>
                <div className="text-xl font-bold text-purple-300 mt-0.5" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  {formatCurrency(totalRevenue)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <div className="text-xs text-muted-foreground">Avg Basket Size</div>
                <div className="text-xl font-bold text-cyan-300 mt-0.5" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  {formatCurrency(avgOrderValue)}
                </div>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-sky-500/10">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  💵 Cash on Delivery (COD)
                </span>
                <span className="font-bold text-foreground">
                  {paymentStats.cod} Orders ({orders.length ? Math.round((paymentStats.cod / orders.length) * 100) : 0}%)
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-sky-500/10">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  💳 Online / Razorpay / UPI
                </span>
                <span className="font-bold text-foreground">
                  {paymentStats.online} Orders ({orders.length ? Math.round((paymentStats.online / orders.length) * 100) : 0}%)
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Platform Commission Estimate</span>
                <span className="font-bold text-emerald-400">
                  {formatCurrency(Math.round(totalRevenue * 0.05))} (5%)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Suppliers & Customer Ecosystem */}
        <Card className="glass-card border-sky-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center justify-between" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              <span className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" />
                Network Stakeholders
              </span>
              <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30">
                {approvedSuppliers}/{totalSuppliers} Active
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center p-2 rounded-lg bg-secondary/50 border border-sky-500/10">
                <span className="text-muted-foreground">Total Verified Suppliers</span>
                <span className="font-bold text-amber-400">{approvedSuppliers} Approved</span>
              </div>

              <div className="flex justify-between items-center p-2 rounded-lg bg-secondary/50 border border-sky-500/10">
                <span className="text-muted-foreground">Registered Customers</span>
                <span className="font-bold text-sky-400">{totalCustomers} Users</span>
              </div>

              <div className="flex justify-between items-center p-2 rounded-lg bg-secondary/50 border border-sky-500/10">
                <span className="text-muted-foreground">Repeat Booking Ratio</span>
                <span className="font-bold text-green-400">
                  {totalCustomers ? (orders.length / totalCustomers).toFixed(1) : 0} orders / user
                </span>
              </div>
            </div>

            {/* List of active suppliers */}
            <div className="pt-2 border-t border-sky-500/10">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Top Registered Suppliers
              </div>
              <div className="space-y-1.5">
                {suppliers.slice(0, 3).map(sup => (
                  <div key={sup.id} className="flex items-center justify-between text-xs py-1">
                    <span className="font-medium text-foreground truncate max-w-[150px]">
                      {sup.business_name || sup.owner_name || 'Supplier'}
                    </span>
                    <Badge variant="secondary" className="text-[10px] h-5 bg-sky-500/10 text-sky-400 border-sky-500/20">
                      ★ {sup.rating ?? 5.0}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
