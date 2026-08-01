'use client'

import React, { useEffect } from 'react'
import { CheckCircle2, Sparkles, Droplet } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface OrderSuccessModalProps {
  isOpen: boolean
  onClose: () => void
}

export function OrderSuccessModal({ isOpen, onClose }: OrderSuccessModalProps) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Floating background water drops */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div
            key={i}
            className="absolute text-sky-400/40 animate-float"
            style={{
              top: `${(i * 12) % 80}%`,
              left: `${(i * 11) % 90}%`,
              animationDuration: `${2 + (i % 3)}s`,
              animationDelay: `${i * 0.2}s`,
            }}
          >
            <Droplet className="w-5 h-5 fill-sky-400/20" />
          </div>
        ))}
      </div>

      <div className="w-full max-w-sm bg-slate-900 border border-sky-500/30 rounded-3xl p-8 text-center shadow-2xl space-y-5 relative animate-in zoom-in-75 duration-300">
        {/* Glowing Pop Checkmark */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-sky-500/20 animate-ping duration-1000" />
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-sky-500 to-cyan-400 p-4 shadow-lg shadow-sky-500/40 flex items-center justify-center transform hover:scale-105 transition-all">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Order Confirmed
          </div>
          <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Order Placed! 🎉
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Aapka water order successfully confirm ho gaya hai. Supplier ko real-time notification bheja gaya hai.
          </p>
        </div>

        <div className="pt-2">
          <Button
            onClick={onClose}
            className="w-full water-shimmer text-white font-semibold h-10 text-xs rounded-xl"
          >
            View My Orders →
          </Button>
        </div>
      </div>
    </div>
  )
}
