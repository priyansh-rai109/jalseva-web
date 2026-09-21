'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  Search,
  Filter,
  Heart,
  MessageSquare,
  Phone,
  ArrowRight,
  Droplets,
  CheckCircle2,
  Share2,
  Eye,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ShortlistProvider, useShortlist } from '@/lib/context/ShortlistContext'
import { ShortlistDrawer } from '@/components/custom-prints/ShortlistDrawer'
import { CustomPrintsNav } from '@/components/custom-prints/CustomPrintsNav'
import { BottleDesignPublic, OCCASION_CATEGORIES } from '@/types/bottle-printing'
import { toast } from 'sonner'

const ADMIN_WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || '919166759989'
const ADMIN_PHONE_NUMBER =
  process.env.NEXT_PUBLIC_ADMIN_PHONE_NUMBER || '+919166759989'

// Occasion categories including 'All'
const CATEGORY_TABS = ['All', ...OCCASION_CATEGORIES]

// Distinct styling badges for different occasion categories
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

// ─── Design Card Component ───────────────────────────────────────────────────
function DesignCard({ design }: { design: BottleDesignPublic }) {
  const { isShortlisted, toggleShortlist } = useShortlist()
  const shortlisted = isShortlisted(design.design_code)

  const primaryImage = design.images?.[0] || ''

  const handleWhatsAppQuickEnquiry = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const text = encodeURIComponent(
      `Hi, I'm interested in Design ${design.design_code} - ${design.title} for ${design.occasion_category}. Please share pricing and availability.`
    )
    window.open(`https://wa.me/${ADMIN_WHATSAPP_NUMBER.replace(/[^0-9]/g, '')}?text=${text}`, '_blank')
  }

  const handleShortlistClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleShortlist({
      id: design.id,
      design_code: design.design_code,
      title: design.title,
      occasion_category: design.occasion_category,
      image: primaryImage,
    })
  }

  return (
    <div className="group relative rounded-2xl bg-card/70 hover:bg-card border border-border hover:border-sky-500/40 shadow-sm hover:shadow-xl hover:shadow-sky-500/5 transition-all duration-300 flex flex-col overflow-hidden">
      {/* Top Image Container */}
      <Link
        href={`/custom-prints/${encodeURIComponent(design.design_code)}`}
        className="block relative aspect-[4/5] w-full overflow-hidden bg-muted/40 cursor-pointer"
      >
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={design.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
            <Droplets className="w-8 h-8 text-muted-foreground/40 mb-2" />
            <span className="text-xs">No preview image</span>
          </div>
        )}

        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Design Code Badge - Top Left */}
        <div className="absolute top-3 left-3 z-10">
          <Badge className="bg-black/75 backdrop-blur-md text-sky-400 border border-sky-500/30 font-mono text-xs px-2.5 py-1 font-bold shadow-md">
            {design.design_code}
          </Badge>
        </div>

        {/* Shortlist Heart Button - Top Right */}
        <button
          onClick={handleShortlistClick}
          className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-200 ${
            shortlisted
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 scale-105'
              : 'bg-black/50 text-white/90 hover:bg-black/80 hover:text-rose-400 hover:scale-105'
          }`}
          aria-label={shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
          title={shortlisted ? 'In your shortlist' : 'Add to shortlist'}
        >
          <Heart className={`w-4 h-4 ${shortlisted ? 'fill-white' : ''}`} />
        </button>

        {/* Occasion Category Badge - Bottom Left on Image */}
        <div className="absolute bottom-3 left-3 z-10">
          <Badge
            variant="outline"
            className={`backdrop-blur-md text-[11px] font-semibold px-2.5 py-0.5 border shadow ${getOccasionBadgeStyle(
              design.occasion_category
            )}`}
          >
            {design.occasion_category}
          </Badge>
        </div>
      </Link>

      {/* Content Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <Link
            href={`/custom-prints/${encodeURIComponent(design.design_code)}`}
            className="hover:underline"
          >
            <h3 className="font-bold text-base sm:text-lg text-foreground group-hover:text-sky-400 transition-colors line-clamp-1">
              {design.title}
            </h3>
          </Link>

          {design.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
              {design.description}
            </p>
          )}

          {/* Tags preview */}
          {design.tags && design.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2.5">
              {design.tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded"
                >
                  #{tag}
                </span>
              ))}
              {design.tags.length > 3 && (
                <span className="text-[10px] text-muted-foreground/60">
                  +{design.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Card Actions */}
        <div className="pt-2 border-t border-border/60 flex items-center gap-2">
          <Link
            href={`/custom-prints/${encodeURIComponent(design.design_code)}`}
            className="flex-1"
          >
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs font-medium border-border hover:border-sky-500/40 hover:bg-sky-500/5 h-9"
            >
              <Eye className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
              View Details
            </Button>
          </Link>

          <Button
            size="sm"
            onClick={handleWhatsAppQuickEnquiry}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-3 h-9 flex items-center gap-1.5 shadow-sm shadow-emerald-600/20"
            title="Enquire on WhatsApp"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">WhatsApp</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Catalog Content ─────────────────────────────────────────────────────
function CatalogContent() {
  const [designs, setDesigns] = useState<BottleDesignPublic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Fetch designs on mount and on category change
  useEffect(() => {
    async function loadDesigns() {
      try {
        setLoading(true)
        setError(null)
        const params = new URLSearchParams()
        if (activeCategory !== 'All') {
          params.set('category', activeCategory)
        }
        if (searchQuery.trim()) {
          params.set('search', searchQuery.trim())
        }

        const res = await fetch(`/api/bottle-designs?${params.toString()}`)
        if (!res.ok) throw new Error('Failed to load designs')
        const data = await res.json()
        setDesigns(data.designs || [])
      } catch (err: any) {
        console.error('[Catalog Fetch Error]', err)
        setError('Unable to load bottle designs. Please check back shortly.')
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(() => {
      loadDesigns()
    }, 250)

    return () => clearTimeout(timer)
  }, [activeCategory, searchQuery])

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <CustomPrintsNav />

      {/* ─── Hero / Concept Intro ────────────────────────────────────────── */}
      <header className="relative py-12 sm:py-16 px-4 sm:px-6 lg:px-8 border-b border-border/60 bg-gradient-to-b from-sky-950/20 via-background to-background overflow-hidden">
        {/* Subtle glowing orbs */}
        <div className="absolute -top-16 left-1/3 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-4 relative z-10">
          <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 px-3.5 py-1 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-purple-400" />
            Personalized Water Bottles for Weddings, Parties & Corporate Events
          </Badge>

          <h1
            className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: 'Rajdhani, sans-serif' }}
          >
            Custom Water Bottle <span className="gradient-text">Printing Studio</span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Browse our curated custom bottle designs — call or WhatsApp us to order with your custom names, event date, and brand logo.
          </p>

          {/* Quick 3-Step Process Ribbon */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-muted-foreground font-medium">
            <div className="flex items-center gap-1.5 bg-card/60 border border-border/80 px-3 py-1.5 rounded-full">
              <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px] font-bold">1</span>
              <span>Browse & Shortlist Designs</span>
            </div>
            <span className="text-muted-foreground/40 hidden sm:inline">→</span>
            <div className="flex items-center gap-1.5 bg-card/60 border border-border/80 px-3 py-1.5 rounded-full">
              <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px] font-bold">2</span>
              <span>Quote Design Code via WhatsApp / Call</span>
            </div>
            <span className="text-muted-foreground/40 hidden sm:inline">→</span>
            <div className="flex items-center gap-1.5 bg-card/60 border border-border/80 px-3 py-1.5 rounded-full">
              <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px] font-bold">3</span>
              <span>Get Custom Quote & Delivery in Jodhpur</span>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Filter & Search Bar ─────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pb-4 border-b border-border/60">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORY_TABS.map((cat) => {
              const isActive = activeCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 border ${
                    isActive
                      ? 'bg-sky-500 text-white border-sky-400 shadow-sm shadow-sky-500/30'
                      : 'bg-card/60 text-muted-foreground hover:text-foreground border-border hover:border-border/80'
                  }`}
                >
                  {cat}
                </button>
              )
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search code or title (e.g. WD-101)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 text-xs h-9 bg-card/70 border-border"
            />
          </div>
        </div>

        {/* Results summary */}
        <div className="pt-4 pb-2 flex items-center justify-between text-xs text-muted-foreground">
          <div>
            Showing <span className="font-semibold text-foreground">{designs.length}</span> active design{designs.length === 1 ? '' : 's'}
            {activeCategory !== 'All' && <span> for <strong>{activeCategory}</strong></span>}
          </div>
          <div className="text-[11px]">
            Have a custom artwork?{' '}
            <a
              href={`https://wa.me/${ADMIN_WHATSAPP_NUMBER.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                'Hi, I have my own custom bottle artwork / logo. Can you print it?'
              )}`}
              target="_blank"
              rel="noreferrer"
              className="text-sky-400 hover:underline inline-flex items-center gap-1 font-medium"
            >
              Send on WhatsApp <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* ─── Grid of Designs ────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 py-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div
                key={n}
                className="rounded-2xl bg-card/40 border border-border/50 animate-pulse overflow-hidden h-96 flex flex-col"
              >
                <div className="aspect-[4/5] bg-muted/60 w-full" />
                <div className="p-4 space-y-2 flex-1">
                  <div className="h-4 bg-muted/80 rounded w-3/4" />
                  <div className="h-3 bg-muted/60 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-rose-400 font-medium text-sm">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveCategory('All')}
              className="text-xs"
            >
              Reset Filters
            </Button>
          </div>
        ) : designs.length === 0 ? (
          <div className="py-16 text-center max-w-md mx-auto space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
              <Layers className="w-6 h-6 text-muted-foreground/60" />
            </div>
            <h3 className="font-bold text-foreground text-base">No designs found</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              No active bottle designs match your selected category or search query. Try clearing the filters or contact us directly for custom designs.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveCategory('All')
                  setSearchQuery('')
                }}
                className="text-xs"
              >
                View All Designs
              </Button>
              <a
                href={`https://wa.me/${ADMIN_WHATSAPP_NUMBER.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                  'Hi JalSeva, I am looking for a custom bottle design that is not listed in the catalog.'
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs">
                  Request Custom Design
                </Button>
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 py-6">
            {designs.map((design) => (
              <DesignCard key={design.id} design={design} />
            ))}
          </div>
        )}
      </div>

      {/* ─── Bottom Banner CTA ───────────────────────────────────────────── */}
      <section className="mt-auto border-t border-border/80 bg-card/30 py-10 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Planning a Wedding, Birthday or Corporate Gala in Jodhpur?
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
            Get 250ml, 500ml, or 1-Litre customized label bottles delivered directly to your venue. Connect with our dedicated event printing manager today.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href={`https://wa.me/${ADMIN_WHATSAPP_NUMBER.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                'Hi JalSeva, I want to discuss customized water bottle printing for an upcoming event.'
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-5 shadow-lg shadow-emerald-600/20">
                <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                Chat on WhatsApp
              </Button>
            </a>
            <a href={`tel:${ADMIN_PHONE_NUMBER}`}>
              <Button variant="outline" className="border-border text-xs font-semibold px-4">
                <Phone className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
                Call: {ADMIN_PHONE_NUMBER}
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/60 py-6 px-4 text-center text-xs text-muted-foreground bg-background">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>© 2024 JalSeva — Custom Bottle Studio | Jodhpur, Rajasthan</span>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-foreground transition-colors">Water Tankers</Link>
            <Link href="/corporate" className="hover:text-foreground transition-colors">B2B Corporate</Link>
            <Link href="/custom-prints" className="text-sky-400 hover:underline">Bottle Catalog</Link>
          </div>
        </div>
      </footer>

      {/* Floating Shortlist Drawer */}
      <ShortlistDrawer />
    </div>
  )
}

export default function CustomPrintsPage() {
  return (
    <ShortlistProvider>
      <CatalogContent />
    </ShortlistProvider>
  )
}
