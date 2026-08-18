'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import {
  Truck, MapPin, Phone, MessageSquare, CheckCircle2, ShieldAlert,
  Droplets, KeyRound, Loader2, Navigation, AlertCircle, Sparkles
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { formatCurrency, formatDateTime, getDeliveryPin, validateDeliveryPin } from '@/lib/utils'
import Link from 'next/link'

export default function DriverQuickDeliveryPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()

  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [enteredPin, setEnteredPin] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [isDelivered, setIsDelivered] = useState(false)

  const fetchOrder = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/orders/${id}`)
      const data = await res.json()
      if (res.ok && data.order) {
        setOrder(data.order)
        if (data.order.status === 'delivered') {
          setIsDelivered(true)
        }
      }
    } catch (err) {
      toast.error('Failed to load delivery details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) fetchOrder()
  }, [id])

  const handleVerifyAndDeliver = async () => {
    if (!enteredPin.trim() || enteredPin.length < 4) {
      toast.error('Kripya customer ka 4-digit Delivery PIN darj karein')
      return
    }

    const isValid = validateDeliveryPin(id, enteredPin)
    if (!isValid) {
      toast.error('❌ Galat PIN! Customer se unka 4-digit PIN maangein.')
      return
    }

    setVerifying(true)
    try {
      const res = await fetch('/api/supplier/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: id,
          status: 'delivered',
          notes: `Verified & Delivered via Driver Quick Portal (PIN: ${enteredPin})`,
        }),
      })

      const json = await res.json()
      if (res.ok && (json.success || json.order)) {
        setIsDelivered(true)
        toast.success('🎉 Delivery Verified & Completed!')
      } else {
        toast.error(json.error || 'Failed to complete delivery')
      }
    } catch (err) {
      toast.error('Network error completing delivery')
    } finally {
      setVerifying(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin mb-3" />
        <p className="text-sm text-slate-400">Loading delivery details...</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center text-white">
        <AlertCircle className="w-12 h-12 text-amber-400 mb-3" />
        <h1 className="text-xl font-bold">Order Not Found</h1>
        <p className="text-sm text-slate-400 mt-1 max-w-sm">
          This delivery link may have expired or the order ID is invalid.
        </p>
      </div>
    )
  }

  const customerName = order.customers?.name || 'Customer'
  const customerPhone = order.customers?.phone || order.customer_phone || ''
  const addressText = typeof order.delivery_address === 'object'
    ? `${order.delivery_address?.line1 || ''}, ${order.delivery_address?.city || 'Jodhpur'}`
    : String(order.delivery_address || 'Jodhpur')

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressText)}`

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-4 sm:p-6 select-none">
      {/* Top Mobile Bar */}
      <div className="w-full max-w-md flex items-center justify-between py-3 border-b border-slate-800 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg water-shimmer flex items-center justify-center">
            <Droplets className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg gradient-text" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            JalSeva Driver Partner
          </span>
        </div>
        <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/30 text-xs">
          Order #{order.id.slice(0, 6)}
        </Badge>
      </div>

      <div className="w-full max-w-md space-y-4">
        {/* Delivery Completion Success Screen */}
        {isDelivered ? (
          <Card className="bg-gradient-to-b from-emerald-950/50 to-slate-900 border-emerald-500/40 text-center p-6 space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/40 animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-emerald-300" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                डिलीवरी सफल (Delivered)!
              </h2>
              <p className="text-xs text-slate-300">
                पानी का ऑर्डर ग्राहक को सही तरीके से हैंडओवर कर दिया गया है।
              </p>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-left text-xs space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Customer:</span>
                <span className="font-semibold text-white">{customerName}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Amount:</span>
                <span className="font-bold text-emerald-400 font-mono text-sm">{formatCurrency(order.total_amount)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Delivered At:</span>
                <span className="text-white">{formatDateTime(new Date().toISOString())}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              धन्यवाद! आप इस पेज को बंद कर सकते हैं।
            </p>
          </Card>
        ) : (
          <>
            {/* 1. Customer & Navigation Card */}
            <Card className="bg-slate-900/90 border-slate-800 overflow-hidden shadow-lg">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">DELIVERY TO</span>
                    <h3 className="text-base font-bold text-white">{customerName}</h3>
                  </div>
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                    {order.quantity || 1}x 20L Water Can
                  </Badge>
                </div>

                {/* Address Box */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-start gap-2.5">
                  <MapPin className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-300 leading-relaxed">
                    {addressText}
                  </div>
                </div>

                {/* Action Buttons: Google Maps & Call */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs h-10 gap-1.5 shadow-md">
                      <Navigation className="w-4 h-4" />
                      <span>Google Maps</span>
                    </Button>
                  </a>

                  {customerPhone ? (
                    <a href={`tel:${customerPhone}`}>
                      <Button variant="outline" className="w-full border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 font-semibold text-xs h-10 gap-1.5">
                        <Phone className="w-4 h-4" />
                        <span>Call Customer</span>
                      </Button>
                    </a>
                  ) : (
                    <Button disabled variant="outline" className="w-full text-xs h-10">No Phone</Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 2. Payment Details */}
            <Card className="bg-slate-900/90 border-slate-800 p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">COLLECT AMOUNT</div>
                  <div className="text-xl font-bold font-mono text-emerald-400">
                    {formatCurrency(order.total_amount)}
                  </div>
                </div>
                <Badge className={order.payment_method === 'cod' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'}>
                  {order.payment_method === 'cod' ? '💵 CASH ON DELIVERY' : '💳 PAID ONLINE'}
                </Badge>
              </div>
            </Card>

            {/* 3. 4-Digit PIN Security Verification */}
            <Card className="bg-gradient-to-b from-slate-900 to-slate-950 border-sky-500/40 p-4 space-y-3 shadow-xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">4-Digit Customer PIN</h4>
                  <p className="text-[11px] text-slate-400">ग्राहक की स्क्रीन से 4-अंकों का डिलीवरी पिन पूछें</p>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <Input
                  type="text"
                  maxLength={4}
                  placeholder="Enter 4-Digit PIN (e.g. 7429)"
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl tracking-[0.4em] font-mono font-bold bg-slate-950 border-sky-500/50 text-sky-300 h-12 focus-visible:ring-sky-400"
                />

                <Button
                  onClick={handleVerifyAndDeliver}
                  disabled={verifying || enteredPin.length < 4}
                  className="w-full water-shimmer text-white font-bold h-12 text-sm gap-2 shadow-lg shadow-sky-500/20"
                >
                  {verifying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>सत्यापित करें व डिलीवरी पूरी करें (Complete Delivery)</span>
                </Button>
              </div>
            </Card>
          </>
        )}
      </div>

      <div className="mt-8 text-center text-[10px] text-slate-500">
        JalSeva Secure Delivery Verification Protocol • Jodhpur
      </div>
    </div>
  )
}
