'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Star, MessageSquare, Droplets } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate, getInitials } from '@/lib/utils'

export default function SupplierReviewsPage() {
  const supabase = createClient()
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [avgRating, setAvgRating] = useState(0)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: supplier } = await supabase.from('suppliers').select('id').eq('user_id', user.id).single()
      if (!supplier) return

      const { data } = await supabase
        .from('reviews')
        .select('*, customers(name)')
        .eq('supplier_id', supplier.id)
        .order('created_at', { ascending: false })

      const reviewList = data || []
      setReviews(reviewList)
      if (reviewList.length) {
        setAvgRating(reviewList.reduce((s: number, r: any) => s + r.rating, 0) / reviewList.length)
      }
      setLoading(false)
    }
    init()
  }, [])

  const ratingDist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: reviews.length ? (reviews.filter(r => r.rating === star).length / reviews.length) * 100 : 0,
  }))

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Customer Reviews</h1>
        <p className="text-muted-foreground mt-1">See what your customers are saying</p>
      </div>

      {/* Summary */}
      {!loading && reviews.length > 0 && (
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex gap-8 items-center">
              <div className="text-center">
                <div className="text-6xl font-bold gradient-text" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  {avgRating.toFixed(1)}
                </div>
                <div className="flex gap-0.5 justify-center mt-2">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className={`w-5 h-5 ${s <= Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-border'}`} />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{reviews.length} reviews</p>
              </div>
              <div className="flex-1 space-y-2">
                {ratingDist.map(({ star, count, pct }) => (
                  <div key={star} className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground w-6">{star}★</span>
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-muted-foreground w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="glass-card h-28 animate-pulse" />)}</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-3" />
          <p className="text-muted-foreground">No reviews yet</p>
          <p className="text-xs text-muted-foreground mt-1">Reviews appear after customers receive their orders</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review: any) => (
            <Card key={review.id} className="glass-card hover:border-amber-500/20 transition-all">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full water-shimmer flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {getInitials((review.customers as any)?.name || 'C')}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{(review.customers as any)?.name || 'Customer'}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(review.created_at)}</span>
                    </div>
                    <div className="flex gap-0.5 mt-1">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-border'}`} />
                      ))}
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">&quot;{review.comment}&quot;</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
