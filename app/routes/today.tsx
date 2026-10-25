import { useEffect } from 'react'
import { data, Link, useRevalidator } from 'react-router'
import type { FeedEvent, StoredListing } from '../../server/feed/contract.ts'
import { upcomingEvents } from '../../server/feed/events.ts'
import { feedFileStatus } from '../../server/feed/ingest.ts'
import { currentListings } from '../../server/feed/listings.ts'
import { pageAlerts } from '../../server/feed/page-alerts.ts'
import { servesAshland } from '../../server/listings/scope.ts'
import { searchListings } from '../../server/listings/search.ts'
import { groupEvents } from '../../server/today/events.ts'
import { groupToday, type TodayEntry } from '../../server/today/group.ts'
import { AlertList } from '../components/alert-list.tsx'
import { AskForm } from '../components/ask-form.tsx'
import { type ListingCard, ListingCardView } from '../components/listing-card.tsx'
import { ListingStatus } from '../components/listing-status.tsx'
import { services } from '../context.ts'
import type { Messages } from '../i18n/en.ts'
import { type Lang, langFromPath, locales, messagesFor } from '../i18n/index.ts'
import { useI18n } from '../i18n/provider.tsx'
import { areaName } from '../lib/areas.ts'
import { toCard } from '../lib/card-data.ts'
import { clock } from '../lib/format.ts'
import { savedIds } from '../lib/saved-list.ts'
import type { Route } from './+types/today'

interface TodayCard {
  card: ListingCard
  when: string
  // Every window today, when there is more than one ("9:00 AM–12:00 PM, 1:00 PM–3:00 PM").
  hours: string | null
}

function toEntry(
  entry: TodayEntry,
  lang: Lang,
  t: Messages,
  group: 'openNow' | 'later' | 'closed' | 'notConfirmed',
  alert?: string,
  saved = false,
): TodayCard {
  const listing: StoredListing = entry.listing
  const window = entry.window
  const when =
    group === 'openNow' && window?.endsAt
      ? t.today.until(clock(lang, window.endsAt))
      : group === 'later' && window
        ? window.endsAt
          ? t.today.opensFromTo(clock(lang, window.startsAt), clock(lang, window.endsAt))
          : t.today.opensAt(clock(lang, window.startsAt))
        : group === 'closed'
          ? entry.canceled !== undefined
            ? t.today.canceled(entry.canceled)
            : t.today.closed
          : entry.mayBeCanceled !== undefined
            ? entry.mayBeCanceled || t.today.notConfirmed
            : t.today.notConfirmed
  const span = (window: TodayEntry['today'][number]) =>
    window.endsAt ? `${clock(lang, window.startsAt)}–${clock(lang, window.endsAt)}` : clock(lang, window.startsAt)
  return {
    when,
    hours: entry.today.length > 1 ? t.today.hours(entry.today.map(span).join(', ')) : null,
    // A window can be somewhere other than the listing's usual address.
    card: { ...toCard(listing, lang, { alert, saved }), address: window?.location ?? listing.address },
  }
}

interface EventView {
  id: string
  title: string
  provider: string
  when: string
  where: string
  status: { kind: 'canceled' | 'may_be_canceled'; text: string } | null
  labels: Array<{ kind: 'caution' | 'source'; text: string }>
  listingId: string | null
}

function toEventView(event: FeedEvent, lang: Lang, t: Messages, known: Set<string>): EventView {
  const when = event.startsAt
    ? event.endsAt
      ? `${clock(lang, event.startsAt)}–${clock(lang, event.endsAt)}`
      : clock(lang, event.startsAt)
    : t.events.allDay
  const labels: EventView['labels'] = []
  if (event.unconfirmed) labels.push({ kind: 'caution', text: t.labels.unconfirmed })
  if (event.provenanceLabel) labels.push({ kind: 'source', text: event.provenanceLabel })
  return {
    id: event.id,
    title: event.title,
    provider: event.provider,
    when,
    where: event.address,
    status: event.status
      ? {
          kind: event.status,
          text: event.note || (event.status === 'canceled' ? t.events.canceled : t.events.mayBeCanceled),
        }
      : null,
    labels,
    // Only link to a listing that is actually there, rather than to a page that says it isn't.
    listingId: event.listingId && known.has(event.listingId) ? event.listingId : null,
  }
}

