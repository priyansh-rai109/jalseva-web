'use client'

import React from 'react'
import Link from 'next/link'
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
  Star,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { formatCurrency, formatDateTime, getOrderStatusColor, getOrderStatusLabel } from '@/lib/utils'

interface CustomerDashboardClientProps {
  displayName: string
  unreviewedOrder: any
  totalOrders: number
  deliveredOrders: number
  activeOrders: any[]
  recentOrders: any[]
  suppliers: any[]
}

export function CustomerDashboardClient({
  displayName,
  unreviewedOrder,
  totalOrders,
  deliveredOrders,
  activeOrders,
  recentOrders,
  suppliers,
}: CustomerDashboardClientProps) {
  const { t, language } = useLanguage()

  const statusIcon = (status: string) => {
    if (status === 'pending') return <Clock className="w-4 h-4 text-yellow-400" />
    if (status === 'confirmed') return <CheckCircle2 className="w-4 h-4 text-blue-400" />
    if (status === 'out_for_delivery') return <Truck className="w-4 h-4 text-purple-400" />
    return null
  }

  const getTranslatedStatus = (status: string) => {
    if (language === 'hi') {
      if (status === 'pending') return 'ऑर्डर दर्ज'
      if (status === 'confirmed') return 'स्वीकृत'
      if (status === 'out_for_delivery') return 'डिलीवरी पर'
      if (status === 'delivered') return 'डिलीवर'
      if (status === 'cancelled') return 'रद्द'
    }
    return getOrderStatusLabel(status)
  }

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {t('heyUser')} {displayName} 👋
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 sm:mt-1">{t('dashboardSubtitle')}</p>
        </div>
        <Link href="/customer/browse">
          <Button className="water-shimmer text-white min-h-[40px]">
            <Droplets className="w-4 h-4 mr-1.5" />
            {t('orderWaterButton')}
          </Button>
        </Link>
      </div>

      {/* Prominent Delivered Order Review Banner */}
      {unreviewedOrder && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-sky-500/10 to-transparent border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-amber-500/5 animate-in fade-in duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 shadow-inner">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-foreground">
                {language === 'hi'
                  ? `${(unreviewedOrder.suppliers as any)?.business_name || 'सप्लायर'} से पानी डिलीवरी कैसी रही?`
                  : `How was your delivery from ${(unreviewedOrder.suppliers as any)?.business_name || 'your supplier'}?`}
              </p>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                {language === 'hi'
                  ? `${(unreviewedOrder.water_products as any)?.name} डिलीवर हो गया! अपनी राय देकर जोधपुर में मदद करें।`
                  : `${(unreviewedOrder.water_products as any)?.name} was delivered! Rate your experience to help others.`}
              </p>
            </div>
          </div>
          <Link href={`/customer/orders/${unreviewedOrder.id}`} className="self-end sm:self-auto flex-shrink-0">
            <Button size="sm" className="water-shimmer text-white text-xs font-bold rounded-xl shadow-md shadow-sky-500/20">
              <Star className="w-3.5 h-3.5 fill-white mr-1.5" /> {t('rateDelivery')}
            </Button>
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: t('totalOrdersStat'), value: totalOrders ?? 0, icon: ShoppingCart, color: 'text-sky-400', bg: 'bg-sky-400/10' },
          { label: t('deliveredStat'), value: deliveredOrders ?? 0, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10' },
          { label: t('activeOrdersStat'), value: activeOrders?.length ?? 0, icon: Truck, color: 'text-purple-400', bg: 'bg-purple-400/10' },
        ].map((stat) => (
          <Link key={stat.label} href="/customer/orders">
            <Card className="glass-card hover:border-sky-500/30 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer">
              <CardContent className="p-4 sm:p-5">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg ${stat.bg} flex items-center justify-center mb-2 sm:mb-3`}>
                  <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`} />
                </div>
                <div className="text-xl sm:text-2xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{stat.value}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Active Orders */}
      {activeOrders && activeOrders.length > 0 && (
        <Card className="glass-card border-sky-500/20">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              <Truck className="w-5 h-5 text-sky-400" />
              {t('activeOrdersStat')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2 space-y-2.5 sm:space-y-3">
            {activeOrders.map((order: any) => (
              <Link
                key={order.id}
                href={`/customer/orders/${order.id}`}
                className="flex items-center gap-3 sm:gap-4 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
              >
                {statusIcon(order.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold truncate">{(order.water_products as any)?.name}</p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{(order.suppliers as any)?.business_name}</p>
                </div>
                <div className="text-right">
                  <Badge className={`text-[10px] sm:text-xs border ${getOrderStatusColor(order.status)}`}>
                    {getTranslatedStatus(order.status)}
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-0.5">{formatCurrency(order.total_amount)}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Featured Suppliers */}
      <div>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {t('suppliersNearYou')}
          </h2>
          <Link href="/customer/browse" className="text-xs sm:text-sm text-sky-400 hover:text-sky-300 flex items-center gap-1">
            {t('viewAll')} <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {!suppliers || suppliers.length === 0 ? (
          <div className="glass-card p-6 sm:p-8 text-center rounded-2xl">
            <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground text-sm">{t('noSuppliersFound')}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
            {suppliers.map((supplier: any) => (
              <Link key={supplier.id} href={`/customer/supplier/${supplier.id}`}>
                <Card className="glass-card hover:border-sky-500/30 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer h-full">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl water-shimmer flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm sm:text-base truncate">{supplier.business_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{supplier.address}</p>
                        <div className="flex items-center gap-2 sm:gap-3 mt-2 flex-wrap">
                          <span className="text-xs text-amber-400 flex items-center gap-0.5 font-medium">
                            <Star className="w-3.5 h-3.5 fill-amber-400" /> {supplier.rating?.toFixed(1) || '0.0'}
                          </span>
                          <span className="text-xs text-muted-foreground">{supplier.total_orders} {t('ordersCount')}</span>
                          {supplier.zones && (
                            <Badge className="text-[10px] bg-sky-500/10 text-sky-400 border-sky-500/20">
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
          <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6 pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {t('recentOrders')}
            </CardTitle>
            <Link href="/customer/orders" className="text-xs sm:text-sm text-sky-400 hover:text-sky-300 flex items-center gap-1">
              {t('viewAll')} <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2 space-y-2.5 sm:space-y-3">
            {recentOrders.map((order: any) => (
              <Link
                key={order.id}
                href={`/customer/orders/${order.id}`}
                className="flex items-center gap-3 sm:gap-4 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold truncate">{(order.water_products as any)?.name}</p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                    {(order.suppliers as any)?.business_name} · {formatDateTime(order.created_at)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs sm:text-sm font-bold gradient-text">{formatCurrency(order.total_amount)}</div>
                  <Badge className={`mt-0.5 text-[10px] border ${getOrderStatusColor(order.status)}`}>
                    {getTranslatedStatus(order.status)}
                  </Badge>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
