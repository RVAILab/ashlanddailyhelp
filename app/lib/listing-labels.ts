import type { FeedListing } from '../../contract/steward/feed.ts'
import { type Lang, locales, messagesFor } from '../i18n/index.ts'

export interface ListingLabel {
  kind: 'warning' | 'caution' | 'time' | 'source'
  text: string
}

const formatter = (lang: Lang, options: Intl.DateTimeFormatOptions, timeZone = 'America/Los_Angeles') =>
  new Intl.DateTimeFormat(locales[lang], { timeZone, ...options })
const plain = (text: string) => text.replace(/\s/g, ' ')

// Worked out on the server, so the words and dates on a card are the same in the page and after hydration.
export function listingLabels(listing: FeedListing, lang: Lang): ListingLabel[] {
  const t = messagesFor(lang).labels
  const endTime = formatter(lang, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  const day = (date: Date, timeZone?: string) =>
    plain(formatter(lang, { month: 'short', day: 'numeric' }, timeZone).format(date))
  const labels: ListingLabel[] = []
  if (listing.conflict) labels.push({ kind: 'warning', text: t.conflict })
  if (listing.mayBeCanceled) labels.push({ kind: 'warning', text: listing.mayBeCanceled })
  if (listing.unconfirmed) labels.push({ kind: 'caution', text: t.unconfirmed })
  if (listing.tags.includes('FICTIONAL_DEMONSTRATION')) labels.push({ kind: 'caution', text: t.fictional })
  if (listing.endsAt) labels.push({ kind: 'time', text: t.ends(plain(endTime.format(new Date(listing.endsAt)))) })
  labels.push({
    kind: 'source',
    text: listing.provenanceLabel ?? t.sourceReviewed(day(new Date(`${listing.reviewedDate}T00:00:00Z`), 'UTC')),
  })
  if (listing.lastConfirmed)
    labels.push({ kind: 'source', text: t.lastConfirmed(day(new Date(listing.lastConfirmed))) })
  return labels
}
