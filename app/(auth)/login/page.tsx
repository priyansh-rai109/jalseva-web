'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Droplets, Mail, Lock, Eye, EyeOff, Loader2, Sparkles, User, Shield, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginForm) => {
    console.log('[Login] Form submission triggered with email:', data.email)
    setLoading(true)
    
    try {
      console.log('[Login] Calling supabase.auth.signInWithPassword...')
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      console.log('[Login] Supabase auth response received. authData:', authData, 'error:', error)

      if (error) {
        console.error('[Login] Supabase auth error:', error)
        toast.error(error.message || 'Invalid email or password')
        setLoading(false)
        return
      }

      const user = authData?.user
      if (user) {
        console.log('[Login] User authenticated successfully. User ID:', user.id)
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        if (profileError || !profile) {
          console.error('[Login] Profile query error or missing profile row:', profileError)
          await supabase.auth.signOut()
          toast.error('Account setup incomplete. Please contact support.')
          setLoading(false)
          return
        }

        const role = profile.role
        console.log('[Login] User role resolved as:', role)
        toast.success('Signed in successfully!')

        let targetPath = '/customer/dashboard'
        if (role === 'super_admin') targetPath = '/admin/dashboard'
        else if (role === 'supplier') targetPath = '/supplier/dashboard'

        console.log('[Login] Attempting redirect to:', targetPath)
        window.location.href = targetPath
      } else {
        console.warn('[Login] No user object returned in authData')
        setLoading(false)
      }
    } catch (err) {
      console.error('[Login] Unexpected exception during login:', err)
      toast.error('An unexpected error occurred.')
      setLoading(false)
    }
  }


  // Quick helper for demo logins
  const handleQuickLogin = async (email: string) => {
    setValue('email', email)
    setValue('password', 'password123')
    toast.info(`Pre-filled credentials for ${email}`)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-400/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl water-shimmer flex items-center justify-center shadow-lg">
              <Droplets className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              <span className="gradient-text">Jal</span>
              <span className="text-foreground">Seva</span>
            </span>
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-foreground">Welcome Back</h1>
          <p className="text-muted-foreground text-sm mt-1">Sign in to your professional water marketplace account</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8 space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-10 bg-secondary border-border"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10 bg-secondary border-border"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full water-shimmer text-white font-semibold h-11"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Quick Demo Logins Section */}
          <div className="pt-2 border-t border-border/60">
            <div className="flex items-center gap-1.5 mb-3 justify-center text-xs text-sky-400 font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Quick Demo Pre-fills</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('customer@jalseva.in')}
                className="py-1.5 px-2 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-[11px] font-medium flex flex-col items-center justify-center gap-1 text-sky-300 transition-all"
              >
                <User className="w-3.5 h-3.5" />
                <span>Customer</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('supplier@jalseva.in')}
                className="py-1.5 px-2 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-[11px] font-medium flex flex-col items-center justify-center gap-1 text-amber-400 transition-all"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Supplier</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@jalseva.in')}
                className="py-1.5 px-2 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-[11px] font-medium flex flex-col items-center justify-center gap-1 text-purple-400 transition-all"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground pt-2">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-sky-400 hover:text-sky-300 font-medium">
              Register here
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/admin-login" className="hover:text-muted-foreground/80 underline">
            Go to Admin Portal
          </Link>
        </p>
      </div>
    </div>
  )
}
