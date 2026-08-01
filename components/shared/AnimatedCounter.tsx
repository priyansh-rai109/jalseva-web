'use client'

import React, { useState, useEffect } from 'react'

interface AnimatedCounterProps {
  value: number
  duration?: number
  prefix?: string
  suffix?: string
  decimals?: number
  className?: string
}

export function AnimatedCounter({
  value,
  duration = 1000,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let startTimestamp: number | null = null
    const startValue = 0
    const endValue = value

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)

      // Ease-out quad formula for smooth counting
      const easeOutProgress = 1 - Math.pow(1 - progress, 3)
      const currentCount = startValue + (endValue - startValue) * easeOutProgress

      setCount(currentCount)

      if (progress < 1) {
        requestAnimationFrame(step)
      } else {
        setCount(endValue)
      }
    }

    requestAnimationFrame(step)
  }, [value, duration])

  const formattedNumber = count.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return (
    <span className={`inline-block transition-all ${className}`}>
      {prefix}{formattedNumber}{suffix}
    </span>
  )
}
