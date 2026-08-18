'use client'

import React, { useState } from 'react'
import {
  Truck, Phone, User, Clock, ShieldCheck,
  MessageSquare, Loader2, Send, CheckCircle2, X
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { formatDisplayName } from '@/lib/utils'

interface DispatchOrderModalProps {
  isOpen: boolean
  onClose: () => void
  order: any
  onConfirmDispatch: (orderId: string, driverDetails: {
    driverName: string
    driverPhone: string
    vehicleNumber: string
    estimatedMins: string
  }) => Promise<void>
  loading?: boolean
}

export function DispatchOrderModal({
  isOpen,
  onClose,
  order,
  onConfirmDispatch,
  loading = false,
}: DispatchOrderModalProps) {
  const { language } = useLanguage()

  const [driverName, setDriverName] = useState('Ramesh Gurjar')
  const [driverPhone, setDriverPhone] = useState('9829012345')
  const [vehicleNumber, setVehicleNumber] = useState('RJ-19-GA-5420')
  const [estimatedMins, setEstimatedMins] = useState('15-20')

  if (!order) return null

  const customerName = formatDisplayName(order.customers?.name || 'Customer')
  const customerPhone = order.customers?.phone || ''
  const shortId = order.id?.slice(0, 8).toUpperCase()

  const dispatchWhatsappMessage = encodeURIComponent(
    language === 'hi'
      ? `💧 *जलसेवा (JalSeva) ऑर्डर अपडेट*\n\nनमस्ते ${customerName},\nआपका पानी का ऑर्डर #${shortId} निकल चुका है!\n\n👨‍✈️ *डिलीवरी ड्राइवर:* ${driverName}\n📞 *ड्राइवर संपर्क:* ${driverPhone}\n🚚 *वाहन नंबर:* ${vehicleNumber}\n⏱️ *पहुंचने का समय:* ~${estimatedMins} मिनट\n\n📍 *लाइव जीपीएस ट्रैकिंग लिंक:*\nhttps://jalseva-web.vercel.app/customer/orders/${order.id}\n\nधन्यवाद! 🙏`
      : `💧 *JalSeva Order Update*\n\nHello ${customerName},\nYour water order #${shortId} is out for delivery!\n\n👨‍✈️ *Driver:* ${driverName}\n📞 *Driver Contact:* ${driverPhone}\n🚚 *Vehicle No:* ${vehicleNumber}\n⏱️ *Estimated ETA:* ~${estimatedMins} mins\n\n📍 *Live GPS Tracking:*\nhttps://jalseva-web.vercel.app/customer/orders/${order.id}\n\nThank you!`
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onConfirmDispatch(order.id, {
      driverName: driverName.trim() || 'Assigned Driver',
      driverPhone: driverPhone.trim() || '+919876543210',
      vehicleNumber: vehicleNumber.trim() || 'RJ-19-GA-5420',
      estimatedMins: estimatedMins.trim() || '15-20',
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass-card max-w-lg p-0 overflow-hidden border-sky-500/30">
        <div className="bg-gradient-to-r from-sky-950 via-blue-900 to-slate-900 p-5 border-b border-border/80">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-300">
              <Truck className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold text-white flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                <span>{language === 'hi' ? 'ड्राइवर विवरण व डिस्पैच (Out for Delivery)' : 'Assign Driver & Dispatch'}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-sky-200/80 mt-0.5">
                {language === 'hi'
                  ? `ऑर्डर #${shortId} — ग्राहक (${customerName}) को ड्राइवर की जानकारी भेजी जाएगी`
                  : `Order #${shortId} — Driver details will be sent to customer (${customerName})`}
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Driver Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-sky-400" />
                <span>{language === 'hi' ? 'डिलीवरी ड्राइवर का नाम' : 'Driver Name'}</span>
              </Label>
              <Input
                required
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="e.g. Ramesh Gurjar"
                className="bg-secondary h-10 text-sm"
              />
            </div>

            {/* Driver Phone */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>{language === 'hi' ? 'ड्राइवर का मोबाइल नंबर' : 'Driver Mobile'}</span>
              </Label>
              <Input
                required
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                placeholder="9829012345"
                className="bg-secondary h-10 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Vehicle Number */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === 'hi' ? 'वाहन नंबर (Vehicle Reg)' : 'Vehicle Number'}</span>
              </Label>
              <Input
                required
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="e.g. RJ-19-GA-5420"
                className="bg-secondary h-10 text-sm font-mono"
              />
            </div>

            {/* Estimated Minutes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>{language === 'hi' ? 'पहुंचने का अनुमानित समय' : 'Estimated ETA (mins)'}</span>
              </Label>
              <Input
                value={estimatedMins}
                onChange={(e) => setEstimatedMins(e.target.value)}
                placeholder="15-20"
                className="bg-secondary h-10 text-sm"
              />
            </div>
          </div>

          {/* WhatsApp Message Preview Box */}
          <div className="p-3.5 rounded-xl bg-secondary/70 border border-border/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <MessageSquare className="w-3 h-3 text-emerald-400" />
                {language === 'hi' ? 'ग्राहक को भेजा जाने वाला संदेश:' : 'Message sent to customer:'}
              </span>
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] py-0">
                WhatsApp Preview
              </Badge>
            </div>
            <p className="text-xs text-foreground/90 bg-card/60 p-2.5 rounded-lg border border-border/60 leading-relaxed font-sans">
              💧 <strong>{driverName}</strong> ({driverPhone}) वाहन <strong>{vehicleNumber}</strong> से निकल रहे हैं। ETA: <strong>~{estimatedMins} मिनट</strong>।
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
            {customerPhone && (
              <a
                href={`https://wa.me/${customerPhone.replace(/\D/g, '')}?text=${dispatchWhatsappMessage}`}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto flex-1"
              >
                <Button
                  type="button"
                  variant="outline"
                  className="w-full text-xs h-11 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>{language === 'hi' ? 'ग्राहक को व्हाट्सएप भेजें' : 'Send WhatsApp'}</span>
                </Button>
              </a>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto flex-1 water-shimmer text-white font-bold text-xs h-11 shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {language === 'hi' ? 'डिस्पैच हो रहा है...' : 'Dispatching...'}</>
              ) : (
                <><Send className="w-4 h-4" /> {language === 'hi' ? 'ऑर्डर डिस्पैच करें 🚀' : 'Confirm & Dispatch 🚀'}</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
