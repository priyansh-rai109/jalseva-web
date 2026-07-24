'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Droplets, Building2, Clock, Phone,
  RefreshCcw, CheckCircle2, AlertCircle, LogOut
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function SupplierPendingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [supplier, setSupplier] = useState<any>(null)
  const [checking, setChecking] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    loadSupplierDetails()
  }, [])

  async function loadSupplierDetails() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('suppliers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      setSupplier(data)
    } catch (err) {
      console.error('[SupplierPending] Error loading supplier details:', err)
    } finally {
      setLoadingData(false)
    }
  }

  async function checkApprovalStatus() {
    setChecking(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      const { data: sup } = await supabase
        .from('suppliers')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle()

      if (sup?.status === 'approved') {
        toast.success('Your account has been approved! 🎉')
        // Update cookie with approved role
        const cookieRaw = document.cookie.split('; ').find(r => r.startsWith('jalseva-mock-session='))
        if (cookieRaw) {
          try {
            const cookieUser = JSON.parse(decodeURIComponent(cookieRaw.split('=').slice(1).join('=')))
            cookieUser.user_metadata = { ...cookieUser.user_metadata, role: 'supplier' }
            document.cookie = `jalseva-mock-session=${encodeURIComponent(JSON.stringify(cookieUser))}; path=/; max-age=86400; SameSite=Lax`
          } catch {}
        }
        await new Promise(r => setTimeout(r, 300))
        window.location.href = '/supplier/dashboard'
        return
      }
      toast.info('Still under review. We\'ll notify you soon.')
    } catch (err) {
      console.error('[SupplierPending] Check status error:', err)
      toast.error('Could not check status. Try again.')
    } finally {
      setChecking(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    document.cookie = 'jalseva-mock-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-sky-500/8 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6 text-center">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2 justify-center">
          <div className="w-10 h-10 rounded-xl water-shimmer flex items-center justify-center shadow-lg">
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            <span className="gradient-text">Jal</span>
            <span className="text-foreground">Seva</span>
          </span>
        </Link>

        <div className="glass-card p-8 space-y-6">
          {/* Status Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-amber-500/15 border-2 border-amber-500/40 flex items-center justify-center">
              <Clock className="w-10 h-10 text-amber-400" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Application Submitted! ⏳</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Aapki application review mein hai. <strong className="text-foreground">2–3 din mein approve ho jaayegi.</strong> Admin team aapko SMS/WhatsApp par confirm karegi.
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-[10px] text-emerald-400 font-medium">Submitted</span>
            </div>
            <div className="flex-1 h-px bg-amber-500/40 max-w-[60px]" />
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center animate-pulse">
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-[10px] text-amber-400 font-medium">Under Review</span>
            </div>
            <div className="flex-1 h-px bg-border max-w-[60px]" />
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-secondary border-2 border-border flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">Approved</span>
            </div>
          </div>

          {/* Business Details */}
          {supplier && (
            <div className="bg-secondary/40 rounded-xl p-4 text-left space-y-2.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                <Building2 className="w-3.5 h-3.5" /> Application Summary
              </div>
              {[
                ['Business', supplier.business_name],
                ['Owner', supplier.owner_name],
                ['Phone', supplier.phone],
                ['Address', supplier.address],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-foreground font-medium text-right max-w-[60%] truncate">{val}</span>
                </div>
              ))}
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-xs font-semibold border border-amber-500/30 capitalize">
                  {supplier.status || 'Pending Review'}
                </span>
              </div>
            </div>
          )}

          {/* What happens next */}
          <div className="space-y-2 text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What Happens Next?</p>
            {[
              { icon: CheckCircle2, text: 'Our team verifies your business details', color: 'text-sky-400' },
              { icon: Clock, text: 'Review typically takes 2–3 business days', color: 'text-amber-400' },
              { icon: AlertCircle, text: "You'll receive SMS/WhatsApp confirmation", color: 'text-emerald-400' },
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <s.icon className={`w-4 h-4 mt-0.5 shrink-0 ${s.color}`} />
                <p className="text-sm text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={checkApprovalStatus}
              disabled={checking}
              className="w-full water-shimmer text-white font-semibold"
            >
              {checking ? <><RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> Checking...</> : <><RefreshCcw className="w-4 h-4 mr-2" /> Check Approval Status</>}
            </Button>

            <a
              href="tel:+919999999999"
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-sky-400 transition-colors"
            >
              <Phone className="w-4 h-4" />
              Contact Admin for faster processing
            </a>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-400 transition-colors mx-auto"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </div>
    </div>
  )
}
