'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Droplets, Sparkles, ShieldCheck, HeartHandshake, Waves } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export function Water3DOrbHero() {
  const { language } = useLanguage()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const [pulseCount, setPulseCount] = useState(0)

  // 3D Tilt calculation based on mouse position
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 30 // -15deg to +15deg
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -30
    setMousePos({ x, y })
  }

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 })
    setIsHovered(false)
  }

  // 3D Liquid Canvas Wave Simulation inside the Orb
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    const size = 260
    canvas.width = size * 2
    canvas.height = size * 2
    ctx.scale(2, 2)

    let step = 0
    // Floating mineral micro-bubbles
    const bubbles = Array.from({ length: 12 }, () => ({
      x: Math.random() * size,
      y: Math.random() * (size * 0.5) + size * 0.4,
      radius: Math.random() * 2.5 + 1,
      speed: Math.random() * 0.8 + 0.4,
      opacity: Math.random() * 0.5 + 0.3,
    }))

    const render = () => {
      step += 0.04
      ctx.clearRect(0, 0, size, size)

      const centerX = size / 2
      const centerY = size / 2
      const radius = size / 2 - 10

      // Create Circular Clipping Path for 3D sphere
      ctx.save()
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.clip()

      // Deep water base gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, size)
      bgGrad.addColorStop(0, 'rgba(8, 47, 73, 0.4)')
      bgGrad.addColorStop(0.5, 'rgba(14, 116, 144, 0.6)')
      bgGrad.addColorStop(1, 'rgba(3, 105, 161, 0.85)')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, size, size)

      // 1. Primary Liquid Wave
      ctx.beginPath()
      const waterLevel = centerY + 15
      ctx.moveTo(0, size)
      ctx.lineTo(0, waterLevel)

      for (let x = 0; x <= size; x += 5) {
        const wave1 = Math.sin(x * 0.03 + step) * 9
        const wave2 = Math.cos(x * 0.015 - step * 0.8) * 5
        ctx.lineTo(x, waterLevel + wave1 + wave2)
      }

      ctx.lineTo(size, size)
      ctx.closePath()

      const waveGrad = ctx.createLinearGradient(0, waterLevel - 15, 0, size)
      waveGrad.addColorStop(0, 'rgba(56, 189, 248, 0.85)')
      waveGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.75)')
      waveGrad.addColorStop(1, 'rgba(2, 132, 199, 0.95)')
      ctx.fillStyle = waveGrad
      ctx.fill()

      // 2. Secondary Translucent Front Foam Wave
      ctx.beginPath()
      ctx.moveTo(0, size)
      ctx.lineTo(0, waterLevel)
      for (let x = 0; x <= size; x += 5) {
        const wave = Math.sin(x * 0.025 - step * 1.2) * 6
        ctx.lineTo(x, waterLevel + wave)
      }
      ctx.lineTo(size, size)
      ctx.closePath()
      ctx.fillStyle = 'rgba(224, 242, 254, 0.25)'
      ctx.fill()

      // 3. Floating rising mineral bubbles
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i]
        b.y -= b.speed
        b.x += Math.sin(step + i) * 0.3

        if (b.y < waterLevel) {
          b.y = size - 15
          b.x = Math.random() * size
        }

        ctx.beginPath()
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(240, 249, 255, ${b.opacity})`
        ctx.shadowColor = '#38bdf8'
        ctx.shadowBlur = 4
        ctx.fill()
      }

      // 4. 3D Spherical Specular Light Reflection (Top Left Curvature)
      const specGrad = ctx.createRadialGradient(
        centerX - radius * 0.35,
        centerY - radius * 0.35,
        2,
        centerX - radius * 0.35,
        centerY - radius * 0.35,
        radius * 0.65
      )
      specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)')
      specGrad.addColorStop(0.3, 'rgba(224, 242, 254, 0.4)')
      specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = specGrad
      ctx.beginPath()
      ctx.arc(centerX - radius * 0.35, centerY - radius * 0.35, radius * 0.6, 0, Math.PI * 2)
      ctx.fill()

      // 5. 3D Glass Edge Fresnel Rim
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.6)'
      ctx.lineWidth = 3
      ctx.shadowColor = '#0ea5e9'
      ctx.shadowBlur = 12
      ctx.stroke()

      ctx.restore()

      animationFrameId = requestAnimationFrame(render)
    }

    animationFrameId = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animationFrameId)
  }, [])

  return (
    <div className="relative flex flex-col items-center justify-center my-6 sm:my-8 select-none">
      {/* 3D Container with Perspective */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        onClick={() => setPulseCount((prev) => prev + 1)}
        className="relative cursor-pointer transition-transform duration-200 ease-out"
        style={{
          perspective: '1000px',
          transform: `rotateY(${mousePos.x}deg) rotateX(${mousePos.y}deg) scale(${isHovered ? 1.04 : 1})`,
        }}
      >
        {/* Ambient Glowing Aura */}
        <div className="absolute -inset-6 rounded-full bg-gradient-to-tr from-sky-500/30 via-cyan-400/20 to-blue-600/30 blur-2xl animate-pulse pointer-events-none" />

        {/* Outer Gyro Ring */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full p-2.5 bg-gradient-to-tr from-sky-500/40 via-cyan-400/10 to-blue-600/50 border border-sky-400/40 shadow-[0_0_50px_rgba(14,165,233,0.35)] backdrop-blur-md flex items-center justify-center">
          {/* Orbital Particle Satellite 1 */}
          <div className="absolute inset-0 rounded-full animate-spin-slow pointer-events-none">
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-cyan-300 shadow-[0_0_12px_#38bdf8] flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
          </div>

          {/* Orbital Particle Satellite 2 */}
          <div className="absolute inset-0 rounded-full animate-spin-slow pointer-events-none" style={{ animationDirection: 'reverse', animationDuration: '14s' }}>
            <div className="absolute -bottom-1 left-1/3 w-3 h-3 rounded-full bg-sky-400 shadow-[0_0_10px_#0ea5e9]" />
          </div>

          {/* The 3D Liquid Canvas Sphere */}
          <div className="relative w-full h-full rounded-full overflow-hidden shadow-inner bg-slate-950/80">
            <canvas
              ref={canvasRef}
              className="w-full h-full block"
              style={{ width: '100%', height: '100%' }}
            />

            {/* Central 3D Overlay Badge */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 pointer-events-none">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg mb-1.5 animate-bounce">
                <Droplets className="w-6 h-6 text-cyan-300 fill-cyan-300/40" />
              </div>
              <span className="text-xs font-bold tracking-wider text-white uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {language === 'hi' ? 'जल ही जीवन है' : 'Pure Water 3D'}
              </span>
              <span className="text-[10px] text-cyan-200/90 font-medium drop-shadow">
                {language === 'hi' ? 'हर बूंद अनमोल है 💧' : 'Save Every Drop 💧'}
              </span>
            </div>
          </div>
        </div>

        {/* Interactive Floating Pill Badges */}
        <div className="absolute -bottom-3 -left-4 sm:-left-8 bg-card/90 backdrop-blur-xl border border-sky-500/30 rounded-2xl py-1.5 px-3 shadow-xl flex items-center gap-2 animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <div className="text-left">
            <div className="text-[10px] font-bold text-foreground">TDS 85 PPM</div>
            <div className="text-[8px] text-muted-foreground">{language === 'hi' ? 'लैब प्रमाणित शुद्धता' : 'WHO Pure Grade'}</div>
          </div>
        </div>

        <div className="absolute -top-3 -right-4 sm:-right-8 bg-card/90 backdrop-blur-xl border border-emerald-500/30 rounded-2xl py-1.5 px-3 shadow-xl flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <div className="text-left">
            <div className="text-[10px] font-bold text-foreground">100% RO + UV</div>
            <div className="text-[8px] text-muted-foreground">{language === 'hi' ? 'जोधपुर जल सेवा' : 'Certified Quality'}</div>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground/80 mt-4 flex items-center gap-1">
        <Waves className="w-3 h-3 text-sky-400 animate-pulse" />
        <span>{language === 'hi' ? 'माउस घुमाकर 3D वाटर वेव व शुद्धता का अनुभव करें' : 'Hover & tilt to interact with real-time 3D fluid physics'}</span>
      </p>
    </div>
  )
}
