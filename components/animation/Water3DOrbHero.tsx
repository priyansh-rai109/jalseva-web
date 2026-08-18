'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  Droplets, Sparkles, ShieldCheck, Waves,
  Plus, RotateCcw, Award, CheckCircle2, Zap, Play
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface Water3DOrbHeroProps {
  variant?: 'compact' | 'full'
}

export function Water3DOrbHero({ variant = 'full' }: Water3DOrbHeroProps) {
  const { language } = useLanguage()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const [waterLevel, setWaterLevel] = useState(65) // 0 - 100%
  const [dropsCount, setDropsCount] = useState(0)
  const [tdsValue, setTdsValue] = useState(82)
  const [isPouring, setIsPouring] = useState(false)
  const [splashes, setSplashes] = useState<{ id: number; x: number; y: number }[]>([])

  const isCompact = variant === 'compact'

  // 3D Tilt calculation
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 24
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -24
    setMousePos({ x, y })
  }

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 })
    setIsHovered(false)
  }

  // Pour / Drop Water Action
  const triggerWaterDrop = (e?: React.MouseEvent) => {
    setIsPouring(true)
    setDropsCount((prev) => prev + 1)
    setWaterLevel((prev) => Math.min(95, prev + 5))
    setTdsValue(Math.floor(75 + Math.random() * 12))

    const splashId = Date.now()
    setSplashes((prev) => [...prev.slice(-4), { id: splashId, x: 50, y: 50 }])

    setTimeout(() => {
      setIsPouring(false)
    }, 600)
  }

  const resetWater = () => {
    setWaterLevel(65)
    setTdsValue(82)
    setDropsCount(0)
  }

  // Fluid Canvas Animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    const size = isCompact ? 220 : 280
    canvas.width = size * 2
    canvas.height = size * 2
    ctx.scale(2, 2)

    let step = 0

    // Rising mineral micro-bubbles
    const bubbles = Array.from({ length: 16 }, () => ({
      x: Math.random() * size,
      y: Math.random() * size,
      radius: Math.random() * 2.2 + 0.8,
      speed: Math.random() * 0.9 + 0.4,
      opacity: Math.random() * 0.6 + 0.2,
      wobble: Math.random() * Math.PI * 2,
    }))

    const render = () => {
      step += 0.045
      ctx.clearRect(0, 0, size, size)

      const centerX = size / 2
      const centerY = size / 2
      const radius = size / 2 - 8

      // Spherical Clipping
      ctx.save()
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.clip()

      // Deep water flask background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, size)
      bgGrad.addColorStop(0, '#041726')
      bgGrad.addColorStop(0.5, '#07324f')
      bgGrad.addColorStop(1, '#02182b')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, size, size)

      // Calculate current fluid line
      const targetSurfaceY = size - (waterLevel / 100) * (size - 20)

      // 1. Back fluid layer
      ctx.beginPath()
      ctx.moveTo(0, size)
      ctx.lineTo(0, targetSurfaceY)
      for (let x = 0; x <= size; x += 4) {
        const wave = Math.cos(x * 0.028 - step * 1.3) * (isPouring ? 12 : 6)
        ctx.lineTo(x, targetSurfaceY + wave)
      }
      ctx.lineTo(size, size)
      ctx.closePath()
      const backGrad = ctx.createLinearGradient(0, targetSurfaceY, 0, size)
      backGrad.addColorStop(0, 'rgba(14, 165, 233, 0.45)')
      backGrad.addColorStop(1, 'rgba(3, 105, 161, 0.85)')
      ctx.fillStyle = backGrad
      ctx.fill()

      // 2. Primary Foreground Fluid Wave
      ctx.beginPath()
      ctx.moveTo(0, size)
      ctx.lineTo(0, targetSurfaceY)
      for (let x = 0; x <= size; x += 4) {
        const wave1 = Math.sin(x * 0.035 + step) * (isPouring ? 14 : 7)
        const wave2 = Math.cos(x * 0.018 - step * 0.7) * 4
        ctx.lineTo(x, targetSurfaceY + wave1 + wave2)
      }
      ctx.lineTo(size, size)
      ctx.closePath()

      const waveGrad = ctx.createLinearGradient(0, targetSurfaceY - 15, 0, size)
      waveGrad.addColorStop(0, '#38bdf8')
      waveGrad.addColorStop(0.3, '#0284c7')
      waveGrad.addColorStop(1, '#0369a1')
      ctx.fillStyle = waveGrad
      ctx.fill()

      // 3. Fluid Crest Highlight
      ctx.beginPath()
      for (let x = 0; x <= size; x += 4) {
        const wave = Math.sin(x * 0.035 + step) * (isPouring ? 14 : 7) + Math.cos(x * 0.018 - step * 0.7) * 4
        if (x === 0) ctx.moveTo(x, targetSurfaceY + wave)
        else ctx.lineTo(x, targetSurfaceY + wave)
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)'
      ctx.lineWidth = 2
      ctx.shadowColor = '#38bdf8'
      ctx.shadowBlur = 8
      ctx.stroke()

      // 4. Floating Oxygen & Pure Mineral Bubbles
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i]
        b.y -= b.speed * (isPouring ? 2.5 : 1)
        b.wobble += 0.05
        const wobbleX = Math.sin(b.wobble) * 1.5

        if (b.y < targetSurfaceY) {
          b.y = size - 10
          b.x = Math.random() * size
        }

        ctx.beginPath()
        ctx.arc(b.x + wobbleX, b.y, b.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(224, 242, 254, ${b.opacity})`
        ctx.shadowColor = '#38bdf8'
        ctx.shadowBlur = 4
        ctx.fill()
      }

      // 5. Specular 3D Glass Light Curved Reflection
      const specGrad = ctx.createRadialGradient(
        centerX - radius * 0.35,
        centerY - radius * 0.35,
        2,
        centerX - radius * 0.35,
        centerY - radius * 0.35,
        radius * 0.65
      )
      specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.75)')
      specGrad.addColorStop(0.3, 'rgba(186, 230, 253, 0.3)')
      specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = specGrad
      ctx.beginPath()
      ctx.arc(centerX - radius * 0.35, centerY - radius * 0.35, radius * 0.6, 0, Math.PI * 2)
      ctx.fill()

      // 6. Glass Fresnel Rim
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.5)'
      ctx.lineWidth = 2.5
      ctx.shadowColor = '#0ea5e9'
      ctx.shadowBlur = 10
      ctx.stroke()

      ctx.restore()

      animationFrameId = requestAnimationFrame(render)
    }

    animationFrameId = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animationFrameId)
  }, [waterLevel, isPouring, isCompact])

  return (
    <div className="flex flex-col items-center justify-center select-none py-2">
      {/* 3D Vessel with Perspective Tilt */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        onClick={() => triggerWaterDrop()}
        className="relative cursor-pointer transition-transform duration-200 ease-out"
        style={{
          perspective: '1000px',
          transform: `rotateY(${mousePos.x}deg) rotateX(${mousePos.y}deg) scale(${isHovered ? 1.03 : 1})`,
        }}
      >
        {/* Glowing Aura Ring */}
        <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-sky-500/25 via-cyan-400/20 to-blue-600/25 blur-xl animate-pulse pointer-events-none" />

        {/* Outer 3D Gyro Vessel Ring */}
        <div className={`relative ${isCompact ? 'w-48 h-48 sm:w-56 sm:h-56' : 'w-64 h-64 sm:w-72 sm:h-72'} rounded-full p-2 bg-gradient-to-b from-sky-400/40 via-cyan-500/10 to-blue-700/50 border border-sky-400/50 shadow-[0_0_40px_rgba(14,165,233,0.3)] backdrop-blur-md flex items-center justify-center`}>
          
          {/* Orbital Cyan Satellite */}
          <div className="absolute inset-0 rounded-full animate-spin-slow pointer-events-none">
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-cyan-300 shadow-[0_0_12px_#38bdf8] flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            </div>
          </div>

          {/* Liquid Canvas Sphere */}
          <div className="relative w-full h-full rounded-full overflow-hidden shadow-2xl bg-slate-950">
            <canvas
              ref={canvasRef}
              className="w-full h-full block"
              style={{ width: '100%', height: '100%' }}
            />

            {/* Tap Drop Splash Animation */}
            {isPouring && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-16 h-16 rounded-full border-2 border-cyan-300 animate-ping opacity-75" />
              </div>
            )}

            {/* Central Information Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3 pointer-events-none">
              <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-md mb-1 animate-bounce">
                <Droplets className="w-5 h-5 text-cyan-300 fill-cyan-300/40" />
              </div>
              <span className="text-sm font-bold tracking-wider text-white uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                JalSeva
              </span>
              <span className="text-[11px] text-cyan-200 font-semibold drop-shadow">
                {waterLevel}% {language === 'hi' ? 'शुद्ध जल' : 'Pure Water'}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic TDS & Quality Badges */}
        <div className="absolute -bottom-2 -left-2 sm:-left-4 bg-card/95 backdrop-blur-md border border-sky-500/40 rounded-xl py-1 px-2.5 shadow-lg flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <div className="text-left">
            <div className="text-[10px] font-bold text-foreground font-mono">TDS {tdsValue} PPM</div>
            <div className="text-[8px] text-muted-foreground">{language === 'hi' ? 'आदर्श शुद्धता' : 'WHO Standard'}</div>
          </div>
        </div>

        <div className="absolute -top-2 -right-2 sm:-right-4 bg-card/95 backdrop-blur-md border border-emerald-500/40 rounded-xl py-1 px-2.5 shadow-lg flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <div className="text-left">
            <div className="text-[10px] font-bold text-foreground">100% RO + UV</div>
            <div className="text-[8px] text-emerald-400 font-semibold">{language === 'hi' ? 'लैब प्रमाणित' : 'Lab Tested'}</div>
          </div>
        </div>
      </div>

      {/* Interactive Control Buttons */}
      <div className="flex items-center gap-2 mt-3.5">
        <Button
          type="button"
          size="sm"
          onClick={() => triggerWaterDrop()}
          className="water-shimmer text-white text-xs h-7 px-2.5 rounded-lg shadow-sm flex items-center gap-1 font-semibold"
        >
          <Plus className="w-3 h-3" />
          <span>{language === 'hi' ? '💧 बूंद डालें (+5%)' : '💧 Add Drop (+5%)'}</span>
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={resetWater}
          className="text-xs h-7 px-2 rounded-lg border-border/80 text-muted-foreground hover:text-foreground"
          title="Reset Level"
        >
          <RotateCcw className="w-3 h-3" />
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground/80 mt-1.5 flex items-center gap-1">
        <Waves className="w-2.5 h-2.5 text-sky-400 animate-pulse" />
        <span>{language === 'hi' ? 'क्लिक करके पानी डालें और माउस घुमाकर तरंगें देखें' : 'Click to add water drops & hover to tilt waves'}</span>
      </p>
    </div>
  )
}
