'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/stores/cart-store'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  ShoppingCart, Trash2, Plus, Minus, MapPin,
  Loader2, ChevronRight, Package, Droplets
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { OrderSuccessModal } from '@/components/shared/OrderSuccessModal'
import Link from 'next/link'

const checkoutSchema = z.object({
  line1: z.string().min(5, 'Address required'),
  pincode: z.string().min(6, 'Valid pincode required'),
  city: z.string().min(2, 'City required'),
  payment_mode: z.enum(['cash_on_delivery', 'upi', 'razorpay']),
  special_instructions: z.string().optional(),
})

type CheckoutForm = z.infer<typeof checkoutSchema>

const productTypeIcons: Record<string, string> = { tanker: '🚛', can: '🫙', pouch: '💧' }

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function CartPage() {
  const router = useRouter()
  const supabase = createClient()
  const { items, removeItem, updateQuantity, clearCart, getTotalAmount, getTotalItems, supplier_id } = useCartStore()
  const [placing, setPlacing] = useState(false)
  const [step, setStep] = useState<'cart' | 'checkout'>('cart')
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { payment_mode: 'cash_on_delivery', city: 'Jodhpur' },
  })

  const paymentMode = watch('payment_mode')

  const placeOrder = async (data: CheckoutForm) => {
    if (items.length === 0) return
    setPlacing(true)

    const deliveryAddress = {
      id: crypto.randomUUID(),
      label: 'Delivery',
      line1: data.line1,
      pincode: data.pincode,
      city: data.city,
      is_default: false,
    }

    try {
      const totalAmt = getTotalAmount()

      // 1. Create order in JalSeva backend
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          deliveryAddress,
          paymentMode: data.payment_mode,
          specialInstructions: data.special_instructions,
        }),
      })

      const json = await res.json()

      if (!res.ok || !json.order) {
        toast.error(json.error || 'Failed to place order')
        setPlacing(false)
        return
      }

      const createdOrderId = json.order.id

      // 2. If Razorpay is chosen, launch Razorpay Checkout Modal
      if (data.payment_mode === 'razorpay') {
        const loaded = await loadRazorpayScript()
        if (!loaded) {
          toast.error('Failed to load Razorpay SDK. Please check your connection.')
          setPlacing(false)
          return
        }

        const rzpRes = await fetch('/api/payments/create-razorpay-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: totalAmt,
            orderId: createdOrderId,
          }),
        })

        const rzpJson = await rzpRes.json()

        if (!rzpRes.ok || !rzpJson.id) {
          toast.error(rzpJson.error || 'Failed to initiate Razorpay payment')
          setPlacing(false)
          return
        }

        const options = {
          key: rzpJson.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_T34XmzvqjTeeXs',
          amount: rzpJson.amount,
          currency: rzpJson.currency || 'INR',
          name: 'JalSeva Water Delivery',
          description: `Payment for Order #${createdOrderId.slice(0, 8)}`,
          order_id: rzpJson.id,
          handler: async (response: any) => {
            try {
              const verifyRes = await fetch('/api/payments/verify-razorpay-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  orderId: createdOrderId,
                }),
              })

              const verifyJson = await verifyRes.json()

              if (verifyRes.ok && verifyJson.success) {
                toast.success('🎉 Razorpay Payment Verified Successfully!')
                clearCart()
                setShowSuccessModal(true)
              } else {
                toast.error(verifyJson.error || 'Payment verification failed')
              }
            } catch (err) {
              toast.error('Error verifying payment')
            }
          },
          modal: {
            ondismiss: () => {
              toast.error('Payment cancelled by user')
              setPlacing(false)
            },
          },
          theme: {
            color: '#0284c7',
          },
        }

        const rzpInstance = new (window as any).Razorpay(options)
        rzpInstance.open()
        return
      }

      // Cash on delivery / UPI offline flow
      clearCart()
      setShowSuccessModal(true)
    } catch (err) {
      console.error('[Cart Order Placement Exception]', err)
      toast.error('Failed to place order')
    } finally {
      setPlacing(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="space-y-6 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Your Cart</h1>
        <div className="text-center py-20">
          <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
          <h2 className="text-xl font-semibold mb-2">Cart is empty</h2>
          <p className="text-muted-foreground mb-6">Add water products from a supplier to get started</p>
          <Link href="/customer/browse">
            <Button className="water-shimmer text-white">
              <Droplets className="w-4 h-4 mr-2" /> Browse Suppliers
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {step === 'cart' ? 'Your Cart' : 'Checkout'}
          </h1>
          <p className="text-muted-foreground mt-1">{getTotalItems()} item{getTotalItems() !== 1 ? 's' : ''}</p>
        </div>
        {/* Step indicator */}
        <div className="flex items-center gap-2 text-sm">
          <span className={step === 'cart' ? 'text-sky-400 font-medium' : 'text-muted-foreground'}>Cart</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className={step === 'checkout' ? 'text-sky-400 font-medium' : 'text-muted-foreground'}>Delivery</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Confirm</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Items / Checkout form */}
        <div className="lg:col-span-2 space-y-4">
          {step === 'cart' ? (
            <>
              {/* Cart Items */}
              {items.map((item) => (
                <Card key={item.product.id} className="glass-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">{productTypeIcons[item.product.type]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground">{formatCurrency(item.product.price)} per {item.product.unit}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="outline" className="h-8 w-8"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center font-semibold">{item.quantity}</span>
                        <Button size="icon" className="h-8 w-8 water-shimmer text-white"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="text-right min-w-[80px]">
                        <div className="font-bold">{formatCurrency(item.product.price * item.quantity)}</div>
                        <button onClick={() => removeItem(item.product.id)}
                          className="text-red-400 hover:text-red-300 mt-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            /* Checkout Form */
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  <MapPin className="w-5 h-5 text-sky-400" /> Delivery Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Street Address</Label>
                  <Input placeholder="123, Sardarpura, Near Clock Tower" className="bg-secondary"
                    {...register('line1')} />
                  {errors.line1 && <p className="text-xs text-destructive">{errors.line1.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input placeholder="Jodhpur" className="bg-secondary" {...register('city')} />
                  </div>
                  <div className="space-y-2">
                    <Label>Pincode</Label>
                    <Input placeholder="342001" className="bg-secondary" {...register('pincode')} />
                    {errors.pincode && <p className="text-xs text-destructive">{errors.pincode.message}</p>}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { value: 'razorpay', label: '💳 Razorpay Online', desc: 'UPI, Cards, NetBanking' },
                      { value: 'cash_on_delivery', label: '💵 Cash on Delivery', desc: 'Pay when delivered' },
                      { value: 'upi', label: '📱 Manual UPI', desc: 'Google Pay / PhonePe' },
                    ].map((opt) => (
                      <button key={opt.value} type="button"
                        onClick={() => setValue('payment_mode', opt.value as 'cash_on_delivery' | 'upi' | 'razorpay')}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          paymentMode === opt.value
                            ? 'border-sky-500 bg-sky-500/10'
                            : 'border-border bg-secondary hover:border-sky-500/30'
                        }`}
                      >
                        <div className="text-sm font-medium">{opt.label}</div>
                        <div className="text-xs text-muted-foreground">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Special Instructions (optional)</Label>
                  <Textarea placeholder="Call before delivery, leave at gate..." className="bg-secondary resize-none" rows={2}
                    {...register('special_instructions')} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Order Summary */}
        <div>
          <Card className="glass-card sticky top-6">
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Rajdhani, sans-serif' }}>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((item) => (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.product.name} × {item.quantity}</span>
                  <span>{formatCurrency(item.product.price * item.quantity)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="gradient-text" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  {formatCurrency(getTotalAmount())}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-sky-500/5 border border-sky-500/10 text-xs text-sky-400">
                💧 Cash on Delivery available · Free delivery
              </div>

              {step === 'cart' ? (
                <Button onClick={() => setStep('checkout')} className="w-full water-shimmer text-white font-semibold h-11">
                  Proceed to Delivery <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <>
                  <Button onClick={handleSubmit(placeOrder)} disabled={placing}
                    className="w-full water-shimmer text-white font-semibold h-11">
                    {placing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Placing Order...</> : '🎉 Place Order'}
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={() => setStep('cart')}>
                    ← Back to Cart
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <OrderSuccessModal
        isOpen={showSuccessModal}
        onClose={() => router.push('/customer/orders')}
      />
    </div>
  )
}
