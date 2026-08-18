'use client'

import React, { useState, useEffect, useRef } from 'react'

interface AnimatedOtpInputProps {
  value: string[]
  onChange: (otp: string[]) => void
  onComplete?: (otpString: string) => void
  disabled?: boolean
  error?: boolean
  otpRefs?: React.MutableRefObject<(HTMLInputElement | null)[]>
}

export function AnimatedOtpInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  otpRefs,
}: AnimatedOtpInputProps) {
  const [bouncingIndex, setBouncingIndex] = useState<number | null>(null)
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const [isShaking, setIsShaking] = useState(false)
  const internalRefs = useRef<(HTMLInputElement | null)[]>([])

  const isAllFilled = value.join('').length === 6

  // Trigger shake animation when error prop changes to true
  useEffect(() => {
    if (error) {
      setIsShaking(true)
      const timer = setTimeout(() => setIsShaking(false), 500)
      return () => clearTimeout(timer)
    }
  }, [error])

  const setRef = (el: HTMLInputElement | null, idx: number) => {
    internalRefs.current[idx] = el
    if (otpRefs && otpRefs.current) {
      otpRefs.current[idx] = el
    }
  }

  const handleOtpChange = (idx: number, val: string) => {
    if (disabled) return
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = internalRefs.current.map((el, i) => (i === idx ? digit : el?.value || ''))
    onChange(next)

    if (digit) {
      // Trigger bounce effect on typed box
      setBouncingIndex(idx)
      setTimeout(() => setBouncingIndex(null), 200)

      // Move to next box
      if (idx < 5) {
        internalRefs.current[idx + 1]?.focus()
      }
    }

    const nextStr = next.join('')
    if (nextStr.length === 6 && onComplete) {
      onComplete(nextStr)
    }
  }

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return
    if (e.key === 'Backspace') {
      if (!value[idx] && idx > 0) {
        // Empty box backspace -> move to previous
        internalRefs.current[idx - 1]?.focus()
      }
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length > 0) {
      const pastedArr = Array(6).fill('')
      for (let i = 0; i < Math.min(pasted.length, 6); i++) {
        pastedArr[i] = pasted[i]
      }
      onChange(pastedArr)

      // Trigger wave bounce across filled boxes
      setBouncingIndex(pasted.length - 1)
      setTimeout(() => setBouncingIndex(null), 300)

      // Focus appropriate box
      const targetIdx = Math.min(pasted.length, 5)
      internalRefs.current[targetIdx]?.focus()

      if (pasted.length === 6 && onComplete) {
        onComplete(pasted)
      }
    }
  }

  return (
    <div className="flex gap-1.5 sm:gap-2.5 justify-center py-1">
      {value.map((digit, idx) => {
        const isFilled = Boolean(digit)
        const isFocused = focusedIndex === idx
        const isBouncing = bouncingIndex === idx

        // Dynamic styling & animation logic
        let stateClasses = 'border-border text-foreground bg-secondary/80'

        if (isShaking || error) {
          stateClasses = 'border-red-500 text-red-400 bg-red-500/10 shadow-md shadow-red-500/20 animate-otp-shake'
        } else if (isAllFilled) {
          stateClasses = 'border-sky-400 text-sky-300 bg-sky-500/15 shadow-md shadow-sky-500/30 animate-otp-success'
        } else if (isBouncing) {
          stateClasses = 'border-sky-400 text-sky-300 bg-sky-500/20 shadow-lg shadow-sky-500/40 animate-otp-bounce scale-110 ring-2 ring-sky-400/50'
        } else if (isFocused) {
          stateClasses = 'border-sky-400 text-sky-200 bg-sky-500/10 ring-2 ring-sky-400/40 shadow-sm shadow-sky-500/20 animate-otp-pulse-border scale-[1.03]'
        } else if (isFilled) {
          stateClasses = 'border-sky-500/80 text-sky-300 bg-sky-500/10 shadow-sm shadow-sky-500/10 font-bold'
        }

        return (
          <input
            key={idx}
            ref={el => setRef(el, idx)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            disabled={disabled}
            onChange={e => handleOtpChange(idx, e.target.value)}
            onKeyDown={e => handleOtpKeyDown(idx, e)}
            onPaste={handleOtpPaste}
            onFocus={() => setFocusedIndex(idx)}
            onBlur={() => setFocusedIndex(null)}
            style={{
              animationDelay: isAllFilled ? `${idx * 60}ms` : '0ms',
            }}
            className={`w-9 h-12 sm:w-11 sm:h-13 text-center text-lg sm:text-xl font-extrabold rounded-xl border transition-all duration-150 outline-none ${stateClasses}`}
          />
        )
      })}
    </div>
  )
}
