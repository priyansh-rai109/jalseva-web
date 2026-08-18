'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { translations, type Language, type TranslationKey } from './translations'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
  t: (key: TranslationKey, fallback?: string) => string
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key) => translations.en[key] || key,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('jalseva-lang') as Language
      if (saved === 'hi' || saved === 'en') {
        setLanguageState(saved)
      }
    } catch {}
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    try {
      localStorage.setItem('jalseva-lang', lang)
    } catch {}
  }

  const toggleLanguage = () => {
    const nextLang = language === 'en' ? 'hi' : 'en'
    setLanguage(nextLang)
  }

  const t = (key: TranslationKey, fallback?: string): string => {
    const langDict = translations[language] || translations.en
    return langDict[key] || fallback || translations.en[key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
