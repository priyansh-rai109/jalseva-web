'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Droplets, Clock, CheckCircle2, Truck, XCircle, Ban, Star, Sparkles
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ReviewModal } from '@/components/shared/ReviewModal'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { formatCurrency, formatDateTime, getOrderStatusColor, getOrderStatusLabel } from '@/lib/utils'

interface CustomerOrdersClientProps {
  initialOrders: any[]
}

export function CustomerOrdersClient({ initialOrders }: CustomerOrdersClientProps) {
  const router = useRouter()
  const { t, language } = useLanguage()
  const [orders, setOrders] = useState<any[]>(initialOrders)
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null)
  const [loadingCancel, setLoadingCancel] = useState(false)

  // Review modal state
  const [reviewOrder, setReviewOrder] = useState<any | null>(null)

  const statusIcon = (status: string) => {
    if (status === 'pending') return <Clock className="w-4 h-4 text-yellow-400" />
    if (status === 'confirmed') return <CheckCircle2 className="w-4 h-4 text-blue-400" />
    if (status === 'out_for_delivery') return <Truck className="w-4 h-4 text-purple-400" />
    if (status === 'delivered') return <CheckCircle2 className="w-4 h-4 text-green-400" />
    if (status === 'cancelled') return <XCircle className="w-4 h-4 text-red-400" />
    return null
  }

  const productTypeIcon = (type: string) => {
    if (type === 'tanker') return '🚛'
    if (type === 'can') return '🫙'
    return '💧'
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

  const handleCancelOrder = async (reason?: string) => {
    if (!cancellingOrderId) return
    setLoadingCancel(true)
    try {
      const res = await fetch(`/api/orders/${cancellingOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', reason }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        toast.success(t('orderCancelledToast'))
        setOrders((prev) =>
          prev.map((o) => (o.id === cancellingOrderId ? { ...o, status: 'cancelled' } : o))
        )
        router.refresh()
      } else {
        toast.error(json.error || (language === 'hi' ? 'ऑर्डर रद्द करने में समस्या आई' : 'Failed to cancel order'))
      }
    } catch (err) {
      toast.error('Error cancelling order')
    }
    setLoadingCancel(false)
    setCancellingOrderId(null)
  }

  const handleReviewSuccess = (newReview: any) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === reviewOrder?.id ? { ...o, reviews: [newReview] } : o
      )
    )
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {orders.map((order: any) => {
        const canCancel = order.status === 'pending' || order.status === 'confirmed'
        const isDelivered = order.status === 'delivered'
        const existingReview =
          Array.isArray(order.reviews) && order.reviews.length > 0
            ? order.reviews[0]
            : order.reviews || null

        return (
          <Card key={order.id} className="glass-card hover:border-sky-500/30 transition-all">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                <div className="flex items-center justify-between sm:justify-start gap-3">
                  <div className="text-3xl sm:text-4xl p-2 rounded-xl bg-secondary/60 flex items-center justify-center shrink-0">
                    {productTypeIcon((order.water_products as any)?.type)}
                  </div>
                  <div className="sm:hidden text-right">
                    <div className="text-lg font-bold gradient-text" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                      {formatCurrency(order.total_amount)}
                    </div>
                    <Badge className={`mt-0.5 text-[10px] border ${getOrderStatusColor(order.status)}`}>
                      {getTranslatedStatus(order.status)}
                    </Badge>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="hidden sm:flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="font-semibold text-base sm:text-lg">{(order.water_products as any)?.name}</h3>
                    <div className="flex items-center gap-2">
                      {isDelivered && existingReview && (
                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400" /> Rated {existingReview.rating}/5
                        </Badge>
                      )}
                      <Badge className={`text-xs border ${getOrderStatusColor(order.status)}`}>
                        {getTranslatedStatus(order.status)}
                      </Badge>
                    </div>
                  </div>

                  <h3 className="sm:hidden font-semibold text-base">{(order.water_products as any)?.name}</h3>

                  <p className="text-sm text-muted-foreground mt-0.5 sm:mt-1">{(order.suppliers as any)?.business_name}</p>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                    <span>{t('quantity')}: {order.quantity}</span>
                    <span>•</span>
                    <span className="capitalize">{order.payment_mode?.replace(/_/g, ' ')}</span>
                    <span>•</span>
                    <span>{formatDateTime(order.created_at)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 sm:gap-3 mt-4 flex-wrap">
                    <Link href={`/customer/orders/${order.id}`} className="flex-1 sm:flex-initial">
                      <Button variant="outline" size="sm" className="w-full text-xs min-h-[38px]">
                        {t('viewDetailsAndTracking')}
                      </Button>
                    </Link>

                    {/* Prominent Rate & Review Button for Delivered Orders */}
                    {isDelivered && !existingReview && (
                      <Button
                        size="sm"
                        onClick={() => setReviewOrder(order)}
                        className="flex-1 sm:flex-initial water-shimmer text-white text-xs font-bold shadow-md shadow-sky-500/20 animate-pulse min-h-[38px]"
                      >
                        <Star className="w-3.5 h-3.5 fill-white mr-1.5" />
                        {t('rateAndReview')}
                      </Button>
                    )}

                    {isDelivered && existingReview && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setReviewOrder(order)}
                        className="text-xs text-muted-foreground hover:text-foreground min-h-[38px]"
                      >
                        {t('editReview')}
                      </Button>
                    )}

                    {canCancel && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 min-h-[38px]"
                        onClick={() => setCancellingOrderId(order.id)}
                      >
                        <Ban className="w-3.5 h-3.5 mr-1" />
                        {t('cancelOrder')}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="hidden sm:block text-right flex-shrink-0">
                  <div className="text-lg font-bold gradient-text" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    {formatCurrency(order.total_amount)}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-muted-foreground justify-end">
                    {statusIcon(order.status)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Reusable Review Modal */}
      {reviewOrder && (
        <ReviewModal
          isOpen={!!reviewOrder}
          onClose={() => setReviewOrder(null)}
          order={reviewOrder}
          existingReview={
            Array.isArray(reviewOrder.reviews) && reviewOrder.reviews.length > 0
              ? reviewOrder.reviews[0]
              : reviewOrder.reviews || null
          }
          onSuccess={handleReviewSuccess}
        />
      )}

      {/* Confirmation Dialog for Order Cancellation */}
      <ConfirmDialog
        isOpen={!!cancellingOrderId}
        title={t('cancelOrderConfirmTitle')}
        message={t('cancelOrderConfirmMsg')}
        confirmText={t('cancelOrderYes')}
        cancelText={t('cancelOrderNo')}
        variant="destructive"
        requireReason={true}
        reasonPlaceholder={t('cancelReasonPlaceholder')}
        loading={loadingCancel}
        onConfirm={(reason) => handleCancelOrder(reason)}
        onCancel={() => setCancellingOrderId(null)}
      />
    </div>
  )
}
