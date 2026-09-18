'use client'

import React, { useState, useEffect } from 'react'
import {
  AlertTriangle, MessageSquare, Loader2, CheckCircle2,
  Clock, ShieldAlert, X
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface ComplaintModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  orderShortId?: string
  onComplaintSubmitted?: (complaint: any) => void
}

const COMMON_REASONS = [
  'Water delivery delayed / late arrival',
  'Water quality or purity concern',
  'Can / container damaged or leaking',
  'Incorrect water quantity delivered',
  'Driver / delivery personnel issue',
  'Other delivery problem',
]

export function ComplaintModal({
  isOpen,
  onClose,
  orderId,
  orderShortId,
  onComplaintSubmitted,
}: ComplaintModalProps) {
  const { language } = useLanguage()
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [existingComplaints, setExistingComplaints] = useState<any[]>([])
  const [loadingExisting, setLoadingExisting] = useState(false)

  const shortId = orderShortId || orderId?.slice(0, 8).toUpperCase()

  // Fetch existing complaints for this order
  useEffect(() => {
    if (isOpen && orderId) {
      setLoadingExisting(true)
      fetch(`/api/complaints?order_id=${orderId}`)
        .then((res) => res.json())
        .then((data) => {
          setExistingComplaints(data.complaints || [])
        })
        .catch((err) => {
          console.error('Error fetching complaints:', err)
        })
        .finally(() => setLoadingExisting(false))
    }
  }, [isOpen, orderId])

  const handleReasonClick = (reason: string) => {
    if (!description) {
      setDescription(reason + ': ')
    } else if (!description.includes(reason)) {
      setDescription((prev) => `${prev.trim()}\n- ${reason}`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!description.trim() || description.trim().length < 5) {
      toast.error(
        language === 'hi'
          ? 'कृपया शिकायत का विवरण कम से कम 5 अक्षरों में लिखें'
          : 'Please enter a complaint description (min 5 characters)'
      )
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          description: description.trim(),
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        toast.success(
          language === 'hi'
            ? 'आपकी शिकायत दर्ज कर ली गई है और विश्लेषण के लिए भेज दी गई है।'
            : 'Complaint submitted successfully and forwarded for automated analysis.'
        )
        setExistingComplaints((prev) => [data.complaint, ...prev])
        setDescription('')
        if (onComplaintSubmitted) onComplaintSubmitted(data.complaint)
        onClose()
      } else {
        toast.error(data.error || 'Failed to submit complaint')
      }
    } catch (err: any) {
      console.error('Error submitting complaint:', err)
      toast.error('Network error submitting complaint')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass-card max-w-lg p-0 overflow-hidden border-amber-500/30">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-950 p-5 border-b border-border/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                <span>{language === 'hi' ? 'शिकायत दर्ज करें (File Complaint)' : 'Report an Issue / Complaint'}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {language === 'hi'
                  ? `ऑर्डर #${shortId} के संबंध में अपनी समस्या बताएं`
                  : `Report a delivery or water quality issue for Order #${shortId}`}
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Previous Complaints list if any */}
          {existingComplaints.length > 0 && (
            <div className="space-y-2 p-3 rounded-xl bg-secondary/50 border border-border">
              <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>{language === 'hi' ? 'पूर्व में दर्ज शिकायतें:' : 'Previous Complaints:'}</span>
              </div>
              {existingComplaints.map((c) => (
                <div key={c.id} className="p-2.5 rounded-lg bg-card/60 border border-border/60 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/20 text-[10px] capitalize py-0">
                      {c.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-foreground/90">{c.description}</p>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quick Suggestions */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {language === 'hi' ? 'त्वरित कारण चुनें:' : 'Common issue categories:'}
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => handleReasonClick(reason)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground hover:text-foreground transition-all text-left"
                  >
                    + {reason}
                  </button>
                ))}
              </div>
            </div>

            {/* Description Textarea */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>{language === 'hi' ? 'समस्या का विस्तार से विवरण:' : 'Describe the issue:'}</span>
                <span className="text-[11px] text-muted-foreground">{description.length}/2000</span>
              </Label>
              <Textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  language === 'hi'
                    ? 'कृपया विस्तार से बताएं (जैसे: पानी समय पर नहीं आया, पानी का स्वाद खराब है, या कैन टूटी हुई थी)...'
                    : 'Please provide details about the problem (e.g., late delivery, bad taste, broken seal)...'
                }
                className="bg-secondary text-sm resize-none"
              />
            </div>

            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
              <span>
                {language === 'hi'
                  ? 'आपकी शिकायत स्वचालित विश्लेषण वर्कफ़्लो में तुरंत भेजी जाएगी और एडमिन टीम समाधान सुनिश्चित करेगी।'
                  : 'Your complaint will be recorded securely and queued for automated sentiment & issue analysis.'}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
                {language === 'hi' ? 'रद्द करें' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting || description.trim().length < 5}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    {language === 'hi' ? 'दर्ज हो रहा है...' : 'Submitting...'}
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                    {language === 'hi' ? 'शिकायत भेजें' : 'Submit Complaint'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
