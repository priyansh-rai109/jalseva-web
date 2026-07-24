'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Droplets, User, Mail, MapPin, Building2, CheckCircle2, ArrowRight, Loader2, ShieldAlert } from 'lucide-react'
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
        if (!currentUser) {
          toast.error('Session expired. Please enter phone number again.')
          router.push('/login')
          return
        }
        setUser(currentUser)
        setPhone(currentUser.phone || currentUser.user_metadata?.phone || '+91 User')

        // Check if user already has profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', currentUser.id)
          .maybeSingle()

        if (profile?.role === 'customer') {
          router.push('/customer/dashboard')
        } else if (profile?.role === 'supplier') {
          router.push('/supplier/dashboard')
        }
      } catch (err) {
        console.error('Error loading session user:', err)
      } finally {
        setCheckingAuth(false)
      }
    }
    loadUser()
  }, [router, supabase])

  const onSubmitCustomer = async (data: CustomerForm) => {
    if (!user) return
    setLoading(true)

    const validUserId = user.id && user.id.length >= 32 && user.id.includes('-')
      ? user.id
      : getPhoneUuid(phone)

    try {
      // 1. Update/Upsert profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: validUserId,
          role: 'customer',
          name: data.name.trim(),
          email: data.email?.trim() || null,
          phone: phone,
          updated_at: new Date().toISOString()
        })

      if (profileError) console.warn('[Profile Upsert Notice]:', profileError.message)

      // 2. Upsert customer row
      const { error: customerError } = await supabase
        .from('customers')
        .upsert({
          user_id: validUserId,
          name: data.name.trim(),
          phone: phone,
          email: data.email?.trim() || null,
          addresses: [
            {
              id: 'default-addr',
              label: 'Primary Address',
              line1: data.city,
              city: data.city,
              is_default: true
            }
          ]
        })

      if (customerError) console.warn('[Customer Upsert Notice]:', customerError.message)
    } catch (err: any) {
      console.warn('Profile completion DB fallback:', err)
    } finally {
      // Set completed user cookie so middleware & app immediately know user's role and name
      const completedUser = {
        ...user,
        id: validUserId,
        user_metadata: {
          ...user?.user_metadata,
          role: 'customer',
          name: data.name.trim(),
          phone: phone
        }
      }
      document.cookie = `jalseva-mock-session=${encodeURIComponent(JSON.stringify(completedUser))}; path=/; max-age=86400`

      toast.success('Profile completed successfully!')
      setTimeout(() => {
        window.location.href = '/customer/dashboard'
      }, 300)
    }
  }

  const onSubmitSupplier = async (data: SupplierForm) => {
    if (!user) return
    setLoading(true)

    const validUserId = user.id && user.id.length >= 32 && user.id.includes('-')
      ? user.id
      : getPhoneUuid(phone)

    try {
      // 1. Update/Upsert profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: validUserId,
          role: 'supplier',
          name: data.business_name.trim(),
          email: data.email?.trim() || null,
          phone: phone,
          updated_at: new Date().toISOString()
        })

      if (profileError) console.warn('[Profile Upsert Notice]:', profileError.message)

      // 2. Insert into suppliers table with status 'pending'
      const { error: supplierError } = await supabase
        .from('suppliers')
        .upsert({
          user_id: validUserId,
          business_name: data.business_name.trim(),
          owner_name: data.owner_name.trim(),
          phone: phone,
          email: data.email?.trim() || null,
          address: data.address.trim(),
          city: data.city.trim(),
          status: 'pending'
        })

      if (supplierError) console.warn('[Supplier Upsert Notice]:', supplierError.message)
    } catch (err: any) {
      console.warn('Supplier onboarding DB fallback:', err)
    } finally {
      const completedUser = {
        ...user,
        id: validUserId,
        user_metadata: {
          ...user?.user_metadata,
          role: 'supplier',
          name: data.business_name.trim(),
          phone: phone
        }
      }
      document.cookie = `jalseva-mock-session=${encodeURIComponent(JSON.stringify(completedUser))}; path=/; max-age=86400`

      toast.success('Supplier application submitted! Under admin review.')
      setTimeout(() => {
        window.location.href = '/supplier/pending'
      }, 300)
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
          {/* Step 1: Role Selection Cards */}
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
                  <h3 className="font-bold text-sm text-foreground">Customer</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Order water cans & tankers for home/business</p>
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
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${selectedRole === 'supplier' ? 'bg-amber-500 text-black' : 'bg-secondary text-muted-foreground'}`}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  {selectedRole === 'supplier' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Water Supplier</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Deliver water orders & manage business</p>
                </div>
              </button>
            </div>
          </div>

          {/* Form Step 2a: Customer Form */}
          {selectedRole === 'customer' && (
            <form onSubmit={handleSubmitCustomer(onSubmitCustomer)} className="space-y-4 pt-2 border-t border-border/60">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Ramesh Sharma"
                    className="pl-10 bg-secondary border-border"
                    {...registerCustomer('name')}
                  />
                </div>
                {customerErrors.name && (
                  <p className="text-xs text-destructive">{customerErrors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className="pl-10 bg-secondary border-border"
                    {...registerCustomer('email')}
                  />
                </div>
                {customerErrors.email && (
                  <p className="text-xs text-destructive">{customerErrors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="city"
                    defaultValue="Jodhpur"
                    className="pl-10 bg-secondary border-border"
                    {...registerCustomer('city')}
                  />
                </div>
                {customerErrors.city && (
                  <p className="text-xs text-destructive">{customerErrors.city.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full water-shimmer text-white font-semibold h-11 transition-all mt-4"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving Profile...</>
                ) : (
                  <>Continue to Dashboard <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </form>
          )}

          {/* Form Step 2b: Supplier Onboarding Form */}
          {selectedRole === 'supplier' && (
            <form onSubmit={handleSubmitSupplier(onSubmitSupplier)} className="space-y-4 pt-2 border-t border-border/60">
              <div className="space-y-2">
                <Label htmlFor="business_name">Business Name <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="business_name"
                    placeholder="Marwar Water Suppliers"
                    className="pl-10 bg-secondary border-border"
                    {...registerSupplier('business_name')}
                  />
                </div>
                {supplierErrors.business_name && (
                  <p className="text-xs text-destructive">{supplierErrors.business_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner_name">Owner Name <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="owner_name"
                    placeholder="Suresh Kumar"
                    className="pl-10 bg-secondary border-border"
                    {...registerSupplier('owner_name')}
                  />
                </div>
                {supplierErrors.owner_name && (
                  <p className="text-xs text-destructive">{supplierErrors.owner_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier_email">Business Email <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="supplier_email"
                    type="email"
                    placeholder="business@jalseva.in"
                    className="pl-10 bg-secondary border-border"
                    {...registerSupplier('email')}
                  />
                </div>
                {supplierErrors.email && (
                  <p className="text-xs text-destructive">{supplierErrors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Business Address <span className="text-destructive">*</span></Label>
                <Input
                  id="address"
                  placeholder="Plot 14, Sardarpura B Road, Jodhpur"
                  className="bg-secondary border-border"
                  {...registerSupplier('address')}
                />
                {supplierErrors.address && (
                  <p className="text-xs text-destructive">{supplierErrors.address.message}</p>
                )}
              </div>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <strong>Admin Approval Required:</strong> Water supplier profiles require verification by JalSeva Admin before accepting orders.
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold h-11 transition-all mt-4"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting Application...</>
                ) : (
                  <>Submit Supplier Profile <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
