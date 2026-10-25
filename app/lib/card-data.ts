import type { StoredListing } from '../../server/feed/contract.ts'
import type { ListingCard } from '../components/listing-card.tsx'
import { type Lang, messagesFor } from '../i18n/index.ts'
import { areaName } from './areas.ts'
import { listingLabels } from './listing-labels.ts'

interface CardOptions {
  translated?: Map<string, string>
  alert?: string
  saved?: boolean
}

// What a listing card shows, worked out on the server like the labels.
export function toCard(
  listing: StoredListing,
  lang: Lang,
  { translated = new Map(), alert, saved = false }: CardOptions = {},
): ListingCard {
  const t = messagesFor(lang)
  const schedule = translated.get(listing.schedule.trim())
  const labels = [
    ...(alert ? [{ kind: 'warning' as const, text: alert }] : []),
    ...listingLabels(listing, lang, translated),
  ]
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
    saved,
    ...(listing.geo ? { geo: { lat: listing.geo.lat, lng: listing.geo.lng } } : {}),
  }
}
