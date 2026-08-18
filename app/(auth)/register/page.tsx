'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Droplets, Phone, ArrowRight, Loader2,
  CheckCircle2, User, Building2, Lock, KeyRound, MapPin
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LanguageToggle } from '@/components/shared/LanguageToggle'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { createClient } from '@/lib/supabase/client'

function setMockCookie(user: object) {
  document.cookie = `jalseva-mock-session=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=86400; SameSite=Lax`
}

function RegisterPageContent() {
  const supabase = createClient()
  const { t, language } = useLanguage()

  const [selectedRole, setSelectedRole] = useState<'customer' | 'supplier'>('customer')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [city, setCity] = useState('Jodhpur')
  const [zoneId, setZoneId] = useState('')
  const [zones, setZones] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Load Zones for Suppliers
  useEffect(() => {
    supabase.from('zones').select('*').eq('is_active', true).order('name').then((res: any) => {
      if (res?.data) setZones(res.data)
    })
  }, [supabase])

  const isValidPhone = phone.replace(/\D/g, '').length === 10
  const isValidPin = pin.length === 4 && pin === confirmPin && name.trim().length >= 2

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    const digits = phone.replace(/\D/g, '')

    if (name.trim().length < 2) {
      toast.error(language === 'hi' ? 'कृपया अपना पूरा नाम दर्ज करें' : 'Please enter your full name')
      return
    }

    if (digits.length !== 10) {
      toast.error(language === 'hi' ? 'कृपया सही 10-अंकों का मोबाइल नंबर डालें' : 'Enter a valid 10-digit mobile number')
      return
    }

    if (pin.length !== 4) {
      toast.error(language === 'hi' ? 'पिन 4 अंकों का होना चाहिए' : 'PIN must be exactly 4 digits')
      return
    }

    if (pin !== confirmPin) {
      toast.error(language === 'hi' ? 'दोनों पिन मेल नहीं खा रहे हैं' : 'PINs do not match')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/pin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          phone: digits,
          pin: pin.trim(),
          name: name.trim(),
          role: selectedRole,
          bizName: selectedRole === 'supplier' ? name.trim() : undefined,
          city: city,
          zoneId: zoneId || undefined,
        }),
      })

      const data = await res.json()

      if (!data.success) {
        toast.error(data.error || (language === 'hi' ? 'खाता निर्माण विफल रहा' : 'Registration failed'))
        setLoading(false)
        return
      }

      // Store authenticated session
      const mockUser = {
        id: data.userId,
        phone: data.phone,
        user_metadata: {
          role: data.role ?? selectedRole,
          phone: data.phone,
          name: data.name ?? name,
        },
      }
      setMockCookie(mockUser)

      toast.success(
        language === 'hi'
          ? '🎉 खाता सफलतापूर्वक बन गया!'
          : '🎉 Account created successfully!'
      )

      await new Promise((r) => setTimeout(r, 300))

      if (selectedRole === 'supplier') {
        window.location.href = '/supplier/dashboard'
      } else {
        window.location.href = '/customer/dashboard'
      }
    } catch (err: any) {
      console.error('[Register] Error:', err)
      toast.error(language === 'hi' ? 'खाता बनाने में त्रुटि हुई।' : 'Error creating account.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-950/20 via-background to-background" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-sky-500/10 rounded-full blur-3xl" />

      {/* Language Switcher Top Right */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageToggle variant="compact" />
      </div>

      <div className="w-full max-w-lg relative z-10 py-6">
        {/* Brand Header */}
        <div className="text-center mb-6 sm:mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-3">
            <div className="w-11 h-11 rounded-2xl water-shimmer flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Droplets className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              <span className="gradient-text">Jal</span>
              <span className="text-foreground">Seva</span>
            </span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            {language === 'hi' ? 'नया खाता बनाएं' : 'Create an Account'}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {language === 'hi'
              ? 'शुद्ध जल सेवा से जुड़ें और 4-अंकों के सुरक्षा पिन से सुरक्षित रहें'
              : 'Join JalSeva with your secure 4-digit Security PIN'}
          </p>
        </div>

        {/* Registration Card */}
        <div className="glass-card p-5 sm:p-8 rounded-2xl sm:rounded-3xl border-sky-500/20 shadow-xl shadow-sky-500/5">
          <form onSubmit={handleRegister} className="space-y-4 sm:space-y-5">
            {/* Role Selector Tabs */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-semibold">
                {language === 'hi' ? 'खाते का प्रकार चुनें' : 'Select Account Type'}
              </Label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedRole('customer')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                    selectedRole === 'customer'
                      ? 'border-sky-500 bg-sky-500/15 shadow-sm shadow-sky-500/10'
                      : 'border-border bg-secondary/60 hover:border-sky-500/30'
                  }`}
                >
                  <User className={`w-5 h-5 ${selectedRole === 'customer' ? 'text-sky-400' : 'text-muted-foreground'}`} />
                  <span className="text-xs sm:text-sm font-bold">
                    {language === 'hi' ? 'ग्राहक (Customer)' : 'Customer'}
                  </span>
                  <span className="text-[10px] text-muted-foreground">घर व ऑफिस डिलीवरी</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('supplier')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                    selectedRole === 'supplier'
                      ? 'border-purple-500 bg-purple-500/15 shadow-sm shadow-purple-500/10'
                      : 'border-border bg-secondary/60 hover:border-purple-500/30'
                  }`}
                >
                  <Building2 className={`w-5 h-5 ${selectedRole === 'supplier' ? 'text-purple-400' : 'text-muted-foreground'}`} />
                  <span className="text-xs sm:text-sm font-bold">
                    {language === 'hi' ? 'वाटर सप्लायर (Supplier)' : 'Water Supplier'}
                  </span>
                  <span className="text-[10px] text-muted-foreground">पानी का व्यापार बढ़ाएं</span>
                </button>
              </div>
            </div>

            {/* Full Name / Business Name */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-semibold">
                {selectedRole === 'supplier'
                  ? (language === 'hi' ? 'वाटर प्लांट / एजेंसी का नाम' : 'Business / Plant Name')
                  : (language === 'hi' ? 'आपका पूरा नाम' : 'Full Name')}
              </Label>
              <Input
                type="text"
                placeholder={selectedRole === 'supplier' ? 'उदा. मारवाड़ आरओ प्लांट' : 'उदा. राहुल शर्मा'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-secondary/80 h-11 text-sm rounded-xl border-sky-500/20 focus:border-sky-500"
                required
              />
            </div>

            {/* Mobile Number */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-sky-400" />
                <span>{language === 'hi' ? 'मोबाइल नंबर (Mobile Number)' : 'Mobile Number'}</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs sm:text-sm font-bold text-sky-400">
                  +91
                </span>
                <Input
                  type="tel"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="pl-14 bg-secondary/80 h-11 text-sm sm:text-base font-medium rounded-xl border-sky-500/20 focus:border-sky-500"
                  maxLength={10}
                  required
                />
              </div>
            </div>

            {/* PIN Grid (Create & Confirm) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Create PIN */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-sky-400" />
                  <span>{language === 'hi' ? '4-अंकों का पिन बनाएं' : 'Set 4-Digit PIN'}</span>
                </Label>
                <Input
                  type="password"
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="bg-secondary/80 h-11 text-center text-lg tracking-widest font-bold rounded-xl border-sky-500/20"
                  maxLength={4}
                  required
                />
              </div>

              {/* Confirm PIN */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-sky-400" />
                  <span>{language === 'hi' ? 'पिन पुनः दर्ज करें' : 'Confirm PIN'}</span>
                </Label>
                <Input
                  type="password"
                  placeholder="••••"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className={`bg-secondary/80 h-11 text-center text-lg tracking-widest font-bold rounded-xl ${
                    confirmPin && pin !== confirmPin ? 'border-red-500/50' : 'border-sky-500/20'
                  }`}
                  maxLength={4}
                  required
                />
              </div>
            </div>

            {/* Supplier Zone selection if supplier */}
            {selectedRole === 'supplier' && zones.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-purple-400" />
                  <span>{language === 'hi' ? 'डिलीवरी ज़ोन (क्षेत्र)' : 'Primary Delivery Zone'}</span>
                </Label>
                <Select value={zoneId} onValueChange={(v) => setZoneId(v ?? '')}>
                  <SelectTrigger className="bg-secondary/80 h-11 text-xs sm:text-sm rounded-xl">
                    <SelectValue placeholder={language === 'hi' ? 'ज़ोन चुनें (उदा. शास्त्री नगर)' : 'Select Zone'} />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map((z) => (
                      <SelectItem key={z.id} value={z.id}>
                        {z.name} ({z.city})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Register Submit Button */}
            <Button
              type="submit"
              disabled={loading || !isValidPhone || !isValidPin}
              className="w-full water-shimmer text-white font-semibold h-11 sm:h-12 rounded-xl text-sm sm:text-base shadow-lg shadow-sky-500/20 mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {language === 'hi' ? 'खाता बन रहा है...' : 'Creating Account...'}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {language === 'hi' ? 'अकाउंट बनाएं और शुरू करें' : 'Create Account & Get Started'}
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center text-xs sm:text-sm text-muted-foreground border-t border-border/50 pt-4">
            {language === 'hi' ? 'पहले से खाता है? ' : 'Already have an account? '}
            <Link href="/login" className="text-sky-400 font-semibold hover:underline">
              {language === 'hi' ? 'यहाँ लॉगिन करें' : 'Sign in here'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
        </div>
      }
    >
      <RegisterPageContent />
    </Suspense>
  )
}
