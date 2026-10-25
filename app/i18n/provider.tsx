import { createContext, useContext } from 'react'
import type { Messages } from './en.ts'
import { type Lang, localePath, messagesFor } from './index.ts'

interface I18n {
  lang: Lang
  t: Messages
  path: (to: string) => string
}

const I18nContext = createContext<I18n>({ lang: 'en', t: messagesFor('en'), path: to => to })

export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return (
    <I18nContext.Provider value={{ lang, t: messagesFor(lang), path: to => localePath(to, lang) }}>
      {children}
    </I18nContext.Provider>
  )
}

export const useI18n = () => useContext(I18nContext)
