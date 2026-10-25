import { Link, Outlet, redirect, type ShouldRevalidateFunctionArgs, useLocation } from 'react-router'
import { type FeedStatus, listingsFeedStatus } from '../../server/feed/listings.ts'
import { FeedFooter, type FooterFeed } from '../components/feed-footer.tsx'
import { services } from '../context.ts'
import { type Lang, langFromPath, localePath, messagesFor, preferredLang } from '../i18n/index.ts'
import { I18nProvider } from '../i18n/provider.tsx'
import { formatAsOf } from '../lib/format.ts'
import type { Route } from './+types/locale'

const VARY = 'Accept-Language, Cookie'

function forFooter(status: FeedStatus, lang: Lang): FooterFeed {
  return status.state === 'stored' ? { ...status, asOf: formatAsOf(status.generatedAt, lang) } : status
}

export async function loader({ request, url, context }: Route.LoaderArgs) {
  const lang = langFromPath(url.pathname)
  // An English (unprefixed) page sends Spanish speakers to the Spanish page; a /es link always stays Spanish.
  if (lang === 'en') {
    const wanted = preferredLang({
      cookie: request.headers.get('Cookie'),
      acceptLanguage: request.headers.get('Accept-Language'),
    })
    if (wanted === 'es') throw redirect(localePath(`${url.pathname}${url.search}`, 'es'), { headers: { Vary: VARY } })
  }
  let status: FeedStatus
  try {
    status = await listingsFeedStatus(context.get(services).database())
  } catch (error) {
    console.error('locale: could not open the database', error)
    status = { state: 'unavailable' }
  }
  return { lang, feed: forFooter(status, lang) }
}

export function headers() {
  return { Vary: VARY }
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
    <a href={`/language?to=${other}&return=${back}`} lang={other} hrefLang={other} className="language-switch">
      {messagesFor(lang).language.switchTo}
    </a>
  )
}

export default function Locale({ loaderData }: Route.ComponentProps) {
  const { lang, feed } = loaderData
  const t = messagesFor(lang)
  return (
    <I18nProvider lang={lang}>
      <header className="site-header">
        <Link to={localePath('/', lang)} className="site-name">
          {t.siteName}
        </Link>
        <LanguageSwitch lang={lang} />
      </header>
      <Outlet />
      <FeedFooter feed={feed} />
    </I18nProvider>
  )
}
