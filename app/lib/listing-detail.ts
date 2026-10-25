import type { FeedListing } from '../../contract/steward/feed.ts'
import { type Lang, locales, messagesFor } from '../i18n/index.ts'
import { areaName } from './areas.ts'
import { type ListingLabel, listingLabels } from './listing-labels.ts'

// The steward's exact wording for a provider whose location must not be published.
export const SENSITIVE_ADDRESS = 'Location not published. Call the provider.'

export interface DetailField {
  key: string
  label: string
  text: string
  fromFeed: boolean
}

export interface ProvenanceEntry {
  source: string
  url: string | null
  ref: string
  quote: string | null
  seen: string
}

export interface ListingDetail {
  id: string
  name: string
  provider: string
  description: string
  phone: string | null
  labels: ListingLabel[]
  reviewed: string
  fields: DetailField[]
  location: { published: true; mapUrl: string | null } | { published: false }
  sources: Array<{ url: string; host: string }>
  provenance: Array<{ field: string; entries: ProvenanceEntry[] }>
}

const FEED_FIELDS = ['schedule', 'address', 'access', 'requirements', 'cost', 'accessibility', 'capacity'] as const

const host = (url: string) => new URL(url).hostname.replace(/^www\./, '')
const isUrl = (value: string) => URL.canParse(value) && /^https?:/.test(value)

export function listingDetail(listing: FeedListing, lang: Lang): ListingDetail {
  const t = messagesFor(lang)
  const day = (iso: string, timeZone = 'America/Los_Angeles') =>
    new Intl.DateTimeFormat(locales[lang], { timeZone, month: lang === 'es' ? 'long' : 'short', day: 'numeric' })
      .format(new Date(iso))
      .replace(/\s/g, ' ')
  const sensitive = listing.address.trim() === SENSITIVE_ADDRESS
  const feedField = (key: (typeof FEED_FIELDS)[number]): DetailField => {
    const label = t.detail.fields[key] ?? key
    if (key === 'address' && sensitive) return { key, label, text: t.detail.locationNotPublished, fromFeed: false }
    const text = listing[key].trim()
    return text ? { key, label, text, fromFeed: true } : { key, label, text: t.detail.notConfirmed, fromFeed: false }
  }
  const fields: DetailField[] = [
    {
      key: 'categories',
      label: t.detail.fields.categories ?? 'categories',
      text: listing.categories.map(category => t.categories[category]).join(', '),
      fromFeed: false,
    },
    ...FEED_FIELDS.map(feedField),
    { key: 'area', label: t.detail.fields.area ?? 'area', text: areaName(listing.area, t), fromFeed: false },
    {
      key: 'coverage',
      label: t.detail.fields.coverage ?? 'coverage',
      text: listing.coverage.length
        ? listing.coverage.map(place => areaName(place, t)).join(', ')
        : t.detail.notConfirmed,
      fromFeed: false,
    },
  ]
  // A map search only helps for a street address; a description of a place ("behind the church") is shown as text.
  const mapUrl = /\d/.test(listing.address)
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(listing.address)}`
    : null
  const sources = [listing.source, ...(listing.sourceUrls ?? [])]
    .filter((url, index, all) => isUrl(url) && all.indexOf(url) === index)
    .map(url => ({ url, host: host(url) }))
  const provenance = Object.entries(listing.provenance ?? {})
    .filter(([field]) => !(sensitive && field === 'address'))
    .map(([field, entries]) => ({
      field: t.detail.fields[field] ?? field,
      entries: entries.map(entry => ({
        source: t.detail.sourceTypes[entry.sourceType],
        url: isUrl(entry.sourceRef) ? entry.sourceRef : null,
        ref: isUrl(entry.sourceRef) ? host(entry.sourceRef) : entry.sourceRef,
        quote: entry.span,
        seen: t.detail.seen(day(entry.observedAt)),
      })),
    }))
  return {
    id: listing.id,
    name: listing.name,
    provider: listing.provider,
    description: listing.description,
    phone: listing.phone,
    labels: listingLabels(listing, lang),
    reviewed: t.detail.reviewed(day(`${listing.reviewedDate}T00:00:00Z`, 'UTC')),
    fields,
    location: sensitive ? { published: false } : { published: true, mapUrl },
    sources,
    provenance,
  }
}
