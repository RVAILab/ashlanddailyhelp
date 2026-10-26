import { Link } from 'react-router'
import { upcomingEvents } from '../../server/feed/events.ts'
import { listingsFeedStatus } from '../../server/feed/listings.ts'
import { pageAlerts } from '../../server/feed/page-alerts.ts'
import { servesAshland } from '../../server/listings/scope.ts'
import { searchListings } from '../../server/listings/search.ts'
import { type NextKind, type NextPlace, nextPlace } from '../../server/next/next.ts'
import { services } from '../context.ts'
import { type Lang, langFromPath, locales, messagesFor } from '../i18n/index.ts'
import { useI18n } from '../i18n/provider.tsx'
import { clock } from '../lib/format.ts'
import { whereText } from '../lib/listing-detail.ts'
import type { Route } from './+types/next'

export const handle = { hydrate: false }

interface NextView {
  name: string
  provider: string
  where: string
  when: string
  phone: string | null
  details: string | null
}

const pacificDay = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date(iso))

const DAY = 86_400_000

function toView(place: NextPlace | null, lang: Lang, known: Set<string>, now: Date): NextView | null {
  if (!place) return null
  const t = messagesFor(lang).next
  // Today needs no day; tomorrow says so; later in the week names the weekday.
  const dayWord = (iso: string) => {
    const days = Math.round((Date.parse(pacificDay(iso)) - Date.parse(pacificDay(now.toISOString()))) / DAY)
    if (days <= 0) return null
    if (days === 1) return t.tomorrow
    return new Intl.DateTimeFormat(locales[lang], { timeZone: 'America/Los_Angeles', weekday: 'long' }).format(
      new Date(iso),
    )
  }
  const start = t.startAt(clock(lang, place.startsAt), dayWord(place.startsAt))
  const end = place.endsAt
    ? t.endAt(
        clock(lang, place.endsAt),
        pacificDay(place.endsAt) === pacificDay(place.startsAt) && !place.openNow ? null : dayWord(place.endsAt),
      )
    : null
  const when = place.openNow
    ? end
      ? t.openUntil(end)
      : t.starts(start)
    : end
      ? t.startsUntil(start, end)
      : t.starts(start)
  return {
    name: place.name,
    provider: place.provider,
    where: whereText(place.where, lang),
    when,
    phone: place.phone,
    details: place.listingId && known.has(place.listingId) ? `/resources/${place.listingId}` : null,
  }
}

export async function loader({ url, context }: Route.LoaderArgs) {
  const lang = langFromPath(url.pathname)
  const now = new Date()
  const db = context.get(services).database()
  // Spanish reads more easily with full names ("domingo, 25 de octubre") than abbreviations.
  const length = lang === 'es' ? 'long' : 'short'
  const day = new Intl.DateTimeFormat(locales[lang], {
    timeZone: 'America/Los_Angeles',
    weekday: length,
    month: length,
    day: 'numeric',
  }).format(now)
  // A copy saved for offline says which day it was worked out, so it isn't mistaken for today's.
  const workedOut = messagesFor(lang).next.workedOut(clock(lang, now), day)
  if (!db) return { workedOut, meal: null, sleep: null, demonstration: false }
  const alerts = await pageAlerts(db, lang, now)
  const listings = await searchListings(db, {}, now, lang)
  const events = (await upcomingEvents(db, now)).filter(event => servesAshland(event.area))
  const known = new Set(listings.map(listing => listing.id))
  const pick = (kind: NextKind) => toView(nextPlace(listings, events, now, kind, alerts.closedUntil), lang, known, now)
  const feed = await listingsFeedStatus(db)
  return {
    workedOut,
    meal: pick('meal'),
    sleep: pick('sleep'),
    demonstration: feed.state === 'stored' && feed.dataset === 'FICTIONAL_DEMONSTRATION',
  }
}

export function meta({ location }: Route.MetaArgs) {
  const t = messagesFor(langFromPath(location.pathname))
  return [{ title: `${t.next.title} · ${t.siteName}` }]
}

export default function Next({ loaderData }: Route.ComponentProps) {
  const { workedOut, meal, sleep, demonstration } = loaderData
  const { t, path } = useI18n()
  return (
    <main className="next">
      <h1>{t.next.title}</h1>
      <p>{workedOut}</p>
      {demonstration && <p className="notice">{t.feed.demonstration}</p>}
      <Pick id="next-meal" heading={t.next.meal} place={meal} none={t.next.noMeal} />
      <Pick id="next-sleep" heading={t.next.sleep} place={sleep} none={t.next.noSleep} />
      <p>
        <Link to={path('/today')} className="next-link">
          {t.next.more}
        </Link>
      </p>
    </main>
  )
}

function Pick({ id, heading, place, none }: { id: string; heading: string; place: NextView | null; none: string }) {
  const { t, path } = useI18n()
  return (
    <section aria-labelledby={id} className="next-pick">
      <h2 id={id}>{heading}</h2>
      {place ? (
        <>
          <h3>{place.name}</h3>
          <p className="next-when">{place.when}</p>
          <p className="next-where">{place.where}</p>
          <p className="next-actions">
            {place.phone ? (
              <a href={`tel:${place.phone.replace(/[^\d+]/g, '')}`} className="call-211">
                {t.next.call(place.phone)}
              </a>
            ) : (
              <a href="tel:211" className="call-211">
                {t.next.call('211')}
              </a>
            )}
            {place.details && (
              <Link to={path(place.details)} className="action">
                {t.next.details}
                <span className="visually-hidden"> {t.next.about(place.name)}</span> <span aria-hidden="true">→</span>
              </Link>
            )}
          </p>
        </>
      ) : (
        <>
          <p className="next-when">{none}</p>
          <p>{t.next.ask}</p>
          <p>
            <a href="tel:211" className="call-211">
              {t.next.call('211')}
            </a>
          </p>
        </>
      )}
    </section>
  )
}
