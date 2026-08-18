'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  ArrowLeft, Clock, CheckCircle2, Truck, XCircle,
  Phone, MessageSquare, Loader2, MapPin, User, Package,
  AlertCircle, Check, Ban
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { formatCurrency, formatDateTime, getOrderStatusColor, getOrderStatusLabel, formatDisplayName } from '@/lib/utils'
import Link from 'next/link'

export default function SupplierOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [order, setOrder] = useState<any>(null)
  const [tracking, setTracking] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)

  const fetchOrderDetails = async () => {
    try {
      const res = await fetch(`/api/orders/${id}`)
      const json = await res.json()
      if (res.ok && json.order) {
        setOrder(json.order)
        setTracking(json.tracking || [])
      }
    } catch (err) {
      console.error('Error fetching order details:', err)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchOrderDetails()

    // Realtime tracking subscription
    const channel = supabase
      .channel(`supplier-order-details-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        () => fetchOrderDetails()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_tracking', filter: `order_id=eq.${id}` },
        () => fetchOrderDetails()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  const updateOrderStatus = async (newStatus?: string, reason?: string, paymentStatus?: string) => {
    setUpdating(true)
    try {
      const res = await fetch('/api/supplier/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: id, status: newStatus, reason, paymentStatus }),
      })
      const json = await res.json()
      if (res.ok && (json.order || json.success)) {
        toast.success(paymentStatus ? 'Payment status updated to Paid' : `Order status updated`)
        fetchOrderDetails()
      } else {
        toast.error(json.error || 'Failed to update order status')
      }
    } catch (err) {
      toast.error('Error updating order status')
    }
    setUpdating(false)
    setConfirmCancelOpen(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-amber-400 mx-auto opacity-80" />
        <h2 className="text-xl font-bold">Order Not Found</h2>
        <p className="text-sm text-muted-foreground">This order could not be located or you may not have permission to view it.</p>
        <Link href="/supplier/orders">
          <Button variant="outline" className="mt-2">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Supplier Orders
          </Button>
        </Link>
      </div>
    )
  }

  const customerName = formatDisplayName(
    order.customers?.name,
    order.customers?.phone
  )
  const customerPhone = order.customers?.phone || 'Not provided'
  const cleanPhone = customerPhone.replace(/\D/g, '')

  return (
    <div className="p-3 sm:p-5 md:p-8 space-y-5 sm:space-y-6 max-w-4xl mx-auto">
      {/* Back link */}
      <Link href="/supplier/orders" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Supplier Orders
      </Link>

      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 glass-card rounded-xl">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              Order Summary
            </h1>
            <Badge className={`text-xs border ${getOrderStatusColor(order.status)}`}>
              {getOrderStatusLabel(order.status)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Order ID: {order.id}</p>
        </div>

        {/* Action Controls for Supplier */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {order.status === 'pending' && (
            <>
              <Button
                size="sm"
                className="flex-1 sm:flex-initial bg-green-600 hover:bg-green-500 text-white min-h-[38px]"
                disabled={updating}
                onClick={() => updateOrderStatus('confirmed')}
              >
                <Check className="w-4 h-4 mr-1.5" /> Confirm Order
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1 sm:flex-initial bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 min-h-[38px]"
                disabled={updating}
                onClick={() => setConfirmCancelOpen(true)}
              >
                <Ban className="w-4 h-4 mr-1.5" /> Cancel Order
              </Button>
            </>
          )}

          {order.status === 'confirmed' && (
            <Button
              size="sm"
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 text-white min-h-[38px]"
              disabled={updating}
              onClick={() => updateOrderStatus('out_for_delivery')}
            >
              <Truck className="w-4 h-4 mr-1.5" /> Dispatch / Out for Delivery
            </Button>
          )}

          {order.status === 'out_for_delivery' && (
            <Button
              size="sm"
              className="w-full sm:w-auto bg-green-600 hover:bg-green-500 text-white min-h-[38px]"
              disabled={updating}
              onClick={() => updateOrderStatus('delivered')}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Mark Delivered
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid: Customer & Order Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Customer & Product Summary */}
        <div className="md:col-span-2 space-y-6">
          {/* Customer Summary Card */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                <User className="w-5 h-5 text-sky-400" />
                Customer Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="font-bold text-base text-foreground">{customerName}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Phone className="w-3.5 h-3.5 text-sky-400" />
                    {customerPhone}
                  </p>
                </div>
                {cleanPhone && (
                  <div className="flex items-center gap-2">
                    <a href={`tel:${customerPhone}`}>
                      <Button size="sm" variant="outline" className="text-xs">
                        <Phone className="w-3.5 h-3.5 mr-1" /> Call
                      </Button>
                    </a>
                    <a href={`https://wa.me/${cleanPhone}`} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline" className="text-xs text-green-400 border-green-500/20 bg-green-500/10">
                        <MessageSquare className="w-3.5 h-3.5 mr-1" /> WhatsApp
                      </Button>
                    </a>
                  </div>
                )}
              </div>

              <Separator />

              {/* Delivery Address */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  <MapPin className="w-3.5 h-3.5 text-sky-400" />
                  Delivery Address
                </div>
                <p className="text-sm font-medium">
                  {typeof order.delivery_address === 'string'
                    ? order.delivery_address
                    : (order.delivery_address?.line1 || order.delivery_address?.address || 'Standard Address')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Water Product Summary Card */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                <Package className="w-5 h-5 text-sky-400" />
                Order Items & Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{order.water_products?.name || 'Water Can'}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Type: <span className="capitalize">{order.water_products?.type}</span> ({order.water_products?.capacity_liters || 20}L)
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold gradient-text" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    {formatCurrency(order.total_amount)}
                  </div>
                  <p className="text-xs text-muted-foreground">{order.quantity} units @ {formatCurrency(order.water_products?.price || order.total_amount)}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs block">Payment Method</span>
                  <span className="font-semibold capitalize">{order.payment_mode?.replace('_', ' ') || 'Cash on Delivery'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block">Payment Status</span>
                  {(order.payment_status === 'paid' || order.status === 'delivered' || order.payment_mode === 'online' || order.special_instructions?.includes('Razorpay')) ? (
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs mt-1">
                      ✓ Successful (Paid)
                    </Badge>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-xs">
                        ⏳ Pending (Pay on Delivery)
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] h-6 px-2 text-green-400 border-green-500/20 hover:bg-green-500/10"
                        disabled={updating}
                        onClick={() => updateOrderStatus(order.status, undefined, 'paid')}
                      >
                        Mark Paid
                      </Button>
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block">Order Date</span>
                  <span className="font-semibold text-xs">{formatDateTime(order.created_at)}</span>
                </div>
              </div>

              {order.special_instructions && (
                <div className="p-3 rounded-lg bg-secondary/50 text-xs space-y-1">
                  <span className="font-semibold text-muted-foreground block">Special Notes / Instructions:</span>
                  <p className="text-foreground">{order.special_instructions}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Timeline & Activity Logs */}
        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Activity Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tracking.length === 0 ? (
                <div className="flex gap-2 items-start text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Order Received</p>
                    <p className="text-muted-foreground/60">{formatDateTime(order.created_at)}</p>
                  </div>
                </div>
              ) : (
                tracking.map((t: any) => (
                  <div key={t.id} className="flex gap-3 items-start text-xs border-l border-border pl-4 relative last:border-0 pb-2">
                    <div className="absolute -left-1 top-1 w-2 h-2 rounded-full bg-sky-500" />
                    <div>
                      <p className="font-semibold capitalize">{t.status.replace('_', ' ')}</p>
                      {t.notes && <p className="text-muted-foreground mt-0.5">{t.notes}</p>}
                      <p className="text-muted-foreground/50 mt-1">{formatDateTime(t.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Modal for Order Cancellation */}
      <ConfirmDialog
        isOpen={confirmCancelOpen}
        title="Cancel Order?"
        message="Kya aap iss order ko cancel karna chahte hain? Reason mention karein."
        confirmText="Haan, Cancel Karo"
        cancelText="Wapas chalo"
        variant="destructive"
        requireReason={true}
        reasonPlaceholder="Cancellation reason..."
        loading={updating}
        onConfirm={(reason) => updateOrderStatus('cancelled', reason)}
        onCancel={() => setConfirmCancelOpen(false)}
      />
    </div>
  )
}
