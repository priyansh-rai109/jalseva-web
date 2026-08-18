'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Droplets, Phone, ArrowRight, Loader2,
  Sparkles, User, Building2, Lock, Eye, EyeOff, KeyRound, HelpCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LanguageToggle } from '@/components/shared/LanguageToggle'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { SUPPORT_WHATSAPP_URL } from '@/lib/error-utils'

function setMockCookie(user: object) {
  document.cookie = `jalseva-mock-session=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=86400; SameSite=Lax`
}

function redirectByRole(role: string | null) {
  if (role === 'super_admin') window.location.href = '/admin/dashboard'
  else if (role === 'supplier') window.location.href = '/supplier/dashboard'
  else if (role === 'customer') window.location.href = '/customer/dashboard'
  else window.location.href = '/customer/dashboard'
}

export default function LoginPage() {
  const { t, language } = useLanguage()
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [loading, setLoading] = useState(false)

  // Forgot PIN Modal
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [resetPhone, setResetPhone] = useState('')
  const [newPin, setNewPin] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  const isValidPhone = phone.replace(/\D/g, '').length === 10
  const isValidPin = pin.length >= 4

  // ── 1. Submit PIN Login ──────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const digits = phone.replace(/\D/g, '')

    if (digits.length !== 10) {
      toast.error(language === 'hi' ? 'कृपया सही 10-अंकों का मोबाइल नंबर डालें' : 'Enter a valid 10-digit mobile number')
      return
    }

    if (!pin || pin.length < 4) {
      toast.error(language === 'hi' ? 'कृपया अपना 4-अंकों का सुरक्षा पिन डालें' : 'Please enter your 4-digit Security PIN')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/pin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          phone: digits,
          pin: pin.trim(),
        }),
      })

      const data = await res.json()

      if (!data.success) {
        toast.error(data.error || (language === 'hi' ? 'लॉगिन विफल। कृपया सही पिन डालें।' : 'Login failed. Incorrect PIN.'))
        setLoading(false)
        return
      }

      // Store authenticated session
      const mockUser = {
        id: data.userId,
        phone: data.phone,
        user_metadata: {
          role: data.role ?? 'customer',
          phone: data.phone,
          name: data.name ?? 'JalSeva User',
        },
      }
      setMockCookie(mockUser)

      toast.success(
        language === 'hi'
          ? `नमस्ते ${data.name || ''}! स्वागत है।`
          : `Welcome back${data.name ? ', ' + data.name : ''}!`
      )

      await new Promise((r) => setTimeout(r, 200))
      redirectByRole(data.role)
    } catch (err: any) {
      console.error('[Login] Error:', err)
      toast.error(language === 'hi' ? 'लॉगिन में त्रुटि हुई। कृपया पुनः प्रयास करें।' : 'Login error. Please try again.')
      setLoading(false)
    }
  }

  // ── 2. Demo Quick-Logins ────────────────────────────────────────────────
  const handleDemoLogin = (role: 'customer' | 'supplier') => {
    setLoading(true)
    if (role === 'customer') {
      const user = {
        id: 'customer-id',
        phone: '+919876543210',
        user_metadata: { role: 'customer', name: 'Vijay Jodhpur', phone: '+919876543210' },
      }
      setMockCookie(user)
      toast.success('Customer Demo Active!')
      setTimeout(() => { window.location.href = '/customer/dashboard' }, 200)
    } else {
      const user = {
        id: 'supplier-id',
        phone: '+919829012345',
        user_metadata: { role: 'supplier', name: 'Ramesh Kumar', phone: '+919829012345' },
      }
      setMockCookie(user)
      toast.success('Supplier Demo Active!')
      setTimeout(() => { window.location.href = '/supplier/dashboard' }, 200)
    }
  }

  // ── 3. Handle Reset PIN ─────────────────────────────────────────────────
  const handleResetPinSubmit = async () => {
    const digits = resetPhone.replace(/\D/g, '')
    if (digits.length !== 10) {
      toast.error(language === 'hi' ? 'कृपया मान्य 10-अंकों का फोन नंबर डालें' : 'Invalid 10-digit phone number')
      return
    }
    if (newPin.length !== 4) {
      toast.error(language === 'hi' ? 'नया पिन 4 अंकों का होना चाहिए' : 'New PIN must be 4 digits')
      return
    }

    setResetLoading(true)
    try {
      const res = await fetch('/api/auth/pin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset-pin',
          phone: digits,
          pin: newPin,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message || 'PIN reset successfully!')
        setShowForgotModal(false)
        setPhone(digits)
        setPin(newPin)
      } else {
        toast.error(data.error || 'Failed to reset PIN')
      }
    } catch {
      toast.error('Could not reset PIN')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-950/20 via-background to-background" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-sky-500/10 rounded-full blur-3xl" />

      {/* Language Switcher Top Right */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageToggle variant="compact" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand Logo Header */}
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
            {language === 'hi' ? 'स्वागत है!' : 'Welcome Back'}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {language === 'hi'
              ? 'अपने मोबाइल नंबर और 4-अंकों के सुरक्षा पिन से लॉगिन करें'
              : 'Sign in with your Mobile Number & 4-Digit Security PIN'}
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-5 sm:p-8 rounded-2xl sm:rounded-3xl border-sky-500/20 shadow-xl shadow-sky-500/5">
          <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
            {/* Phone Input */}
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
                  className="pl-14 bg-secondary/80 h-11 sm:h-12 text-sm sm:text-base font-medium rounded-xl border-sky-500/20 focus:border-sky-500"
                  maxLength={10}
                  autoFocus
                />
              </div>
            </div>

            {/* 4-Digit Secret PIN Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-sky-400" />
                  <span>{language === 'hi' ? '4-अंकों का सुरक्षा पिन (PIN)' : '4-Digit Security PIN'}</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
                >
                  {language === 'hi' ? 'पिन भूल गए?' : 'Forgot PIN?'}
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showPin ? 'text' : 'password'}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="bg-secondary/80 h-11 sm:h-12 text-center text-lg sm:text-xl tracking-widest font-bold rounded-xl border-sky-500/20 focus:border-sky-500 pr-10"
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {language === 'hi'
                  ? '💡 डिफ़ॉल्ट पिन 1234 है (या अपना सेट किया हुआ 4-अंकों का पिन डालें)'
                  : '💡 Default PIN is 1234 (or enter your custom set PIN)'}
              </p>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              disabled={loading || !isValidPhone || !isValidPin}
              className="w-full water-shimmer text-white font-semibold h-11 sm:h-12 rounded-xl text-sm sm:text-base shadow-lg shadow-sky-500/20"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {language === 'hi' ? 'सत्यापित हो रहा है...' : 'Signing in...'}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {language === 'hi' ? 'लॉगिन करें' : 'Sign In'}
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Quick Demo Access */}
          <div className="mt-6 pt-5 border-t border-border/50">
            <p className="text-xs text-muted-foreground text-center mb-3 font-medium">
              {language === 'hi' ? '⚡ त्वरित डेमो लॉगिन (1-क्लिक)' : '⚡ Quick 1-Click Demo Login'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleDemoLogin('customer')}
                className="text-xs rounded-xl border-sky-500/30 hover:bg-sky-500/10 text-sky-400 gap-1.5 h-9"
              >
                <User className="w-3.5 h-3.5" />
                <span>Customer Demo</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleDemoLogin('supplier')}
                className="text-xs rounded-xl border-purple-500/30 hover:bg-purple-500/10 text-purple-400 gap-1.5 h-9"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Supplier Demo</span>
              </Button>
            </div>
          </div>

          {/* Register Link */}
          <div className="mt-6 text-center text-xs sm:text-sm text-muted-foreground">
            {language === 'hi' ? 'नया खाता बनाना है? ' : "Don't have an account? "}
            <Link href="/register" className="text-sky-400 font-semibold hover:underline">
              {language === 'hi' ? 'नया अकाउंट बनाएं' : 'Register here'}
            </Link>
          </div>
        </div>

        {/* Admin Login Link */}
        <div className="text-center mt-5">
          <Link
            href="/admin-login"
            className="text-xs text-muted-foreground/80 hover:text-sky-400 transition-colors inline-flex items-center gap-1"
          >
            <Lock className="w-3 h-3" />
            <span>{language === 'hi' ? 'सुपर एडमिन ईमेल पोर्टल (Admin Portal)' : 'Super Admin Email Portal'}</span>
          </Link>
        </div>
      </div>

      {/* Forgot PIN Modal */}
      <Dialog open={showForgotModal} onOpenChange={setShowForgotModal}>
        <DialogContent className="glass-card border-sky-500/30 max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              <KeyRound className="w-5 h-5 text-sky-400" />
              <span>{language === 'hi' ? 'सुरक्षा पिन रीसेट करें' : 'Reset Security PIN'}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">{language === 'hi' ? 'रजिस्टर्ड मोबाइल नंबर' : 'Registered Phone'}</Label>
              <Input
                type="tel"
                placeholder="10-digit number"
                value={resetPhone}
                onChange={(e) => setResetPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="bg-secondary text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">{language === 'hi' ? 'नया 4-अंकों का पिन' : 'New 4-Digit PIN'}</Label>
              <Input
                type="password"
                placeholder="e.g. 4582"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="bg-secondary text-sm text-center font-bold text-base tracking-widest"
                maxLength={4}
              />
            </div>
            <Button
              onClick={handleResetPinSubmit}
              disabled={resetLoading || resetPhone.length !== 10 || newPin.length !== 4}
              className="w-full water-shimmer text-white text-xs font-semibold"
            >
              {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (language === 'hi' ? 'पिन बदलें' : 'Update PIN')}
            </Button>
            <div className="text-center pt-2">
              <a
                href={SUPPORT_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-400 hover:underline"
              >
                💬 WhatsApp पर मदद लें (Support)
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
