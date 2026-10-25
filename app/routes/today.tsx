import { useEffect } from 'react'
import { data, Form, Link, useRevalidator } from 'react-router'
import type { StoredListing } from '../../server/feed/contract.ts'
import { listingAreas, searchListings } from '../../server/listings/search.ts'
import { groupToday, type TodayEntry } from '../../server/today/group.ts'
import { type ListingCard, ListingCardView } from '../components/listing-card.tsx'
import { services } from '../context.ts'
import type { Messages } from '../i18n/en.ts'
import { type Lang, langFromPath, locales, messagesFor } from '../i18n/index.ts'
import { useI18n } from '../i18n/provider.tsx'
import { areaName } from '../lib/areas.ts'
import { categories } from '../lib/categories.ts'
import { readFilters } from '../lib/filters.ts'
import { listingLabels } from '../lib/listing-labels.ts'
import type { Route } from './+types/today'

const clock = (lang: Lang, iso: string | Date) =>
  new Intl.DateTimeFormat(locales[lang], { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit' })
    .format(new Date(iso))
    .replace(/\s/g, ' ')

interface TodayCard {
  card: ListingCard
  when: string
}

function toEntry(
  entry: TodayEntry,
  lang: Lang,
  t: Messages,
  group: 'openNow' | 'later' | 'closed' | 'notConfirmed',
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
          : t.today.notConfirmed
  return {
    when,
    card: {
      id: listing.id,
      name: listing.name,
      provider: listing.provider,
      categories: listing.categories.map(category => t.categories[category]),
      area: areaName(listing.area, t),
      schedule: { text: listing.schedule, fromFeed: true },
      translated: false,
      address: listing.address,
      phone: listing.phone,
      labels: listingLabels(listing, lang),
    },
  }
}

export async function loader({ url, context }: Route.LoaderArgs) {
  const db = context.get(services).database()
  if (!db) throw data('The listings database is not configured.', { status: 503 })
  const lang = langFromPath(url.pathname)
  const t = messagesFor(lang)
  const now = new Date()
  const areas = await listingAreas(db, now)
  const { query: _, ...filters } = readFilters(url.searchParams)
  const area = areas.find(known => known.toLowerCase() === filters.area?.toLowerCase())
  if (area) filters.area = area
  else delete filters.area
  const groups = groupToday(await searchListings(db, filters, now, lang), now)
  return {
    filters,
    areas,
    workedOut: clock(lang, now),
    nextChange: groups.nextChange?.toISOString() ?? null,
    groups: {
      openNow: groups.openNow.map(entry => toEntry(entry, lang, t, 'openNow')),
      later: groups.later.map(entry => toEntry(entry, lang, t, 'later')),
      closed: groups.closed.map(entry => toEntry(entry, lang, t, 'closed')),
      notConfirmed: groups.notConfirmed.map(entry => toEntry(entry, lang, t, 'notConfirmed')),
    },
  }
}

export function meta({ location }: Route.MetaArgs) {
  const t = messagesFor(langFromPath(location.pathname))
  return [{ title: `${t.today.title} · ${t.siteName}` }]
}

const HOUR = 60 * 60 * 1000

// Regroup when the next window opens or closes, and at least every hour, without a reload.
function useRegroup(nextChange: string | null) {
  const { revalidate } = useRevalidator()
  useEffect(() => {
    const untilChange = nextChange ? Date.parse(nextChange) - Date.now() : Number.POSITIVE_INFINITY
    const untilHour = HOUR - (Date.now() % HOUR)
    const timer = setTimeout(() => revalidate(), Math.max(1_000, Math.min(untilChange, untilHour) + 1_000))
    return () => clearTimeout(timer)
  }, [nextChange, revalidate])
}

const GROUPS = ['openNow', 'later', 'closed', 'notConfirmed'] as const

export default function Today({ loaderData }: Route.ComponentProps) {
  const { filters, areas, workedOut, nextChange, groups } = loaderData
  const { t, path } = useI18n()
  useRegroup(nextChange)
  return (
    <main>
      <h1>{t.today.title}</h1>
      <p>{t.today.workedOut(workedOut)}</p>
      <Form method="get" className="search-form">
        <label>
          {t.search.kind}
          <select name="category" defaultValue={filters.category ?? ''} key={`c-${filters.category ?? ''}`}>
            <option value="">{t.search.anyKind}</option>
            {categories.map(id => (
              <option key={id} value={id}>
                {t.categories[id]}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t.search.area}
          <select name="area" defaultValue={filters.area ?? ''} key={`a-${filters.area ?? ''}`}>
            <option value="">{t.search.anyArea}</option>
            {areas.map(name => (
              <option key={name} value={name}>
                {areaName(name, t)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">{t.search.submit}</button>
      </Form>
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
                <ListingCardView listing={entry.card} />
              </div>
            ))
          )}
        </section>
      ))}
      <p>
        <Link to={path('/resources')}>{t.home.searchAll}</Link>
      </p>
    </main>
  )
}
