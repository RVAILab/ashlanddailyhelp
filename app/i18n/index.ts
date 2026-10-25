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

// Always a path on this site: normalizing "/.//host" yields "//host", which browsers read as another site.
export function localePath(path: string, lang: Lang): string {
  const url = new URL(path, 'http://local')
  const local = url.pathname.replace(/^[/\\]+/, '/')
  const bare = langFromPath(local) === 'es' ? local.slice(3) || '/' : local
  const pathname = lang === 'es' ? (bare === '/' ? '/es' : `/es${bare}`) : bare
  return `${pathname}${url.search}${url.hash}`
}

export const LANG_COOKIE = 'lang'

function savedLang(cookie: string | null | undefined): Lang | null {
  const value = cookie
    ?.split(';')
    .map(part => part.trim().split('='))
    .find(([name]) => name === LANG_COOKIE)?.[1]
  return isLang(value) ? value : null
}

// The browser's languages that the site has, best first; equal weights keep the browser's own order.
function ranked(acceptLanguage: string): Lang[] {
  return acceptLanguage
    .split(',')
    .map((part, order) => {
      const [tag = '', ...params] = part.trim().toLowerCase().split(';')
      const q = params.map(param => param.trim()).find(param => param.startsWith('q='))
      return { lang: tag.split('-')[0], weight: q ? Number(q.slice(2)) || 0 : 1, order }
    })
    .filter((entry): entry is { lang: Lang; weight: number; order: number } => isLang(entry.lang) && entry.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.order - b.order)
    .map(entry => entry.lang)
}

// A saved choice wins; otherwise the browser's first choice between Spanish and English.
export function preferredLang({
  cookie,
  acceptLanguage,
}: {
  cookie?: string | null
  acceptLanguage?: string | null
}): Lang {
  return savedLang(cookie) ?? ranked(acceptLanguage ?? '')[0] ?? 'en'
}
