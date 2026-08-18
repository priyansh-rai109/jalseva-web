'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  ArrowLeft, Clock, CheckCircle2, Truck, XCircle,
  Star, Phone, MessageSquare, Loader2, MapPin, ClipboardList, Ban, Sparkles, Edit3, Navigation, Compass, FileText, KeyRound, ShieldCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ReviewModal } from '@/components/shared/ReviewModal'
import { LiveGpsMapModal } from '@/components/shared/LiveGpsMapModal'
import { TaxInvoiceModal } from '@/components/shared/TaxInvoiceModal'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { formatCurrency, formatDateTime, getOrderStatusColor, getOrderStatusLabel, getDeliveryPin } from '@/lib/utils'
import Link from 'next/link'

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const { t, language } = useLanguage()
  const [order, setOrder] = useState<any>(null)
  const [tracking, setTracking] = useState<any[]>([])
  const [review, setReview] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Cancel modal state
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  // Modals state
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [gpsModalOpen, setGpsModalOpen] = useState(false)
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const autoPromptTriggered = useRef(false)

  const steps = [
    {
      status: 'pending',
      label: language === 'hi' ? 'ऑर्डर दर्ज (Placed)' : 'Placed',
      desc: language === 'hi' ? 'सप्लायर पुष्टि की प्रतीक्षा में' : 'Awaiting supplier confirmation'
    },
    {
      status: 'confirmed',
      label: language === 'hi' ? 'स्वीकृत (Confirmed)' : 'Confirmed',
      desc: language === 'hi' ? 'सप्लायर ने स्वीकार किया और तैयार कर रहा है' : 'Supplier confirmed and preparing'
    },
    {
      status: 'out_for_delivery',
      label: language === 'hi' ? 'डिलीवरी पर निकला' : 'Out for Delivery',
      desc: language === 'hi' ? 'पानी का वाहन रास्ते में है' : 'Water is on the way'
    },
    {
      status: 'delivered',
      label: language === 'hi' ? 'डिलीवर हो गया' : 'Delivered',
      desc: language === 'hi' ? 'सफलतापूर्वक द्वार तक पहुंचाया गया' : 'Delivered successfully'
    },
  ]

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

  // Helper to extract driver details if assigned by supplier
  const parseDriverDetails = (instructions?: string) => {
    if (!instructions) return null
    const match = instructions.match(/\[Driver:\s*([^|]+)\s*\|\s*Phone:\s*([^|]+)\s*\|\s*Vehicle:\s*([^|]+)\s*\|\s*ETA:\s*([^\]]+)\]/)
    if (match) {
      return {
        driverName: match[1]?.trim(),
        driverPhone: match[2]?.trim(),
        vehicleNumber: match[3]?.trim(),
        eta: match[4]?.trim(),
      }
    }
    return null
  }

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
            toast.success(t('orderDeliveredNotification'))
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
        toast.success(t('orderCancelledToast'))
        fetchOrderDetails(false)
      } else {
        toast.error(json.error || (language === 'hi' ? 'ऑर्डर रद्द करने में समस्या आई' : 'Failed to cancel order'))
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
    return <div className="p-8 text-center text-muted-foreground">{t('noOrdersYet')}</div>
  }

  const currentStepIdx = steps.findIndex((s) => s.status === order.status)
  const isCancelled = order.status === 'cancelled'
  const canCancel = order.status === 'pending' || order.status === 'confirmed'
  const isDelivered = order.status === 'delivered'

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6 max-w-3xl mx-auto">
      {/* Back */}
      <Link
        href="/customer/orders"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> {t('backToOrders')}
      </Link>

      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {t('orderTrackingTitle')}
          </h1>
          <p className="text-muted-foreground text-xs mt-0.5 sm:mt-1">{t('orderId')}: {order.id}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Badge className={`text-xs sm:text-sm py-1 border ${getOrderStatusColor(order.status)}`}>
            {getTranslatedStatus(order.status)}
          </Badge>

          <Button
            variant="outline"
            size="sm"
            className="border-sky-500/30 text-sky-400 hover:bg-sky-500/10 text-xs min-h-[36px] gap-1.5"
            onClick={() => setInvoiceOpen(true)}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{language === 'hi' ? 'जीएसटी रसीद / Invoice' : 'Tax Invoice'}</span>
          </Button>

          {canCancel && (
            <Button
              variant="destructive"
              size="sm"
              className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-xs min-h-[36px]"
              onClick={() => setConfirmCancelOpen(true)}
            >
              <Ban className="w-3.5 h-3.5 mr-1" />
              {t('cancelOrder')}
            </Button>
          )}
        </div>
      </div>

      {/* Stepper */}
      {!isCancelled && (
        <Card className="glass-card">
          <CardContent className="p-4 sm:p-6">
            <div className="relative flex flex-col md:flex-row justify-between gap-4 md:gap-4">
              {steps.map((step, idx) => {
                const isDone = currentStepIdx >= idx
                const isCurrent = currentStepIdx === idx
                return (
                  <div key={step.status} className="flex md:flex-col items-center gap-3 md:gap-2 flex-1 relative">
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-all flex-shrink-0 z-10 ${isDone
                          ? 'border-sky-400 bg-sky-500/20 text-sky-400 font-bold shadow-md shadow-sky-500/20'
                          : 'border-border bg-secondary text-muted-foreground'
                        } ${isCurrent ? 'ring-4 ring-sky-500/20 scale-105' : ''}`}
                    >
                      {isDone ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" /> : idx + 1}
                    </div>
                    <div className="text-left md:text-center min-w-0">
                      <div className={`text-xs sm:text-sm font-semibold ${isDone ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {step.label}
                      </div>
                      <div className="text-[11px] text-muted-foreground leading-tight">{step.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4-Digit Delivery Security PIN Card */}
      {!isCancelled && !isDelivered && (
        <Card className="bg-gradient-to-r from-amber-500/15 via-sky-500/10 to-transparent border-amber-500/40 p-4 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span>{language === 'hi' ? 'डिलीवरी सुरक्षा पिन (Delivery Security PIN)' : 'Delivery Security PIN'}</span>
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] py-0">Secret PIN</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {language === 'hi'
                    ? 'पानी का जार प्राप्त होने पर यह 4-अंकों का पिन डिलीवरी ड्राइवर को बताएं'
                    : 'Share this 4-digit PIN with your delivery driver when water arrives'}
                </p>
              </div>
            </div>
            <div className="self-end sm:self-center bg-card/90 border border-amber-500/50 rounded-xl px-4 py-2 text-center shadow-inner">
              <span className="text-[10px] text-muted-foreground block font-medium">YOUR PIN</span>
              <span className="text-2xl font-black font-mono tracking-[0.25em] text-amber-400">
                {getDeliveryPin(order.id)}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Live GPS Route Tracking Banner */}
      {/* Real Live GPS Map Tracker Trigger Banner */}
      {!isCancelled && !isDelivered && (
        <Card className="glass-card border-sky-500/40 bg-gradient-to-r from-sky-950/40 via-blue-950/50 to-slate-900 overflow-hidden shadow-lg shadow-sky-500/10">
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl water-shimmer flex items-center justify-center text-white flex-shrink-0 shadow-md shadow-sky-500/20">
                  <Navigation className="w-6 h-6 animate-spin-slow" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-foreground" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                      {language === 'hi' ? '🛰️ लाइव जीपीएस डिलीवरी ट्रैकिंग (Live GPS Map)' : '🛰️ Live GPS Delivery Tracking'}
                    </h3>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] py-0 px-2 animate-pulse">
                      ● LIVE
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {language === 'hi'
                      ? `पानी का वाहन रास्ते में है${parseDriverDetails(order.special_instructions)?.eta ? ` (~${parseDriverDetails(order.special_instructions)?.eta} में पहुंचेगा)` : ' (~14 मिनट)'}। मैप पर लाइव लोकेशन देखें।`
                      : `Delivery vehicle is on the way${parseDriverDetails(order.special_instructions)?.eta ? ` (ETA: ~${parseDriverDetails(order.special_instructions)?.eta})` : ' (~14 mins)'}. Click below to view live telemetry map.`}
                  </p>
                </div>
              </div>

              <Button
                onClick={() => setGpsModalOpen(true)}
                className="w-full sm:w-auto water-shimmer text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-sky-500/20 flex items-center justify-center gap-1.5"
              >
                <Compass className="w-4 h-4 text-sky-200" />
                <span>{language === 'hi' ? 'लाइव मैप खोलें 🗺️' : 'Open Live GPS Map 🗺️'}</span>
              </Button>
            </div>

            {/* Assigned Driver Box (if dispatched with driver details) */}
            {parseDriverDetails(order.special_instructions) && (
              <div className="p-3 rounded-xl bg-secondary/70 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-lg flex-shrink-0">
                    👨‍✈️
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground flex items-center gap-2">
                      <span>{parseDriverDetails(order.special_instructions)?.driverName}</span>
                      <span className="text-[10px] text-muted-foreground font-mono bg-card/60 px-1.5 py-0.5 rounded border border-border/50">
                        {parseDriverDetails(order.special_instructions)?.vehicleNumber}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-400 font-medium mt-0.5">
                      📞 {parseDriverDetails(order.special_instructions)?.driverPhone}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a href={`tel:${parseDriverDetails(order.special_instructions)?.driverPhone}`} className="flex-1 sm:flex-initial">
                    <Button size="sm" className="w-full sm:w-auto water-shimmer text-white text-xs h-8">
                      <Phone className="w-3 h-3 mr-1" />
                      {language === 'hi' ? 'ड्राइवर को कॉल' : 'Call Driver'}
                    </Button>
                  </a>
                  <a
                    href={`https://wa.me/${parseDriverDetails(order.special_instructions)?.driverPhone.replace(/\D/g, '')}?text=Hello,%20regarding%20my%20water%20order%20%23${order.id.slice(0, 8)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 sm:flex-initial"
                  >
                    <Button size="sm" variant="outline" className="w-full sm:w-auto text-xs h-8 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10">
                      <MessageSquare className="w-3 h-3 mr-1" />
                      WhatsApp
                    </Button>
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Prominent Delivered Review Section */}
      {isDelivered && (
        <Card className="glass-card border-amber-500/30 overflow-hidden shadow-lg shadow-amber-500/5">
          <CardContent className="p-4 sm:p-6 space-y-4">
            {!review ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0 text-amber-400 shadow-inner">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground">
                      {t('rateAndReview')}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {language === 'hi'
                        ? 'आपका पानी सफलतापूर्वक डिलीवर हो गया! कृपया 1 मिनट देकर अपनी समीक्षा साझा करें।'
                        : 'Your water has been delivered! Please take 1 minute to share your review.'}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setReviewModalOpen(true)}
                  className="water-shimmer text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-sky-500/20 w-full sm:w-auto"
                >
                  <Star className="w-3.5 h-3.5 fill-white mr-1.5" /> {t('rateDelivery')} ⭐
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400" /> {review.rating}/5
                    </span>
                    <span className="text-xs text-muted-foreground">{t('yourReviewComment')}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReviewModalOpen(true)}
                    className="text-xs text-muted-foreground hover:text-foreground h-8"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1" /> {t('editReview')}
                  </Button>
                </div>
                {review.comment && (
                  <p className="text-xs text-foreground/90 bg-secondary/40 p-3 rounded-xl border border-border/40 whitespace-pre-line leading-relaxed">
                    {review.comment}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Supplier info & Order Items Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Supplier details */}
        <Card className="glass-card">
          <CardHeader className="p-4 sm:p-5 pb-2">
            <CardTitle className="text-base" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {t('supplierDetails')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-2 space-y-3">
            <div>
              <p className="font-semibold text-sm">{(order.suppliers as any)?.business_name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{(order.suppliers as any)?.owner_name}</p>
            </div>
            {(order.suppliers as any)?.phone && (
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${(order.suppliers as any).phone}`}
                  className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 bg-sky-500/10 px-3 py-1.5 rounded-lg border border-sky-500/20"
                >
                  <Phone className="w-3.5 h-3.5" /> Call Supplier
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Details */}
        <Card className="glass-card">
          <CardHeader className="p-4 sm:p-5 pb-2">
            <CardTitle className="text-base" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {language === 'hi' ? 'ऑर्डर विवरण (Order Items)' : 'Order Items'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-2 space-y-2">
            <div className="flex justify-between text-xs sm:text-sm">
              <span>{(order.water_products as any)?.name} × {order.quantity}</span>
              <span className="font-bold gradient-text">{formatCurrency(order.total_amount)}</span>
            </div>
            <div className="text-xs text-muted-foreground flex justify-between">
              <span>{language === 'hi' ? 'भुगतान माध्यम' : 'Payment Mode'}:</span>
              <span className="capitalize font-medium text-foreground">{order.payment_mode?.replace(/_/g, ' ')}</span>
            </div>
            {order.special_instructions && (
              <div className="pt-2 text-xs text-muted-foreground border-t border-border/40">
                <span className="font-semibold">{t('specialInstructions')}:</span> {order.special_instructions}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tax Invoice Modal */}
      {order && (
        <TaxInvoiceModal
          isOpen={invoiceOpen}
          onClose={() => setInvoiceOpen(false)}
          order={order}
        />
      )}

      {/* Review Modal */}
      {order && (
        <ReviewModal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          order={order}
          existingReview={review}
          onSuccess={(newReview) => {
            setReview(newReview)
            fetchOrderDetails(false)
          }}
        />
      )}

      {/* Live GPS Map Tracker Modal */}
      {order && (
        <LiveGpsMapModal
          isOpen={gpsModalOpen}
          onClose={() => setGpsModalOpen(false)}
          orderId={order.id}
          supplierName={order.suppliers?.business_name || 'JalSeva Verified Plant'}
          customerAddress={
            typeof order.delivery_address === 'object'
              ? `${order.delivery_address?.line1 || ''}, ${order.delivery_address?.city || ''}`
              : String(order.delivery_address || '')
          }
          driverName={
            parseDriverDetails(order.special_instructions)?.driverName ||
            (language === 'hi'
              ? `${order.suppliers?.business_name || 'सप्लायर'} (डिलीवरी टीम)`
              : `${order.suppliers?.business_name || 'Supplier'} (Delivery Executive)`)
          }
          driverPhone={
            parseDriverDetails(order.special_instructions)?.driverPhone ||
            order.suppliers?.phone ||
            '+919876543210'
          }
          vehicleNumber={
            parseDriverDetails(order.special_instructions)?.vehicleNumber ||
            'RJ-19-GA-5420'
          }
          productType={order.water_products?.type || 'can'}
        />
      )}

      {/* Confirmation Dialog for Order Cancellation */}
      <ConfirmDialog
        isOpen={confirmCancelOpen}
        title={t('cancelOrderConfirmTitle')}
        message={t('cancelOrderConfirmMsg')}
        confirmText={t('cancelOrderYes')}
        cancelText={t('cancelOrderNo')}
        variant="destructive"
        requireReason={true}
        reasonPlaceholder={t('cancelReasonPlaceholder')}
        loading={cancelling}
        onConfirm={(reason) => handleCancelOrder(reason)}
        onCancel={() => setConfirmCancelOpen(false)}
      />
    </div>
  )
}
