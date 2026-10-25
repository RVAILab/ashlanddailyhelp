import type { FeedListing } from '../../contract/steward/feed.ts'
import type { Messages } from '../i18n/en.ts'
import { type Lang, locales, messagesFor } from '../i18n/index.ts'
import { areaName } from './areas.ts'
import { type ListingLabel, listingLabels } from './listing-labels.ts'

// The steward's wording for a provider whose location must not be published (FEED.md, listings), matched loosely.
const SENSITIVE_ADDRESS = 'location not published. call the provider.'
// The steward's own way of saying a field is unknown; shown as "Not confirmed", per the content rules.
const UNKNOWN = ['', 'unknown']

export type DetailKey = keyof Messages['detail']['fields']

export interface DetailField {
  key: DetailKey
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
  description: { text: string; fromFeed: boolean }
  phone: string | null
  labels: ListingLabel[]
  reviewed: string | null
  fields: DetailField[]
  location: { published: true; mapUrl: string | null } | { published: false }
  sources: Array<{ url: string; name: string }>
  provenance: Array<{ field: string; fromFeed: boolean; entries: ProvenanceEntry[] }>
}

const ORDER = [
  'categories',
  'schedule',
  'address',
  'access',
  'requirements',
  'cost',
  'accessibility',
  'capacity',
  'area',
  'coverage',
] as const satisfies readonly DetailKey[]

const normalize = (text: string) => text.trim().replace(/\s+/g, ' ').toLowerCase()
const isWebUrl = (value: string) => /^https?:\/\//i.test(value) && URL.canParse(value)
const siteName = (url: string) => new URL(url).hostname.replace(/^www\./, '')
const pageName = (url: string) => {
  const { pathname } = new URL(url)
  return `${siteName(url)}${pathname === '/' ? '' : pathname.replace(/\/$/, '')}`
}
// A map search helps only for a street address: a number followed by a street name, from wherever it starts.
const streetAddress = (address: string) => address.match(/\b\d+\s+[A-Za-z][\s\S]*$/)?.[0] ?? null

export function listingDetail(listing: FeedListing, lang: Lang): ListingDetail {
  const t = messagesFor(lang)
  const day = (iso: string, timeZone = 'America/Los_Angeles') =>
    new Intl.DateTimeFormat(locales[lang], { timeZone, month: lang === 'es' ? 'long' : 'short', day: 'numeric' })
      .format(new Date(iso))
      .replace(/\s/g, ' ')
  const sensitive = normalize(listing.address) === SENSITIVE_ADDRESS
  const feedText = (text: string) =>
    UNKNOWN.includes(normalize(text))
      ? { text: t.detail.notConfirmed, fromFeed: false }
      : { text: text.trim(), fromFeed: true }
  const value = (key: (typeof ORDER)[number]): { text: string; fromFeed: boolean } => {
    if (key === 'categories')
      return { text: listing.categories.map(id => t.categories[id]).join(', '), fromFeed: false }
    if (key === 'area') return { text: areaName(listing.area, t), fromFeed: false }
    if (key === 'coverage')
      return listing.coverage.length
        ? { text: listing.coverage.map(place => areaName(place, t)).join(', '), fromFeed: false }
        : { text: t.detail.notConfirmed, fromFeed: false }
    if (key === 'address' && sensitive) return { text: t.detail.locationNotPublished, fromFeed: false }
    return feedText(listing[key])
  }
  const fields = ORDER.map(key => ({ key, label: t.detail.fields[key], ...value(key) }))

  const street = sensitive ? null : streetAddress(listing.address)
  const mapUrl = street ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(street)}` : null
  const sources = [listing.source, ...(listing.sourceUrls ?? [])]
    .filter((url, index, all) => isWebUrl(url) && all.indexOf(url) === index)
    .map(url => ({ url, name: pageName(url) }))

  const known = Object.keys(t.detail.fields) as DetailKey[]
  const rank = (field: string) => {
    const at = (ORDER as readonly string[]).indexOf(field)
    return at === -1 ? ORDER.length + known.indexOf(field as DetailKey) : at
  }
  const provenance = Object.entries(listing.provenance ?? {})
    .filter(([field, entries]) => entries.length > 0 && !(sensitive && field === 'address'))
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([field, entries]) => ({
      field: known.includes(field as DetailKey) ? t.detail.fields[field as DetailKey] : field,
      fromFeed: !known.includes(field as DetailKey),
      entries: entries.map(entry => ({
        source: t.detail.sourceTypes[entry.sourceType],
        url: isWebUrl(entry.sourceRef) ? entry.sourceRef : null,
        ref: isWebUrl(entry.sourceRef) ? siteName(entry.sourceRef) : entry.sourceRef,
        quote: entry.span,
        seen: t.detail.seen(day(entry.observedAt)),
      })),
    }))

  return {
    id: listing.id,
    name: listing.name,
    provider: listing.provider,
    description: feedText(listing.description),
    phone: listing.phone,
    labels: listingLabels(listing, lang),
    // The labels already give the review date unless a provenance label takes its place.
    reviewed: listing.provenanceLabel ? t.detail.reviewed(day(`${listing.reviewedDate}T00:00:00Z`, 'UTC')) : null,
    fields,
    location: sensitive ? { published: false } : { published: true, mapUrl },
    sources,
    provenance,
  }
}
