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
import { formatCurrency, formatDateTime, getOrderStatusColor, getOrderStatusLabel } from '@/lib/utils'

interface CustomerOrdersClientProps {
  initialOrders: any[]
}

export function CustomerOrdersClient({ initialOrders }: CustomerOrdersClientProps) {
  const router = useRouter()
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
        toast.success('Order cancel kar diya gaya hai')
        setOrders((prev) =>
          prev.map((o) => (o.id === cancellingOrderId ? { ...o, status: 'cancelled' } : o))
        )
        router.refresh()
      } else {
        toast.error(json.error || 'Failed to cancel order')
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
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="text-3xl">{productTypeIcon((order.water_products as any)?.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="font-semibold">{(order.water_products as any)?.name}</h3>
                    <div className="flex items-center gap-2">
                      {isDelivered && existingReview && (
                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400" /> Rated {existingReview.rating}/5
                        </Badge>
                      )}
                      <Badge className={`text-xs border ${getOrderStatusColor(order.status)}`}>
                        {getOrderStatusLabel(order.status)}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{(order.suppliers as any)?.business_name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                    <span>Qty: {order.quantity}</span>
                    <span>Payment: {order.payment_mode?.replace('_', ' ')}</span>
                    <span>{formatDateTime(order.created_at)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 mt-4 flex-wrap">
                    <Link href={`/customer/orders/${order.id}`}>
                      <Button variant="outline" size="sm" className="text-xs">
                        View Details & Tracking
                      </Button>
                    </Link>

                    {/* Prominent Rate & Review Button for Delivered Orders */}
                    {isDelivered && !existingReview && (
                      <Button
                        size="sm"
                        onClick={() => setReviewOrder(order)}
                        className="water-shimmer text-white text-xs font-bold shadow-md shadow-sky-500/20 animate-pulse"
                      >
                        <Star className="w-3.5 h-3.5 fill-white mr-1.5" />
                        Rate & Review Delivery
                      </Button>
                    )}

                    {isDelivered && existingReview && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setReviewOrder(order)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Edit Review
                      </Button>
                    )}

                    {canCancel && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                        onClick={() => setCancellingOrderId(order.id)}
                      >
                        <Ban className="w-3.5 h-3.5 mr-1" />
                        Cancel Order
                      </Button>
                    )}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
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
        title="Order Cancel Karein?"
        message="Kya aap sach mein apna order cancel karna chahte hain? Confirm karne ke liye kripya reason likhein."
        confirmText="Haan, Cancel Karo"
        cancelText="Wapas chalo"
        variant="destructive"
        requireReason={true}
        reasonPlaceholder="Cancel karne ka reason (e.g., Galti se order ho gaya, Plan change)..."
        loading={loadingCancel}
        onConfirm={(reason) => handleCancelOrder(reason)}
        onCancel={() => setCancellingOrderId(null)}
      />
    </div>
  )
}
