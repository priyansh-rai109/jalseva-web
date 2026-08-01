'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Droplets, Phone, ArrowRight, Loader2, RotateCcw,
  CheckCircle2, User, Building2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getPhoneUuid } from '@/lib/utils'
import { AnimatedOtpInput } from '@/components/shared/AnimatedOtpInput'

function setMockCookie(user: object) {
  document.cookie = `jalseva-mock-session=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=86400; SameSite=Lax`
}

function redirectByRole(role: string | null, selectedRole: string) {
  if (role === 'super_admin') { window.location.href = '/admin/dashboard'; return }
  if (role === 'supplier') { window.location.href = '/supplier/dashboard'; return }
  if (role === 'customer') { window.location.href = '/customer/dashboard'; return }
  window.location.href = `/register/complete-profile?role=${selectedRole}`
}

function RegisterPageContent() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [requestId, setRequestId] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<'customer' | 'supplier'>('customer')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [otpError, setOtpError] = useState(false)

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

  const handleSendOtp = async () => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length !== 10) { toast.error('Enter a valid 10-digit mobile number'); return }
    setLoading(true)

    try {
      console.log('[Register] Requesting OTP send for:', digits)
      const res = await fetch('/api/auth/send-msg91-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits }),
      })

      const data = await res.json()
      if (!data.success) {
        toast.error(data.error || 'Failed to send OTP')
        setLoading(false)
        return
      }

      if (data.requestId) {
        setRequestId(data.requestId)
      }

      if (data.testMode) {
        toast.info('📲 Test Mode: Use OTP 123456 to register')
      } else {
        toast.success(`OTP sent to +91 ${digits}`)
      }

      setStep('otp')
      setCountdown(30)
      setOtp(['', '', '', '', '', ''])
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    } catch (err: any) {
      console.error('[Register] Send OTP error:', err)
      toast.error('Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    const digits = phone.replace(/\D/g, '')
    if (otpValue.length !== 6) { toast.error('Enter the 6-digit OTP'); return }
    setLoading(true)

    try {
      console.log('[Register] Requesting OTP verification for:', digits, 'with requestId:', requestId)
      const res = await fetch('/api/auth/verify-msg91-otp-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: digits,
          otp: otpValue,
          requestId: requestId || undefined,
          selectedRole,
        }),
      })

      const data = await res.json()
      if (!data.success) {
        setOtpError(true)
        setTimeout(() => setOtpError(false), 600)
        toast.error(data.error || 'Invalid OTP. Please try again.')
        setLoading(false)
        return
      }

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
        // Returning user → direct to dashboard!
        toast.success(`Welcome back${data.name ? ', ' + data.name : ''}!`)
        redirectByRole(data.role, selectedRole)
      } else {
        // New user → complete profile
        toast.success('Phone verified! Please complete your details.')
        window.location.href = `/register/complete-profile?role=${selectedRole}`
      }
    } catch (err: any) {
      console.error('[Register] Verify OTP error:', err)
      toast.error('Verification failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
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
          <h1 className="mt-4 text-3xl font-bold text-foreground">Create Account</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {step === 'phone' ? 'Enter your mobile number to get started' : `OTP sent to +91 ${phone.replace(/\D/g,'')}`}
          </p>
        </div>

        <div className="glass-card p-8 space-y-6">

          {/* Role selector — show only on phone step */}
          {step === 'phone' && (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole('customer')}
                className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2 ${
                  selectedRole === 'customer'
                    ? 'bg-sky-500/15 border-sky-500/60 ring-1 ring-sky-500/50'
                    : 'bg-secondary/40 border-border hover:bg-secondary/70'
                }`}
              >
                <User className={`w-4 h-4 shrink-0 ${selectedRole === 'customer' ? 'text-sky-400' : 'text-muted-foreground'}`} />
                <div>
                  <p className={`text-xs font-semibold ${selectedRole === 'customer' ? 'text-foreground' : 'text-muted-foreground'}`}>Customer</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Order water</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('supplier')}
                className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2 ${
                  selectedRole === 'supplier'
                    ? 'bg-amber-500/15 border-amber-500/60 ring-1 ring-amber-500/50'
                    : 'bg-secondary/40 border-border hover:bg-secondary/70'
                }`}
              >
                <Building2 className={`w-4 h-4 shrink-0 ${selectedRole === 'supplier' ? 'text-amber-400' : 'text-muted-foreground'}`} />
                <div>
                  <p className={`text-xs font-semibold ${selectedRole === 'supplier' ? 'text-foreground' : 'text-muted-foreground'}`}>Supplier</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Deliver water</p>
                </div>
              </button>
            </div>
          )}

          {/* Step 1: Phone */}
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
              </div>

              <Button
                onClick={handleSendOtp}
                disabled={!isValidPhone || loading}
                className="w-full water-shimmer text-white font-semibold h-11"
              >
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending OTP...</> : <>Get OTP <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
            </div>
          )}

          {/* Step 2: OTP */}
          {step === 'otp' && (
            <div className="space-y-5">
              <div className="space-y-3">
                <Label className="text-center block font-medium">Enter 6-digit OTP</Label>
                <AnimatedOtpInput
                  value={otp}
                  onChange={(newOtp) => { setOtp(newOtp); setOtpError(false) }}
                  disabled={loading}
                  error={otpError}
                  otpRefs={otpRefs}
                />
              </div>

              <Button
                onClick={handleVerifyOtp}
                disabled={!isValidOtp || loading}
                className="w-full water-shimmer text-white font-semibold h-11"
              >
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Verify & Continue</>}
              </Button>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <button type="button" onClick={() => { setStep('phone'); setOtp(['','','','','','']); setRequestId(null) }} className="hover:text-sky-400 transition-colors flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> Change number
                </button>
                {countdown > 0 ? (
                  <span>Resend in {countdown}s</span>
                ) : (
                  <button type="button" onClick={handleSendOtp} className="hover:text-sky-400 transition-colors">Resend OTP</button>
                )}
              </div>
            </div>
          )}

          <div className="text-center text-xs text-muted-foreground pt-2 border-t border-border/60">
            Already have an account?{' '}
            <Link href="/login" className="text-sky-400 hover:text-sky-300 font-medium">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
      </div>
    }>
      <RegisterPageContent />
    </Suspense>
  )
}
