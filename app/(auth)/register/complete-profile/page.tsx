'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Droplets, User, MapPin, Building2,
  CheckCircle2, ArrowRight, Loader2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getPhoneUuid } from '@/lib/utils'

function readMockCookie(): any | null {
  if (typeof window === 'undefined') return null
  const raw = document.cookie.split(';').map(c => c.trim()).find(r => r.startsWith('jalseva-mock-session='))
  if (!raw) return null
  try { return JSON.parse(decodeURIComponent(raw.substring('jalseva-mock-session='.length))) } catch { return null }
}

function writeMockCookie(user: object) {
  document.cookie = `jalseva-mock-session=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=86400; SameSite=Lax`
}

export default function CompleteProfilePage() {
  const supabase = createClient()

  const [user, setUser] = useState<any>(null)
  const [phone, setPhone] = useState('')

  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const initialRole = searchParams?.get('role') === 'supplier' ? 'supplier' : 'customer'
  const [selectedRole, setSelectedRole] = useState<'customer' | 'supplier'>(initialRole)

  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Customer form state
  const [custName, setCustName] = useState('')
  const [custCity, setCustCity] = useState('Jodhpur')

  // Supplier form state
  const [bizName, setBizName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [supAddress, setSupAddress] = useState('')
  const [supCity, setSupCity] = useState('Jodhpur')

  // ── On mount: check session & auto-detect registered user ───────────────
  useEffect(() => {
    async function checkSession() {
      try {
        let authUser: any = null

        const mockUser = readMockCookie()
        if (mockUser?.id) {
          authUser = mockUser
        }

        if (!authUser) {
          const { data: { user: supabaseUser } } = await supabase.auth.getUser()
          if (supabaseUser) authUser = supabaseUser
        }

        console.log('[CompleteProfile] Session user:', authUser)

        if (!authUser) {
          console.warn('[CompleteProfile] No session — redirecting to /login')
          toast.error('Session expired. Please login again.')
          window.location.href = '/login'
          return
        }

        setUser(authUser)
        const rawPhone = authUser.phone || authUser.user_metadata?.phone || ''
        setPhone(rawPhone)

        // ── Auto-detection: check if profile already exists in DB ──────────
        const digits = rawPhone.replace(/\D/g, '').slice(-10)
        const fullPhone = `+91${digits}`

        let existingRole: string | null = authUser.user_metadata?.role || null

        if (!existingRole || existingRole === '') {
          if (digits) {
            const { data: pByPhone } = await supabase
              .from('profiles')
              .select('role, id')
              .or(`phone.eq.${fullPhone},phone.eq.${digits},phone.eq.91${digits}`)
              .maybeSingle()
            if (pByPhone?.role && pByPhone.role !== '') {
              existingRole = pByPhone.role
            }
          }

          if (!existingRole && authUser.id) {
            const { data: pById } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', authUser.id)
              .maybeSingle()
            if (pById?.role && pById.role !== '') {
              existingRole = pById.role
            }
          }
        }

        console.log('[CompleteProfile] Existing role detected:', existingRole)

        if (existingRole === 'customer') {
          writeMockCookie({ ...authUser, user_metadata: { ...(authUser.user_metadata || {}), role: 'customer' } })
          window.location.href = '/customer/dashboard'
          return
        }
        if (existingRole === 'supplier') {
          writeMockCookie({ ...authUser, user_metadata: { ...(authUser.user_metadata || {}), role: 'supplier' } })
          window.location.href = '/supplier/dashboard'
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

  // ── Submit: Customer ──────────────────────────────────────────────────
  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!custName.trim()) { toast.error('Full name is required'); return }
    if (!custCity.trim()) { toast.error('City is required'); return }

    setLoading(true)

    try {
      const digits = phone.replace(/\D/g, '').slice(-10)
      const validUserId = (user?.id && user.id.length >= 30 && user.id.includes('-'))
        ? user.id
        : getPhoneUuid(digits)
      const formattedPhone = digits ? `+91${digits}` : phone

      console.log('[CompleteProfile] Submitting Customer profile...', { validUserId, custName, custCity, formattedPhone })

      const { upsertCustomerProfileAction } = await import('./actions')
      const res = await upsertCustomerProfileAction({
        userId: validUserId,
        name: custName.trim(),
        phone: formattedPhone,
        city: custCity.trim(),
      })

      if (res && res.success === false) {
        toast.error(res.error || 'Failed to save profile')
        setLoading(false)
        return
      }

      const realUserId = res?.userId || validUserId

      writeMockCookie({
        ...user,
        id: realUserId,
        user_metadata: {
          ...(user?.user_metadata || {}),
          role: 'customer',
          name: custName.trim(),
          phone: formattedPhone,
        }
      })

      toast.success('Profile created! Welcome to JalSeva 💧')
      await new Promise(r => setTimeout(r, 200))
      window.location.href = '/customer/dashboard'

    } catch (err: any) {
      console.error('[CompleteProfile] Customer submit error:', err)
      toast.error(`Failed to save profile: ${err?.message || 'Unknown error'}`)
      setLoading(false)
    }
  }

  // ── Submit: Supplier ──────────────────────────────────────────────────
  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bizName.trim()) { toast.error('Business name is required'); return }
    if (!ownerName.trim()) { toast.error('Owner name is required'); return }
    if (!supAddress.trim()) { toast.error('Business address is required'); return }

    setLoading(true)

    try {
      const digits = phone.replace(/\D/g, '').slice(-10)
      const validUserId = (user?.id && user.id.length >= 30 && user.id.includes('-'))
        ? user.id
        : getPhoneUuid(digits)
      const formattedPhone = digits ? `+91${digits}` : phone

      console.log('[CompleteProfile] Submitting Supplier profile...', { validUserId, bizName, ownerName, supAddress, supCity })

      const { upsertSupplierProfileAction } = await import('./actions')
      const res = await upsertSupplierProfileAction({
        userId: validUserId,
        bizName: bizName.trim(),
        ownerName: ownerName.trim(),
        phone: formattedPhone,
        address: supAddress.trim(),
        city: supCity.trim(),
      })

      if (res && res.success === false) {
        toast.error(res.error || 'Failed to save supplier profile')
        setLoading(false)
        return
      }

      const realUserId = res?.userId || validUserId

      writeMockCookie({
        ...user,
        id: realUserId,
        user_metadata: {
          ...(user?.user_metadata || {}),
          role: 'supplier',
          name: bizName.trim(),
          phone: formattedPhone,
        }
      })

      toast.success('Supplier profile created! Welcome to JalSeva 🚚')
      await new Promise(r => setTimeout(r, 200))
      window.location.href = '/supplier/dashboard'

    } catch (err: any) {
      console.error('[CompleteProfile] Supplier submit error:', err)
      toast.error(`Failed to submit supplier details: ${err?.message || 'Unknown error'}`)
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
      </div>
    )
  }

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
          <p className="text-muted-foreground text-xs mt-1">Enter your details to register on JalSeva</p>
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
                <Label htmlFor="cust-city">City <span className="text-red-400">*</span></Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="cust-city"
                    value={custCity}
                    onChange={e => setCustCity(e.target.value)}
                    placeholder="Your city (e.g. Jodhpur)"
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full water-shimmer text-white font-semibold h-11 mt-2" disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <>Complete Registration <ArrowRight className="w-4 h-4 ml-2" /></>}
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

              <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold h-11 mt-2" disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : <>Complete Registration <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Already registered?{' '}
          <Link href="/login" className="text-sky-400 hover:text-sky-300 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
