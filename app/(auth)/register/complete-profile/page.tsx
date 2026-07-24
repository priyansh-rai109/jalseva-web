'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Droplets, User, Mail, MapPin, Building2, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getPhoneUuid } from '@/lib/utils'

const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  city: z.string().min(2, 'City required'),
})

const supplierSchema = z.object({
  business_name: z.string().min(2, 'Business name is required'),
  owner_name: z.string().min(2, 'Owner name is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().min(5, 'Full business address required'),
  city: z.string().min(2, 'City required'),
})

type CustomerForm = z.infer<typeof customerSchema>
type SupplierForm = z.infer<typeof supplierSchema>

export default function CompleteProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<any>(null)
  const [phone, setPhone] = useState<string>('')
  const [selectedRole, setSelectedRole] = useState<'customer' | 'supplier'>('customer')
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const {
    register: registerCustomer,
    handleSubmit: handleSubmitCustomer,
    formState: { errors: customerErrors }
  } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: { city: 'Jodhpur' }
  })

  const {
    register: registerSupplier,
    handleSubmit: handleSubmitSupplier,
    formState: { errors: supplierErrors }
  } = useForm<SupplierForm>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { city: 'Jodhpur' }
  })

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        console.log('[CompleteProfile] Session user:', currentUser)
        if (!currentUser) {
          toast.error('Session expired. Please enter phone number again.')
          router.push('/login')
          return
        }
        setUser(currentUser)
        const rawPhone = currentUser.phone || currentUser.user_metadata?.phone || ''
        setPhone(rawPhone)

        // Check if user already has a completed profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', currentUser.id)
          .maybeSingle()

        console.log('[CompleteProfile] Existing profile:', profile)

        if (profile?.role === 'customer') {
          router.push('/customer/dashboard')
        } else if (profile?.role === 'supplier') {
          router.push('/supplier/pending')
        }
      } catch (err) {
        console.error('[CompleteProfile] Error loading session:', err)
      } finally {
        setCheckingAuth(false)
      }
    }
    loadUser()
  }, [])

  const onSubmitCustomer = async (data: CustomerForm) => {
    console.log('[CompleteProfile] Customer form submitted:', data)
    console.log('[CompleteProfile] Current auth session:', user)
    setLoading(true)

    try {
      console.log('[CompleteProfile] Inserting profile data...')

      const cleanPhone = phone.replace(/\D/g, '').slice(-10)
      const validUserId = user?.id && user.id.length >= 30 && user.id.includes('-')
        ? user.id
        : getPhoneUuid(cleanPhone)
      const formattedPhone = cleanPhone ? `+91${cleanPhone}` : phone

      // 1. Upsert profile row
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: validUserId,
          role: 'customer',
          name: data.name.trim(),
          email: data.email?.trim() || null,
          phone: formattedPhone,
          updated_at: new Date().toISOString()
        })

      console.log('[CompleteProfile] Profile insert response:', profileError || 'success')
      if (profileError) console.warn('[CompleteProfile] Profile insert notice:', profileError.message)

      // 2. Upsert customer row
      const { error: customerError } = await supabase
        .from('customers')
        .upsert({
          user_id: validUserId,
          name: data.name.trim(),
          phone: formattedPhone,
          email: data.email?.trim() || null,
          addresses: [{
            id: 'default-addr',
            label: 'Primary Address',
            line1: data.city,
            city: data.city,
            is_default: true
          }]
        })

      if (customerError) console.warn('[CompleteProfile] Customer insert notice:', customerError.message)

      // 3. CRITICAL: Update the mock session cookie with the new role BEFORE redirecting
      //    This ensures middleware reads the correct role on the next request
      const updatedUser = {
        ...(user || {}),
        id: validUserId,
        user_metadata: {
          ...(user?.user_metadata || {}),
          role: 'customer',
          name: data.name.trim(),
          phone: formattedPhone,
        }
      }
      document.cookie = `jalseva-mock-session=${encodeURIComponent(JSON.stringify(updatedUser))}; path=/; max-age=86400; SameSite=Lax`

      const targetPath = '/customer/dashboard'
      console.log('[CompleteProfile] Attempting redirect to:', targetPath)
      toast.success('Profile completed successfully!')

      // Small delay to ensure cookie is fully set before navigation
      await new Promise(r => setTimeout(r, 300))
      window.location.href = targetPath
    } catch (err: any) {
      console.error('[CompleteProfile] Profile completion error:', err)
      toast.error(`Failed to complete profile: ${err?.message || 'Unknown error'}`)
      setLoading(false)
    }
  }

  const onSubmitSupplier = async (data: SupplierForm) => {
    console.log('[CompleteProfile] Supplier form submitted:', data)
    console.log('[CompleteProfile] Current auth session:', user)
    setLoading(true)

    try {
      console.log('[CompleteProfile] Inserting supplier profile data...')

      const cleanPhone = phone.replace(/\D/g, '').slice(-10)
      const validUserId = user?.id && user.id.length >= 30 && user.id.includes('-')
        ? user.id
        : getPhoneUuid(cleanPhone)
      const formattedPhone = cleanPhone ? `+91${cleanPhone}` : phone

      // 1. Upsert profile row
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: validUserId,
          role: 'supplier',
          name: data.business_name.trim(),
          email: data.email?.trim() || null,
          phone: formattedPhone,
          updated_at: new Date().toISOString()
        })

      if (profileError) console.warn('[CompleteProfile] Profile insert notice:', profileError.message)

      // 2. Upsert supplier row
      const { error: supplierError } = await supabase
        .from('suppliers')
        .upsert({
          user_id: validUserId,
          business_name: data.business_name.trim(),
          owner_name: data.owner_name.trim(),
          phone: formattedPhone,
          email: data.email?.trim() || null,
          address: data.address.trim(),
          city: data.city.trim(),
          status: 'pending'
        })

      if (supplierError) console.warn('[CompleteProfile] Supplier insert notice:', supplierError.message)

      // 3. CRITICAL: Update the mock session cookie with the new role BEFORE redirecting
      const updatedUser = {
        ...(user || {}),
        id: validUserId,
        user_metadata: {
          ...(user?.user_metadata || {}),
          role: 'supplier',
          name: data.business_name.trim(),
          phone: formattedPhone,
        }
      }
      document.cookie = `jalseva-mock-session=${encodeURIComponent(JSON.stringify(updatedUser))}; path=/; max-age=86400; SameSite=Lax`

      const targetPath = '/supplier/pending'
      console.log('[CompleteProfile] Attempting redirect to:', targetPath)
      toast.success('Supplier application submitted! Under admin review.')

      // Small delay to ensure cookie is fully set before navigation
      await new Promise(r => setTimeout(r, 300))
      window.location.href = targetPath
    } catch (err: any) {
      console.error('[CompleteProfile] Supplier onboarding error:', err)
      toast.error(`Failed to complete profile: ${err?.message || 'Unknown error'}`)
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
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-72 h-72 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 space-y-6">
        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl water-shimmer flex items-center justify-center shadow-lg">
              <Droplets className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              <span className="gradient-text">Jal</span>
              <span className="text-foreground">Seva</span>
            </span>
          </Link>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Mobile {phone} Verified</span>
          </div>
          <h1 className="mt-3 text-2xl font-bold text-foreground">Complete Your Profile</h1>
          <p className="text-muted-foreground text-xs mt-1">Select your role on JalSeva water delivery platform</p>
        </div>

        <div className="glass-card p-6 sm:p-8 space-y-6">
          {/* Role Selection Cards */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Account Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole('customer')}
                className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  selectedRole === 'customer'
                    ? 'bg-sky-500/15 border-sky-500/60 ring-1 ring-sky-500/50 shadow-md'
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
                  <p className="text-xs text-muted-foreground mt-0.5">Order water cans & tankers for home/business</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('supplier')}
                className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  selectedRole === 'supplier'
                    ? 'bg-amber-500/15 border-amber-500/60 ring-1 ring-amber-500/50 shadow-md'
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
                  <p className="text-xs text-muted-foreground mt-0.5">Deliver water orders & manage business</p>
                </div>
              </button>
            </div>
          </div>

          {/* Customer Form */}
          {selectedRole === 'customer' && (
            <form onSubmit={handleSubmitCustomer(onSubmitCustomer)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="customer-name" className="text-sm font-medium">
                  Full Name <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="customer-name"
                    {...registerCustomer('name')}
                    placeholder="Enter your full name"
                    className="pl-9"
                  />
                </div>
                {customerErrors.name && <p className="text-xs text-red-400">{customerErrors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="customer-email" className="text-sm font-medium">
                  Email Address <span className="text-muted-foreground text-xs">(Optional)</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="customer-email"
                    type="email"
                    {...registerCustomer('email')}
                    placeholder="your@email.com"
                    className="pl-9"
                  />
                </div>
                {customerErrors.email && <p className="text-xs text-red-400">{customerErrors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="customer-city" className="text-sm font-medium">
                  City <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="customer-city"
                    {...registerCustomer('city')}
                    placeholder="Your city"
                    className="pl-9"
                  />
                </div>
                {customerErrors.city && <p className="text-xs text-red-400">{customerErrors.city.message}</p>}
              </div>

              <Button type="submit" className="w-full water-shimmer text-white font-semibold" disabled={loading}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving Profile...</>
                ) : (
                  <>Continue to Dashboard <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </form>
          )}

          {/* Supplier Form */}
          {selectedRole === 'supplier' && (
            <form onSubmit={handleSubmitSupplier(onSubmitSupplier)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="business-name" className="text-sm font-medium">
                  Business Name <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="business-name"
                    {...registerSupplier('business_name')}
                    placeholder="e.g. Marwar Pure Water"
                    className="pl-9"
                  />
                </div>
                {supplierErrors.business_name && <p className="text-xs text-red-400">{supplierErrors.business_name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="owner-name" className="text-sm font-medium">
                  Owner Name <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="owner-name"
                    {...registerSupplier('owner_name')}
                    placeholder="Your full name"
                    className="pl-9"
                  />
                </div>
                {supplierErrors.owner_name && <p className="text-xs text-red-400">{supplierErrors.owner_name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="supplier-email" className="text-sm font-medium">
                  Business Email <span className="text-muted-foreground text-xs">(Optional)</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="supplier-email"
                    type="email"
                    {...registerSupplier('email')}
                    placeholder="business@email.com"
                    className="pl-9"
                  />
                </div>
                {supplierErrors.email && <p className="text-xs text-red-400">{supplierErrors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address" className="text-sm font-medium">
                  Business Address <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="address"
                    {...registerSupplier('address')}
                    placeholder="Full business address"
                    className="pl-9"
                  />
                </div>
                {supplierErrors.address && <p className="text-xs text-red-400">{supplierErrors.address.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="supplier-city" className="text-sm font-medium">
                  City <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="supplier-city"
                    {...registerSupplier('city')}
                    placeholder="Your city"
                    className="pl-9"
                  />
                </div>
                {supplierErrors.city && <p className="text-xs text-red-400">{supplierErrors.city.message}</p>}
              </div>

              <Button type="submit" className="w-full amber-shimmer text-white font-semibold" disabled={loading}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting Application...</>
                ) : (
                  <>Submit Application <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-sky-400 hover:text-sky-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
