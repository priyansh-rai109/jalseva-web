'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Droplets, Phone, ArrowRight, Loader2, RotateCcw,
  Sparkles, User, Building2, CheckCircle2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getPhoneUuid } from '@/lib/utils'
import { getFriendlyErrorMessage, SUPPORT_WHATSAPP_URL } from '@/lib/error-utils'

function setMockCookie(user: object) {
  document.cookie = `jalseva-mock-session=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=86400; SameSite=Lax`
}

function redirectByRole(role: string | null) {
  if (role === 'super_admin') window.location.href = '/admin/dashboard'
  else if (role === 'supplier') window.location.href = '/supplier/dashboard'
  else if (role === 'customer') window.location.href = '/customer/dashboard'
  else window.location.href = '/register/complete-profile'
}

export default function LoginPage() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [requestId, setRequestId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const otpRefs = useRef<(HTMLInputElement | null)[]>([])
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (countdown > 0) {
      countdownRef.current = setTimeout(() => setCountdown(c => c - 1), 1000)
    }
    return () => { if (countdownRef.current) clearTimeout(countdownRef.current) }
  }, [countdown])

  const isValidPhone = phone.replace(/\D/g, '').length === 10
  const otpValue = otp.join('')
  const isValidOtp = otpValue.length === 6

  // ── OTP box handlers ──────────────────────────────────────────────────
  const handleOtpChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[idx] = digit
    setOtp(next)
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus()
  }

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(''))
      otpRefs.current[5]?.focus()
    }
  }

  // ── Step 1: Send OTP via Server API ─────────────────────────────────────
  const handleSendOtp = async () => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length !== 10) { toast.error('Enter a valid 10-digit mobile number'); return }
    setLoading(true)

    try {
      console.log('[Login] Requesting OTP send for:', digits)
      const res = await fetch('/api/auth/send-msg91-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits }),
      })
      const data = await res.json()
      if (!data.success) {
        toast.error(getFriendlyErrorMessage(data.error, 'auth'), {
          action: {
            label: 'Need Help?',
            onClick: () => window.open(SUPPORT_WHATSAPP_URL, '_blank'),
          },
        })
        setLoading(false)
        return
      }

      if (data.requestId) {
        setRequestId(data.requestId)
      }

      if (data.testMode) {
        toast.info('📲 Test Mode: Use OTP 123456 to continue')
      } else {
        toast.success(`OTP sent to +91 ${digits}`)
      }

      setStep('otp')
      setCountdown(30)
      setOtp(['', '', '', '', '', ''])
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    } catch (err: any) {
      console.error('[Login] Send OTP error:', err)
      toast.error(getFriendlyErrorMessage(err, 'auth'), {
        action: {
          label: 'Need Help?',
          onClick: () => window.open(SUPPORT_WHATSAPP_URL, '_blank'),
        },
      })
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: Verify OTP via Server API ───────────────────────────────────
  const handleVerifyOtp = async () => {
    const digits = phone.replace(/\D/g, '')
    if (otpValue.length !== 6) { toast.error('Sahi 6-digit OTP daalo'); return }
    setLoading(true)

    try {
      console.log('[Login] Requesting OTP verification for:', digits, 'with requestId:', requestId)
      const res = await fetch('/api/auth/verify-msg91-otp-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: digits,
          otp: otpValue,
          requestId: requestId || undefined,
        }),
      })

      const data = await res.json()
      if (!data.success) {
        toast.error(getFriendlyErrorMessage(data.error, 'auth'), {
          action: {
            label: 'Need Help?',
            onClick: () => window.open(SUPPORT_WHATSAPP_URL, '_blank'),
          },
        })
        setLoading(false)
        return
      }

      // Set mock session cookie with real userId and role
      const mockUser = {
        id: data.userId,
        phone: data.phone,
        user_metadata: {
          role: data.role ?? '',
          phone: data.phone,
          name: data.name ?? '',
        },
      }
      setMockCookie(mockUser)

      await new Promise(r => setTimeout(r, 200))

      if (!data.isNewUser && data.role) {
        // Returning registered user → direct to dashboard!
        toast.success(`Welcome back${data.name ? ', ' + data.name : ''}!`)
        redirectByRole(data.role)
      } else {
        // New unregistered user → complete profile
        toast.success('Phone verified! Please complete your details.')
        window.location.href = `/register/complete-profile?role=customer`
      }
    } catch (err: any) {
      console.error('[Login] Verify OTP error:', err)
      toast.error('Verification failed. Please try again.')
      setLoading(false)
    }
  }

  // ── Demo quick-fills ────────────────────────────────────────────────────
  const fillDemo = async (demoPhone: string, role: string) => {
    const digits = demoPhone.replace(/\D/g, '')
    const fullPhone = `+91${digits}`
    const userId = getPhoneUuid(digits)

    const mockUser = {
      id: userId,
      phone: fullPhone,
      user_metadata: { role, phone: fullPhone, name: role === 'customer' ? 'Vijay Jodhpur' : 'Ramesh Kumar' },
    }
    setMockCookie(mockUser)

    toast.success(`${role === 'customer' ? 'Customer' : 'Supplier'} demo session set!`)
    await new Promise(r => setTimeout(r, 200))
    window.location.href = role === 'customer' ? '/customer/dashboard' : '/supplier/dashboard'
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-400/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl water-shimmer flex items-center justify-center shadow-lg">
              <Droplets className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              <span className="gradient-text">Jal</span>
              <span className="text-foreground">Seva</span>
            </span>
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-foreground">Welcome Back</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {step === 'phone' ? 'Sign in with your mobile number' : `OTP sent to +91 ${phone.replace(/\D/g,'')}`}
          </p>
        </div>

        <div className="glass-card p-8 space-y-6">

          {/* ── STEP 1: Phone Input ── */}
          {step === 'phone' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Mobile Number</Label>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 px-3 rounded-lg bg-secondary border border-border text-sm font-medium text-muted-foreground whitespace-nowrap">
                    🇮🇳 +91
                  </div>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="9876543210"
                      className="pl-9 bg-secondary border-border tracking-widest font-mono"
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      onKeyDown={e => { if (e.key === 'Enter' && isValidPhone) handleSendOtp() }}
                    />
                  </div>
                </div>
                {phone.length > 0 && phone.length < 10 && (
                  <p className="text-xs text-muted-foreground">{10 - phone.length} more digit{10 - phone.length !== 1 ? 's' : ''} needed</p>
                )}
              </div>

              <Button
                onClick={handleSendOtp}
                disabled={!isValidPhone || loading}
                className="w-full water-shimmer text-white font-semibold h-11"
              >
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending OTP...</> : <>Send OTP <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
            </div>
          )}

          {/* ── STEP 2: Custom 6-Box OTP Input ── */}
          {step === 'otp' && (
            <div className="space-y-5">
              <div className="space-y-3">
                <Label className="text-center block">Enter 6-digit OTP</Label>
                <div className="flex gap-2 justify-center">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={el => { otpRefs.current[idx] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(idx, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(idx, e)}
                      onPaste={idx === 0 ? handleOtpPaste : undefined}
                      className={`w-11 h-12 text-center text-lg font-bold rounded-lg border bg-secondary transition-all outline-none
                        ${digit ? 'border-sky-500 text-sky-300 shadow-sm shadow-sky-500/20' : 'border-border text-foreground'}
                        focus:border-sky-400 focus:ring-1 focus:ring-sky-400/40`}
                    />
                  ))}
                </div>
              </div>

              <Button
                onClick={handleVerifyOtp}
                disabled={!isValidOtp || loading}
                className="w-full water-shimmer text-white font-semibold h-11"
              >
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Verify & Continue</>}
              </Button>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <button
                  type="button"
                  onClick={() => { setStep('phone'); setOtp(['','','','','','']); setRequestId(null) }}
                  className="hover:text-sky-400 transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Change number
                </button>
                {countdown > 0 ? (
                  <span>Resend in {countdown}s</span>
                ) : (
                  <button type="button" onClick={handleSendOtp} className="hover:text-sky-400 transition-colors">
                    Resend OTP
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quick Demo Pre-fills */}
          <div className="pt-2 border-t border-border/60 space-y-3">
            <div className="flex items-center gap-1.5 justify-center text-xs text-sky-400 font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Quick Demo Pre-fills</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemo('9876543210', 'customer')}
                className="py-2 px-3 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-xs font-medium flex items-center justify-center gap-1.5 text-sky-300 transition-all"
              >
                <User className="w-3.5 h-3.5" /> Customer Demo
              </button>
              <button
                type="button"
                onClick={() => fillDemo('9876543211', 'supplier')}
                className="py-2 px-3 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-xs font-medium flex items-center justify-center gap-1.5 text-amber-400 transition-all"
              >
                <Building2 className="w-3.5 h-3.5" /> Supplier Demo
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            New to JalSeva?{' '}
            <Link href="/register" className="text-sky-400 hover:text-sky-300 font-medium">Register here</Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/admin-login" className="hover:text-muted-foreground/80 underline">Go to Admin Portal →</Link>
        </p>
      </div>
    </div>
  )
}
