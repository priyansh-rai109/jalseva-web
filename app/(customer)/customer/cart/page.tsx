'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/stores/cart-store'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  ShoppingCart, Trash2, Plus, Minus, MapPin,
  Loader2, ChevronRight, Package, Droplets, Info, CheckCircle2, ArrowLeft, Zap, ShieldAlert, Coins, Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { OrderSuccessModal } from '@/components/shared/OrderSuccessModal'
import Link from 'next/link'

const checkoutSchema = z.object({
  line1: z.string().min(5, 'Address required (कम से कम 5 अक्षर)'),
  pincode: z.string().min(6, 'Valid 6-digit pincode required (6 अंकों का पिनकोड)'),
  city: z.string().min(2, 'City required (शहर का नाम लिखें)'),
  payment_mode: z.enum(['cash_on_delivery', 'razorpay', 'upi', 'online']),
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
  const { t, language } = useLanguage()
  const { items, removeItem, updateQuantity, clearCart, getTotalAmount, getTotalItems, supplier_id } = useCartStore()
  const [placing, setPlacing] = useState(false)
  const [step, setStep] = useState<'cart' | 'checkout'>('cart')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [isEmergency, setIsEmergency] = useState(false)
  const [useCoins, setUseCoins] = useState(false)

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
      const totalAmt = Math.max(10, getTotalAmount() + (isEmergency ? 50 : 0) - (useCoins ? 50 : 0))

      // 1. Create order in JalSeva backend
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          deliveryAddress,
          paymentMode: data.payment_mode,
          specialInstructions: [
            isEmergency ? '⚡ [60-MIN EMERGENCY EXPRESS PRIORITY]' : '',
            data.special_instructions,
          ]
            .filter(Boolean)
            .join(' - '),
        }),
      })

      const json = await res.json()
      const createdOrders = json.orders || (json.order ? [json.order] : [])
      const createdOrderId = createdOrders[0]?.id

      if (!res.ok || !createdOrderId) {
        toast.error(json.error || (language === 'hi' ? 'ऑर्डर दर्ज करने में समस्या आई' : 'Failed to place order'))
        setPlacing(false)
        return
      }

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
                toast.success(language === 'hi' ? '🎉 ऑनलाइन भुगतान सफल हुआ!' : '🎉 Razorpay Payment Verified Successfully!')
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
              toast.error(language === 'hi' ? 'भुगतान रद्द कर दिया गया' : 'Payment cancelled by user')
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
      toast.success(language === 'hi' ? '🎉 आपका ऑर्डर सफलतापूर्वक दर्ज हो गया है!' : '🎉 Order placed successfully!')
      setShowSuccessModal(true)
    } catch (err) {
      console.error('[Cart Order Placement Exception]', err)
      toast.error(language === 'hi' ? 'ऑर्डर दर्ज करने में विफलता' : 'Failed to place order')
    } finally {
      setPlacing(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          {t('yourCart')}
        </h1>
        <div className="text-center py-16 sm:py-20 glass-card rounded-2xl p-6">
          <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
          <h2 className="text-xl font-semibold mb-2">{t('cartIsEmpty')}</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
            {t('cartEmptySubtitle')}
          </p>
          <Link href="/customer/browse">
            <Button className="water-shimmer text-white min-h-[44px]">
              <Droplets className="w-4 h-4 mr-2" /> {t('browseWaterSuppliers')}
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {step === 'cart' ? t('yourCart') : t('step2Delivery')}
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            {getTotalItems()} {t('itemsInCart')}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm bg-secondary/60 px-3 py-1.5 rounded-full border border-border">
          <button
            type="button"
            onClick={() => setStep('cart')}
            className={step === 'cart' ? 'text-sky-400 font-bold' : 'text-muted-foreground hover:text-foreground'}
          >
            {t('step1CartItems')}
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          <span className={step === 'checkout' ? 'text-sky-400 font-bold' : 'text-muted-foreground'}>
            {t('step2Delivery')}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Items / Checkout form */}
        <div className="lg:col-span-2 space-y-4">
          {step === 'cart' ? (
            <>
              {/* Informative banner */}
              <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 flex items-center gap-2.5">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>
                  {language === 'hi'
                    ? 'अपनी सामग्री और मात्रा जांचें। इसके बाद "डिलीवरी पते पर आगे बढ़ें" पर क्लिक करें।'
                    : 'Review your items and quantities below, then click "Proceed to Delivery" to enter your address.'}
                </span>
              </div>

              {/* Cart Items */}
              {items.map((item) => (
                <Card key={item.product.id} className="glass-card">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="text-2xl sm:text-3xl p-2 rounded-xl bg-secondary/80 flex items-center justify-center flex-shrink-0">
                        {productTypeIcons[item.product.type] || '💧'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm sm:text-base truncate">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(item.product.price)} {t('perUnit')} {item.product.unit}</p>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Button size="icon" variant="outline" className="h-7 w-7 sm:h-8 sm:w-8"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-6 text-center text-xs sm:text-sm font-bold">{item.quantity}</span>
                        <Button size="icon" className="h-7 w-7 sm:h-8 sm:w-8 water-shimmer text-white"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="text-right min-w-[70px] sm:min-w-[80px]">
                        <div className="font-bold text-sm sm:text-base gradient-text">{formatCurrency(item.product.price * item.quantity)}</div>
                        <button onClick={() => removeItem(item.product.id)}
                          aria-label="Remove item"
                          className="text-red-400 hover:text-red-300 mt-1 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="flex justify-between items-center pt-2">
                <Link href="/customer/browse" className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" /> {language === 'hi' ? '+ और उत्पाद जोड़ें' : '+ Add more products'}
                </Link>
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs text-muted-foreground hover:text-red-400"
                >
                  {language === 'hi' ? 'कार्ट खाली करें' : 'Clear Cart'}
                </button>
              </div>
            </>
          ) : (
            /* Checkout Form */
            <Card className="glass-card">
              <CardHeader className="p-4 sm:p-6 pb-2">
                <CardTitle className="flex items-center gap-2 text-lg" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  <MapPin className="w-5 h-5 text-sky-400" /> {t('deliveryAddress')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">{t('streetAddress')}</Label>
                  <Input placeholder={t('streetPlaceholder')} className="bg-secondary h-11 text-sm"
                    {...register('line1')} />
                  {errors.line1 && <p className="text-xs text-destructive">{errors.line1.message}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t('city')}</Label>
                    <Input placeholder="Jodhpur" className="bg-secondary h-11 text-sm" {...register('city')} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t('pincode')}</Label>
                    <Input placeholder="342001" className="bg-secondary h-11 text-sm" {...register('pincode')} />
                    {errors.pincode && <p className="text-xs text-destructive">{errors.pincode.message}</p>}
                  </div>
                </div>

                <Separator />

                {/* ⚡ 60-Minute Emergency Express Tanker Delivery Toggle */}
                <div
                  onClick={() => setIsEmergency(!isEmergency)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isEmergency
                      ? 'border-amber-500/80 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                      : 'border-border bg-secondary/40 hover:border-amber-500/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isEmergency ? 'bg-amber-500 text-black font-bold animate-pulse' : 'bg-secondary text-amber-400'
                    }`}>
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                        <span>{language === 'hi' ? '⚡ 60-मिनट आपातकालीन सुपरफास्ट डिलीवरी' : '⚡ 60-Min Emergency Express Delivery'}</span>
                        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] py-0 px-1.5">
                          +₹50
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {language === 'hi'
                          ? 'शादी, समारोह या आपातकाल के लिए नजदीकी ड्राइवर को तुरंत प्राथमिकता पर भेजा जाएगा।'
                          : 'Priority dispatch for sudden water shortages, events, and immediate needs.'}
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isEmergency}
                    onChange={() => {}}
                    className="h-4 w-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">{t('paymentMethod')}</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { value: 'cash_on_delivery', label: t('payCod'), desc: t('payCodDesc') },
                      { value: 'razorpay', label: t('payRazorpay'), desc: t('payRazorpayDesc') },
                      { value: 'upi', label: t('payUpi'), desc: t('payUpiDesc') },
                    ].map((opt) => (
                      <button key={opt.value} type="button"
                        onClick={() => setValue('payment_mode', opt.value as 'cash_on_delivery' | 'upi' | 'razorpay')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          paymentMode === opt.value
                            ? 'border-sky-500 bg-sky-500/10 shadow-sm'
                            : 'border-border bg-secondary hover:border-sky-500/30'
                        }`}
                      >
                        <div className="text-xs sm:text-sm font-semibold">{opt.label}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">{t('specialInstructions')}</Label>
                  <Textarea placeholder={t('instructionsPlaceholder')} className="bg-secondary resize-none text-sm" rows={2}
                    {...register('special_instructions')} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Order Summary */}
        <div>
          <Card className="glass-card sticky top-6">
            <CardHeader className="p-4 sm:p-5 pb-2">
              <CardTitle className="text-base sm:text-lg" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {language === 'hi' ? 'ऑर्डर सारांश (Summary)' : 'Order Summary'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-3">
              {items.map((item) => (
                <div key={item.product.id} className="flex justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground truncate max-w-[65%]">{item.product.name} × {item.quantity}</span>
                  <span className="font-medium">{formatCurrency(item.product.price * item.quantity)}</span>
                </div>
              ))}

              {isEmergency && (
                <div className="flex justify-between text-xs text-amber-400 font-medium">
                  <span>⚡ {language === 'hi' ? 'आपातकालीन प्राथमिकता शुल्क' : 'Emergency Priority Fee'}</span>
                  <span>+₹50</span>
                </div>
              )}

              {/* JalDrop Coins Redemption Toggle */}
              <div
                onClick={() => setUseCoins(!useCoins)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                  useCoins
                    ? 'border-amber-500/50 bg-amber-500/15 shadow-sm shadow-amber-500/10'
                    : 'border-border bg-secondary/40 hover:bg-secondary'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span>{language === 'hi' ? 'JalDrop कॉइन्स लगाएं' : 'Apply JalDrop Coins'}</span>
                      <Badge className="bg-amber-500/20 text-amber-300 text-[9px] py-0 px-1">Save ₹50</Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground">Available: 150 Coins</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={useCoins}
                  onChange={() => {}}
                  className="rounded border-amber-400 text-amber-500 focus:ring-amber-400 pointer-events-none"
                />
              </div>

              {useCoins && (
                <div className="flex justify-between text-xs text-emerald-400 font-semibold">
                  <span>🪙 {language === 'hi' ? 'JalDrop कॉइन्स डिस्काउंट' : 'JalDrop Discount'}</span>
                  <span>-₹50</span>
                </div>
              )}

              <Separator />
              <div className="flex justify-between font-bold text-base sm:text-lg">
                <span>{t('total')}</span>
                <span className="gradient-text" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  {formatCurrency(Math.max(10, getTotalAmount() + (isEmergency ? 50 : 0) - (useCoins ? 50 : 0)))}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-sky-500/5 border border-sky-500/10 text-xs text-sky-400 leading-relaxed">
                {t('freeDelivery')}
              </div>

              {step === 'cart' ? (
                <Button onClick={() => setStep('checkout')} className="w-full water-shimmer text-white font-semibold min-h-[44px]">
                  {t('proceedToDelivery')} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <div className="space-y-2 pt-1">
                  <Button onClick={handleSubmit(placeOrder)} disabled={placing}
                    className="w-full water-shimmer text-white font-semibold min-h-[44px] shadow-lg shadow-sky-500/20">
                    {placing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('placingOrder')}</> : t('placeOrder')}
                  </Button>
                  <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => setStep('cart')}>
                    ← {language === 'hi' ? 'कार्ट में बदलाव करें' : 'Back to Cart'}
                  </Button>
                </div>
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