const dayName = (lang: Lang, date: string) =>
  new Intl.DateTimeFormat(locales[lang], { timeZone: 'UTC', weekday: 'long', month: 'short', day: 'numeric' }).format(
    new Date(`${date}T12:00:00Z`),
  )

const soonest = (...times: Array<string | null>) =>
  times.filter((time): time is string => time !== null).sort((a, b) => Date.parse(a) - Date.parse(b))[0] ?? null

export async function loader({ request, url, context }: Route.LoaderArgs) {
  const saved = savedIds(request.headers.get('Cookie'))
  const db = context.get(services).database()
  if (!db) throw data('The listings database is not configured.', { status: 503 })
  const lang = langFromPath(url.pathname)
  const t = messagesFor(lang)
  const now = new Date()
  const alerts = await pageAlerts(db, lang, now)
  const groups = groupToday(await searchListings(db, {}, now, lang), now, new Set(alerts.closedListings))
  const scheduled = groupEvents(
    (await upcomingEvents(db, now)).filter(event => servesAshland(event.area)),
    now,
  )
  const known = new Set((await currentListings(db, now)).map(listing => listing.id))
  const eventsFeed = await feedFileStatus(db, 'events.json')
  const view = (list: FeedEvent[]) => list.map(event => toEventView(event, lang, t, known))
  return {
    workedOut: clock(lang, now),
    now: now.toISOString(),
    nextChange: soonest(groups.nextChange?.toISOString() ?? null, alerts.nextEnd),
    events: {
      today: view(scheduled.today),
      finished: view(scheduled.finished),
      tomorrow: view(scheduled.tomorrow),
      thisWeek: scheduled.thisWeek.map(event => ({
        ...toEventView(event, lang, t, known),
        day: dayName(lang, event.date),
      })),
    },
    eventsDemonstration: eventsFeed?.dataset === 'FICTIONAL_DEMONSTRATION',
    alerts,
    groups: {
      openNow: groups.openNow.map(entry =>
        toEntry(entry, lang, t, 'openNow', alerts.byListing[entry.listing.id], saved.includes(entry.listing.id)),
      ),
      later: groups.later.map(entry =>
        toEntry(entry, lang, t, 'later', alerts.byListing[entry.listing.id], saved.includes(entry.listing.id)),
      ),
      closed: groups.closed.map(entry =>
        toEntry(entry, lang, t, 'closed', alerts.byListing[entry.listing.id], saved.includes(entry.listing.id)),
      ),
      notConfirmed: groups.notConfirmed.map(entry =>
        toEntry(entry, lang, t, 'notConfirmed', alerts.byListing[entry.listing.id], saved.includes(entry.listing.id)),
      ),
    },
  }
}

export function meta({ location }: Route.MetaArgs) {
  const t = messagesFor(langFromPath(location.pathname))
  return [{ title: `${t.today.title} · ${t.siteName}` }]
}

const HOUR = 60 * 60 * 1000

// Regroup when the next window opens or closes, and at least every hour, without a reload.
// Times come from the server's clock, so a phone whose clock is off can't make this reload in a loop.
function useRegroup(serverNow: string, nextChange: string | null) {
  const { revalidate } = useRevalidator()
  useEffect(() => {
    const base = Date.parse(serverNow)
    const untilChange = nextChange ? Date.parse(nextChange) - base : Number.POSITIVE_INFINITY
    const untilHour = HOUR - (base % HOUR)
    const timer = setTimeout(() => revalidate(), Math.max(1_000, Math.min(untilChange, untilHour) + 1_000))
    return () => clearTimeout(timer)
  }, [serverNow, nextChange, revalidate])
}

