'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Droplets, Phone, ArrowRight, Loader2, RotateCcw,
  CheckCircle2, AlertCircle, User, Building2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getPhoneUuid } from '@/lib/utils'

const TEST_OTP = '123456'
const isDevelopment = process.env.NODE_ENV === 'development'

function setMockCookie(user: object) {
  document.cookie = `jalseva-mock-session=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=86400; SameSite=Lax`
}

function RegisterPageContent() {
  const supabase = createClient()
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [testMode, setTestMode] = useState(false)
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
      const fullPhone = `+91${digits}`
      console.log('[Register] Sending OTP to:', fullPhone)

      const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone })

      if (error) {
        const msg = error.message?.toLowerCase() || ''
        if (
          isDevelopment &&
          (msg.includes('unsupported') || msg.includes('phone provider') ||
            msg.includes('not enabled') || msg.includes('sms') || msg.includes('twilio'))
        ) {
          console.warn('[Register] SMS provider not configured — test mode')
          setTestMode(true)
          toast.info('📲 Test Mode: Use OTP 123456 to continue')
        } else {
          toast.error(error.message)
          setLoading(false)
          return
        }
      } else {
        toast.success(`OTP sent to +91 ${digits}`)
      }

      setStep('otp')
      setCountdown(30)
      setOtp(['', '', '', '', '', ''])
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    } catch (err: any) {
      console.error('[Register] Send OTP exception:', err)
      toast.error('Failed to send OTP. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    const digits = phone.replace(/\D/g, '')
    const fullPhone = `+91${digits}`
    const enteredOtp = otpValue

    if (enteredOtp.length !== 6) { toast.error('Enter the 6-digit OTP'); return }
    setLoading(true)

    try {
      let userId: string

      if (isDevelopment && (testMode || enteredOtp === TEST_OTP)) {
        console.log('[Register] Test mode OTP accepted')
        userId = getPhoneUuid(digits)
      } else {
        const { data, error } = await supabase.auth.verifyOtp({
          phone: fullPhone,
          token: enteredOtp,
          type: 'sms'
        })
        if (error) {
          console.error('[Register] OTP verify error:', error.message)
          toast.error(error.message || 'Invalid OTP. Try again.')
          setLoading(false)
          return
        }
        userId = data.user?.id ?? getPhoneUuid(digits)
      }

      console.log('[Register] OTP verified. userId:', userId)

      // Check if user already has a profile/role
      let existingRole: string | null = null
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle()
        existingRole = (profile?.role && profile.role !== '') ? profile.role : null
        console.log('[Register] Existing role from DB:', existingRole)
      } catch {}

      // Write mock session cookie with empty role (complete-profile will update it)
      const mockUser = {
        id: userId,
        phone: fullPhone,
        user_metadata: { role: existingRole ?? '', phone: fullPhone }
      }
      setMockCookie(mockUser)

      await new Promise(r => setTimeout(r, 200))

      if (existingRole) {
        // Returning user — go straight to dashboard
        toast.success('Welcome back! Signing you in...')
        if (existingRole === 'super_admin') window.location.href = '/admin/dashboard'
        else if (existingRole === 'supplier') window.location.href = '/supplier/dashboard'
        else window.location.href = '/customer/dashboard'
      } else {
        // New user — go to complete profile
        toast.success('Phone verified! Complete your profile.')
        window.location.href = '/register/complete-profile'
      }
    } catch (err: any) {
      console.error('[Register] Verify OTP exception:', err)
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
          {testMode && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Test Mode Active</p>
                <p className="mt-0.5 text-amber-300/80">Use OTP <strong>123456</strong> to register.</p>
              </div>
            </div>
          )}

          {/* What you can register as */}
          {step === 'phone' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-sky-500/8 border border-sky-500/20 flex items-center gap-2">
                <User className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-foreground">Customer</p>
                  <p className="text-[10px] text-muted-foreground">Order water</p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-foreground">Supplier</p>
                  <p className="text-[10px] text-muted-foreground">Deliver water</p>
                </div>
              </div>
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
                <button type="button" onClick={() => { setStep('phone'); setOtp(['','','','','','']); setTestMode(false) }} className="hover:text-sky-400 transition-colors flex items-center gap-1">
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
