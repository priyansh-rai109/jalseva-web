'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Truck, Phone, User, Clock,
  MessageSquare, Loader2, Send, Plus
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { formatDisplayName } from '@/lib/utils'

export interface DriverOption {
  id: string
  name: string
  phone: string
  vehicle_type: string
  vehicle_number: string
  status: string
}

interface DispatchOrderModalProps {
  isOpen: boolean
  onClose: () => void
  order: any
  onConfirmDispatch: (orderId: string, driverDetails: {
    driverId?: string
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

  const [driversList, setDriversList] = useState<DriverOption[]>([])
  const [loadingDrivers, setLoadingDrivers] = useState(false)
  const [selectedDriverId, setSelectedDriverId] = useState<string>('custom')

  const [driverName, setDriverName] = useState('Ramesh Gurjar')
  const [driverPhone, setDriverPhone] = useState('9829012345')
  const [vehicleNumber, setVehicleNumber] = useState('RJ-19-GA-5420')
  const [estimatedMins, setEstimatedMins] = useState('15-20')

  // Fetch drivers list when modal is opened
  useEffect(() => {
    if (isOpen) {
      setLoadingDrivers(true)
      fetch('/api/supplier/drivers')
        .then(res => res.json())
        .then(data => {
          const list: DriverOption[] = data.drivers || []
          setDriversList(list)
          // If active drivers exist, select the first active driver by default!
          const activeDrivers = list.filter(d => d.status === 'active' || d.status === 'on_duty')
          if (activeDrivers.length > 0) {
            const first = activeDrivers[0]
            setSelectedDriverId(first.id)
            setDriverName(first.name)
            setDriverPhone(first.phone)
            setVehicleNumber(first.vehicle_number)
          }
        })
        .catch(err => {
          console.error('Error fetching drivers for modal:', err)
        })
        .finally(() => setLoadingDrivers(false))
    }
  }, [isOpen])

  if (!order) return null

  const customerName = formatDisplayName(order.customers?.name || 'Customer')
  const customerPhone = order.customers?.phone || ''
  const shortId = order.id?.slice(0, 8).toUpperCase()

  const handleSelectDriverChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setSelectedDriverId(val)

    if (val === 'custom' || val === 'new') {
      // Clear or leave editable
      setDriverName('')
      setDriverPhone('')
      setVehicleNumber('')
    } else {
      const found = driversList.find(d => d.id === val)
      if (found) {
        setDriverName(found.name)
        setDriverPhone(found.phone)
        setVehicleNumber(found.vehicle_number)
      }
    }
  }

  const dispatchWhatsappMessage = encodeURIComponent(
    language === 'hi'
      ? `💧 *जलसेवा (JalSeva) ऑर्डर अपडेट*\n\nनमस्ते ${customerName},\nआपका पानी का ऑर्डर #${shortId} निकल चुका है!\n\n👨‍✈️ *डिलीवरी ड्राइवर:* ${driverName}\n📞 *ड्राइवर संपर्क:* ${driverPhone}\n🚚 *वाहन नंबर:* ${vehicleNumber}\n⏱️ *पहुंचने का समय:* ~${estimatedMins} मिनट\n\n📍 *लाइव जीपीएस ट्रैकिंग लिंक:*\nhttps://jalseva-web.vercel.app/customer/orders/${order.id}\n\nधन्यवाद! 🙏`
      : `💧 *JalSeva Order Update*\n\nHello ${customerName},\nYour water order #${shortId} is out for delivery!\n\n👨‍✈️ *Driver:* ${driverName}\n📞 *Driver Contact:* ${driverPhone}\n🚚 *Vehicle No:* ${vehicleNumber}\n⏱️ *Estimated ETA:* ~${estimatedMins} mins\n\n📍 *Live GPS Tracking:*\nhttps://jalseva-web.vercel.app/customer/orders/${order.id}\n\nThank you!`
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onConfirmDispatch(order.id, {
      driverId: selectedDriverId !== 'custom' && selectedDriverId !== 'new' ? selectedDriverId : undefined,
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
                <span>{language === 'hi' ? 'ड्राइवर चयन व ऑर्डर डिस्पैच' : 'Assign Driver & Dispatch'}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-sky-200/80 mt-0.5">
                {language === 'hi'
                  ? `ऑर्डर #${shortId} — ग्राहक (${customerName}) को डिलीवरी की सूचना जाएगी`
                  : `Order #${shortId} — Driver details will be sent to customer (${customerName})`}
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Driver Selection Dropdown */}
          <div className="space-y-1.5 p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                <User className="w-4 h-4 text-sky-400" />
                <span>{language === 'hi' ? 'ड्राइवर चुनें (Select Driver from Profiles)' : 'Select Driver'}</span>
              </Label>
              <Link href="/supplier/drivers" target="_blank" className="text-[11px] text-sky-400 hover:underline flex items-center gap-0.5">
                <Plus className="w-3 h-3" />
                {language === 'hi' ? 'नया ड्राइवर जोड़ें' : 'Manage Drivers'}
              </Link>
            </div>

            {loadingDrivers ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
                <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                <span>{language === 'hi' ? 'ड्राइवर्स लोड हो रहे हैं...' : 'Loading registered drivers...'}</span>
              </div>
            ) : (
              <select
                value={selectedDriverId}
                onChange={handleSelectDriverChange}
                className="w-full bg-secondary text-foreground font-medium rounded-xl border border-sky-500/40 h-10 px-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {driversList.length > 0 && (
                  <optgroup label={language === 'hi' ? 'आपके पंजीकृत ड्राइवर' : 'Your Drivers'}>
                    {driversList.map((d) => (
                      <option key={d.id} value={d.id}>
                        👨‍✈️ {d.name} — {d.vehicle_number} ({d.vehicle_type || 'Vehicle'}) {d.status !== 'active' ? `[${d.status}]` : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
                <option value="custom">✏️ {language === 'hi' ? 'अन्य / खुद भरें (Manual Entry)' : 'Other / Manual Details'}</option>
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Driver Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-sky-400" />
                <span>{language === 'hi' ? 'ड्राइवर का नाम' : 'Driver Name'}</span>
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
              💧 <strong>{driverName || 'Driver'}</strong> ({driverPhone || 'Phone'}) वाहन <strong>{vehicleNumber || 'Vehicle'}</strong> से निकल रहे हैं। ETA: <strong>~{estimatedMins} मिनट</strong>।
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-2 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {customerPhone && (
                <a
                  href={`https://wa.me/${customerPhone.replace(/\D/g, '')}?text=${dispatchWhatsappMessage}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full"
                >
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full text-xs h-10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span>{language === 'hi' ? 'ग्राहक को व्हाट्सएप' : 'WhatsApp Customer'}</span>
                  </Button>
                </a>
              )}

              {driverPhone && (
                <a
                  href={`https://wa.me/${driverPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                    `🚚 *JalSeva Delivery Task*\n📦 Order #${shortId}\n👤 Customer: ${customerName} (${customerPhone || 'N/A'})\n💵 Collect: ₹${order.total_amount} (${order.payment_method?.toUpperCase() || 'COD'})\n📲 1-Click Map Navigation & PIN Handover Screen:\nhttps://jalseva-web.vercel.app/delivery/${order.id}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full"
                >
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full text-xs h-10 border-sky-500/40 text-sky-400 hover:bg-sky-500/10 flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-4 h-4 text-sky-400" />
                    <span>{language === 'hi' ? 'ड्राइवर को लिंक भेजें' : 'Send Driver PWA Link'}</span>
                  </Button>
                </a>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full water-shimmer text-white font-bold text-xs h-11 shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 mt-1"
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
