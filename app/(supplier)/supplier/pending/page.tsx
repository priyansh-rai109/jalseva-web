'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Droplets, Clock, ShieldCheck, RefreshCw, LogOut, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function SupplierPendingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [supplier, setSupplier] = useState<any>(null)
  const [checking, setChecking] = useState(false)

  const fetchSupplierStatus = async () => {
    setChecking(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data } = await supabase
        .from('suppliers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (data) {
        setSupplier(data)
        if (data.status === 'approved') {
          toast.success('Your supplier account is approved!')
          window.location.href = '/supplier/dashboard'
          return
        }
      }
    } catch (err) {
      console.error('Error fetching supplier status:', err)
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    fetchSupplierStatus()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    toast.info('Signed out successfully.')
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-lg relative z-10 space-y-6 text-center">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl water-shimmer flex items-center justify-center shadow-lg">
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            <span className="gradient-text">Jal</span>
            <span className="text-foreground">Seva</span>
          </span>
        </Link>

        {/* Status Card */}
        <div className="glass-card p-8 space-y-6 text-left border-amber-500/30">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Clock className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider">
                Application Under Review
              </span>
              <h1 className="text-xl font-bold text-foreground mt-1">Verification Pending</h1>
            </div>
          </div>

          <p className="text-muted-foreground text-sm leading-relaxed">
            Thank you for registering your water business on JalSeva. Your application has been submitted and is currently being verified by our Super Admin team for Jodhpur region.
          </p>

          {supplier && (
            <div className="p-4 rounded-xl bg-secondary/50 border border-border/60 space-y-2 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-amber-400" /> Business Name</span>
                <span className="font-semibold text-foreground">{supplier.business_name}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Owner Name</span>
                <span className="font-semibold text-foreground">{supplier.owner_name}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Contact Phone</span>
                <span className="font-semibold text-foreground">{supplier.phone}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Status</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">Pending Admin Review</span>
              </div>
            </div>
          )}

          <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 text-sky-400 mt-0.5" />
            <div>
              <strong>Estimated Time:</strong> Applications are usually reviewed within 24-48 hours. Once approved, you will be able to access your supplier portal immediately.
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Button
              onClick={fetchSupplierStatus}
              disabled={checking}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold h-10"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
              Check Status
            </Button>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="flex-1 border-border text-foreground h-10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Need urgent approval? Contact JalSeva Admin support at{' '}
          <a href="tel:+919876543210" className="text-sky-400 underline font-medium">
            +91 98765 43210
          </a>
        </p>
      </div>
    </div>
  )
}
