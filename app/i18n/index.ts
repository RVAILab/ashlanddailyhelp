import { en, type Messages } from './en.ts'
import { es } from './es.ts'

export const langs = ['en', 'es'] as const
export type Lang = (typeof langs)[number]

const catalogs: Record<Lang, Messages> = { en, es }

export const messagesFor = (lang: Lang): Messages => catalogs[lang]

export const isLang = (value: unknown): value is Lang => langs.includes(value as Lang)

// The language is the first path segment for Spanish (/es/resources); English pages have no prefix.
export const langFromPath = (pathname: string): Lang =>
  pathname === '/es' || pathname.startsWith('/es/') ? 'es' : 'en'

export const locales: Record<Lang, string> = { en: 'en-US', es: 'es-US' }

export function localePath(path: string, lang: Lang): string {
  const url = new URL(path, 'http://local')
  const bare = langFromPath(url.pathname) === 'es' ? url.pathname.slice(3) || '/' : url.pathname
  const pathname = lang === 'es' ? (bare === '/' ? '/es' : `/es${bare}`) : bare
  return `${pathname}${url.search}`
}

export const LANG_COOKIE = 'lang'

function savedLang(cookie: string | null | undefined): Lang | null {
  const value = cookie
    ?.split(';')
    .map(part => part.trim().split('='))
    .find(([name]) => name === LANG_COOKIE)?.[1]
  return isLang(value) ? value : null
}

function quality(acceptLanguage: string, lang: Lang): number {
  let best = 0
  for (const part of acceptLanguage.split(',')) {
    const [tag = '', ...params] = part.trim().toLowerCase().split(';')
    if (tag !== lang && !tag.startsWith(`${lang}-`)) continue
    const q = params.map(param => param.trim()).find(param => param.startsWith('q='))
    best = Math.max(best, q ? Number(q.slice(2)) || 0 : 1)
  }
  return best
}

// A saved choice wins; otherwise Spanish only when the browser ranks it above English.
export function preferredLang({
  cookie,
  acceptLanguage,
}: {
  cookie?: string | null
  acceptLanguage?: string | null
}): Lang {
  const saved = savedLang(cookie)
  if (saved) return saved
  if (!acceptLanguage) return 'en'
  return quality(acceptLanguage, 'es') > quality(acceptLanguage, 'en') ? 'es' : 'en'
}
