import { useEffect, useRef } from 'react'
import { data, Form, Link } from 'react-router'
import type { FeedListing } from '../../contract/steward/feed.ts'
import { listingsFeedStatus } from '../../server/feed/listings.ts'
import { listingAreas, searchListings } from '../../server/listings/search.ts'
import { translationsFor } from '../../server/translate/lookup.ts'
import { translatableTexts } from '../../server/translate/texts.ts'
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

function toCard(listing: FeedListing, lang: Lang, translated: Map<string, string>): ListingCard {
  const t = messagesFor(lang)
  const schedule = translated.get(listing.schedule.trim())
  const labels = listingLabels(listing, lang, translated)
  return {
    id: listing.id,
    name: listing.name,
    provider: listing.provider,
    categories: listing.categories.map(category => t.categories[category]),
    area: areaName(listing.area, t),
    schedule: schedule ? { text: schedule, fromFeed: false } : { text: listing.schedule, fromFeed: true },
    translated: Boolean(schedule) || labels.some(label => label.translated),
    address: listing.address,
    phone: listing.phone,
    labels,
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
  const found = await searchListings(db, filters, now, lang)
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
    areas,
    results: found.map(listing => toCard(listing, lang, translated)),
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
  // Uncontrolled fields keep whatever someone typed before the page finished loading. When the URL changes (back,
  // forward, a shared link) they are set to match it, without remounting, so focus stays where it was.
  const query = useRef<HTMLInputElement>(null)
  const category = useRef<HTMLSelectElement>(null)
  const area = useRef<HTMLSelectElement>(null)
  useEffect(() => {
    if (query.current) query.current.value = filters.query ?? ''
    if (category.current) category.current.value = filters.category ?? ''
    if (area.current) area.current.value = filters.area ?? ''
  }, [filters.query, filters.category, filters.area])
  const filtered = Boolean(filters.query || filters.category || filters.area)

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
        <label>
          {t.search.area}
          <select ref={area} name="area" defaultValue={filters.area ?? ''}>
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
