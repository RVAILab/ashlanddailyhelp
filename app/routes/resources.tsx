import { useEffect, useRef, useState } from 'react'
import { data, Form, Link } from 'react-router'
import type { FeedListing } from '../../contract/steward/feed.ts'
import { listingsFeedStatus } from '../../server/feed/listings.ts'
import { pageAlerts } from '../../server/feed/page-alerts.ts'
import { searchListings } from '../../server/listings/search.ts'
import { translationsFor } from '../../server/translate/lookup.ts'
import { translatableTexts } from '../../server/translate/texts.ts'
import { type ListingCard, ListingCardView } from '../components/listing-card.tsx'
import { services } from '../context.ts'
import type { Messages } from '../i18n/en.ts'
import { type Lang, langFromPath, messagesFor } from '../i18n/index.ts'
import { useI18n } from '../i18n/provider.tsx'
import { areaName } from '../lib/areas.ts'
import { toCard } from '../lib/card-data.ts'
import { categories } from '../lib/categories.ts'
import { readFilters } from '../lib/filters.ts'
import { byDistance, type Point, walkMinutes } from '../lib/nearby.ts'
import { savedIds } from '../lib/saved-list.ts'
import type { Route } from './+types/resources'

export async function loader({ request, url, context }: Route.LoaderArgs) {
  const saved = savedIds(request.headers.get('Cookie'))
  const db = context.get(services).database()
  if (!db) throw data('The listings database is not configured.', { status: 503 })
  const lang = langFromPath(url.pathname)
  const now = new Date()
  const feed = await listingsFeedStatus(db)
  const filters = readFilters(url.searchParams)
  const found = await searchListings(db, filters, now, lang)
  const alerts = await pageAlerts(db, lang, now)
  const translated =
    lang === 'es'
      ? await translationsFor(
          db,
          found.flatMap(listing => translatableTexts(listing).map(text => text.english)),
          'es',
        )
      : new Map<string, string>()
  return {
    filters,
    results: found.map(listing =>
      toCard(listing, lang, { translated, alert: alerts.byListing[listing.id], saved: saved.includes(listing.id) }),
    ),
    feedLoaded: feed.state !== 'none',
    demonstration: feed.state === 'stored' && feed.dataset === 'FICTIONAL_DEMONSTRATION',
  }
}

export function meta({ loaderData, location }: Route.MetaArgs) {
  const t = messagesFor(langFromPath(location.pathname))
  const query = loaderData?.filters.query
  return [{ title: query ? `${query} · ${t.search.title} · ${t.siteName}` : `${t.search.title} · ${t.siteName}` }]
}

function Call211({ t }: { t: Messages }) {
  return (
    <a className="call-211" href="tel:211">
      {t.search.call211}
    </a>
  )
}

export default function Resources({ loaderData }: Route.ComponentProps) {
  const { filters, results, feedLoaded, demonstration } = loaderData
  const { t, path } = useI18n()
  // Uncontrolled fields keep whatever someone typed before the page finished loading. When the URL changes (back,
  // forward, a shared link) they are set to match it, without remounting, so focus stays where it was.
  const query = useRef<HTMLInputElement>(null)
  const category = useRef<HTMLSelectElement>(null)
  useEffect(() => {
    if (query.current) query.current.value = filters.query ?? ''
    if (category.current) category.current.value = filters.category ?? ''
  }, [filters.query, filters.category])
  const filtered = Boolean(filters.query || filters.category)

  return (
    <main>
      <h1>{t.search.title}</h1>
      <Form method="get" role="search" className="search-form">
        <label>
          {t.search.words}
          <input type="search" name="q" ref={query} defaultValue={filters.query ?? ''} maxLength={100} />
        </label>
        <label>
          {t.search.kind}
          <select ref={category} name="category" defaultValue={filters.category ?? ''}>
            <option value="">{t.search.anyKind}</option>
            {categories.map(id => (
              <option key={id} value={id}>
                {t.categories[id]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">{t.search.submit}</button>
      </Form>
      {!feedLoaded ? (
        <div className="empty">
          <p>{t.search.notLoaded}</p>
          <Call211 t={t} />
        </div>
      ) : (
        <section aria-labelledby="results-heading" className="results">
          <h2 id="results-heading">{t.search.results}</h2>
          {demonstration && <p className="notice">{t.feed.demonstration}</p>}
          {filters.category && !filters.query && (
            <p>
              <a href={path(`/print?category=${filters.category}`)}>{t.print.link}</a>
            </p>
          )}
          <p role="status" className="result-count">
            {t.search.places(results.length)}
          </p>
          {results.length === 0 ? (
            <div className="empty">
              {filtered ? (
                <p>
                  {t.search.tryFewer} <Link to={path('/resources')}>{t.search.clear}</Link>. {t.search.help211}
                </p>
              ) : (
                <p>{t.search.noneListed}</p>
              )}
              <Call211 t={t} />
            </div>
          ) : (
            <NearbyResults results={results} />
          )}
        </section>
      )}
    </main>
  )
}

type Nearby = { state: 'usual' | 'asking' | 'failed' } | { state: 'sorted'; from: Point }

// Sorting by distance happens on this device: the location goes to the sort and nowhere else.
function NearbyResults({ results }: { results: ListingCard[] }) {
  const { t } = useI18n()
  const [hydrated, setHydrated] = useState(false)
  const [nearby, setNearby] = useState<Nearby>({ state: 'usual' })
  useEffect(() => setHydrated(true), [])
  const locate = () => {
    if (!navigator.geolocation) return setNearby({ state: 'failed' })
    setNearby({ state: 'asking' })
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setNearby({ state: 'sorted', from: { lat: coords.latitude, lng: coords.longitude } }),
      () => setNearby({ state: 'failed' }),
      { maximumAge: 5 * 60 * 1000, timeout: 20_000 },
    )
  }
  const distance = (miles: number | null) => {
    if (miles === null) return t.nearby.unknown
    const walk = walkMinutes(miles)
    return walk === null ? t.nearby.miles(miles) : `${t.nearby.miles(miles)} · ${t.nearby.walk(walk)}`
  }
  return (
    <>
      {hydrated && (
        <div className="nearby">
          {nearby.state === 'sorted' ? (
            <button type="button" onClick={() => setNearby({ state: 'usual' })}>
              {t.nearby.usual}
            </button>
          ) : (
            <button type="button" onClick={locate} disabled={nearby.state === 'asking'}>
              {t.nearby.sort}
            </button>
          )}
          <p aria-live="polite">
            {nearby.state === 'asking' && t.nearby.asking}
            {nearby.state === 'failed' && t.nearby.failed}
            {nearby.state === 'sorted' && t.nearby.sorted}
          </p>
        </div>
      )}
      {nearby.state === 'sorted'
        ? byDistance(results, nearby.from).map(({ card, miles }) => (
            <ListingCardView key={card.id} listing={card} distance={distance(miles)} />
          ))
        : results.map(listing => <ListingCardView key={listing.id} listing={listing} />)}
    </>
  )
}
