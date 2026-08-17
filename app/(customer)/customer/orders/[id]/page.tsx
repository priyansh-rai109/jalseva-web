'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  ArrowLeft, Clock, CheckCircle2, Truck, XCircle,
  Star, Phone, MessageSquare, Loader2, MapPin, ClipboardList, Ban, Sparkles, Edit3
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ReviewModal } from '@/components/shared/ReviewModal'
import { formatCurrency, formatDateTime, getOrderStatusColor, getOrderStatusLabel } from '@/lib/utils'
import Link from 'next/link'

const steps = [
  { status: 'pending', label: 'Placed', desc: 'Awaiting supplier confirmation' },
  { status: 'confirmed', label: 'Confirmed', desc: 'Supplier confirmed and preparing' },
  { status: 'out_for_delivery', label: 'Out for Delivery', desc: 'Water is on the way' },
  { status: 'delivered', label: 'Delivered', desc: 'Delivered successfully' },
]

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [order, setOrder] = useState<any>(null)
  const [tracking, setTracking] = useState<any[]>([])
  const [review, setReview] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Cancel modal state
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const autoPromptTriggered = useRef(false)

  const fetchOrderDetails = async (isInitial = false) => {
    try {
      const res = await fetch(`/api/orders/${id}`)
      const json = await res.json()
      if (res.ok && json.order) {
        setOrder(json.order)
        setTracking(json.tracking || [])
        setReview(json.review || null)

        // Auto-prompt review if delivered and unreviewed on initial load
        if (
          isInitial &&
          json.order.status === 'delivered' &&
          !json.review &&
          !autoPromptTriggered.current
        ) {
          autoPromptTriggered.current = true
          // Short delay for smooth UI transition
          setTimeout(() => {
            setReviewModalOpen(true)
          }, 600)
        }
      }
    } catch (err) {
      console.error('Error fetching order details:', err)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchOrderDetails(true)

    // Realtime tracking subscription
    const channel = supabase
      .channel(`order-details-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        (payload: any) => {
          console.log('[OrderDetail Realtime Order Update]', payload)
          if (payload.new?.status === 'delivered') {
            toast.success('🎉 Your water order has been delivered! Please share your rating.')
            setReviewModalOpen(true)
          }
          fetchOrderDetails(false)
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_tracking', filter: `order_id=eq.${id}` },
        () => fetchOrderDetails(false)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  const handleCancelOrder = async (reason?: string) => {
    setCancelling(true)
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', reason }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        toast.success('Order cancel kar diya gaya hai')
        fetchOrderDetails(false)
      } else {
        toast.error(json.error || 'Failed to cancel order')
      }
    } catch (err) {
      toast.error('Error cancelling order')
    }
    setCancelling(false)
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
    return <div className="p-8 text-center text-muted-foreground">Order not found</div>
  }

  const currentStepIdx = steps.findIndex((s) => s.status === order.status)
  const isCancelled = order.status === 'cancelled'
  const canCancel = order.status === 'pending' || order.status === 'confirmed'

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-3xl mx-auto">
      {/* Back */}
      <Link
        href="/customer/orders"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Back to orders
      </Link>

      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Order Tracking
          </h1>
          <p className="text-muted-foreground text-xs mt-1">Order ID: {order.id}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`text-sm py-1 border ${getOrderStatusColor(order.status)}`}>
            {getOrderStatusLabel(order.status)}
          </Badge>
          {canCancel && (
            <Button
              variant="destructive"
              size="sm"
              className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
              onClick={() => setConfirmCancelOpen(true)}
            >
              <Ban className="w-4 h-4 mr-1.5" />
              Cancel Order
            </Button>
          )}
        </div>
      </div>

      {/* Stepper */}
      {!isCancelled && (
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="relative flex flex-col md:flex-row justify-between gap-6 md:gap-4">
              {/* Connector line for desktop */}
              <div className="absolute left-4 top-4 bottom-4 md:left-6 md:right-6 md:top-5 md:bottom-auto h-full md:h-0.5 bg-border -z-10" />
              {/* Active progress connector line */}
              {currentStepIdx >= 0 && (
                <div
                  className="absolute left-4 top-4 md:left-6 md:top-5 h-full md:h-0.5 bg-sky-500 -z-10 transition-all duration-500"
                  style={{
                    height:
                      typeof window !== 'undefined' && window.innerWidth < 768
                        ? `${(currentStepIdx / (steps.length - 1)) * 100}%`
                        : 'auto',
                    width:
                      typeof window !== 'undefined' && window.innerWidth >= 768
                        ? `${(currentStepIdx / (steps.length - 1)) * 100}%`
                        : 'auto',
                  }}
                />
              )}

              {steps.map((step, idx) => {
                const isCompleted = idx < currentStepIdx
                const isActive = idx === currentStepIdx

                return (
                  <div
                    key={step.status}
                    className="flex md:flex-col items-start md:items-center text-left md:text-center gap-3 md:gap-2 flex-1"
                  >
                    <div
                      className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                        isCompleted
                          ? 'bg-sky-500 border-sky-500 text-white'
                          : isActive
                          ? 'bg-sky-500/20 border-sky-500 text-sky-400'
                          : 'bg-card border-border text-muted-foreground'
                      }`}
                    >
                      {step.status === 'pending' && <ClipboardList className="w-4 h-4" />}
                      {step.status === 'confirmed' && <CheckCircle2 className="w-4 h-4" />}
                      {step.status === 'out_for_delivery' && <Truck className="w-4 h-4" />}
                      {step.status === 'delivered' && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          isActive ? 'text-sky-400' : 'text-foreground'
                        }`}
                      >
                        {step.label}
                      </p>
                      <p className="text-xs text-muted-foreground hidden md:block mt-0.5 leading-tight">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left: details */}
        <div className="md:col-span-2 space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                Product & Supplier
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{order.water_products?.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Supplier: {order.suppliers?.business_name}
                  </p>
                </div>
                <div className="text-right">
                  <div
                    className="text-xl font-bold gradient-text"
                    style={{ fontFamily: 'Rajdhani, sans-serif' }}
                  >
                    {formatCurrency(order.total_amount)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {order.quantity} units @ {formatCurrency(order.water_products?.price)}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">Payment Mode</span>
                  <span className="font-medium capitalize">
                    {order.payment_mode?.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Payment Status</span>
                  {order.payment_status === 'paid' ||
                  order.status === 'delivered' ||
                  order.payment_mode === 'online' ||
                  order.special_instructions?.includes('Razorpay') ? (
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs mt-1">
                      ✓ Successful (Paid)
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-xs mt-1">
                      ⏳ Pending (Pay on Delivery)
                    </Badge>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Order Date</span>
                  <span className="font-medium text-xs">{formatDateTime(order.created_at)}</span>
                </div>
              </div>

              {order.suppliers?.phone && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
                  <Phone className="w-4 h-4 text-sky-400" />
                  <div className="text-sm">
                    <span className="text-muted-foreground">Supplier Phone: </span>
                    <a
                      href={`tel:${order.suppliers.phone}`}
                      className="font-semibold text-sky-400 hover:underline"
                    >
                      {order.suppliers.phone}
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery Address */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle
                className="flex items-center gap-2 text-base"
                style={{ fontFamily: 'Rajdhani, sans-serif' }}
              >
                <MapPin className="w-4 h-4 text-sky-400" /> Delivery Address
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="font-medium">{order.delivery_address?.line1}</p>
              <p className="text-muted-foreground">
                {order.delivery_address?.city} - {order.delivery_address?.pincode}
              </p>
              {order.special_instructions && (
                <div className="mt-3 p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg text-amber-400 text-xs">
                  <strong>Instructions: </strong> {order.special_instructions}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reviews & Ratings Section once delivered */}
          {order.status === 'delivered' && (
            <Card className="glass-card border-amber-500/30 shadow-lg shadow-amber-500/5">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle
                  className="flex items-center gap-2 text-base"
                  style={{ fontFamily: 'Rajdhani, sans-serif' }}
                >
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />{' '}
                  {review ? 'Your Rating & Feedback' : 'Rate Your Delivery Experience'}
                </CardTitle>
                {review && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setReviewModalOpen(true)}
                    className="text-xs text-sky-400 hover:text-sky-300 h-8"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit Review
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {review ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-secondary/50 border border-border/50 text-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-4 h-4 ${
                                s <= review.rating
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-border'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground font-semibold">
                          {review.rating}/5 Stars
                        </span>
                      </div>

                      <p className="text-foreground text-xs leading-relaxed">
                        &quot;
                        {(review.comment || '').split('\n\n[Supplier Reply]: ')[0] ||
                          'Verified Order Feedback'}
                        &quot;
                      </p>
                    </div>

                    {(review.comment || '').includes('\n\n[Supplier Reply]: ') && (
                      <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs space-y-1">
                        <span className="font-bold text-sky-400 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5" /> Supplier Response:
                        </span>
                        <p className="text-foreground italic">
                          &quot;{(review.comment || '').split('\n\n[Supplier Reply]: ')[1]}&quot;
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-sky-500/10 border border-amber-500/20 text-center space-y-3">
                    <Sparkles className="w-7 h-7 text-amber-400 mx-auto animate-pulse" />
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        How was the water delivery?
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Your review helps {order.suppliers?.business_name} and fellow customers in Jodhpur!
                      </p>
                    </div>

                    <Button
                      onClick={() => setReviewModalOpen(true)}
                      className="water-shimmer text-white font-bold text-xs shadow-md"
                    >
                      <Star className="w-3.5 h-3.5 fill-white mr-1.5" /> Rate & Review Order Now
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Timeline/History logs */}
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
                    <p className="font-semibold">Order Placed</p>
                    <p className="text-muted-foreground/60">{formatDateTime(order.created_at)}</p>
                  </div>
                </div>
              ) : (
                tracking.map((t) => (
                  <div
                    key={t.id}
                    className="flex gap-3 items-start text-xs border-l border-border pl-4 relative last:border-0 pb-2"
                  >
                    <div className="absolute -left-1 top-1 w-2 h-2 rounded-full bg-sky-500" />
                    <div>
                      <p className="font-semibold capitalize">{t.status.replace('_', ' ')}</p>
                      {t.note && <p className="text-muted-foreground mt-0.5">{t.note}</p>}
                      <p className="text-muted-foreground/50 mt-1">
                        {formatDateTime(t.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Review Modal Dialog */}
      <ReviewModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        order={order}
        existingReview={review}
        onSuccess={() => fetchOrderDetails(false)}
      />

      {/* Order Cancellation Modal */}
      <ConfirmDialog
        isOpen={confirmCancelOpen}
        title="Order Cancel Karein?"
        message="Kya aap sach mein apna order cancel karna chahte hain? Confirm karne ke liye kripya cancel karne ka reason likhein."
        confirmText="Haan, Cancel Karo"
        cancelText="Wapas chalo"
        variant="destructive"
        requireReason={true}
        reasonPlaceholder="Cancel karne ka reason (e.g., Galti se order ho gaya, Plan change)..."
        loading={cancelling}
        onConfirm={(reason) => handleCancelOrder(reason)}
        onCancel={() => setConfirmCancelOpen(false)}
      />
    </div>
  )
}
