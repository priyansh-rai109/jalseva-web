'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Check, Truck, CheckCircle2, Ban, Loader2,
  Droplets, RefreshCw, Phone, MessageSquare, Zap
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DispatchOrderModal } from '@/components/supplier/DispatchOrderModal'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { formatCurrency, formatDateTime, getOrderStatusColor, getOrderStatusLabel, formatDisplayName } from '@/lib/utils'
import Link from 'next/link'

const STATUS_OPTIONS = ['all', 'pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled']

export default function SupplierOrdersPage() {
  const supabase = createClient()
  const { t, language } = useLanguage()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [cancelDialogOrder, setCancelDialogOrder] = useState<any | null>(null)
  const [dispatchModalOrder, setDispatchModalOrder] = useState<any | null>(null)

  const fetchOrders = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const res = await fetch(`/api/supplier/orders?status=${statusFilter}`)
      const json = await res.json()
      if (res.ok) {
        setOrders(json.orders || [])
      } else {
        toast.error(json.error || 'Failed to load supplier orders')
      }
    } catch (err) {
      console.error('Error fetching supplier orders:', err)
      toast.error('Network error loading orders')
    }
    if (showLoading) setLoading(false)
  }, [statusFilter])

  useEffect(() => {
    fetchOrders(true)

    // Realtime channel for instant order updates
    const channel = supabase
      .channel('supplier-orders-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload: any) => {
          console.log('[SupplierOrders] Realtime change event:', payload)
          fetchOrders(false)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchOrders, supabase])

  const updateOrderStatus = async (orderId: string, newStatus: string, reason?: string) => {
    setUpdatingId(orderId)
    try {
      const res = await fetch('/api/supplier/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus, reason }),
      })
      const json = await res.json()
      if (res.ok && (json.success || json.order)) {
        const readableStatus = newStatus.replace('_', ' ').toUpperCase()
        toast.success(language === 'hi' ? `ऑर्डर स्थिति अपडेट: ${readableStatus}! ✅` : `Order status updated to: ${readableStatus}! ✅`)
        await fetchOrders(false)
      } else {
        toast.error(json.error || 'Failed to update order status')
      }
    } catch (err) {
      console.error('Error updating order:', err)
      toast.error('Network error updating order')
    }
    setUpdatingId(null)
    setCancelDialogOrder(null)
  }

  const handleConfirmDispatch = async (
    orderId: string,
    driverDetails: { driverName: string; driverPhone: string; vehicleNumber: string; estimatedMins: string }
  ) => {
    setUpdatingId(orderId)
    try {
      const res = await fetch('/api/supplier/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          status: 'out_for_delivery',
          driverName: driverDetails.driverName,
          driverPhone: driverDetails.driverPhone,
          vehicleNumber: driverDetails.vehicleNumber,
          estimatedMins: driverDetails.estimatedMins,
        }),
      })
      const json = await res.json()
      if (res.ok && (json.success || json.order)) {
        toast.success(
          language === 'hi'
            ? `ऑर्डर #${orderId.slice(0, 8).toUpperCase()} ड्राइवर ${driverDetails.driverName} (${driverDetails.driverPhone}) को सौंपकर डिस्पैच कर दिया गया! 🚚`
            : `Order #${orderId.slice(0, 8).toUpperCase()} dispatched with driver ${driverDetails.driverName}! 🚚`
        )
        await fetchOrders(false)
        setDispatchModalOrder(null)
      } else {
        toast.error(json.error || 'Failed to dispatch order')
      }
    } catch (err) {
      console.error('Error dispatching order:', err)
      toast.error('Network error dispatching order')
    }
    setUpdatingId(null)
  }

  const getTranslatedStatus = (status: string) => {
    if (language === 'hi') {
      if (status === 'pending') return 'ऑर्डर दर्ज (Pending)'
      if (status === 'confirmed') return 'स्वीकृत (Confirmed)'
      if (status === 'out_for_delivery') return 'डिलीवरी पर निकला'
      if (status === 'delivered') return 'डिलीवर हो गया'
      if (status === 'cancelled') return 'रद्द (Cancelled)'
    }
    return getOrderStatusLabel(status)
  }

  const getTabLabel = (s: string) => {
    if (language === 'hi') {
      if (s === 'all') return 'सभी ऑर्डर'
      if (s === 'pending') return 'लंबित (Pending)'
      if (s === 'confirmed') return 'स्वीकृत'
      if (s === 'out_for_delivery') return 'रास्ते में'
      if (s === 'delivered') return 'डिलीवर'
      if (s === 'cancelled') return 'रद्द'
    }
    return s === 'all' ? 'All Orders' : s.replace('_', ' ')
  }

  const productTypeIcons: Record<string, string> = { tanker: '🚛', can: '🫙', pouch: '💧' }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-2 sm:p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {language === 'hi' ? 'सप्लायर ऑर्डर्स (Supplier Orders)' : 'Supplier Orders'}
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 sm:mt-1">
            {language === 'hi' ? 'ग्राहकों के आने वाले पानी के ऑर्डर प्रबंधित और डिलीवर करें' : 'Manage, confirm, and fulfill incoming customer orders'}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchOrders(true)}
          disabled={loading}
          className="text-xs min-h-[36px]"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> {language === 'hi' ? 'रिफ्रेश' : 'Refresh'}
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap pb-1 border-b border-border/60">
        {STATUS_OPTIONS.map((s) => {
          const isSelected = statusFilter === s
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all capitalize ${
                isSelected
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
              }`}
            >
              {getTabLabel(s)}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="glass-card h-32 rounded-xl animate-pulse" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-2xl p-6">
          <Droplets className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-3" />
          <p className="text-lg font-semibold">{language === 'hi' ? 'कोई ऑर्डर नहीं मिला' : 'No Orders Found'}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {statusFilter === 'all'
              ? (language === 'hi' ? 'ग्राहकों द्वारा दिए गए नए ऑर्डर यहाँ तुरंत दिखाई देंगे।' : 'New orders placed by customers will appear here in real-time.')
              : `No orders with status "${statusFilter.replace('_', ' ')}" found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isPending = order.status === 'pending'
            const isConfirmed = order.status === 'confirmed'
            const isOutForDelivery = order.status === 'out_for_delivery'
            const isDelivered = order.status === 'delivered'
            const isCancelled = order.status === 'cancelled'
            const isUpdating = updatingId === order.id

            const customerName = formatDisplayName(order.customers?.name, order.customers?.phone)
            const customerPhone = order.customers?.phone || ''
            const cleanPhone = customerPhone.replace(/\D/g, '')

            return (
              <Card
                key={order.id}
                className={`glass-card transition-all rounded-xl ${
                  isPending
                    ? 'border-amber-500/80 bg-amber-500/5 shadow-lg shadow-amber-500/10'
                    : 'hover:border-sky-500/30'
                }`}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Product & Customer info */}
                    <div className="flex items-start gap-3.5 flex-1">
                      <div className="text-3xl p-2.5 rounded-xl bg-secondary/80 flex items-center justify-center flex-shrink-0">
                        {productTypeIcons[order.water_products?.type] || '💧'}
                      </div>
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-base text-foreground">
                            {order.water_products?.name || 'Water Product'}
                          </h3>
                          {isPending && (
                            <Badge className="bg-amber-500 text-black font-extrabold text-[10px] px-2 py-0.5 border-none shadow-sm animate-pulse">
                              {language === 'hi' ? 'नया ऑर्डर ⚡' : 'NEW ORDER ⚡'}
                            </Badge>
                          )}
                          {order.special_instructions?.includes('EMERGENCY') && (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-[10px] font-bold py-0.5 px-2 flex items-center gap-1 animate-pulse">
                              <Zap className="w-3 h-3 text-amber-400" />
                              {language === 'hi' ? '⚡ 60-मिनट आपातकालीन' : '⚡ 60-MIN EMERGENCY'}
                            </Badge>
                          )}
                          <Badge className={`text-xs border ${getOrderStatusColor(order.status)}`}>
                            {getTranslatedStatus(order.status)}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="font-medium text-foreground">
                            {language === 'hi' ? 'ग्राहक' : 'Customer'}: {customerName}
                          </span>
                          {cleanPhone && (
                            <div className="flex items-center gap-1">
                              <a href={`tel:${customerPhone}`} className="text-sky-400 hover:underline flex items-center gap-0.5">
                                <Phone className="w-3 h-3" /> {customerPhone}
                              </a>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-muted-foreground pt-1">
                          <span>{t('quantity')}: <strong className="text-foreground">{order.quantity} units</strong></span>
                          <span>{language === 'hi' ? 'भुगतान' : 'Payment'}: <strong className="text-foreground capitalize">{order.payment_mode?.replace('_', ' ')}</strong></span>
                          <span>{language === 'hi' ? 'तारीख' : 'Ordered'}: <strong className="text-foreground">{formatDateTime(order.created_at)}</strong></span>
                        </div>

                        {order.delivery_address && (
                          <p className="text-xs text-muted-foreground/90 pt-0.5">
                            📍 <strong>{t('deliveryAddress')}:</strong>{' '}
                            {typeof order.delivery_address === 'object'
                              ? `${order.delivery_address.line1 || ''}, ${order.delivery_address.city || ''}`
                              : order.delivery_address}
                          </p>
                        )}

                        {order.special_instructions && (
                          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                            <strong>{language === 'hi' ? 'विशेष निर्देश' : 'Note'}:</strong> {order.special_instructions}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Amount & Action Controls */}
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-border/60">
                      <div className="text-left md:text-right">
                        <span className="text-[11px] text-muted-foreground block">{language === 'hi' ? 'कुल राशि' : 'Total Amount'}</span>
                        <div className="text-2xl font-bold gradient-text" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                          {formatCurrency(order.total_amount)}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                        {isPending && (
                          <>
                            <Button
                              size="sm"
                              disabled={isUpdating}
                              onClick={() => updateOrderStatus(order.id, 'confirmed')}
                              className="flex-1 md:flex-initial bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 min-h-[38px]"
                            >
                              {isUpdating ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                              ) : (
                                <Check className="w-3.5 h-3.5 mr-1.5" />
                              )}
                              {t('confirmOrder')}
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isUpdating}
                              onClick={() => setCancelDialogOrder(order)}
                              className="flex-1 md:flex-initial text-xs text-red-400 border-red-500/20 hover:bg-red-500/10 min-h-[38px]"
                            >
                              <Ban className="w-3 h-3 mr-1" />
                              {t('cancelOrder')}
                            </Button>
                          </>
                        )}

                        {isConfirmed && (
                          <Button
                            size="sm"
                            disabled={isUpdating}
                            onClick={() => setDispatchModalOrder(order)}
                            className="w-full md:w-auto bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 min-h-[38px]"
                          >
                            {isUpdating ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                            ) : (
                              <Truck className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            {t('dispatchOutForDelivery')}
                          </Button>
                        )}

                        {isOutForDelivery && (
                          <Button
                            size="sm"
                            disabled={isUpdating}
                            onClick={() => updateOrderStatus(order.id, 'delivered')}
                            className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 min-h-[38px]"
                          >
                            {isUpdating ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            {t('markDelivered')}
                          </Button>
                        )}

                        <Link href={`/supplier/orders/${order.id}`} className="w-full md:w-auto">
                          <Button size="sm" variant="outline" className="w-full md:w-auto text-xs min-h-[38px]">
                            {language === 'hi' ? 'विवरण देखें →' : 'View Details →'}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Driver Assignment & Dispatch Modal */}
      <DispatchOrderModal
        isOpen={!!dispatchModalOrder}
        onClose={() => setDispatchModalOrder(null)}
        order={dispatchModalOrder}
        loading={updatingId === dispatchModalOrder?.id}
        onConfirmDispatch={handleConfirmDispatch}
      />

      {/* Cancel Confirmation Modal */}
      {cancelDialogOrder && (
        <ConfirmDialog
          isOpen={!!cancelDialogOrder}
          title={t('cancelOrderConfirmTitle')}
          message={language === 'hi' ? `क्या आप वाकई Order #${cancelDialogOrder.id.slice(0, 8).toUpperCase()} को रद्द करना चाहते हैं? कारण लिखें:` : `Are you sure you want to cancel Order #${cancelDialogOrder.id.slice(0, 8).toUpperCase()}? Please specify a reason:`}
          confirmText={t('cancelOrderYes')}
          cancelText={t('cancelOrderNo')}
          variant="destructive"
          requireReason={true}
          reasonPlaceholder={t('cancelReasonPlaceholder')}
          loading={updatingId === cancelDialogOrder.id}
          onConfirm={(reason) => updateOrderStatus(cancelDialogOrder.id, 'cancelled', reason)}
          onCancel={() => setCancelDialogOrder(null)}
        />
      )}
    </div>
  )
}
