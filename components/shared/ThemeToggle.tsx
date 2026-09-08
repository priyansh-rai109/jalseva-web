'use client'

import React, { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
  variant?: 'pill' | 'compact' | 'icon'
}

export function ThemeToggle({ className, variant = 'compact' }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className={cn('w-9 h-9 rounded-xl bg-secondary/50 animate-pulse', className)} />
    )
  }

  const isDark = resolvedTheme === 'dark'

  const toggle = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label="Toggle theme"
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        className={cn(
          'w-9 h-9 rounded-xl glass-card flex items-center justify-center text-muted-foreground hover:text-sky-500 hover:border-sky-500/30 transition-all active:scale-95',
          className
        )}
      >
        {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-600" />}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme between Light and Dark mode"
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 active:scale-95 select-none shadow-sm',
        isDark
          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
          : 'bg-sky-500/10 text-sky-700 border-sky-500/30 hover:bg-sky-500/20',
        className
      )}
    >
      {isDark ? (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-400" />
          <span>Light Mode</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-sky-600" />
          <span>Dark Mode</span>
        </>
      )}
    </button>
  )
}
