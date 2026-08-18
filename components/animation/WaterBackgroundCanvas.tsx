'use client'

import React, { useEffect, useRef } from 'react'

interface Drop {
  x: number
  y: number
  radius: number
  speed: number
  opacity: number
  glow: number
}

interface Ripple {
  x: number
  y: number
  radius: number
  maxRadius: number
  opacity: number
  speed: number
}

export function WaterBackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    // Drops pool
    const isMobile = width < 768
    const dropsCount = isMobile ? 18 : 35
    const drops: Drop[] = Array.from({ length: dropsCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2 + 1.2,
      speed: Math.random() * 0.8 + 0.3,
      opacity: Math.random() * 0.4 + 0.15,
      glow: Math.random() * 6 + 2,
    }))

    const ripples: Ripple[] = []

    const addRipple = (x: number, y: number, maxRadius = isMobile ? 60 : 100) => {
      if (ripples.length > 20) ripples.shift()
      ripples.push({
        x,
        y,
        radius: 2,
        maxRadius,
        opacity: 0.7,
        speed: 1.8,
      })
    }

    // Interactive pointer handlers
    const handlePointerMove = (e: MouseEvent) => {
      // Add subtle ripple occasionally on mouse move
      if (Math.random() < 0.2) {
        addRipple(e.clientX, e.clientY, 50)
      }
    }

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      addRipple(clientX, clientY, isMobile ? 80 : 140)
    }

    window.addEventListener('mousemove', handlePointerMove, { passive: true })
    window.addEventListener('touchstart', handlePointerDown, { passive: true })
    window.addEventListener('mousedown', handlePointerDown, { passive: true })

    // Auto-create occasional natural gentle raindrops in the background
    const autoRainInterval = setInterval(() => {
      if (Math.random() < 0.7) {
        addRipple(Math.random() * width, Math.random() * height, Math.random() * 40 + 30)
      }
    }, 2400)

    // Animation render loop
    let lastTime = performance.now()
    const render = (time: number) => {
      const delta = (time - lastTime) / 1000
      lastTime = time

      ctx.clearRect(0, 0, width, height)

      // 1. Draw and update ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i]
        r.radius += r.speed * (delta * 60)
        r.opacity = Math.max(0, 0.7 * (1 - r.radius / r.maxRadius))

        if (r.radius >= r.maxRadius || r.opacity <= 0.01) {
          ripples.splice(i, 1)
          continue
        }

        // Inner soft water crest
        ctx.save()
        ctx.beginPath()
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(56, 189, 248, ${r.opacity * 0.45})`
        ctx.lineWidth = 1.5
        ctx.shadowColor = '#0ea5e9'
        ctx.shadowBlur = 8
        ctx.stroke()

        // Outer secondary refraction wave
        if (r.radius > 8) {
          ctx.beginPath()
          ctx.arc(r.x, r.y, r.radius - 6, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(14, 165, 233, ${r.opacity * 0.25})`
          ctx.lineWidth = 1
          ctx.stroke()
        }
        ctx.restore()
      }

      // 2. Draw and update glowing falling droplets
      for (let i = 0; i < drops.length; i++) {
        const d = drops[i]
        d.y += d.speed * (delta * 60)

        // Reset drop when hitting bottom
        if (d.y > height) {
          d.y = -10
          d.x = Math.random() * width
          // Create small subtle ripple on drop impact
          if (Math.random() < 0.3) {
            addRipple(d.x, height - 10, 30)
          }
        }

        ctx.save()
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(186, 230, 253, ${d.opacity})`
        ctx.shadowColor = '#38bdf8'
        ctx.shadowBlur = d.glow
        ctx.fill()
        ctx.restore()
      }

      animationFrameId = requestAnimationFrame(render)
    }

    animationFrameId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animationFrameId)
      clearInterval(autoRainInterval)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handlePointerMove)
      window.removeEventListener('touchstart', handlePointerDown)
      window.removeEventListener('mousedown', handlePointerDown)
    }
  }, [])

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full opacity-60 transition-opacity duration-1000"
      />
    </div>
  )
}
