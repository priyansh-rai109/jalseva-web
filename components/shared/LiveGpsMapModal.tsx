'use client'

import React, { useState, useEffect } from 'react'
import {
  Navigation, Phone, MessageSquare,
  X, Compass, Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface LiveGpsMapModalProps {
  orderId: string
  supplierName: string
  customerAddress: string
  driverName?: string
  driverPhone?: string
  vehicleNumber?: string
  productType?: 'tanker' | 'can' | 'pouch'
  isOpen: boolean
  onClose: () => void
}

export function LiveGpsMapModal({
  orderId,
  supplierName,
  customerAddress,
  driverName = 'Vikram Singh (Verified Driver)',
  driverPhone = '+919876543210',
  vehicleNumber = 'RJ-19-GA-5420',
  productType = 'can',
  isOpen,
  onClose,
}: LiveGpsMapModalProps) {
  const { language } = useLanguage()

  // Simulated live driver movement progression (0 to 100%)
  const [progress, setProgress] = useState(38)
  const [etaMinutes, setEtaMinutes] = useState(14)
  const [distanceKm, setDistanceKm] = useState(2.3)
  const [speedKmh, setSpeedKmh] = useState(26)

  useEffect(() => {
    if (!isOpen) return

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) return 92
        return prev + 1.2
      })

      setEtaMinutes((prev) => (prev > 2 ? prev - 0.2 : 2))
      setDistanceKm((prev) => (prev > 0.3 ? +(prev - 0.05).toFixed(1) : 0.2))
      setSpeedKmh(Math.floor(22 + Math.random() * 8))
    }, 2000)

    return () => clearInterval(timer)
  }, [isOpen])

  if (!isOpen) return null

  // SVG road polyline path coordinates: (50, 240) -> (140, 180) -> (240, 210) -> (360, 120) -> (450, 70)
  const pathPoints = [
    { x: 50, y: 240, name: 'Supplier RO Hub' },
    { x: 140, y: 180, name: 'Paota Circle' },
    { x: 240, y: 210, name: 'Ratanada Main Rd' },
    { x: 360, y: 120, name: 'Sardarpura 5th Ave' },
    { x: 450, y: 70, name: 'Customer Destination' },
  ]

  // Calculate current vehicle position along polyline segments
  const totalSegments = pathPoints.length - 1
  const currentSegmentIndex = Math.min(
    totalSegments - 1,
    Math.floor((progress / 100) * totalSegments)
  )
  const segmentFraction = ((progress / 100) * totalSegments) - currentSegmentIndex
  const p1 = pathPoints[currentSegmentIndex]
  const p2 = pathPoints[currentSegmentIndex + 1]

  const vehicleX = p1.x + (p2.x - p1.x) * segmentFraction
  const vehicleY = p1.y + (p2.y - p1.y) * segmentFraction

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900/95 border border-sky-500/40 rounded-3xl overflow-hidden shadow-2xl space-y-0 relative animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-sky-950/80 to-slate-900 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl water-shimmer flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <Navigation className="w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-foreground" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  {language === 'hi' ? '🛰️ लाइव जीपीएस ट्रैकर (Live GPS Route)' : '🛰️ Live GPS Driver Tracker'}
                </h3>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] py-0 px-2 animate-pulse">
                  ● LIVE
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Order #{orderId.slice(0, 8)} • {supplierName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-full hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Vector Map Simulation Canvas */}
        <div className="relative w-full h-64 sm:h-72 bg-slate-950 overflow-hidden select-none">
          {/* Map Grid Pattern */}
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: `linear-gradient(#38bdf8 1px, transparent 1px), linear-gradient(90deg, #38bdf8 1px, transparent 1px)`,
              backgroundSize: '32px 32px',
            }}
          />

          {/* Jodhpur Area Landmarking Labels */}
          <div className="absolute top-4 left-6 text-[10px] text-sky-400/40 font-mono tracking-wider">
            📍 JODHPUR • SECTOR 4
          </div>
          <div className="absolute bottom-4 right-6 text-[10px] text-sky-400/40 font-mono tracking-wider">
            SARDARPURA WEST • RAJASTHAN
          </div>

          {/* SVG Road Polyline and Markers */}
          <svg className="w-full h-full" viewBox="0 0 500 300" preserveAspectRatio="none">
            <defs>
              <linearGradient id="routeGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0284c7" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
            </defs>

            {/* Base Road Track (Dark) */}
            <path
              d="M 50 240 Q 140 180 240 210 T 360 120 T 450 70"
              fill="none"
              stroke="#1e293b"
              strokeWidth="10"
              strokeLinecap="round"
            />

            {/* Active Highlighted Route Track */}
            <path
              d="M 50 240 Q 140 180 240 210 T 360 120 T 450 70"
              fill="none"
              stroke="url(#routeGlow)"
              strokeWidth="4"
              strokeDasharray="6,6"
              className="animate-pulse"
            />

            {/* Supplier Origin Marker (Start) */}
            <g transform="translate(50, 240)">
              <circle r="14" fill="#0284c7" fillOpacity="0.2" />
              <circle r="6" fill="#38bdf8" />
              <text x="12" y="4" fill="#94a3b8" fontSize="10" fontWeight="bold">
                RO Plant
              </text>
            </g>

            {/* Destination Customer Marker (End) */}
            <g transform="translate(450, 70)">
              <circle r="18" fill="#10b981" fillOpacity="0.2" className="animate-ping" />
              <circle r="8" fill="#10b981" />
              <text x="-40" y="-12" fill="#34d399" fontSize="10" fontWeight="bold">
                🏠 Your Location
              </text>
            </g>

            {/* Live Moving Vehicle Marker */}
            <g transform={`translate(${vehicleX}, ${vehicleY})`}>
              <circle r="18" fill="#f59e0b" fillOpacity="0.25" className="animate-ping" />
              <circle r="10" fill="#f59e0b" stroke="#fff" strokeWidth="2" />
              {/* Vehicle Type Icon text */}
              <text x="-6" y="4" fontSize="10">
                {productType === 'tanker' ? '🚛' : '🛺'}
              </text>
            </g>
          </svg>

          {/* Floating Speed & Telemetry HUD */}
          <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-sky-500/30 rounded-xl p-2 px-3 backdrop-blur-md flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1 text-sky-300">
              <Compass className="w-3.5 h-3.5 text-sky-400" />
              <span>Speed: <strong>{speedKmh} km/h</strong></span>
            </div>
            <div className="w-[1px] h-3 bg-border" />
            <div className="flex items-center gap-1 text-amber-300">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{progress.toFixed(0)}% Route Covered</span>
            </div>
          </div>
        </div>

        {/* Live Status & Driver Card */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* ETA Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 space-y-0.5">
              <div className="text-[10px] text-sky-300 uppercase font-semibold">
                {language === 'hi' ? 'पहुंचने का अनुमान' : 'Estimated Time (ETA)'}
              </div>
              <div className="text-xl font-bold text-sky-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                ~ {Math.ceil(etaMinutes)} {language === 'hi' ? 'मिनट' : 'Mins'}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-0.5">
              <div className="text-[10px] text-emerald-300 uppercase font-semibold">
                {language === 'hi' ? 'शेष दूरी' : 'Remaining Distance'}
              </div>
              <div className="text-xl font-bold text-emerald-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {distanceKm} km
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-secondary/80 border border-border/80 space-y-0.5">
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                {language === 'hi' ? 'वाहन नंबर' : 'Vehicle Reg'}
              </div>
              <div className="text-sm font-bold text-foreground font-mono">
                {vehicleNumber}
              </div>
            </div>
          </div>

          {/* Driver details & Action Buttons */}
          <div className="p-3.5 rounded-2xl bg-secondary/60 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-lg flex-shrink-0">
                👨‍✈️
              </div>
              <div>
                <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <span>{driverName}</span>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] py-0 px-1">
                    ✓ Verified
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  📍 {customerAddress || 'Sardarpura, Jodhpur'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a href={`tel:${driverPhone}`} className="flex-1 sm:flex-initial">
                <Button size="sm" className="w-full sm:w-auto water-shimmer text-white font-semibold text-xs min-h-[38px] rounded-xl">
                  <Phone className="w-3.5 h-3.5 mr-1.5" />
                  {language === 'hi' ? 'कॉल करें' : 'Call Driver'}
                </Button>
              </a>

              <a
                href={`https://wa.me/${driverPhone.replace(/\D/g, '')}?text=Hello%20JalSeva%20driver,%20regarding%20my%20water%20order%20%23${orderId.slice(0, 8)}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-initial"
              >
                <Button size="sm" variant="outline" className="w-full sm:w-auto text-xs min-h-[38px] rounded-xl border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                  <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                  WhatsApp
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
