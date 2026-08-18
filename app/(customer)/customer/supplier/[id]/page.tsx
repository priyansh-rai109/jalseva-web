'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Building2, MapPin, Star, Phone, Package, Droplets,
  ShoppingCart, Plus, Minus, Truck, ArrowLeft, Loader2,
  CheckCircle2, MessageSquare, ThumbsUp, Sparkles, Filter, Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useCartStore } from '@/lib/stores/cart-store'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { formatCurrency, formatDate, getInitials } from '@/lib/utils'
import Link from 'next/link'
import type { Supplier, WaterProduct } from '@/types'

const productTypeIcons = { tanker: '🚛', can: '🫙', pouch: '💧' }

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const { t, language } = useLanguage()
  const { addItem, items, getTotalAmount, getTotalItems, supplier_id } = useCartStore()

  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [products, setProducts] = useState<WaterProduct[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [starFilter, setStarFilter] = useState<number | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [cartPop, setCartPop] = useState(false)

  const handleAddToCart = (product: WaterProduct, delta: number) => {
    addItem(product, delta)
    if (delta > 0) {
      setCartPop(true)
      setTimeout(() => setCartPop(false), 300)
      toast.success(`${product.name} ${t('addedToCart')}`, {
        action: {
          label: t('viewCart'),
          onClick: () => router.push('/customer/cart'),
        },
      })
    }
  }

  const handleBuyNow = (product: WaterProduct) => {
    addItem(product, 1)
    router.push('/customer/cart')
  }

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: sup }, { data: prods }, { data: revs }] = await Promise.all([
        supabase.from('suppliers').select('*, zones(name)').eq('id', id).maybeSingle(),
        supabase.from('water_products').select('*').eq('supplier_id', id).eq('is_active', true).order('type'),
        supabase.from('reviews').select('*, customers(name)').eq('supplier_id', id).order('created_at', { ascending: false }),
      ])
      setSupplier(sup)
      setProducts(prods || [])
      setReviews(revs || [])
      setLoading(false)
    }
    fetchData()
  }, [id, supabase])

  const getCartQty = (productId: string) => {
    return items.find((i) => i.product.id === productId)?.quantity || 0
  }

  const cartFromDifferentSupplier = supplier_id && supplier_id !== id

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length
    : (supplier?.rating || 0)

  const ratingDist = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => r.rating === star).length
    const pct = reviews.length ? (count / reviews.length) * 100 : 0
    return { star, count, pct }
  })

  const filteredReviews = starFilter === 'all'
    ? reviews
    : reviews.filter((r) => r.rating === starFilter)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
      </div>
    )
  }

  if (!supplier) {
    return <div className="p-8 text-center text-muted-foreground">{t('noSuppliersFound')}</div>
  }

  return (
    <div className="p-3 sm:p-5 md:p-8 space-y-5 sm:space-y-6 max-w-4xl mx-auto">
      {/* Back */}
      <Link href="/customer/browse" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> {t('backToSuppliers')}
      </Link>

      {/* Supplier Hero */}
      <Card className="glass-card overflow-hidden">
        <div className="h-20 sm:h-24 water-shimmer opacity-30" />
        <CardContent className="p-4 sm:p-5 -mt-10 sm:-mt-12 relative">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl water-shimmer flex items-center justify-center mb-3 sm:mb-4 border-4 border-card shadow-lg">
            <Building2 className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {supplier.business_name}
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm">{supplier.owner_name}</p>
              <div className="flex items-center gap-2 sm:gap-3 mt-2 flex-wrap text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 text-xs">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  {avgRating.toFixed(1)} ({reviews.length} {t('customerReviewsCount')})
                </span>
                <span className="flex items-center gap-1 text-xs">
                  <Truck className="w-3.5 h-3.5" /> {supplier.total_orders} {t('ordersCount')}
                </span>
                <span className="flex items-center gap-1 text-xs">
                  <MapPin className="w-3.5 h-3.5" /> {supplier.address}
                </span>
                {supplier.phone && (
                  <a href={`tel:${supplier.phone}`} className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300">
                    <Phone className="w-3.5 h-3.5" /> {supplier.phone}
                  </a>
                )}
              </div>
            </div>
            <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">✓ {t('verifiedSupplier')}</Badge>
          </div>
          {supplier.description && (
            <p className="mt-4 text-xs sm:text-sm text-muted-foreground">{supplier.description}</p>
          )}
        </CardContent>
      </Card>

      {/* Different supplier cart warning */}
      {cartFromDifferentSupplier && (
        <div className="p-3 sm:p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs sm:text-sm text-amber-300">
          ⚠️ {language === 'hi' ? 'आपकी कार्ट में किसी अन्य सप्लायर के उत्पाद हैं। यहाँ नया आइटम जोड़ने पर वह कार्ट बदल जाएगी।' : 'You have items from another supplier in your cart. Adding items here will clear that cart.'}
        </div>
      )}

      {/* Products */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold mb-4" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          {t('availableProducts')}
        </h2>

        {products.length === 0 ? (
          <div className="text-center py-12 glass-card rounded-2xl">
            <Package className="w-10 h-10 mx-auto text-muted-foreground opacity-30 mb-3" />
            <p className="text-muted-foreground text-sm">{language === 'hi' ? 'कोई उत्पाद उपलब्ध नहीं है' : 'No products available'}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {products.map((product) => {
              const qty = getCartQty(product.id)
              return (
                <Card key={product.id} className="glass-card hover:border-sky-500/30 transition-all flex flex-col justify-between">
                  <CardContent className="p-4 sm:p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="text-3xl p-2 rounded-xl bg-secondary/80 flex items-center justify-center flex-shrink-0">
                        {productTypeIcons[product.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base">{product.name}</h3>
                        {product.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{product.description}</p>
                        )}
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <Badge className="text-xs bg-secondary border-border text-muted-foreground capitalize">
                            {product.type === 'tanker' ? t('tanker') : product.type === 'can' ? t('can') : t('pouch')}
                          </Badge>
                          {product.capacity_liters && (
                            <Badge className="text-xs bg-secondary border-border text-muted-foreground">{product.capacity_liters}L</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <div className="text-lg sm:text-xl font-bold gradient-text" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                          {formatCurrency(product.price)}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{t('perUnit')} {product.unit}</div>
                      </div>

                      {qty === 0 ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddToCart(product, 1)}
                            className="text-xs font-semibold border-sky-500/30 text-sky-400 hover:bg-sky-500/10 min-h-[38px]"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> {t('addToCart')}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleBuyNow(product)}
                            className="water-shimmer text-white text-xs font-semibold min-h-[38px] shadow-sm"
                          >
                            <Zap className="w-3.5 h-3.5 mr-1" /> {t('buyNow')}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 bg-secondary/80 p-1 rounded-xl border border-border">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                              onClick={() => handleAddToCart(product, -1)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-6 text-center text-xs font-bold">{qty}</span>
                            <Button
                              size="icon"
                              className="h-7 w-7 rounded-lg water-shimmer text-white"
                              onClick={() => handleAddToCart(product, 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <Link href="/customer/cart">
                            <Button size="sm" className="water-shimmer text-white text-xs font-semibold min-h-[36px]">
                              {t('viewCart')}
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Customer Reviews & Ratings Showcase */}
      <div className="space-y-5 pt-4 border-t border-border/80">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              {t('customerReviewsAndRatings')} ({reviews.length})
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {language === 'hi'
                ? `${supplier.business_name} से पानी मंगवाने वाले ग्राहकों के सत्यापित अनुभव`
                : `Verified feedback from customers who ordered water from ${supplier.business_name}`}
            </p>
          </div>
        </div>

        {reviews.length > 0 && (
          <Card className="glass-card">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-6 items-center">
                {/* Average score */}
                <div className="text-center sm:border-r sm:border-border/60 sm:pr-8">
                  <div className="text-4xl sm:text-5xl font-extrabold gradient-text" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    {avgRating.toFixed(1)}
                  </div>
                  <div className="flex gap-1 justify-center mt-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-border'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                    {t('basedOn')} {reviews.length} {t('customerReviewsCount')}
                  </p>
                </div>

                {/* Rating Distribution Bar chart */}
                <div className="flex-1 w-full space-y-1.5">
                  {ratingDist.map(({ star, count, pct }) => (
                    <div key={star} className="flex items-center gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => setStarFilter(starFilter === star ? 'all' : star)}
                        className={`flex items-center gap-1 w-10 text-left hover:text-amber-400 font-medium ${
                          starFilter === star ? 'text-amber-400 font-bold' : 'text-muted-foreground'
                        }`}
                      >
                        <span>{star}</span>
                        <Star className="w-3 h-3 fill-current" />
                      </button>
                      <div className="flex-1 h-2.5 bg-secondary/80 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground w-8 text-right font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filter Pills */}
        {reviews.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pb-1">
            <span className="text-xs text-muted-foreground mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> {t('filterByRating')}:
            </span>
            <button
              onClick={() => setStarFilter('all')}
              className={`text-xs px-3 py-1 rounded-full border transition-all ${
                starFilter === 'all'
                  ? 'bg-sky-500 text-white border-sky-500 font-semibold'
                  : 'bg-secondary/60 text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              {t('all')} ({reviews.length})
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
                  {s} Star ({count})
                </button>
              )
            })}
          </div>
        )}

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <div className="p-8 text-center glass-card rounded-2xl space-y-2">
            <Droplets className="w-10 h-10 mx-auto text-sky-400 opacity-40 mb-1" />
            <p className="font-semibold text-sm">{language === 'hi' ? 'इस सप्लायर के लिए अभी कोई समीक्षा नहीं है' : 'No reviews yet for this supplier'}</p>
            <p className="text-xs text-muted-foreground">
              {language === 'hi'
                ? `${supplier.business_name} से पानी मंगवाएं और सबसे पहले अपनी राय साझा करें!`
                : `Order water from ${supplier.business_name} and be the first to share your experience!`}
            </p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-6 text-center glass-card rounded-xl text-xs text-muted-foreground">
            {starFilter}-star reviews not found.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReviews.map((rev: any) => {
              const rawComment = rev.comment || ''
              const parts = rawComment.split('\n\n[Supplier Reply]: ')
              const custComment = parts[0]
              const supplierReply = parts[1] || null
              const customerName = (rev.customers as any)?.name || 'Verified Customer'

              return (
                <Card key={rev.id} className="glass-card hover:border-amber-500/20 transition-all">
                  <CardContent className="p-4 sm:p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full water-shimmer flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                          {getInitials(customerName)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-foreground">{customerName}</span>
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] py-0 px-1.5">
                              ✓ {t('verifiedBuyer')}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-muted-foreground">{formatDate(rev.created_at)}</span>
                        </div>
                      </div>

                      {/* Stars */}
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= rev.rating ? 'text-amber-400 fill-amber-400' : 'text-border'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {custComment && (
                      <p className="text-xs text-foreground/90 leading-relaxed pl-0 sm:pl-12 whitespace-pre-line">
                        {custComment}
                      </p>
                    )}

                    {supplierReply && (
                      <div className="ml-0 sm:ml-12 p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-sky-400 font-bold">
                          <MessageSquare className="w-3.5 h-3.5" /> {t('supplierReply')}
                        </div>
                        <p className="text-foreground italic">&quot;{supplierReply}&quot;</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Floating cart bar */}
      {getTotalItems() > 0 && supplier_id === id && (
        <div className="fixed bottom-20 left-3 right-3 sm:left-6 sm:right-6 lg:bottom-6 lg:left-72 lg:right-6 z-40">
          <Link href="/customer/cart">
            <div className={`bg-sky-600 hover:bg-sky-500 text-white rounded-2xl p-3.5 sm:p-4 shadow-xl flex items-center justify-between cursor-pointer transition-all ${cartPop ? 'animate-cart-bounce ring-4 ring-sky-400/40' : ''}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 bg-white/20 rounded-full flex items-center justify-center transition-transform ${cartPop ? 'scale-125' : ''}`}>
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <span className="font-semibold text-xs sm:text-base">
                  {getTotalItems()} {t('itemsInCart')}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm sm:text-lg">{formatCurrency(getTotalAmount())}</span>
                <Badge className="bg-white text-sky-900 font-bold text-xs py-1 px-2.5">
                  {t('viewCart')}
                </Badge>
              </div>
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}
