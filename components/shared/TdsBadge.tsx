'use client'

import React, { useState } from 'react'
import { Droplets, ShieldCheck, Sparkles, Info, X, CheckCircle2, Award } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { cn } from '@/lib/utils'

interface TdsBadgeProps {
  tdsValue?: number
  roPurified?: boolean
  uvSterilized?: boolean
  isiCertified?: boolean
  className?: string
  compact?: boolean
}

export function TdsBadge({
  tdsValue = 68,
  roPurified = true,
  uvSterilized = true,
  isiCertified = true,
  className,
  compact = false,
}: TdsBadgeProps) {
  const { language } = useLanguage()
  const [showModal, setShowModal] = useState(false)

  const getTdsCategory = (val: number) => {
    if (val <= 80) {
      return {
        label: language === 'hi' ? 'अति शुद्ध व मीठा' : 'Sweet & Pure',
        color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
        barColor: 'bg-emerald-400',
      }
    }
    if (val <= 150) {
      return {
        label: language === 'hi' ? 'उत्कृष्ट गुणवत्ता' : 'Excellent Quality',
        color: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
        barColor: 'bg-sky-400',
      }
    }
    return {
      label: language === 'hi' ? 'मानक स्तर' : 'Standard RO',
      color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
      barColor: 'bg-amber-400',
    }
  }

  const category = getTdsCategory(tdsValue)

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold cursor-pointer hover:scale-105 transition-transform',
          category.color,
          className
        )}
      >
        <Droplets className="w-3 h-3 text-current" />
        <span>TDS: {tdsValue} ppm</span>
        <span className="text-[9px] opacity-80">({category.label})</span>
      </button>
    )
  }

  return (
    <>
      <div
        className={cn(
          'p-3 rounded-2xl bg-secondary/60 border border-border/80 space-y-2',
          className
        )}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-foreground">
              {language === 'hi' ? 'जल शुद्धता व गुणवत्ता (Lab Certified)' : 'Water Purity & Lab Certified'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="text-[11px] text-sky-400 hover:text-sky-300 inline-flex items-center gap-0.5 hover:underline"
          >
            <Info className="w-3 h-3" />
            {language === 'hi' ? 'TDS रिपोर्ट देखें' : 'View TDS Report'}
          </button>
        </div>

        {/* TDS Meter Card */}
        <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-card border border-border/60">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              {language === 'hi' ? 'परीक्षित टीडीएस (TDS Level)' : 'Tested TDS Level'}
            </div>
            <div className="text-lg font-bold text-foreground flex items-center gap-1.5" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              <span className="gradient-text text-xl">{tdsValue}</span>
              <span className="text-xs text-muted-foreground font-normal">ppm (mg/L)</span>
            </div>
          </div>
          <Badge className={cn('text-xs font-semibold px-2.5 py-0.5 border', category.color)}>
            ✓ {category.label}
          </Badge>
        </div>

        {/* Quality Badges */}
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {roPurified && (
            <Badge className="text-[10px] bg-sky-500/10 text-sky-300 border-sky-500/20 py-0.5 px-2">
              ✓ 5-Stage RO
            </Badge>
          )}
          {uvSterilized && (
            <Badge className="text-[10px] bg-purple-500/10 text-purple-300 border-purple-500/20 py-0.5 px-2">
              ✓ UV + UF Sterilized
            </Badge>
          )}
          {isiCertified && (
            <Badge className="text-[10px] bg-emerald-500/10 text-emerald-300 border-emerald-500/20 py-0.5 px-2">
              ✓ BIS / FSSAI Tested
            </Badge>
          )}
        </div>
      </div>

      {/* TDS & Water Purity Informational Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-sky-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 relative animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1 pt-1">
              <div className="w-12 h-12 rounded-2xl water-shimmer flex items-center justify-center mx-auto mb-2 text-white shadow-lg shadow-sky-500/20">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {language === 'hi' ? 'पानी की शुद्धता व TDS गाइड' : 'Water Purity & TDS Guide'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {language === 'hi' ? 'जोधपुर में पीने के पानी के लिए विश्व स्वास्थ्य संगठन (WHO) मानक' : 'WHO & BIS Standards for Drinking Water in Jodhpur'}
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> TDS 50 - 100 ppm ({language === 'hi' ? 'सर्वोत्तम' : 'Ideal'})
                </div>
                <p className="text-emerald-200/90 leading-relaxed">
                  {language === 'hi'
                    ? 'पीने के लिए सबसे मीठा और स्वस्थ पानी। इसमें आवश्यक मिनरल्स संतुलित रहते हैं।'
                    : 'Sweetest and healthiest for daily drinking. Essential minerals remain balanced.'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 space-y-1">
                <div className="font-bold text-sky-400 flex items-center gap-1.5">
                  <Droplets className="w-4 h-4" /> 5-Stage Reverse Osmosis (RO)
                </div>
                <p className="text-sky-200/90 leading-relaxed">
                  {language === 'hi'
                    ? 'धूल, बैक्टीरिया, फ्लोराइड और अत्यधिक लवणों को 99.9% तक हटाता है।'
                    : 'Removes 99.9% of bacteria, heavy metals, excess salts, and impurities.'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-1">
                <div className="font-bold text-purple-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> UV Disinfection Chamber
                </div>
                <p className="text-purple-200/90 leading-relaxed">
                  {language === 'hi'
                    ? 'अल्ट्रावायलेट किरणों से पानी को 100% कीटाणु-मुक्त और स्वच्छ बनाता है।'
                    : 'Ultraviolet rays neutralize 100% of micro-organisms and pathogens.'}
                </p>
              </div>
            </div>

            <Button
              onClick={() => setShowModal(false)}
              className="w-full water-shimmer text-white font-semibold text-xs min-h-[40px] rounded-xl"
            >
              {language === 'hi' ? 'समझ गया (Got it)' : 'Got it! Close'}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
