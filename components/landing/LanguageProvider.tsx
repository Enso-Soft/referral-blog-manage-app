'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { translations, type Language, type TranslationKey } from './translations'

interface LanguageContextType {
  lang: Language
  setLang: (lang: Language) => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextType | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'ko'
    return (localStorage.getItem('landing-lang') as Language) || 'ko'
  })

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang)
    localStorage.setItem('landing-lang', newLang)
  }, [])

  const t = useCallback((key: TranslationKey) => {
    return translations[lang][key] ?? key
  }, [lang])

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used within LanguageProvider')
  return context
}
