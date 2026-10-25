import { useEffect, useRef } from 'react'
import { data, Link, Outlet, redirect, type ShouldRevalidateFunctionArgs, useLocation } from 'react-router'
import { type FeedStatus, listingsFeedStatus } from '../../server/feed/listings.ts'
import { BrandMark } from '../components/brand-mark.tsx'
import { FeedFooter, type FooterFeed } from '../components/feed-footer.tsx'
import { services } from '../context.ts'
import { type Lang, langFromPath, messagesFor } from '../i18n/index.ts'
import { I18nProvider } from '../i18n/provider.tsx'
import { languageRedirect } from '../i18n/redirect.ts'
import { formatAsOf } from '../lib/format.ts'
import type { Route } from './+types/locale'

// Runs before any page's loader, so a page that is about to redirect does no database work.
export const middleware: Route.MiddlewareFunction[] = [
  ({ request, url }) => {
    const to = languageRedirect(url, request.headers)
    if (to) throw redirect(to, { headers: { Vary: 'Accept-Language, Cookie' } })
  },
]

function forFooter(status: FeedStatus, lang: Lang): FooterFeed {
  return status.state === 'stored' ? { ...status, asOf: formatAsOf(status.generatedAt, lang) } : status
}

export async function loader({ url, context }: Route.LoaderArgs) {
  const lang = langFromPath(url.pathname)
  let status: FeedStatus
  try {
    status = await listingsFeedStatus(context.get(services).database())
  } catch (error) {
    console.error('locale: could not open the database', error)
    status = { state: 'unavailable' }
  }
  // Only English pages depend on the visitor's language preferences; a /es page is the same for everyone.
  const headers = lang === 'en' ? { Vary: 'Accept-Language, Cookie' } : undefined
  return data({ lang, origin: url.origin, feed: forFooter(status, lang) }, { headers })
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders
}

export function shouldRevalidate({
  formMethod,
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
  if (langFromPath(currentUrl.pathname) !== langFromPath(nextUrl.pathname)) return true
  return formMethod !== undefined && formMethod !== 'GET' ? defaultShouldRevalidate : false
}

function LanguageSwitch({ lang }: { lang: Lang }) {
  const location = useLocation()
  const other: Lang = lang === 'es' ? 'en' : 'es'
  const back = encodeURIComponent(`${location.pathname}${location.search}`)
  return (
    <a
      href={`/language?to=${other}&return=${back}`}
      lang={other}
      hrefLang={other}
      rel="nofollow"
      className="language-switch"
    >
      {messagesFor(lang).language.switchTo}
    </a>
  )
}

// After a navigation inside the app, move focus to the new page's heading, so screen readers announce the change
// the way they would for a full page load. Changes of the query string alone (a search) keep focus where it is.
function useFocusOnNewPage() {
  const { pathname } = useLocation()
  const first = useRef(true)
  // biome-ignore lint/correctness/useExhaustiveDependencies: the effect runs because the page changed, not to read it
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const heading = document.querySelector<HTMLElement>('main h1')
    if (!heading) return
    heading.tabIndex = -1
    heading.focus()
  }, [pathname])
}

export default function Locale({ loaderData }: Route.ComponentProps) {
  const { lang, feed } = loaderData
  const t = messagesFor(lang)
  useFocusOnNewPage()
  return (
    <I18nProvider lang={lang}>
      <header className="site-header">
        <Link to={lang === 'es' ? '/es' : '/'} className="site-name" aria-label={t.siteName}>
          <BrandMark />
          <span className="brand-word">
            <span className="brand-name">{t.brand.name}</span>
            <span className="brand-place">{t.brand.place}</span>
          </span>
        </Link>
        <Link to={lang === 'es' ? '/es/list' : '/list'} className="list-link">
          {t.list.link}
        </Link>
        <LanguageSwitch lang={lang} />
      </header>
      <Outlet />
      <FeedFooter feed={feed} />
    </I18nProvider>
  )
}
