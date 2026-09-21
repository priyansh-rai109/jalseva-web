'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  MessageSquare,
  Phone,
  Heart,
  ArrowLeft,
  Copy,
  Check,
  Share2,
  Sparkles,
  ShieldCheck,
  Truck,
  Droplets,
  Calendar,
  Layers,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShortlistProvider, useShortlist } from '@/lib/context/ShortlistContext'
import { ShortlistDrawer } from '@/components/custom-prints/ShortlistDrawer'
import { CustomPrintsNav } from '@/components/custom-prints/CustomPrintsNav'
import { BottleDesignPublic } from '@/types/bottle-printing'
import { toast } from 'sonner'

const ADMIN_WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || '919166759989'
const ADMIN_PHONE_NUMBER =
  process.env.NEXT_PUBLIC_ADMIN_PHONE_NUMBER || '+919166759989'

function getOccasionBadgeStyle(occasion: string) {
  switch (occasion) {
    case 'Wedding':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    case 'Birthday':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    case 'Anniversary':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    case 'Corporate':
      return 'bg-sky-500/10 text-sky-400 border-sky-500/20'
    case 'Baby Shower':
      return 'bg-pink-500/10 text-pink-400 border-pink-500/20'
    case 'Festival':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    default:
      return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  }
}

function DetailContent() {
  const params = useParams()
  const router = useRouter()
  const rawCode = params?.designCode as string
  const designCode = rawCode ? decodeURIComponent(rawCode).trim().toUpperCase() : ''

  const [design, setDesign] = useState<BottleDesignPublic | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)

  const { isShortlisted, toggleShortlist } = useShortlist()

  useEffect(() => {
    async function loadDesign() {
      if (!designCode) return
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/bottle-designs/${encodeURIComponent(designCode)}`)
        if (res.status === 404) {
          setError('Design not found or no longer active')
          return
        }
        if (!res.ok) throw new Error('Failed to fetch design')
        const data = await res.json()
        setDesign(data.design)
      } catch (err: any) {
        console.error('[Design Detail Load Error]', err)
        setError('Unable to load design. Please check the code and try again.')
      } finally {
        setLoading(false)
      }
    }

    loadDesign()
  }, [designCode])

  const copyDesignCode = () => {
    if (!design) return
    navigator.clipboard.writeText(design.design_code)
    setCopiedCode(true)
    toast.success(`Design code ${design.design_code} copied!`)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const handleWhatsAppEnquiry = () => {
    if (!design) return
    const text = encodeURIComponent(
      `Hi, I'm interested in Design ${design.design_code} - ${design.title} for ${design.occasion_category}. Please share pricing and availability.`
    )
    window.open(`https://wa.me/${ADMIN_WHATSAPP_NUMBER.replace(/[^0-9]/g, '')}?text=${text}`, '_blank')
  }

  const handleShare = async () => {
    if (typeof window === 'undefined') return
    const shareUrl = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${design?.title} | JalSeva Custom Bottles`,
          text: `Check out this custom water bottle design: ${design?.design_code} - ${design?.title}`,
          url: shareUrl,
        })
      } catch {}
    } else {
      navigator.clipboard.writeText(shareUrl)
      toast.success('Link copied to clipboard!')
    }
  }

  const shortlisted = design ? isShortlisted(design.design_code) : false

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <CustomPrintsNav showBackButton={true} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Breadcrumb navigation */}
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-6 overflow-x-auto">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
          <Link href="/custom-prints" className="hover:text-foreground transition-colors">Custom Bottles</Link>
          <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-foreground font-medium truncate">
            {design ? design.design_code : designCode}
          </span>
        </nav>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 animate-pulse">
            <div className="lg:col-span-7 aspect-[4/5] bg-muted/60 rounded-3xl" />
            <div className="lg:col-span-5 space-y-4">
              <div className="h-6 bg-muted/80 rounded w-1/3" />
              <div className="h-8 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted/60 rounded w-full" />
              <div className="h-4 bg-muted/60 rounded w-2/3" />
              <div className="h-12 bg-muted/80 rounded-xl mt-6" />
            </div>
          </div>
        ) : error || !design ? (
          <div className="py-20 text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
              <Droplets className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Design Not Found</h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {error || `We couldn't find any active bottle design with code "${designCode}". It may have been archived or updated.`}
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Link href="/custom-prints">
                <Button variant="outline" size="sm" className="text-xs">
                  <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                  Browse Catalog
                </Button>
              </Link>
              <a
                href={`https://wa.me/${ADMIN_WHATSAPP_NUMBER.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                  `Hi JalSeva, I was looking for Design Code ${designCode}. Is it available?`
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs">
                  Ask on WhatsApp
                </Button>
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* ─── Left Column: Gallery / Images ──────────────────────────── */}
            <div className="lg:col-span-7 space-y-4">
              {/* Primary Large Image */}
              <div className="relative aspect-[4/5] sm:aspect-square md:aspect-[4/5] rounded-3xl overflow-hidden bg-muted/40 border border-border/80 shadow-xl group">
                {design.images && design.images[selectedImageIndex] ? (
                  <img
                    src={design.images[selectedImageIndex]}
                    alt={`${design.title} - ${design.design_code}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                    <Droplets className="w-12 h-12 text-muted-foreground/40 mb-2" />
                    <span>No image available</span>
                  </div>
                )}

                {/* Floating Heart / Shortlist Toggle */}
                <button
                  onClick={() =>
                    toggleShortlist({
                      id: design.id,
                      design_code: design.design_code,
                      title: design.title,
                      occasion_category: design.occasion_category,
                      image: design.images?.[0] || '',
                    })
                  }
                  className={`absolute top-4 right-4 z-10 p-3 rounded-full backdrop-blur-md transition-all shadow-lg ${
                    shortlisted
                      ? 'bg-rose-500 text-white shadow-rose-500/40 scale-105'
                      : 'bg-black/60 text-white hover:bg-black/80 hover:text-rose-400 hover:scale-105'
                  }`}
                  aria-label={shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
                  title={shortlisted ? 'In your shortlist' : 'Add to shortlist'}
                >
                  <Heart className={`w-5 h-5 ${shortlisted ? 'fill-white' : ''}`} />
                </button>

                {/* Watermark/Category Badge */}
                <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`backdrop-blur-md px-3 py-1 text-xs font-semibold shadow ${getOccasionBadgeStyle(
                      design.occasion_category
                    )}`}
                  >
                    {design.occasion_category}
                  </Badge>
                </div>
              </div>

              {/* Thumbnails Row (if multiple images) */}
              {design.images && design.images.length > 1 && (
                <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                  {design.images.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                        selectedImageIndex === idx
                          ? 'border-sky-500 ring-2 ring-sky-500/20 scale-95'
                          : 'border-border/60 hover:border-sky-400/50 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ─── Right Column: Details & Call To Action ──────────────────── */}
            <div className="lg:col-span-5 space-y-6">
              {/* Design Code Highlight Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-card border border-sky-500/30 shadow-lg shadow-sky-500/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Design Reference Code
                  </span>
                  <Badge className="bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs">
                    Quote when ordering
                  </Badge>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="text-2xl sm:text-3xl font-mono font-bold text-sky-400 tracking-wider">
                    {design.design_code}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyDesignCode}
                    className="border-sky-500/30 hover:border-sky-500/60 hover:bg-sky-500/10 text-xs h-8 px-2.5 flex items-center gap-1.5"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-sky-400" />}
                    <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                  </Button>
                </div>
              </div>

              {/* Title & Category */}
              <div>
                <h1
                  className="text-2xl sm:text-3xl font-bold text-foreground leading-tight"
                  style={{ fontFamily: 'Rajdhani, sans-serif' }}
                >
                  {design.title}
                </h1>

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <Badge
                    variant="outline"
                    className={`text-xs font-semibold px-2.5 py-0.5 ${getOccasionBadgeStyle(
                      design.occasion_category
                    )}`}
                  >
                    {design.occasion_category}
                  </Badge>

                  {design.tags && design.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/50"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Description */}
              {design.description && (
                <div className="space-y-1.5 pt-2 border-t border-border/60">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                    Design Details & Styling
                  </h4>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {design.description}
                  </p>
                </div>
              )}

              {/* Specifications / Available Options info (NO PRICING) */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-2 text-xs">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Customization Options:
                </div>
                <ul className="text-muted-foreground space-y-1 pl-4 list-disc">
                  <li>Available in 250ml, 500ml, and 1-Litre premium bottles</li>
                  <li>Custom names, event dates, monogram, or corporate logo imprinted</li>
                  <li>High-grade moisture-resistant waterproof label printing</li>
                  <li>Pure RO filtered drinking water sealed at plant</li>
                </ul>
              </div>

              {/* ─── CTA Action Buttons (WhatsApp & Call) ───────────────────── */}
              <div className="space-y-3 pt-2">
                {/* Button 1: Enquire on WhatsApp */}
                <Button
                  onClick={handleWhatsAppEnquiry}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3.5 text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/25 transition-all hover:scale-[1.01]"
                >
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Enquire on WhatsApp</span>
                </Button>

                {/* Button 2: Call Now */}
                <a
                  href={`tel:${ADMIN_PHONE_NUMBER}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold border border-border text-foreground hover:bg-card transition-all"
                >
                  <Phone className="w-4 h-4 text-sky-400" />
                  <span>Call Now ({ADMIN_PHONE_NUMBER})</span>
                </a>

                {/* Shortlist and Share secondary row */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    onClick={() =>
                      toggleShortlist({
                        id: design.id,
                        design_code: design.design_code,
                        title: design.title,
                        occasion_category: design.occasion_category,
                        image: design.images?.[0] || '',
                      })
                    }
                    className="flex-1 text-xs border-border hover:border-rose-400/50 hover:bg-rose-500/5 h-9"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 mr-1.5 ${
                        shortlisted ? 'fill-rose-400 text-rose-400' : 'text-muted-foreground'
                      }`}
                    />
                    <span>{shortlisted ? 'In Shortlist' : 'Add to Shortlist'}</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleShare}
                    className="text-xs border-border hover:bg-accent h-9 px-3"
                    title="Share Design"
                  >
                    <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </div>

              {/* How Ordering Works Notice */}
              <div className="p-3.5 rounded-xl bg-card border border-border/80 text-[11px] text-muted-foreground space-y-1">
                <span className="font-semibold text-foreground block">
                  How does ordering work?
                </span>
                <p className="leading-relaxed">
                  We don't display fixed prices online because each order is tailored by quantity, bottle volume, and label finishes. Quote <strong>{design.design_code}</strong> on WhatsApp or phone to receive instant bulk quotes and mockups for your event.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Shortlist Drawer */}
      <ShortlistDrawer />
    </div>
  )
}

export default function DesignDetailPage() {
  return (
    <ShortlistProvider>
      <DetailContent />
    </ShortlistProvider>
  )
}
