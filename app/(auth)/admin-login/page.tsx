'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Droplets, Shield, Mail, Lock, Eye, EyeOff, Loader2, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const adminSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password required'),
})

type AdminForm = z.infer<typeof adminSchema>

export default function AdminLoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<AdminForm>({
    resolver: zodResolver(adminSchema),
  })

  const onSubmit = async (data: AdminForm) => {
    const cleanEmail = data.email.trim().toLowerCase()
    const cleanPassword = data.password.trim()

    setLoading(true)
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPassword,
    })

    if (error) {
      toast.error(error.message || 'Invalid credentials')
      setLoading(false)
      return
    }

    const user = authData?.user
    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError || !profile) {
        await supabase.auth.signOut()
        toast.error('Account setup incomplete. Please contact support.')
        setLoading(false)
        return
      }

      if (profile.role !== 'super_admin') {
        await supabase.auth.signOut()
        toast.error('Access denied. Admin accounts only.')
        setLoading(false)
        return
      }

      toast.success('Welcome, Admin!')
      window.location.href = '/admin/dashboard'
    } else {
      setLoading(false)
    }
  }

  const handleQuickLogin = () => {
    setValue('email', 'demo.admin@jalseva.in')
    setValue('password', 'DemoPass123!')
    toast.info('Pre-filled admin credentials for demo.admin@jalseva.in')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background — darker, more serious for admin */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-background to-slate-900" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-sky-500/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo + Admin Badge */}
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
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20">
            <Shield className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-xs font-medium text-sky-400 uppercase tracking-wider">Admin Portal</span>
          </div>
          <h1 className="mt-4 text-3xl font-bold">Admin Login</h1>
          <p className="mt-2 text-muted-foreground text-sm">Restricted access — authorized personnel only</p>
        </div>

        <div className="glass-card p-8 border-slate-700/50 space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Admin Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@jalseva.in"
                  className="pl-10 bg-secondary border-border"
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
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
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold h-11 transition-all"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</>
              ) : (
                <><Shield className="w-4 h-4 mr-2" /> Access Admin Panel</>
              )}
            </Button>
          </form>

          {/* Quick Demo Pre-fill for Admin */}
          <div className="pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={handleQuickLogin}
              className="w-full py-2.5 px-3 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-xs font-semibold flex items-center justify-center gap-1.5 text-purple-400 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pre-fill Admin Demo Credentials</span>
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/login" className="hover:text-muted-foreground/70 mr-4">User Login</Link>
          <Link href="/" className="hover:text-muted-foreground/70">← Back to Home</Link>
        </p>
      </div>
    </div>
  )
}
