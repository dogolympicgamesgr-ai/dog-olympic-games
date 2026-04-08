'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

type Lang = 'el' | 'en'

interface LanguageContextType {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (el: string, en: string) => string
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'el',
  setLang: () => {},
  t: (el) => el,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('el')
  const t = (el: string, en: string) => lang === 'el' ? el : en

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang() {
  return useContext(LanguageContext)
}