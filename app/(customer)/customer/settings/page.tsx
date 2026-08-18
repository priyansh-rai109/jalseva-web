'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  User, Phone, Mail, MapPin, Plus, Trash2, Edit2, Loader2, Save,
  Settings, Bell, Shield, Globe, Droplets, KeyRound, Lock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Address } from '@/types'
import { getInitials } from '@/lib/utils'
import { LanguageSettingsCard } from '@/components/shared/LanguageSettingsCard'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const addressSchema = z.object({
  label: z.string().min(1, 'Label required'),
  line1: z.string().min(5, 'Address required'),
  pincode: z.string().min(6, 'Valid pincode'),
  city: z.string().min(2, 'City required'),
})

type AddressForm = z.infer<typeof addressSchema>

export default function CustomerSettingsPage() {
  const { language, t } = useLanguage()
  const [profile, setProfile] = useState<any>(null)
  const [customer, setCustomer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addressDialog, setAddressDialog] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  // Notifications settings
  const [orderAlerts, setOrderAlerts] = useState(true)
  const [whatsappAlerts, setWhatsappAlerts] = useState(true)
  const [promoSms, setPromoSms] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: { city: 'Jodhpur', label: 'Home' },
  })

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/customer/profile')
      const json = await res.json()
      if (res.ok) {
        setProfile(json.profile)
        setCustomer(json.customer)
        setName(json.name || '')
        setPhone(json.phone || '')
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const saveProfile = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/customer/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      })
      if (res.ok) {
        toast.success(language === 'hi' ? 'सेटिंग्स व प्रोफ़ाइल अपडेट हो गई!' : 'Settings & Profile updated!')
        fetchProfile()
      } else {
        toast.error(language === 'hi' ? 'अपडेट विफल रहा' : 'Failed to update settings')
      }
    } catch (err) {
      toast.error('Failed to update settings')
    }
    setSaving(false)
  }

  // Security PIN update
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmNewPin, setConfirmNewPin] = useState('')
  const [updatingPin, setUpdatingPin] = useState(false)

  const handleUpdatePin = async () => {
    if (currentPin.length !== 4) {
      toast.error(language === 'hi' ? 'कृपया सही वर्तमान 4-अंकों का पिन डालें' : 'Current PIN must be 4 digits')
      return
    }
    if (newPin.length !== 4) {
      toast.error(language === 'hi' ? 'नया पिन 4 अंकों का होना चाहिए' : 'New PIN must be 4 digits')
      return
    }
    if (newPin !== confirmNewPin) {
      toast.error(language === 'hi' ? 'दोनों नए पिन मेल नहीं खा रहे हैं' : 'New PINs do not match')
      return
    }
    if (['0000', '1111', '1234', '9999'].includes(newPin)) {
      toast.error(language === 'hi' ? 'कृपया अधिक सुरक्षित पिन चुनें (उदा. 4582)' : 'Please choose a stronger PIN')
      return
    }

    setUpdatingPin(true)
    try {
      const res = await fetch('/api/auth/pin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change-pin',
          phone: phone,
          currentPin: currentPin,
          pin: newPin,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message || (language === 'hi' ? 'सुरक्षा पिन सफलतापूर्वक बदल दिया गया!' : 'Security PIN updated!'))
        setCurrentPin('')
        setNewPin('')
        setConfirmNewPin('')
      } else {
        toast.error(data.error || 'Failed to update PIN')
      }
    } catch {
      toast.error('Could not update PIN')
    } finally {
      setUpdatingPin(false)
    }
  }

  const addAddress = async (data: AddressForm) => {
    const newAddr: Address = {
      id: crypto.randomUUID(),
      label: data.label,
      line1: data.line1,
      pincode: data.pincode,
      city: data.city,
      is_default: !customer?.addresses?.length,
    }
    const updatedAddresses = [...(customer?.addresses || []), newAddr]
    await fetch('/api/customer/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addresses: updatedAddresses }),
    })
    setCustomer({ ...(customer || {}), addresses: updatedAddresses })
    toast.success(language === 'hi' ? 'नया पता सुरक्षित हो गया!' : 'Address added!')
    setAddressDialog(false)
    reset()
  }

  const removeAddress = async (id: string) => {
    const updated = (customer?.addresses || []).filter((a: Address) => a.id !== id)
    await fetch('/api/customer/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addresses: updated }),
    })
    setCustomer({ ...(customer || {}), addresses: updated })
    toast.success(language === 'hi' ? 'पता हटा दिया गया' : 'Address removed')
  }

  const setDefaultAddress = async (id: string) => {
    const updated = (customer?.addresses || []).map((a: Address) => ({
      ...a,
      is_default: a.id === id,
    }))
    await fetch('/api/customer/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addresses: updated }),
    })
    setCustomer({ ...(customer || {}), addresses: updated })
    toast.success(language === 'hi' ? 'डिफ़ॉल्ट पता अपडेट हुआ' : 'Default address updated')
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
    </div>
  )

  return (
    <div className="p-3 sm:p-5 md:p-8 space-y-5 sm:space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2.5" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          <Settings className="w-7 h-7 text-sky-400" />
          <span>{language === 'hi' ? 'ग्राहक सेटिंग्स (Customer Settings)' : 'Customer Settings'}</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {language === 'hi' ? 'भाषा प्राथमिकताएं, खाता विवरण और डिलीवरी पते प्रबंधित करें' : 'Manage your language preferences, account profile, and delivery addresses'}
        </p>
      </div>

      {/* 1. Language Preferences Card */}
      <LanguageSettingsCard />

      {/* 2. Customer Personal Info */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            <User className="w-4 h-4 text-sky-400" />
            <span>{language === 'hi' ? 'व्यक्तिगत जानकारी' : 'Personal Information'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full water-shimmer flex items-center justify-center text-white text-lg sm:text-xl font-bold flex-shrink-0">
              {getInitials(name || 'U')}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold truncate">{name || 'Customer'}</h2>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{profile?.email || 'customer@jalseva.in'}</p>
              <Badge className="mt-1 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs">
                {language === 'hi' ? 'सत्यापित ग्राहक' : 'Verified Customer'}
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{language === 'hi' ? 'पूरा नाम' : 'Full Name'}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={language === 'hi' ? 'अपना नाम दर्ज करें' : 'Your full name'}
                  className="pl-10 bg-secondary h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{language === 'hi' ? 'मोबाइल नंबर' : 'Phone Number'}</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  className="pl-10 bg-secondary h-11"
                />
              </div>
            </div>
          </div>

          <Button onClick={saveProfile} disabled={saving} className="water-shimmer text-white w-full sm:w-auto mt-2">
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {language === 'hi' ? 'सुरक्षित हो रहा है...' : 'Saving...'}</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> {language === 'hi' ? 'बदलाव सुरक्षित करें' : 'Save Changes'}</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 3. Notification Preferences */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            <Bell className="w-4 h-4 text-purple-400" />
            <span>{language === 'hi' ? 'नोटिफिकेशन सेटिंग्स' : 'Notification Preferences'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{language === 'hi' ? 'ऑर्डर लाइव स्टेटस अलर्ट' : 'Live Order Status Alerts'}</p>
              <p className="text-xs text-muted-foreground">{language === 'hi' ? 'डिलीवरी और ड्राइवर निकलने पर तुरंत नोटिफिकेशन' : 'Real-time updates when order is dispatched and delivered'}</p>
            </div>
            <Switch checked={orderAlerts} onCheckedChange={setOrderAlerts} />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{language === 'hi' ? 'व्हाट्सएप नोटिफिकेशन' : 'WhatsApp Delivery Receipts'}</p>
              <p className="text-xs text-muted-foreground">{language === 'hi' ? 'व्हाट्सएप पर डिजिटल रसीद और ड्राइवर संपर्क' : 'Send receipt and driver link on WhatsApp'}</p>
            </div>
            <Switch checked={whatsappAlerts} onCheckedChange={setWhatsappAlerts} />
          </div>
        </CardContent>
      </Card>

      {/* 4. Security PIN Management */}
      <Card className="glass-card border-sky-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            <KeyRound className="w-4 h-4 text-sky-400" />
            <span>{language === 'hi' ? 'सुरक्षा पिन प्रबंधन (Security PIN)' : 'Security PIN Settings'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <p className="text-xs text-muted-foreground">
            {language === 'hi'
              ? 'अपना 4-अंकों का लॉगिन पिन सुरक्षित रखें। पिन बदलने के लिए वर्तमान पिन दर्ज करें।'
              : 'Keep your 4-digit login PIN confidential. Enter current PIN to update.'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{language === 'hi' ? 'वर्तमान पिन' : 'Current PIN'}</Label>
              <Input
                type="password"
                placeholder="••••"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="bg-secondary text-center text-base tracking-widest font-bold h-10"
                maxLength={4}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{language === 'hi' ? 'नया 4-अंकों का पिन' : 'New PIN'}</Label>
              <Input
                type="password"
                placeholder="••••"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="bg-secondary text-center text-base tracking-widest font-bold h-10"
                maxLength={4}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{language === 'hi' ? 'नया पिन पुनः दर्ज करें' : 'Confirm New PIN'}</Label>
              <Input
                type="password"
                placeholder="••••"
                value={confirmNewPin}
                onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="bg-secondary text-center text-base tracking-widest font-bold h-10"
                maxLength={4}
              />
            </div>
          </div>
          <Button
            onClick={handleUpdatePin}
            disabled={updatingPin || currentPin.length !== 4 || newPin.length !== 4 || confirmNewPin.length !== 4}
            className="water-shimmer text-white text-xs h-9 font-semibold"
          >
            {updatingPin ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> {language === 'hi' ? 'अपडेट हो रहा है...' : 'Updating...'}</>
            ) : (
              <><Lock className="w-3.5 h-3.5 mr-1.5" /> {language === 'hi' ? 'पिन अपडेट करें' : 'Update Security PIN'}</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 5. Saved Addresses */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            <MapPin className="w-4 h-4 text-sky-400" />
            <span>{language === 'hi' ? 'सुरक्षित डिलीवरी पते' : 'Saved Delivery Addresses'}</span>
          </CardTitle>
          <Button size="sm" variant="outline" className="text-xs" onClick={() => setAddressDialog(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            {language === 'hi' ? 'नया पता' : 'Add Address'}
          </Button>

          <Dialog open={addressDialog} onOpenChange={setAddressDialog}>
            <DialogContent className="glass-card">
              <DialogHeader>
                <DialogTitle>{language === 'hi' ? 'नया डिलीवरी पता जोड़ें' : 'Add New Delivery Address'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(addAddress)} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Address Label (e.g. Home, Office)</Label>
                  <Input {...register('label')} placeholder="Home" className="bg-secondary" />
                  {errors.label && <p className="text-xs text-destructive">{errors.label.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Street Address</Label>
                  <Input {...register('line1')} placeholder="House/Plot no, Area" className="bg-secondary" />
                  {errors.line1 && <p className="text-xs text-destructive">{errors.line1.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input {...register('city')} className="bg-secondary" />
                  </div>
                  <div className="space-y-2">
                    <Label>Pincode</Label>
                    <Input {...register('pincode')} placeholder="342001" className="bg-secondary" />
                    {errors.pincode && <p className="text-xs text-destructive">{errors.pincode.message}</p>}
                  </div>
                </div>
                <Button type="submit" className="w-full water-shimmer text-white">Save Address</Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {!customer?.addresses?.length ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
              {language === 'hi' ? 'कोई सुरक्षित पता नहीं है' : 'No saved addresses yet'}
            </div>
          ) : (
            <div className="space-y-3">
              {customer.addresses.map((addr: Address) => (
                <div key={addr.id} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors border border-border/60">
                  <MapPin className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{addr.label}</span>
                      {addr.is_default && (
                        <Badge className="text-[10px] bg-sky-500/10 text-sky-400 border-sky-500/20">Default</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{addr.line1}, {addr.city} - {addr.pincode}</p>
                  </div>
                  <div className="flex gap-1">
                    {!addr.is_default && (
                      <button
                        type="button"
                        onClick={() => setDefaultAddress(addr.id)}
                        className="text-xs text-sky-400 hover:text-sky-300 px-2 py-1 rounded"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAddress(addr.id)}
                      className="p-1 hover:bg-red-500/10 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
