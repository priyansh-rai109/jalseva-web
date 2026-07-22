'use client'

import { useState, useEffect } from 'react'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Droplets, User, Mail, Lock, Phone, Building2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Enter valid phone number'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const supplierSchema = z.object({
  business_name: z.string().min(2, 'Business name required'),
  owner_name: z.string().min(2, 'Owner name required'),
  phone: z.string().min(10, 'Enter valid phone number'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  address: z.string().min(5, 'Address required'),
})

type CustomerForm = z.infer<typeof customerSchema>
type SupplierForm = z.infer<typeof supplierSchema>

function CustomerRegisterForm() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
  })

  const onSubmit = async (data: CustomerForm) => {
    setLoading(true)
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { role: 'customer', name: data.name, phone: data.phone } },
    })
    if (error) { toast.error(error.message); setLoading(false); return }

    if (authData.user) {
      await supabase.from('profiles').upsert({
        id: authData.user.id,
        role: 'customer',
        name: data.name,
        phone: data.phone,
        email: data.email,
      })
      await supabase.from('customers').insert({
        user_id: authData.user.id,
        name: data.name,
        phone: data.phone,
        email: data.email,
      })
    }
    toast.success('Account created! Please verify your email.')
    router.push('/login')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Full Name</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Ramesh Sharma" className="pl-10 bg-secondary" {...register('name')} />
        </div>
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Phone Number</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="9876543210" className="pl-10 bg-secondary" {...register('phone')} />
        </div>
        {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input type="email" placeholder="you@example.com" className="pl-10 bg-secondary" {...register('email')} />
        </div>
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input type="password" placeholder="••••••••" className="pl-10 bg-secondary" {...register('password')} />
        </div>
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <Button type="submit" disabled={loading} className="w-full water-shimmer text-white font-semibold h-11">
        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account...</> : 'Create Customer Account'}
      </Button>
    </form>
  )
}

function SupplierRegisterForm() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<SupplierForm>({
    resolver: zodResolver(supplierSchema),
  })

  const onSubmit = async (data: SupplierForm) => {
    setLoading(true)
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { role: 'supplier', name: data.business_name } },
    })
    if (error) { toast.error(error.message); setLoading(false); return }

    if (authData.user) {
      await supabase.from('profiles').upsert({
        id: authData.user.id,
        role: 'supplier',
        name: data.owner_name,
        phone: data.phone,
        email: data.email,
      })
      await supabase.from('suppliers').insert({
        user_id: authData.user.id,
        business_name: data.business_name,
        owner_name: data.owner_name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        status: 'pending',
      })
    }
    toast.success('Application submitted! Admin will review within 24 hours.')
    router.push('/login')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Business Name</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Shiv Water Co." className="pl-10 bg-secondary text-sm" {...register('business_name')} />
          </div>
          {errors.business_name && <p className="text-xs text-destructive">{errors.business_name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Owner Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Ramesh Kumar" className="pl-10 bg-secondary text-sm" {...register('owner_name')} />
          </div>
          {errors.owner_name && <p className="text-xs text-destructive">{errors.owner_name.message}</p>}
        </div>
      </div>
      <div className="space-y-2">
        <Label>Phone</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="9876543210" className="pl-10 bg-secondary" {...register('phone')} />
        </div>
        {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Business Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input type="email" placeholder="business@example.com" className="pl-10 bg-secondary" {...register('email')} />
        </div>
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input type="password" placeholder="••••••••" className="pl-10 bg-secondary" {...register('password')} />
        </div>
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Business Address</Label>
        <Input placeholder="123, Sardarpura, Jodhpur" className="bg-secondary" {...register('address')} />
        {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
      </div>
      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
        ⚠️ Supplier accounts require admin approval. You can login after approval.
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold h-11">
        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : 'Submit Supplier Application'}
      </Button>
    </form>
  )
}

import { Suspense } from 'react'

function RegisterPageContent() {
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get('role') === 'supplier' ? 'supplier' : 'customer'
  const [activeTab, setActiveTab] = useState<'customer' | 'supplier'>('customer')

  useEffect(() => {
    setActiveTab(defaultTab)
  }, [defaultTab])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl water-shimmer flex items-center justify-center shadow-lg">
              <Droplets className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              <span className="gradient-text">Jal</span>
              <span className="text-foreground">Seva</span>
            </span>
          </Link>
          <h1 className="mt-6 text-3xl font-bold">Create Account</h1>
          <p className="mt-2 text-muted-foreground">Join JalSeva marketplace</p>
        </div>

        <div className="glass-card p-8">
          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val ?? 'customer')} className="flex flex-col gap-6 w-full">
            <TabsList className="w-full bg-secondary flex p-1 rounded-lg">
              <TabsTrigger value="customer" className="flex-1 text-center py-2">Customer</TabsTrigger>
              <TabsTrigger value="supplier" className="flex-1 text-center py-2">Water Supplier</TabsTrigger>
            </TabsList>

            {/* Premium Role Description Box */}
            <div className="p-4 rounded-xl bg-secondary/30 border border-border/80 flex flex-row items-center gap-4 transition-all duration-300 w-full">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                activeTab === 'customer' 
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' 
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {activeTab === 'customer' ? (
                  <Droplets className="w-6 h-6 animate-float" />
                ) : (
                  <Building2 className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <h3 className="font-bold text-xs tracking-wider uppercase text-muted-foreground">
                  {activeTab === 'customer' ? 'Customer Account' : 'Water Supplier Account'}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {activeTab === 'customer' 
                    ? 'Order RO purified water cans, bulk tankers, and drinking water pouches for home or business.' 
                    : 'List your water delivery business, manage orders, and deliver water to customers across Jodhpur.'}
                </p>
              </div>
            </div>

            <TabsContent value="customer" className="w-full"><CustomerRegisterForm /></TabsContent>
            <TabsContent value="supplier" className="w-full"><SupplierRegisterForm /></TabsContent>
          </Tabs>


          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-sky-400 hover:text-sky-300 font-medium">
              Sign in
            </Link>
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

