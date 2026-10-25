import { Link } from 'react-router'
import { upcomingEvents } from '../../server/feed/events.ts'
import { listingsFeedStatus } from '../../server/feed/listings.ts'
import { pageAlerts } from '../../server/feed/page-alerts.ts'
import { servesAshland } from '../../server/listings/scope.ts'
import { searchListings } from '../../server/listings/search.ts'
import { type NextKind, type NextPlace, nextPlace } from '../../server/next/next.ts'
import { groupEvents } from '../../server/today/events.ts'
import { groupToday } from '../../server/today/group.ts'
import { services } from '../context.ts'
import { type Lang, langFromPath, messagesFor } from '../i18n/index.ts'
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

function toView(place: NextPlace | null, lang: Lang, known: Set<string>): NextView | null {
  if (!place) return null
  const t = messagesFor(lang).next
  const end = place.endsAt
    ? pacificDay(place.endsAt) > pacificDay(place.startsAt)
      ? t.tomorrow(clock(lang, place.endsAt))
      : clock(lang, place.endsAt)
    : null
  const when = place.openNow
    ? end
      ? t.openUntil(end)
      : t.starts(clock(lang, place.startsAt))
    : end
      ? t.startsUntil(clock(lang, place.startsAt), end)
      : t.starts(clock(lang, place.startsAt))
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
  const workedOut = clock(lang, now)
  if (!db) return { workedOut, meal: null, sleep: null, demonstration: false }
  const alerts = await pageAlerts(db, lang, now)
  const listings = await searchListings(db, {}, now, lang)
  const groups = groupToday(listings, now, new Set(alerts.closedListings))
  const events = groupEvents(
    (await upcomingEvents(db, now)).filter(event => servesAshland(event.area)),
    now,
  ).today
  const closed = new Set([...alerts.closedListings, ...alerts.closedEvents])
  const known = new Set(listings.map(listing => listing.id))
  const pick = (kind: NextKind) => toView(nextPlace(groups, events, now, kind, closed), lang, known)
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
      <p>{t.today.workedOut(workedOut)}</p>
      {demonstration && <p className="notice">{t.feed.demonstration}</p>}
      <Pick id="next-meal" heading={t.next.meal} place={meal} none={t.next.noMeal} />
      <Pick id="next-sleep" heading={t.next.sleep} place={sleep} none={t.next.noSleep} />
      <p>
        <Link to={path('/today')}>{t.next.more}</Link>
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
            {place.phone && (
              <a href={`tel:${place.phone.replace(/[^\d+]/g, '')}`} className="call-211">
                {t.next.call(place.phone)}
              </a>
            )}
            {place.details && (
              <Link to={path(place.details)} className="action">
                {t.next.details} <span aria-hidden="true">→</span>
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
