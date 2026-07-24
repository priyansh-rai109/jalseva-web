'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Droplets, Building2, Clock, Phone, RefreshCcw, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function SupplierPendingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [supplier, setSupplier] = useState<any>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    loadSupplierDetails()
  }, [])

  async function loadSupplierDetails() {
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

    setSupplier(data)
  }

  async function checkApprovalStatus() {
    setChecking(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role === 'supplier') {
      const { data: supplierData } = await supabase
        .from('suppliers')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle()

      if (supplierData?.status === 'approved') {
        router.push('/supplier/dashboard')
        return
      }
    }
    setChecking(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-sky-500/8 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6 text-center">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl water-shimmer flex items-center justify-center shadow-lg">
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            <span className="gradient-text">Jal</span>
            <span className="text-foreground">Seva</span>
          </span>
        </Link>

        {/* Pending Card */}
        <div className="glass-card p-8 space-y-6">
          {/* Status Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-amber-500/15 border-2 border-amber-500/40 flex items-center justify-center animate-pulse-slow">
              <Clock className="w-10 h-10 text-amber-400" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Application Under Review</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your Water Supplier application has been submitted successfully and is currently being reviewed by the JalSeva admin team.
            </p>
          </div>

          {/* Business Details */}
          {supplier && (
            <div className="bg-secondary/40 rounded-xl p-4 text-left space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                <Building2 className="w-3.5 h-3.5" />
                Application Summary
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Business Name</span>
                  <span className="text-foreground font-medium">{supplier.business_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Owner</span>
                  <span className="text-foreground font-medium">{supplier.owner_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="text-foreground font-medium">{supplier.phone}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Address</span>
                  <span className="text-foreground font-medium text-right max-w-[60%]">{supplier.address}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-xs font-semibold border border-amber-500/30 capitalize">
                    {supplier.status || 'Pending Review'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* What happens next */}
          <div className="space-y-3 text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What Happens Next?</p>
            <div className="space-y-2">
              {[
                { icon: CheckCircle2, text: 'Our team will verify your business details' },
                { icon: Clock, text: 'Review typically takes 24–48 hours' },
                { icon: AlertCircle, text: 'You\'ll receive a WhatsApp/SMS confirmation' },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <step.icon className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">{step.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={checkApprovalStatus}
              disabled={checking}
              className="w-full water-shimmer text-white font-semibold"
            >
              {checking ? (
                <><RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> Checking Status...</>
              ) : (
                <><RefreshCcw className="w-4 h-4 mr-2" /> Check Approval Status</>
              )}
            </Button>

            <a
              href="tel:+918769XXXXXX"
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-sky-400 transition-colors"
            >
              <Phone className="w-4 h-4" />
              Contact Admin for faster processing
            </a>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Wrong account?{' '}
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              document.cookie = 'jalseva-mock-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
              window.location.href = '/login'
            }}
            className="text-sky-400 hover:text-sky-300 font-medium"
          >
            Sign out
          </button>
        </p>
      </div>
    </div>
  )
}
