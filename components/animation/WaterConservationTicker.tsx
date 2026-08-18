'use client'

import React, { useState, useEffect } from 'react'
import { Droplets, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { cn } from '@/lib/utils'

const WISDOM_ITEMS_EN = [
  '💧 "Every single drop is sacred in Marwar. Save water, sustain life."',
  '🌿 Over 20,000 pure RO water cans responsibly delivered across Jodhpur.',
  '🛡️ 100% Verified TDS & lab-tested pure water for your family’s health.',
  '🚛 Smart tanker delivery — Zero wastage with sealed hygienic transfers.',
  '✨ "Water is life • जल ही जीवन है" — JalSeva Water Marketplace',
]

const WISDOM_ITEMS_HI = [
  '💧 "मारवाड़ में पानी की हर एक बूंद अनमोल है। जल बचाएं, जीवन संवारें।"',
  '🌿 जोधपुर में 20,000+ शुद्ध RO पानी की कैन सुरक्षित व समय पर डिलीवर।',
  '🛡️ 100% लैब-परीक्षित शुद्ध जल और संतुलित मिनरल्स (TDS Verified)।',
  '🚛 स्मार्ट टैंकर डिलीवरी — बिना किसी बर्बादी के सीलबंद व स्वच्छ पानी।',
  '✨ "जल ही जीवन है — शुद्ध जल, स्वस्थ परिवार" — जलसेवा मार्केटप्लेस',
]

export function WaterConservationTicker() {
  const { language } = useLanguage()
  const [index, setIndex] = useState(0)
  const [isMinimized, setIsMinimized] = useState(false)

  const items = language === 'hi' ? WISDOM_ITEMS_HI : WISDOM_ITEMS_EN

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length)
    }, 5500)
    return () => clearInterval(interval)
  }, [items.length])

  return (
    <aside
      aria-label="Water Conservation Wisdom"
      className={cn(
        'transition-all duration-300 z-30 select-none max-w-2xl mx-auto my-3 px-3 w-full',
        isMinimized ? 'opacity-80' : 'opacity-100'
      )}
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-950/60 via-blue-950/70 to-sky-950/60 border border-sky-500/25 p-2.5 sm:p-3 shadow-lg shadow-sky-500/5 backdrop-blur-md">
        {/* Animated accent gradient line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-sky-400 to-transparent animate-pulse" />

        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl water-shimmer flex items-center justify-center flex-shrink-0 shadow-sm">
              <Droplets className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white animate-bounce" />
            </div>

            {!isMinimized ? (
              <p
                key={index}
                className="text-xs sm:text-sm text-sky-100 font-medium truncate animate-in fade-in slide-in-from-bottom-2 duration-500"
              >
                {items[index]}
              </p>
            ) : (
              <span className="text-xs text-sky-300 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {language === 'hi' ? 'जल ही जीवन है • Every Drop Counts' : 'Water Wisdom • Every Drop Counts'}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            aria-label={isMinimized ? 'Expand Water Awareness Banner' : 'Minimize Water Awareness Banner'}
            className="p-1 text-sky-300/70 hover:text-sky-200 hover:bg-sky-500/10 rounded-lg transition-colors flex-shrink-0"
          >
            {isMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  )
}