const GROUPS = ['openNow', 'later', 'closed', 'notConfirmed'] as const

export default function Today({ loaderData }: Route.ComponentProps) {
  const { workedOut, now, nextChange, groups, events, eventsDemonstration, alerts } = loaderData
  const { t, path } = useI18n()
  useRegroup(now, nextChange)
  return (
    <main>
      <h1>{t.today.title}</h1>
      <AlertList alerts={alerts.alerts} listingNames={alerts.listingNames} demonstration={alerts.demonstration} />
      <p>{t.today.workedOut(workedOut)}</p>
      <p>
        <Link to={path('/next')}>{t.next.link}</Link>
      </p>
      <section aria-labelledby="events-heading" className="today-events">
        <h2 id="events-heading">{t.events.title}</h2>
        {eventsDemonstration && <p className="notice">{t.feed.demonstration}</p>}
        <h3>{t.events.today}</h3>
        {events.today.length === 0 ? <p>{t.events.none}</p> : <EventList events={events.today} />}
        {events.finished.length > 0 && (
          <details>
            <summary>{t.events.finished(events.finished.length)}</summary>
            <EventList events={events.finished} />
          </details>
        )}
        {events.tomorrow.length > 0 && (
          <>
            <h3>{t.events.tomorrow}</h3>
            <EventList events={events.tomorrow} />
          </>
        )}
        {events.thisWeek.length > 0 && (
          <>
            <h3>{t.events.thisWeek}</h3>
            <EventList events={events.thisWeek} />
          </>
        )}
      </section>
      {GROUPS.map(group => (
        <section key={group} aria-labelledby={`${group}-heading`} className={`today-group today-${group}`}>
          <h2 id={`${group}-heading`}>
            {t.today[group]} ({groups[group].length})
          </h2>
          {group === 'notConfirmed' && groups.notConfirmed.length > 0 && <p>{t.today.notConfirmedHint}</p>}
          {groups[group].length === 0 ? (
            <p>{t.today.none}</p>
          ) : (
            groups[group].map(entry => (
              <div key={entry.card.id} className="today-entry">
                <p className={`today-when today-when-${group}`}>{entry.when}</p>
                {entry.hours && <p className="today-hours">{entry.hours}</p>}
                <ListingCardView listing={entry.card} />
              </div>
            ))
          )}
        </section>
      ))}
      <p>
        <Link to={path('/resources')}>{t.home.searchAll}</Link> · <a href={path('/print?view=today')}>{t.print.link}</a>
      </p>
      <section aria-labelledby="ask-heading" className="ask-entry">
        <h2 id="ask-heading">{t.ask.title}</h2>
        <AskForm id="today-ask-q" />
      </section>
    </main>
  )
}

function EventList({ events }: { events: Array<EventView & { day?: string }> }) {
  const { t, path } = useI18n()
  return (
    <ul className="event-list">
      {events.map(event => (
        <li key={event.id}>
          <article
            aria-labelledby={`event-${event.id}`}
            className={event.status?.kind === 'canceled' ? 'event canceled' : 'event'}
          >
            <p className="event-when">
              {event.day ? `${event.day} · ` : ''}
              {event.when}
            </p>
            <h4 id={`event-${event.id}`}>{event.title}</h4>
            <p className="provider">{event.provider}</p>
            {event.status && (
              <p className={`label label-warning event-status-${event.status.kind}`}>
                <span aria-hidden="true">▲</span> {event.status.text}
              </p>
            )}
            <ListingStatus labels={event.labels} />
            <p>{event.where}</p>
            {event.listingId && (
              <p>
                <Link to={path(`/resources/${event.listingId}`)}>{t.events.related}</Link>
              </p>
            )}
          </article>
        </li>
      ))}
    </ul>
  )
}
