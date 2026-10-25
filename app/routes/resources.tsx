import { useEffect, useState } from 'react'
import { data, Form, Link } from 'react-router'
import type { FeedListing } from '../../contract/steward/feed.ts'
import { listingsFeedStatus } from '../../server/feed/listings.ts'
import { listingAreas, searchListings } from '../../server/listings/search.ts'
import { type ListingCard, ListingCardView } from '../components/listing-card.tsx'
import { services } from '../context.ts'
import { areaName } from '../lib/areas.ts'
import { categories, categoryNames } from '../lib/categories.ts'
import { readFilters } from '../lib/filters.ts'
import { listingLabels } from '../lib/listing-labels.ts'
import type { Route } from './+types/resources'

function toCard(listing: FeedListing): ListingCard {
  return {
    id: listing.id,
    name: listing.name,
    provider: listing.provider,
    categories: listing.categories.map(category => categoryNames[category]),
    area: areaName(listing.area),
    schedule: listing.schedule,
    address: listing.address,
    phone: listing.phone,
    labels: listingLabels(listing),
  }
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = context.get(services).database()
  if (!db) throw data('The listings database is not configured.', { status: 503 })
  const now = new Date()
  const [areas, feed] = await Promise.all([listingAreas(db, now), listingsFeedStatus(db)])
  const filters = readFilters(new URL(request.url).searchParams)
  // An area is one the feed names, matched without regard to case; anything else is ignored rather than matching nothing.
  const area = areas.find(known => known.toLowerCase() === filters.area?.toLowerCase())
  if (area) filters.area = area
  else delete filters.area
  const found = await searchListings(db, filters, now)
  return {
    filters,
    areas,
    results: found.map(toCard),
    feedLoaded: feed.state !== 'none',
    demonstration: feed.state === 'stored' && feed.dataset === 'FICTIONAL_DEMONSTRATION',
  }
}

export function meta({ loaderData }: Route.MetaArgs) {
  const query = loaderData?.filters.query
  return [{ title: query ? `${query} · Find help · Ashland Daily Help` : 'Find help · Ashland Daily Help' }]
}

function Call211() {
  return (
    <a className="call-211" href="tel:211">
      Call 211
    </a>
  )
}

export default function Resources({ loaderData }: Route.ComponentProps) {
  const { filters, areas, results, feedLoaded, demonstration } = loaderData
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
      <h1>Find help</h1>
      <Form method="get" role="search" className="search-form">
        <label>
          Words to search for
          <input
            type="search"
            name="q"
            value={query}
            onChange={event => setQuery(event.target.value)}
            maxLength={100}
          />
        </label>
        <label>
          Kind of help
          <select name="category" value={category} onChange={event => setCategory(event.target.value)}>
            <option value="">All kinds of help</option>
            {categories.map(id => (
              <option key={id} value={id}>
                {categoryNames[id]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Area
          <select name="area" value={area} onChange={event => setArea(event.target.value)}>
            <option value="">All areas</option>
            {areas.map(name => (
              <option key={name} value={name}>
                {areaName(name)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Search</button>
      </Form>
      {!feedLoaded ? (
        <div className="empty">
          <p>Listings have not loaded yet. For help finding services now, call 211.</p>
          <Call211 />
        </div>
      ) : (
        <section aria-labelledby="results-heading" className="results">
          <h2 id="results-heading">Results</h2>
          {demonstration && <p className="notice">This is demonstration data. Some listings are fictional.</p>}
          <p role="status" className="result-count">
            {results.length === 0
              ? 'No places match'
              : `${results.length} ${results.length === 1 ? 'place' : 'places'}`}
          </p>
          {results.length === 0 ? (
            <div className="empty">
              {filtered ? (
                <p>
                  Try fewer words, or another kind of help or area. You can also{' '}
                  <Link to="/resources">clear the search</Link>. For help finding services, call 211.
                </p>
              ) : (
                <p>No places are listed right now. For help finding services, call 211.</p>
              )}
              <Call211 />
            </div>
          ) : (
            results.map(listing => <ListingCardView key={listing.id} listing={listing} />)
          )}
        </section>
      )}
    </main>
  )
}
