import { useEffect, useState } from 'react'
import { data, Form, Link } from 'react-router'
import type { FeedListing } from '../../contract/steward/feed.ts'
import { listingsFeedStatus } from '../../server/feed/listings.ts'
import { listingAreas, searchListings } from '../../server/listings/search.ts'
import { type ListingCard, ListingCardView } from '../components/listing-card.tsx'
import { services } from '../context.ts'
import type { Messages } from '../i18n/en.ts'
import { type Lang, langFromPath, messagesFor } from '../i18n/index.ts'
import { useI18n } from '../i18n/provider.tsx'
import { areaName } from '../lib/areas.ts'
import { categories } from '../lib/categories.ts'
import { readFilters } from '../lib/filters.ts'
import { listingLabels } from '../lib/listing-labels.ts'
import type { Route } from './+types/resources'

function toCard(listing: FeedListing, lang: Lang): ListingCard {
  const t = messagesFor(lang)
  return {
    id: listing.id,
    name: listing.name,
    provider: listing.provider,
    categories: listing.categories.map(category => t.categories[category]),
    area: areaName(listing.area, t),
    schedule: listing.schedule,
    address: listing.address,
    phone: listing.phone,
    labels: listingLabels(listing, lang),
  }
}

export async function loader({ url, context }: Route.LoaderArgs) {
  const db = context.get(services).database()
  if (!db) throw data('The listings database is not configured.', { status: 503 })
  const lang = langFromPath(url.pathname)
  const now = new Date()
  const [areas, feed] = await Promise.all([listingAreas(db, now), listingsFeedStatus(db)])
  const filters = readFilters(url.searchParams)
  // An area is one the feed names, matched without regard to case; anything else is ignored rather than matching nothing.
  const area = areas.find(known => known.toLowerCase() === filters.area?.toLowerCase())
  if (area) filters.area = area
  else delete filters.area
  const found = await searchListings(db, filters, now)
  return {
    filters,
    areas,
    results: found.map(listing => toCard(listing, lang)),
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
  const { filters, areas, results, feedLoaded, demonstration } = loaderData
  const { t, path } = useI18n()
  // The fields follow the URL (back, forward, a shared link) without remounting, so focus stays where it was.
  const [query, setQuery] = useState(filters.query ?? '')
  const [category, setCategory] = useState<string>(filters.category ?? '')
  const [area, setArea] = useState(filters.area ?? '')
  useEffect(() => {
    setQuery(filters.query ?? '')
    setCategory(filters.category ?? '')
    setArea(filters.area ?? '')
  }, [filters.query, filters.category, filters.area])
  const filtered = Boolean(filters.query || filters.category || filters.area)

  return (
    <main>
      <h1>{t.search.title}</h1>
      <Form method="get" role="search" className="search-form">
        <label>
          {t.search.words}
          <input
            type="search"
            name="q"
            value={query}
            onChange={event => setQuery(event.target.value)}
            maxLength={100}
          />
        </label>
        <label>
          {t.search.kind}
          <select name="category" value={category} onChange={event => setCategory(event.target.value)}>
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
          <select name="area" value={area} onChange={event => setArea(event.target.value)}>
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
      {!feedLoaded ? (
        <div className="empty">
          <p>{t.search.notLoaded}</p>
          <Call211 t={t} />
        </div>
      ) : (
        <section aria-labelledby="results-heading" className="results">
          <h2 id="results-heading">{t.search.results}</h2>
          {demonstration && <p className="notice">{t.feed.demonstration}</p>}
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
            results.map(listing => <ListingCardView key={listing.id} listing={listing} />)
          )}
        </section>
      )}
    </main>
  )
}
