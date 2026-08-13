'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Check, Truck, CheckCircle2, Ban, Loader2,
  Droplets, RefreshCw, Phone, MessageSquare
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { formatCurrency, formatDateTime, getOrderStatusColor, getOrderStatusLabel, formatDisplayName } from '@/lib/utils'
import Link from 'next/link'

const STATUS_OPTIONS = ['all', 'pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled']

export default function SupplierOrdersPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [cancelDialogOrder, setCancelDialogOrder] = useState<any | null>(null)

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
        toast.success(`Order status updated to: ${readableStatus}! ✅`)
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

  const productTypeIcons: Record<string, string> = { tanker: '🚛', can: '🫙', pouch: '💧' }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-2 sm:p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Supplier Orders
          </h1>
          <p className="text-muted-foreground mt-1">Manage, confirm, and fulfill incoming customer orders</p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchOrders(true)}
          disabled={loading}
          className="text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
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
              {s === 'all' ? 'All Orders' : s.replace('_', ' ')}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="glass-card h-32 rounded-xl animate-pulse" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-2xl">
          <Droplets className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-3" />
          <p className="text-lg font-semibold">No Orders Found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {statusFilter === 'all'
              ? 'New orders placed by customers will appear here in real-time.'
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
                <CardContent className="p-5">
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
                              NEW ORDER ⚡
                            </Badge>
                          )}
                          <Badge className={`text-xs border ${getOrderStatusColor(order.status)}`}>
                            {getOrderStatusLabel(order.status)}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="font-medium text-foreground">Customer: {customerName}</span>
                          {cleanPhone && (
                            <div className="flex items-center gap-1">
                              <a href={`tel:${customerPhone}`} className="text-sky-400 hover:underline flex items-center gap-0.5">
                                <Phone className="w-3 h-3" /> {customerPhone}
                              </a>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-muted-foreground pt-1">
                          <span>Quantity: <strong className="text-foreground">{order.quantity} units</strong></span>
                          <span>Payment: <strong className="text-foreground capitalize">{order.payment_mode?.replace('_', ' ')}</strong></span>
                          <span>Ordered: <strong className="text-foreground">{formatDateTime(order.created_at)}</strong></span>
                        </div>

                        {order.delivery_address && (
                          <p className="text-xs text-muted-foreground/90 pt-0.5">
                            📍 <strong>Address:</strong>{' '}
                            {typeof order.delivery_address === 'object'
                              ? `${order.delivery_address.line1 || ''}, ${order.delivery_address.city || ''}`
                              : order.delivery_address}
                          </p>
                        )}

                        {order.special_instructions && (
                          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                            <strong>Note:</strong> {order.special_instructions}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Amount & Action Controls */}
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-border/60">
                      <div className="text-left md:text-right">
                        <span className="text-[11px] text-muted-foreground block">Total Amount</span>
                        <div className="text-2xl font-bold gradient-text" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                          {formatCurrency(order.total_amount)}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {isPending && (
                          <>
                            <Button
                              size="sm"
                              disabled={isUpdating}
                              onClick={() => updateOrderStatus(order.id, 'confirmed')}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20"
                            >
                              {isUpdating ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                              ) : (
                                <Check className="w-3.5 h-3.5 mr-1.5" />
                              )}
                              Confirm Order
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isUpdating}
                              onClick={() => setCancelDialogOrder(order)}
                              className="text-xs text-red-400 border-red-500/20 hover:bg-red-500/10"
                            >
                              <Ban className="w-3 h-3 mr-1" />
                              Cancel
                            </Button>
                          </>
                        )}

                        {isConfirmed && (
                          <Button
                            size="sm"
                            disabled={isUpdating}
                            onClick={() => updateOrderStatus(order.id, 'out_for_delivery')}
                            className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/20"
                          >
                            {isUpdating ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                            ) : (
                              <Truck className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            Dispatch / Out for Delivery
                          </Button>
                        )}

                        {isOutForDelivery && (
                          <Button
                            size="sm"
                            disabled={isUpdating}
                            onClick={() => updateOrderStatus(order.id, 'delivered')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20"
                          >
                            {isUpdating ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            Mark Delivered
                          </Button>
                        )}

                        <Link href={`/supplier/orders/${order.id}`}>
                          <Button size="sm" variant="outline" className="text-xs">
                            View Details →
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

      {/* Cancel Confirmation Modal */}
      {cancelDialogOrder && (
        <ConfirmDialog
          isOpen={!!cancelDialogOrder}
          title="Cancel Order?"
          message={`Kya aap sach mein Order #${cancelDialogOrder.id.slice(0, 8).toUpperCase()} ko cancel karna chahte hain? Reason mention karein.`}
          confirmText="Haan, Cancel Karo"
          cancelText="Wapas chalo"
          variant="destructive"
          requireReason={true}
          reasonPlaceholder="Cancellation reason (e.g. Stock unavailable, Out of range)..."
          loading={updatingId === cancelDialogOrder.id}
          onConfirm={(reason) => updateOrderStatus(cancelDialogOrder.id, 'cancelled', reason)}
          onCancel={() => setCancelDialogOrder(null)}
        />
      )}
    </div>
  )
}
