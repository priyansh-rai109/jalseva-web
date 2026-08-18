'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Building2, Phone, Mail, MapPin, Save, Loader2, Star,
  Settings, Bell, Shield, Globe, Truck, CheckCircle2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getSupplierStatusColor } from '@/lib/utils'
import type { Zone } from '@/types'
import { LanguageSettingsCard } from '@/components/shared/LanguageSettingsCard'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function SupplierSettingsPage() {
  const { language, t } = useLanguage()
  const supabase = createClient()
  const [supplier, setSupplier] = useState<any>(null)
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [businessName, setBusinessName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [zoneId, setZoneId] = useState('')
  const [licenseNo, setLicenseNo] = useState('')

  // Order alerts & dispatch toggles
  const [instantOrderAlerts, setInstantOrderAlerts] = useState(true)
  const [emergencyDeliveryEnabled, setEmergencyDeliveryEnabled] = useState(true)
  const [autoAcceptTanker, setAutoAcceptTanker] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: s }, { data: z }] = await Promise.all([
        supabase.from('suppliers').select('*, zones(name)').eq('user_id', user.id).single(),
        supabase.from('zones').select('*').eq('is_active', true),
      ])
      if (s) {
        setSupplier(s)
        setBusinessName(s.business_name || '')
        setOwnerName(s.owner_name || '')
        setPhone(s.phone || '')
        setAddress(s.address || '')
        setDescription(s.description || '')
        setZoneId(s.zone_id || '')
        setLicenseNo(s.license_no || '')
      }
      setZones(z || [])
      setLoading(false)
    }
    init()
  }, [])

  const save = async () => {
    setSaving(true)
    const { error } = await supabase.from('suppliers').update({
      business_name: businessName,
      owner_name: ownerName,
      phone,
      address,
      description,
      zone_id: zoneId || null,
      license_no: licenseNo || null,
    }).eq('id', supplier.id)

    if (error) {
      toast.error(language === 'hi' ? 'सेटिंग्स अपडेट विफल' : 'Failed to update settings')
      setSaving(false)
      return
    }
    toast.success(language === 'hi' ? 'सप्लायर सेटिंग्स सुरक्षित हो गईं!' : 'Supplier settings updated!')
    setSaving(false)
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
          <span>{language === 'hi' ? 'सप्लायर सेटिंग्स (Supplier Settings)' : 'Supplier Settings'}</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {language === 'hi' ? 'भाषा प्राथमिकताएं, व्यावसायिक विवरण और ऑर्डर नोटिफिकेशन प्रबंधित करें' : 'Manage your language preferences, business details, and order alerts'}
        </p>
      </div>

      {/* 1. Language Preferences Card */}
      <LanguageSettingsCard />

      {/* 2. Business Status Card */}
      <Card className="glass-card">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl water-shimmer flex items-center justify-center flex-shrink-0">
              <Building2 className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold truncate">{businessName || 'Water Plant'}</h2>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{ownerName || 'Verified Owner'}</p>
              <div className="flex items-center gap-2 sm:gap-3 mt-2 flex-wrap">
                <Badge className={`text-xs border ${getSupplierStatusColor(supplier?.status)}`}>
                  {supplier?.status === 'approved' ? (language === 'hi' ? '✓ स्वीकृत सप्लायर' : '✓ Approved') : supplier?.status}
                </Badge>
                <span className="flex items-center gap-1 text-xs sm:text-sm text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  {supplier?.rating?.toFixed(1) || '0.0'} rating
                </span>
                <span className="text-xs text-muted-foreground">{supplier?.total_orders || 0} orders</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Business Details Form */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            <Building2 className="w-4 h-4 text-sky-400" />
            <span>{language === 'hi' ? 'व्यावसायिक जानकारी' : 'Business Information'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{language === 'hi' ? 'प्रतिष्ठान / प्लांट का नाम' : 'Business Name'}</Label>
              <Input
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                placeholder="e.g. Marwar Pure Water RO Hub"
                className="bg-secondary"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{language === 'hi' ? 'संचालक का नाम' : 'Owner Name'}</Label>
              <Input
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="bg-secondary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{language === 'hi' ? 'सप्लायर मोबाइल नंबर' : 'Phone'}</Label>
              <Input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="9876543210"
                className="bg-secondary"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{language === 'hi' ? 'डिलीवरी जोन (Area Zone)' : 'Delivery Zone'}</Label>
              <Select value={zoneId} onValueChange={(v) => setZoneId(v || '')}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Select Zone" />
                </SelectTrigger>
                <SelectContent>
                  {zones.map(z => (
                    <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{language === 'hi' ? 'प्लांट का पूरा पता' : 'Plant Address'}</Label>
            <Input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="e.g. Paota B Road, Jodhpur"
              className="bg-secondary"
            />
          </div>

          <div className="space-y-1.5">
            <Label>{language === 'hi' ? 'एफएसएसएआई / जल परीक्षण लाइसेंस नंबर' : 'Water Purity / FSSAI License No.'}</Label>
            <Input
              value={licenseNo}
              onChange={e => setLicenseNo(e.target.value)}
              placeholder="e.g. RJ-RO-2024-8841"
              className="bg-secondary"
            />
          </div>

          <Button onClick={save} disabled={saving} className="water-shimmer text-white w-full sm:w-auto mt-2">
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {language === 'hi' ? 'सुरक्षित हो रहा है...' : 'Saving...'}</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> {language === 'hi' ? 'बदलाव सुरक्षित करें' : 'Save Changes'}</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 4. Dispatch & Order Alert Preferences */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            <Bell className="w-4 h-4 text-purple-400" />
            <span>{language === 'hi' ? 'ऑर्डर अलर्ट व प्राथमिकताएं' : 'Order Alerts & Priority'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{language === 'hi' ? 'नए ऑर्डर का तुरंत अलर्ट' : 'Instant Order Sound Alert'}</p>
              <p className="text-xs text-muted-foreground">{language === 'hi' ? 'नया ऑर्डर आने पर रिंग व पुश नोटिफिकेशन' : 'Play chime sound and notify when new order arrives'}</p>
            </div>
            <Switch checked={instantOrderAlerts} onCheckedChange={setInstantOrderAlerts} />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{language === 'hi' ? '⚡ 60-मिनट आपातकालीन डिलीवरी स्वीकारें' : 'Accept 60-Min Emergency Orders'}</p>
              <p className="text-xs text-muted-foreground">{language === 'hi' ? 'प्राथमिकता शुल्क (+₹50) वाले आपातकालीन ऑर्डर प्राप्त करें' : 'Receive priority emergency express dispatch orders (+₹50 fee)'}</p>
            </div>
            <Switch checked={emergencyDeliveryEnabled} onCheckedChange={setEmergencyDeliveryEnabled} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
