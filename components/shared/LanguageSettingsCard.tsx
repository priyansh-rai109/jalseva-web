'use client'

import React from 'react'
import { Languages, CheckCircle2, Globe, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface LanguageSettingsCardProps {
  className?: string
}

export function LanguageSettingsCard({ className }: LanguageSettingsCardProps) {
  const { language, setLanguage, t } = useLanguage()

  const handleSelectLanguage = (newLang: 'en' | 'hi') => {
    if (newLang === language) return
    setLanguage(newLang)
    if (newLang === 'hi') {
      toast.success(t('languageChangedToHindi', 'भाषा बदलकर हिन्दी कर दी गई है!'))
    } else {
      toast.success(t('languageChangedToEnglish', 'Language changed to English successfully!'))
    }
  }

  return (
    <Card className={cn('glass-card border-sky-500/20 shadow-lg overflow-hidden', className)}>
      <CardHeader className="p-4 sm:p-5 bg-gradient-to-r from-sky-500/10 via-background to-transparent border-b border-border/60">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            <div className="w-8 h-8 rounded-xl water-shimmer flex items-center justify-center text-white shadow-sm">
              <Languages className="w-4 h-4" />
            </div>
            <span>{t('languageSettingsTitle', 'Language Preferences')}</span>
          </CardTitle>

          <Badge className="bg-sky-500/15 text-sky-400 border-sky-500/30 text-xs font-semibold px-2.5 py-0.5">
            <Globe className="w-3 h-3 mr-1" />
            {language === 'hi' ? 'हिन्दी (Active)' : 'English (Active)'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {t('languageSettingsSubtitle', 'Choose your preferred display language for JalSeva')}
        </p>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Hindi Option */}
          <button
            type="button"
            onClick={() => handleSelectLanguage('hi')}
            className={cn(
              'flex items-start justify-between p-4 rounded-2xl border text-left transition-all duration-200 group relative',
              language === 'hi'
                ? 'bg-sky-500/15 border-sky-500 ring-2 ring-sky-500/30 shadow-md shadow-sky-500/10'
                : 'bg-secondary/50 border-border hover:bg-secondary/80 hover:border-sky-500/40'
            )}
          >
            <div className="space-y-1 pr-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🇮🇳</span>
                <span className="font-bold text-sm text-foreground group-hover:text-sky-400 transition-colors">
                  हिन्दी (Hindi)
                </span>
                {language === 'hi' && (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] py-0 px-1.5 font-medium">
                    ✓ {t('currentLanguageBadge', 'Active')}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('hindiLanguageDesc', 'जोधपुर व मारवाड़ क्षेत्र के लिए पूर्ण हिन्दी समर्थन')}
              </p>
            </div>

            <div className="flex-shrink-0 mt-0.5">
              {language === 'hi' ? (
                <CheckCircle2 className="w-5 h-5 text-sky-400" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 group-hover:border-sky-400/60" />
              )}
            </div>
          </button>

          {/* English Option */}
          <button
            type="button"
            onClick={() => handleSelectLanguage('en')}
            className={cn(
              'flex items-start justify-between p-4 rounded-2xl border text-left transition-all duration-200 group relative',
              language === 'en'
                ? 'bg-sky-500/15 border-sky-500 ring-2 ring-sky-500/30 shadow-md shadow-sky-500/10'
                : 'bg-secondary/50 border-border hover:bg-secondary/80 hover:border-sky-500/40'
            )}
          >
            <div className="space-y-1 pr-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🌐</span>
                <span className="font-bold text-sm text-foreground group-hover:text-sky-400 transition-colors">
                  English (EN)
                </span>
                {language === 'en' && (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] py-0 px-1.5 font-medium">
                    ✓ {t('currentLanguageBadge', 'Active')}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('englishLanguageDesc', 'Standard English interface for all operations')}
              </p>
            </div>

            <div className="flex-shrink-0 mt-0.5">
              {language === 'en' ? (
                <CheckCircle2 className="w-5 h-5 text-sky-400" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 group-hover:border-sky-400/60" />
              )}
            </div>
          </button>
        </div>

        <div className="p-3 rounded-xl bg-sky-500/5 border border-sky-500/15 flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
          <span>
            {language === 'hi'
              ? 'भाषा का चयन आपके ब्राउज़र में सुरक्षित रहता है और सभी पेजों पर तुरंत लागू होता है।'
              : 'Your language preference is saved in your browser and instantly applies across all pages.'}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
