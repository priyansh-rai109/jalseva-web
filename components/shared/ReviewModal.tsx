'use client'

import React, { useState, useEffect } from 'react'
import { Star, Sparkles, X, Loader2, CheckCircle2, MessageSquare, ThumbsUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface ReviewModalProps {
  isOpen: boolean
  onClose: () => void
  order: {
    id: string
    water_products?: { name: string; type?: string }
    suppliers?: { id?: string; business_name: string }
  }
  existingReview?: {
    id?: string
    rating: number
    comment?: string
  } | null
  onSuccess?: (newReview: any) => void
}

const RATING_LABELS = [
  '',
  'Disappointing 😞',
  'Could be better 😐',
  'Good experience 🙂',
  'Very Good! 😊',
  'Excellent Service! 🌟',
]

const QUICK_TAGS = [
  '💧 Pure & Fresh Water',
  '⏰ On-Time Delivery',
  '🤝 Polite & Helpful Supplier',
  '📦 Clean Cans & Packaging',
  '⚡ Super Fast Service',
  '💰 Fair & Honest Pricing',
]

export function ReviewModal({
  isOpen,
  onClose,
  order,
  existingReview,
  onSuccess,
}: ReviewModalProps) {
  const [rating, setRating] = useState<number>(existingReview?.rating || 5)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [comment, setComment] = useState<string>('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [submitting, setSubmitting] = useState<boolean>(false)

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating || 5)
      const raw = existingReview.comment || ''
      const cleaned = raw.split('\n\n[Supplier Reply]:')[0].trim()
      setComment(cleaned)
    } else {
      setRating(5)
      setComment('')
      setSelectedTags([])
    }
  }, [existingReview, isOpen])

  if (!isOpen) return null

  const handleTagToggle = (tag: string) => {
    const isSelected = selectedTags.includes(tag)
    const newTags = isSelected ? selectedTags.filter((t) => t !== tag) : [...selectedTags, tag]
    setSelectedTags(newTags)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rating || rating < 1) {
      toast.error('Please select a star rating')
      return
    }

    setSubmitting(true)
    try {
      // Combine selected tags with user comment if any
      const tagText = selectedTags.length > 0 ? selectedTags.join(' • ') : ''
      let finalComment = comment.trim()
      if (tagText) {
        finalComment = finalComment ? `${tagText}\n\n${finalComment}` : tagText
      }

      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          rating,
          comment: finalComment || null,
        }),
      })

      const json = await res.json()
      if (res.ok && json.success) {
        toast.success('Thank you! Your review has been published ⭐')
        if (onSuccess) onSuccess(json.review)
        onClose()
      } else {
        toast.error(json.error || 'Failed to submit review')
      }
    } catch (err) {
      console.error('[Review Submit Error]', err)
      toast.error('Network error submitting review')
    } finally {
      setSubmitting(false)
    }
  }

  const currentDisplayRating = hoverRating || rating

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-sky-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 relative animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-secondary/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1.5 pt-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Order Delivered Successfully!
          </div>
          <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Rate Your Experience
          </h2>
          <p className="text-xs text-muted-foreground">
            How was the water delivery from{' '}
            <strong className="text-foreground">
              {order.suppliers?.business_name || 'your supplier'}
            </strong>
            ?
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Star Rating Selector */}
          <div className="flex flex-col items-center justify-center gap-2 py-2 bg-secondary/30 rounded-2xl border border-border/40">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = star <= currentDisplayRating
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1.5 transition-transform hover:scale-125 active:scale-95 focus:outline-none"
                  >
                    <Star
                      className={`w-9 h-9 sm:w-10 sm:h-10 transition-colors duration-150 ${
                        isFilled
                          ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                          : 'text-muted-foreground/30 hover:text-amber-400/60'
                      }`}
                    />
                  </button>
                )
              })}
            </div>

            {/* Dynamic Sentiment label */}
            <span className="text-sm font-semibold text-amber-400 h-5">
              {RATING_LABELS[currentDisplayRating] || ''}
            </span>
          </div>

          {/* Quick Feedback Chips */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <ThumbsUp className="w-3.5 h-3.5 text-sky-400" /> What went well? (Optional)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                      isSelected
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-sm shadow-sky-500/20'
                        : 'bg-secondary/60 text-muted-foreground border-border/60 hover:border-sky-500/30 hover:text-foreground'
                    }`}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Detailed comment box */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-sky-400" /> Write a review (Optional)
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell others about the water quality, cleanliness, delivery speed, and overall service..."
              className="bg-secondary resize-none text-xs rounded-xl focus:border-sky-500"
              rows={3}
              maxLength={500}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Your review helps other families in Jodhpur choose pure water!</span>
              <span>{comment.length}/500</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 text-xs rounded-xl border-border"
            >
              Maybe Later
            </Button>
            <Button
              type="submit"
              disabled={submitting || rating === 0}
              className="flex-1 water-shimmer text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-500/20"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Submit Review
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
