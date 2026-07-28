'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Droplets, User, Mail, MapPin, Building2,
  CheckCircle2, ArrowRight, Loader2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getPhoneUuid } from '@/lib/utils'

// ─────────────────────────────────────────────────
// Helper: read mock session cookie
// ─────────────────────────────────────────────────
function readMockCookie(): any | null {
  if (typeof window === 'undefined') return null
  const raw = document.cookie.split(';').map(c => c.trim()).find(r => r.startsWith('jalseva-mock-session='))
  if (!raw) return null
  try { return JSON.parse(decodeURIComponent(raw.substring('jalseva-mock-session='.length))) } catch { return null }
}

function writeMockCookie(user: object) {
  document.cookie = `jalseva-mock-session=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=86400; SameSite=Lax`
}

// ─────────────────────────────────────────────────
export default function CompleteProfilePage() {
  const supabase = createClient()

  const [user, setUser] = useState<any>(null)
  const [phone, setPhone] = useState('')
  
  // Try to read role from URL, fallback to customer
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const initialRole = searchParams?.get('role') === 'supplier' ? 'supplier' : 'customer'
  const [selectedRole, setSelectedRole] = useState<'customer' | 'supplier'>(initialRole)

  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Customer form state
  const [custName, setCustName] = useState('')
  const [custEmail, setCustEmail] = useState('')
  const [custCity, setCustCity] = useState('Jodhpur')

  // Supplier form state
  const [bizName, setBizName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [supEmail, setSupEmail] = useState('')
  const [supAddress, setSupAddress] = useState('')
  const [supCity, setSupCity] = useState('Jodhpur')

  // ── On mount: verify session exists ──────────
  useEffect(() => {
    async function checkSession() {
      try {
        let { data: { user: authUser } } = await supabase.auth.getUser()
        
        // Direct manual fallback in case client.ts patch is cached/fails
        if (!authUser && typeof document !== 'undefined') {
          const raw = document.cookie.split(';').map(c => c.trim()).find(r => r.startsWith('jalseva-mock-session='))
          if (raw) {
            try {
              const mockUser = JSON.parse(decodeURIComponent(raw.substring('jalseva-mock-session='.length)))
              if (mockUser?.id) authUser = mockUser
            } catch (e) {
              console.error('Fallback mock parse error:', e)
            }
          }
        }

        console.log('[CompleteProfile] Session auth user:', authUser)

        if (!authUser) {
          console.warn('[CompleteProfile] No session — redirecting to /login')
          toast.error('Session expired. Please login again.')
          window.location.href = '/login'
          return
        }

        setUser(authUser)
        const rawPhone = authUser.phone || authUser.user_metadata?.phone || ''
        setPhone(rawPhone)

        // If user already has a completed role, redirect to dashboard
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authUser.id)
          .maybeSingle()

        const existingRole = profile?.role && profile.role !== '' ? profile.role : null
        console.log('[CompleteProfile] Existing role from DB:', existingRole)

        if (existingRole === 'customer') {
          window.location.href = '/customer/dashboard'
          return
        }
        if (existingRole === 'supplier') {
          window.location.href = '/supplier/pending'
          return
        }
      } catch (err) {
        console.error('[CompleteProfile] Auth check error:', err)
      } finally {
        setCheckingAuth(false)
      }
    }
    checkSession()
  }, [])

  // ── Submit: Customer ─────────────────────────
  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!custName.trim()) { toast.error('Full name is required'); return }
    if (!custCity.trim()) { toast.error('City is required'); return }

    console.log('[CompleteProfile] Customer form submitted:', { custName, custEmail, custCity })
    console.log('[CompleteProfile] Current session user:', user)
    setLoading(true)

    try {
      const digits = phone.replace(/\D/g, '').slice(-10)
      const validUserId = (user?.id && user.id.length >= 30 && user.id.includes('-'))
        ? user.id
        : getPhoneUuid(digits)
      const formattedPhone = digits ? `+91${digits}` : phone

      console.log('[CompleteProfile] Inserting profile data... userId:', validUserId)

      // Use server action to bypass RLS and get REAL user ID
      const { upsertCustomerProfileAction } = await import('./actions')
      let newUserId = validUserId
      try {
        newUserId = await upsertCustomerProfileAction({
          userId: validUserId,
          name: custName.trim(),
          email: custEmail.trim() || null,
          phone: formattedPhone,
          city: custCity.trim(),
        })
        console.log('[CompleteProfile] Customer profile saved via server action, real ID:', newUserId)
      } catch (saveErr: any) {
        console.error('[CompleteProfile] Profile save failed:', saveErr)
        toast.error('Failed to save profile details.')
        setLoading(false)
        return
      }

      // 3. CRITICAL: Update cookie BEFORE redirect so middleware sees the role
      const currentCookieUser = readMockCookie() || {}
      writeMockCookie({
        ...currentCookieUser,
        id: newUserId,
        user_metadata: {
          ...(currentCookieUser.user_metadata || {}),
          role: 'customer',
          name: custName.trim(),
          phone: formattedPhone,
        }
      })

      const targetPath = '/customer/dashboard'
      console.log('[CompleteProfile] Attempting redirect to:', targetPath)
      toast.success('Profile completed! Welcome to JalSeva 💧')

      // 4. Small delay to ensure cookie write is registered
      await new Promise(r => setTimeout(r, 300))
      window.location.href = targetPath

    } catch (err: any) {
      console.error('[CompleteProfile] Customer submit error:', err)
      toast.error(`Failed to save profile: ${err?.message || 'Unknown error'}`)
      setLoading(false)
    }
  }

  // ── Submit: Supplier ─────────────────────────
  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bizName.trim()) { toast.error('Business name is required'); return }
    if (!ownerName.trim()) { toast.error('Owner name is required'); return }
    if (!supAddress.trim()) { toast.error('Business address is required'); return }

    console.log('[CompleteProfile] Supplier form submitted:', { bizName, ownerName, supEmail, supAddress, supCity })
    setLoading(true)

    try {
      const digits = phone.replace(/\D/g, '').slice(-10)
      const validUserId = (user?.id && user.id.length >= 30 && user.id.includes('-'))
        ? user.id
        : getPhoneUuid(digits)
      const formattedPhone = digits ? `+91${digits}` : phone

      // Use server action to bypass RLS
      const { upsertSupplierProfileAction } = await import('./actions')
      let newUserId = validUserId
      try {
        newUserId = await upsertSupplierProfileAction({
          userId: validUserId,
          bizName: bizName.trim(),
          ownerName: ownerName.trim(),
          email: supEmail.trim() || null,
          phone: formattedPhone,
          address: supAddress.trim(),
          city: supCity.trim(),
        })
        console.log('[CompleteProfile] Supplier profile saved via server action, real ID:', newUserId)
      } catch (saveErr: any) {
        console.error('[CompleteProfile] Profile save failed:', saveErr)
        toast.error('Failed to save supplier details.')
        setLoading(false)
        return
      }

      // 3. CRITICAL: Update cookie BEFORE redirect
      const currentCookieUser = readMockCookie() || {}
      writeMockCookie({
        ...currentCookieUser,
        id: newUserId,
        user_metadata: {
          ...(currentCookieUser.user_metadata || {}),
          role: 'supplier',
          name: bizName.trim(),
          phone: formattedPhone,
        }
      })

      const targetPath = '/supplier/pending'
      console.log('[CompleteProfile] Attempting redirect to:', targetPath)
      toast.success('Application submitted! Admin will review within 2-3 days.')

      // 4. Small delay to ensure cookie write is registered
      await new Promise(r => setTimeout(r, 300))
      window.location.href = targetPath

    } catch (err: any) {
      console.error('[CompleteProfile] Supplier submit error:', err)
      toast.error(`Failed to submit application: ${err?.message || 'Unknown error'}`)
      setLoading(false)
    }
  }

  // ─────────────────────────────────────────────
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
      </div>
    )
  }

  // ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-72 h-72 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 space-y-6">
        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl water-shimmer flex items-center justify-center shadow-lg">
              <Droplets className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              <span className="gradient-text">Jal</span>
              <span className="text-foreground">Seva</span>
            </span>
          </Link>
          {phone && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mobile {phone} Verified</span>
            </div>
          )}
          <h1 className="mt-3 text-2xl font-bold text-foreground">Complete Your Profile</h1>
          <p className="text-muted-foreground text-xs mt-1">Choose your role on the JalSeva platform</p>
        </div>

        <div className="glass-card p-6 sm:p-8 space-y-6">
          {/* Role Selection */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Account Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole('customer')}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  selectedRole === 'customer'
                    ? 'bg-sky-500/15 border-sky-500/60 ring-1 ring-sky-500/50'
                    : 'bg-secondary/40 border-border hover:bg-secondary/70'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${selectedRole === 'customer' ? 'bg-sky-500 text-white' : 'bg-secondary text-muted-foreground'}`}>
                    <Droplets className="w-5 h-5" />
                  </div>
                  {selectedRole === 'customer' && <CheckCircle2 className="w-4 h-4 text-sky-400" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Customer</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Order water cans & tankers</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('supplier')}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  selectedRole === 'supplier'
                    ? 'bg-amber-500/15 border-amber-500/60 ring-1 ring-amber-500/50'
                    : 'bg-secondary/40 border-border hover:bg-secondary/70'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${selectedRole === 'supplier' ? 'bg-amber-500 text-white' : 'bg-secondary text-muted-foreground'}`}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  {selectedRole === 'supplier' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Water Supplier</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Deliver water & manage biz</p>
                </div>
              </button>
            </div>
          </div>

          {/* ── Customer Form ── */}
          {selectedRole === 'customer' && (
            <form onSubmit={handleCustomerSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cust-name">Full Name <span className="text-red-400">*</span></Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="cust-name"
                    value={custName}
                    onChange={e => setCustName(e.target.value)}
                    placeholder="Your full name"
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cust-email">Email <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="cust-email"
                    type="email"
                    value={custEmail}
                    onChange={e => setCustEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cust-city">City <span className="text-red-400">*</span></Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="cust-city"
                    value={custCity}
                    onChange={e => setCustCity(e.target.value)}
                    placeholder="Your city"
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full water-shimmer text-white font-semibold" disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <>Continue to Dashboard <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
            </form>
          )}

          {/* ── Supplier Form ── */}
          {selectedRole === 'supplier' && (
            <form onSubmit={handleSupplierSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="biz-name">Business Name <span className="text-red-400">*</span></Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="biz-name" value={bizName} onChange={e => setBizName(e.target.value)} placeholder="e.g. Marwar Pure Water" className="pl-9" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="owner-name">Owner Name <span className="text-red-400">*</span></Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="owner-name" value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Your full name" className="pl-9" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sup-email">Business Email <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="sup-email" type="email" value={supEmail} onChange={e => setSupEmail(e.target.value)} placeholder="business@email.com" className="pl-9" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sup-address">Business Address <span className="text-red-400">*</span></Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="sup-address" value={supAddress} onChange={e => setSupAddress(e.target.value)} placeholder="Full business address" className="pl-9" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sup-city">City <span className="text-red-400">*</span></Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="sup-city" value={supCity} onChange={e => setSupCity(e.target.value)} placeholder="Your city" className="pl-9" required />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                ⚠️ Supplier accounts require admin approval (2–3 days). You can check your status after submitting.
              </div>

              <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold" disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : <>Submit Application <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-sky-400 hover:text-sky-300 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
