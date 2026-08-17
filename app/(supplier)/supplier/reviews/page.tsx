'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Star, MessageSquare, Droplets, Filter, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { formatDate, getInitials } from '@/lib/utils'

export default function SupplierReviewsPage() {
  const supabase = createClient()
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [avgRating, setAvgRating] = useState(0)
  const [starFilter, setStarFilter] = useState<number | 'all'>('all')

  const fetchReviews = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    let supplierId: string | null = null
    const { data: supplier } = await supabase.from('suppliers').select('id').eq('user_id', user.id).maybeSingle()
    if (supplier) {
      supplierId = supplier.id
    } else {
      // Fallback: try by email or id
      const { data: altSupplier } = await supabase.from('suppliers').select('id').maybeSingle()
      if (altSupplier) supplierId = altSupplier.id
    }

    if (!supplierId) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('reviews')
      .select('*, customers(name, phone)')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      const reviewList = data || []
      setReviews(reviewList)
      if (reviewList.length > 0) {
        const total = reviewList.reduce((s: number, r: any) => s + Number(r.rating || 0), 0)
        setAvgRating(total / reviewList.length)
      } else {
        setAvgRating(0)
      }
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchReviews(true)

    // Realtime channel for instant reviews synchronization
    const channel = supabase
      .channel('supplier-reviews-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reviews' },
        (payload: any) => {
          console.log('[SupplierReviews] Realtime review event:', payload)
          toast.success('🌟 New customer review received!')
          fetchReviews(false)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchReviews, supabase])

  const ratingDist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    pct: reviews.length ? (reviews.filter((r) => r.rating === star).length / reviews.length) * 100 : 0,
  }))

  const filteredReviews = starFilter === 'all'
    ? reviews
    : reviews.filter((r) => r.rating === starFilter)

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Customer Reviews
          </h1>
          <p className="text-muted-foreground mt-1">See what your customers are saying and reply with greetings</p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchReviews(true)}
          disabled={loading}
          className="text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Summary */}
      {!loading && reviews.length > 0 && (
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-8 items-center">
              <div className="text-center sm:border-r sm:border-border/60 sm:pr-8">
                <div className="text-6xl font-bold gradient-text" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  {avgRating.toFixed(1)}
                </div>
                <div className="flex gap-0.5 justify-center mt-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-5 h-5 ${
                        s <= Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-border'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                  {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                </p>
              </div>

              <div className="flex-1 w-full space-y-2">
                {ratingDist.map(({ star, count, pct }) => (
                  <div key={star} className="flex items-center gap-2.5 text-sm">
                    <button
                      type="button"
                      onClick={() => setStarFilter(starFilter === star ? 'all' : star)}
                      className={`text-muted-foreground hover:text-amber-400 w-8 text-left text-xs font-semibold ${
                        starFilter === star ? 'text-amber-400 font-bold' : ''
                      }`}
                    >
                      {star}★
                    </button>
                    <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-muted-foreground w-6 text-right text-xs font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      {reviews.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pb-1 border-b border-border/60">
          <span className="text-xs text-muted-foreground mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          <button
            onClick={() => setStarFilter('all')}
            className={`text-xs px-3 py-1 rounded-full border transition-all ${
              starFilter === 'all'
                ? 'bg-sky-500 text-white border-sky-500 font-semibold'
                : 'bg-secondary/60 text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            All Reviews ({reviews.length})
          </button>
          {[5, 4, 3, 2, 1].map((s) => {
            const count = reviews.filter((r) => r.rating === s).length
            if (count === 0) return null
            return (
              <button
                key={s}
                onClick={() => setStarFilter(starFilter === s ? 'all' : s)}
                className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1 transition-all ${
                  starFilter === s
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-semibold shadow-sm'
                    : 'bg-secondary/60 text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {s}★ ({count})
              </button>
            )
          })}
        </div>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card h-28 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-2xl">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-3" />
          <p className="text-muted-foreground font-semibold">No reviews yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Customer reviews will appear here automatically when orders are delivered.
          </p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="p-6 text-center glass-card rounded-xl text-xs text-muted-foreground">
          No {starFilter}-star reviews found.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review: any) => {
            const rawComment = review.comment || ''
            const parts = rawComment.split('\n\n[Supplier Reply]: ')
            const customerComment = parts[0]
            const existingReply = parts[1] || null

            return (
              <SupplierReviewCard
                key={review.id}
                review={review}
                customerComment={customerComment}
                existingReply={existingReply}
                onReplySuccess={() => fetchReviews(false)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function SupplierReviewCard({
  review,
  customerComment,
  existingReply,
  onReplySuccess,
}: {
  review: any
  customerComment: string
  existingReply: string | null
  onReplySuccess: () => void
}) {
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [loading, setLoading] = useState(false)

  const quickGreetings = [
    'Thank you so much for your order! We look forward to serving you again! 🙏',
    'Thank you for your wonderful review! Glad to provide pure water! 💧',
    'We appreciate your feedback! Have a great day ahead! 😊',
  ]

  const handleSendReply = async (textToSend?: string) => {
    const message = textToSend || replyText
    if (!message.trim()) return

    setLoading(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId: review.id,
          reply: message,
        }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        toast.success('Greeting reply sent successfully!')
        setReplying(false)
        setReplyText('')
        onReplySuccess()
      } else {
        toast.error(json.error || 'Failed to send reply')
      }
    } catch (err) {
      toast.error('Error sending reply')
    }
    setLoading(false)
  }

  return (
    <Card className="glass-card hover:border-amber-500/20 transition-all">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full water-shimmer flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm">
            {getInitials((review.customers as any)?.name || 'C')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-sm font-bold text-foreground">
                {(review.customers as any)?.name || 'Verified Customer'}
              </span>
              <span className="text-xs text-muted-foreground">{formatDate(review.created_at)}</span>
            </div>
            <div className="flex gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-3.5 h-3.5 ${
                    s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-border'
                  }`}
                />
              ))}
            </div>
            {customerComment && (
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed whitespace-pre-line">
                &quot;{customerComment}&quot;
              </p>
            )}
          </div>
        </div>

        {/* Existing Reply Display */}
        {existingReply && (
          <div className="ml-12 p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-sky-400 font-bold">
              <MessageSquare className="w-3.5 h-3.5" />
              Supplier Greeting Reply:
            </div>
            <p className="text-foreground italic">&quot;{existingReply}&quot;</p>
          </div>
        )}

        {/* Reply Action */}
        {!replying ? (
          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              variant="outline"
              className="text-xs text-sky-400 border-sky-500/20 hover:bg-sky-500/10"
              onClick={() => setReplying(true)}
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
              {existingReply ? 'Edit Reply / Greeting' : 'Send Greeting Reply'}
            </Button>
          </div>
        ) : (
          <div className="ml-12 space-y-3 pt-2 border-t border-border/80">
            <p className="text-xs font-semibold text-muted-foreground">Select Quick Greeting or Type Custom Reply:</p>
            <div className="flex flex-wrap gap-1.5">
              {quickGreetings.map((g, idx) => (
                <Button
                  key={idx}
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="text-[11px] h-auto py-1 px-2.5 whitespace-normal text-left"
                  disabled={loading}
                  onClick={() => handleSendReply(g)}
                >
                  {g}
                </Button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type your greeting message..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 bg-secondary text-xs rounded-xl px-3 py-2 border border-border focus:outline-none focus:border-sky-500"
              />
              <Button
                size="sm"
                className="bg-sky-500 hover:bg-sky-400 text-white text-xs rounded-xl"
                disabled={loading}
                onClick={() => handleSendReply()}
              >
                Send
              </Button>
              <Button size="sm" variant="ghost" className="text-xs" onClick={() => setReplying(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
