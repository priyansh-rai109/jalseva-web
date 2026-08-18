'use client'

import React from 'react'
import { Languages, Globe } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { cn } from '@/lib/utils'

interface LanguageToggleProps {
  className?: string
  variant?: 'pill' | 'compact' | 'icon'
}

export function LanguageToggle({ className, variant = 'pill' }: LanguageToggleProps) {
  const { language, toggleLanguage } = useLanguage()

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={toggleLanguage}
        aria-label="Toggle language between Hindi and English"
        title={language === 'en' ? 'Switch to हिन्दी' : 'Switch to English'}
        className={cn(
          'w-9 h-9 rounded-xl glass-card flex items-center justify-center text-muted-foreground hover:text-sky-400 hover:border-sky-500/30 transition-all active:scale-95',
          className
        )}
      >
        <Globe className="w-4 h-4 text-sky-400" />
      </button>
    )
  }

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={toggleLanguage}
        aria-label="Toggle language between Hindi and English"
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all duration-200 active:scale-95 select-none min-h-[34px]',
          language === 'hi'
            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20 shadow-sm'
            : 'bg-sky-500/10 text-sky-300 border-sky-500/30 hover:bg-sky-500/20 shadow-sm',
          className
        )}
      >
        <Languages className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{language === 'en' ? '🇮🇳 हिन्दी' : '🇬🇧 English'}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label="Toggle language between Hindi and English"
      className={cn(
        'group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold backdrop-blur-md transition-all duration-300 shadow-md active:scale-95 select-none min-h-[38px]',
        language === 'hi'
          ? 'bg-amber-500/15 border-amber-500/40 text-amber-200 hover:bg-amber-500/25 hover:border-amber-400/60 shadow-amber-500/10'
          : 'bg-sky-500/15 border-sky-500/40 text-sky-200 hover:bg-sky-500/25 hover:border-sky-400/60 shadow-sky-500/10',
        className
      )}
    >
      <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
        <Globe className="w-3 h-3 text-white group-hover:rotate-45 transition-transform duration-300" />
      </div>
      <span className="font-bold tracking-wide">
        {language === 'en' ? 'हिन्दी' : 'English'}
      </span>
      <span className="text-[10px] opacity-75 font-normal">
        ({language === 'en' ? 'Switch to Hindi' : 'अंग्रेजी में देखें'})
      </span>
    </button>
  )
}
