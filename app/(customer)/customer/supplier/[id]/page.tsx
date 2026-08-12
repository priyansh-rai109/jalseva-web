'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Building2, MapPin, Star, Phone, Package, Droplets,
  ShoppingCart, Plus, Minus, Truck, ArrowLeft, Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useCartStore } from '@/lib/stores/cart-store'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import type { Supplier, WaterProduct } from '@/types'

const productTypeIcons = { tanker: '🚛', can: '🫙', pouch: '💧' }

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const { addItem, items, getTotalAmount, getTotalItems, supplier_id } = useCartStore()

  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [products, setProducts] = useState<WaterProduct[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [cartPop, setCartPop] = useState(false)

  const handleAddToCart = (product: WaterProduct, delta: number) => {
    addItem(product, delta)
    if (delta > 0) {
      setCartPop(true)
      setTimeout(() => setCartPop(false), 300)
    }
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
  }, [id])

  const getCartQty = (productId: string) => {
    return items.find((i) => i.product.id === productId)?.quantity || 0
  }

  const cartFromDifferentSupplier = supplier_id && supplier_id !== id

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
      </div>
    )
  }

  if (!supplier) {
    return <div className="p-8 text-center text-muted-foreground">Supplier not found</div>
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Back */}
      <Link href="/customer/browse" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to suppliers
      </Link>

      {/* Supplier Hero */}
      <Card className="glass-card overflow-hidden">
        <div className="h-24 water-shimmer opacity-30" />
        <CardContent className="p-5 -mt-12 relative">
          <div className="w-20 h-20 rounded-2xl water-shimmer flex items-center justify-center mb-4 border-4 border-card">
            <Building2 className="w-10 h-10 text-white" />
          </div>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {supplier.business_name}
              </h1>
              <p className="text-muted-foreground text-sm">{supplier.owner_name}</p>
              <div className="flex items-center gap-3 mt-2 flex-wrap text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  {supplier.rating?.toFixed(1) || '0.0'} rating
                </span>
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5" /> {supplier.total_orders} orders
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {supplier.address}
                </span>
                {supplier.phone && (
                  <a href={`tel:${supplier.phone}`} className="flex items-center gap-1 text-sky-400 hover:text-sky-300">
                    <Phone className="w-3.5 h-3.5" /> {supplier.phone}
                  </a>
                )}
              </div>
            </div>
            <Badge className="bg-green-500/10 text-green-400 border-green-500/20">✓ Verified</Badge>
          </div>
          {supplier.description && (
            <p className="mt-4 text-sm text-muted-foreground">{supplier.description}</p>
          )}
        </CardContent>
      </Card>

      {/* Different supplier cart warning */}
      {cartFromDifferentSupplier && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300">
          ⚠️ You have items from another supplier in your cart. Adding items here will clear that cart.
        </div>
      )}

      {/* Products */}
      <div>
        <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          Available Products
        </h2>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-10 h-10 mx-auto text-muted-foreground opacity-30 mb-3" />
            <p className="text-muted-foreground text-sm">No products available</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {products.map((product) => {
              const qty = getCartQty(product.id)
              return (
                <Card key={product.id} className="glass-card hover:border-sky-500/20 transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">{productTypeIcons[product.type]}</div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{product.name}</h3>
                        {product.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{product.description}</p>
                        )}
                        <div className="flex gap-2 mt-2">
                          <Badge className="text-xs bg-secondary border-border text-muted-foreground capitalize">{product.type}</Badge>
                          {product.capacity_liters && (
                            <Badge className="text-xs bg-secondary border-border text-muted-foreground">{product.capacity_liters}L</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xl font-bold gradient-text" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                          {formatCurrency(product.price)}
                        </div>
                        <div className="text-xs text-muted-foreground">per {product.unit}</div>
                      </div>

                      {qty === 0 ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            handleAddToCart(product, 1)
                            toast.success(`${product.name} added to cart`)
                          }}
                          className="water-shimmer text-white"
                        >
                          <Plus className="w-4 h-4 mr-1" /> Add
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => handleAddToCart(product, -1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                          <Button
                            size="icon"
                            className="h-8 w-8 water-shimmer text-white"
                            onClick={() => handleAddToCart(product, 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
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

      {/* Customer Reviews & Ratings */}
      <div className="space-y-4 pt-4 border-t border-border">
        <h2 className="text-xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          Customer Reviews & Ratings ({reviews.length})
        </h2>

        {reviews.length === 0 ? (
          <div className="p-6 text-center glass-card text-muted-foreground text-sm">
            No customer reviews for this supplier yet. Be the first to order and review!
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((rev: any) => {
              const rawComment = rev.comment || ''
              const parts = rawComment.split('\n\n[Supplier Reply]: ')
              const custComment = parts[0]
              const supplierReply = parts[1] || null

              return (
                <Card key={rev.id} className="glass-card">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{(rev.customers as any)?.name || 'Customer'}</span>
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
                      <p className="text-xs text-muted-foreground">&quot;{custComment}&quot;</p>
                    )}

                    {supplierReply && (
                      <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-xs space-y-1 mt-2">
                        <span className="font-bold text-sky-400 block">💬 Supplier Response:</span>
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
      {getTotalItems() > 0 && supplier_id === id && (
        <div className="fixed bottom-6 left-72 right-6 z-40">
          <Link href="/customer/cart">
            <div className={`bg-sky-600 hover:bg-sky-500 text-white rounded-2xl p-4 shadow-xl flex items-center justify-between cursor-pointer transition-all ${cartPop ? 'animate-cart-bounce ring-4 ring-sky-400/40' : ''}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 bg-white/20 rounded-full flex items-center justify-center transition-transform ${cartPop ? 'scale-125' : ''}`}>
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <span className="font-semibold">{getTotalItems()} items in cart</span>
              </div>
              <span className="font-bold text-lg">{formatCurrency(getTotalAmount())}</span>
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}
