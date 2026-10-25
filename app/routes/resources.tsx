import { data, Form, Link } from 'react-router'
import type { FeedListing } from '../../contract/steward/feed.ts'
import { Category } from '../../contract/steward/values.ts'
import { listingsFeedStatus } from '../../server/feed/listings.ts'
import { listingAreas, searchListings } from '../../server/listings/search.ts'
import { type ListingCard, ListingCardView } from '../components/listing-card.tsx'
import { services } from '../context.ts'
import { categoryNames } from '../lib/categories.ts'
import { filtersSearch, readFilters } from '../lib/filters.ts'
import { listingLabels } from '../lib/listing-labels.ts'
import type { Route } from './+types/resources'

const areaNames: Record<string, string> = {
  'Jackson County': 'Jackson County (county-wide)',
  Oregon: 'Oregon (statewide)',
}

function toCard(listing: FeedListing): ListingCard {
  return {
    id: listing.id,
    name: listing.name,
    provider: listing.provider,
    categories: listing.categories.map(category => categoryNames[category]),
    area: listing.area,
    schedule: listing.schedule,
    address: listing.address,
    phone: listing.phone,
    labels: listingLabels(listing),
  }
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = context.get(services).database()
  if (!db) throw data('The listings database is not configured.', { status: 503 })
  const filters = readFilters(new URL(request.url).searchParams)
  const now = new Date()
  const [found, areas, feed] = await Promise.all([
    searchListings(db, filters, now),
    listingAreas(db, now),
    listingsFeedStatus(db),
  ])
  return {
    filters,
    areas,
    results: found.map(toCard),
    feedLoaded: feed.state === 'stored',
    demonstration: feed.state === 'stored' && feed.dataset === 'FICTIONAL_DEMONSTRATION',
  }
}

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    { title: loaderData?.filters.query ? `${loaderData.filters.query} · Find help` : 'Find help · Ashland Daily Help' },
  ]
}

export default function Resources({ loaderData }: Route.ComponentProps) {
  const { filters, areas, results, feedLoaded, demonstration } = loaderData
  const filtered = filtersSearch(filters) !== ''
  return (
    <main>
      <h1>Find help</h1>
      <Form method="get" role="search" className="search-form" key={filtersSearch(filters)}>
        <label>
          Words to search for
          <input type="search" name="q" defaultValue={filters.query} maxLength={100} />
        </label>
        <label>
          Kind of help
          <select name="category" defaultValue={filters.category ?? ''}>
            <option value="">All kinds of help</option>
            {Category.options.map(category => (
              <option key={category} value={category}>
                {categoryNames[category]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Area
          <select name="area" defaultValue={filters.area ?? ''}>
            <option value="">All areas</option>
            {areas.map(area => (
              <option key={area} value={area}>
                {areaNames[area] ?? area}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Search</button>
      </Form>
      {demonstration && <p className="notice">This is demonstration data. Some listings are fictional.</p>}
      {!feedLoaded ? (
        <p>
          Listings have not loaded yet. For help finding services now, call <a href="tel:211">211</a>.
        </p>
      ) : (
        <>
          <p role="status" className="result-count">
            {results.length === 0
              ? 'No places match'
              : `${results.length} ${results.length === 1 ? 'place' : 'places'}`}
          </p>
          {results.length === 0 ? (
            <p>
              Try fewer words or another area
              {filtered && (
                <>
                  , or <Link to="/resources">clear the search</Link>
                </>
              )}
              . For help finding services, call <a href="tel:211">211</a>.
            </p>
          ) : (
            <section aria-label="Results" className="results">
              {results.map(listing => (
                <ListingCardView key={listing.id} listing={listing} />
              ))}
            </section>
          )}
        </>
      )}
    </main>
  )
}
