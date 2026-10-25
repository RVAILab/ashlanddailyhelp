import type { FeedListing } from '../../contract/steward/feed.ts'
import { type Lang, locales, messagesFor } from '../i18n/index.ts'

export interface ListingLabel {
  kind: 'warning' | 'caution' | 'time' | 'source'
  text: string
  // Written by the steward in English, so a page in another language marks it as English for screen readers.
  fromFeed?: true
  // Machine-translated from the steward's English; pages say so and link to the English.
  translated?: true
}

// Spanish uses full day and month names, which read more easily than abbreviations.
const endOptions: Record<Lang, Intl.DateTimeFormatOptions> = {
  en: { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' },
  es: { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' },
}
const dayOptions: Record<Lang, Intl.DateTimeFormatOptions> = {
  en: { month: 'short', day: 'numeric' },
  es: { month: 'long', day: 'numeric' },
}

const plain = (text: string) => text.replace(/\s/g, ' ')

// Worked out on the server, so the words and dates on a card are the same in the page and after hydration.
export function listingLabels(
  listing: FeedListing,
  lang: Lang,
  translated = new Map<string, string>(),
): ListingLabel[] {
  const t = messagesFor(lang).labels
  const format = (date: Date, options: Intl.DateTimeFormatOptions, timeZone = 'America/Los_Angeles') =>
    plain(new Intl.DateTimeFormat(locales[lang], { timeZone, ...options }).format(date))
  const labels: ListingLabel[] = []
  if (listing.conflict) labels.push({ kind: 'warning', text: t.conflict })
  if (listing.mayBeCanceled) {
    const spanish = translated.get(listing.mayBeCanceled.trim())
    labels.push(
      spanish
        ? { kind: 'warning', text: spanish, translated: true }
        : { kind: 'warning', text: listing.mayBeCanceled, fromFeed: true },
    )
  }
  if (listing.unconfirmed) labels.push({ kind: 'caution', text: t.unconfirmed })
  if (listing.tags.includes('FICTIONAL_DEMONSTRATION')) labels.push({ kind: 'caution', text: t.fictional })
  if (listing.endsAt) labels.push({ kind: 'time', text: t.ends(format(new Date(listing.endsAt), endOptions[lang])) })
  if (listing.provenanceLabel) labels.push({ kind: 'source', text: listing.provenanceLabel, fromFeed: true })
  else
    labels.push({
      kind: 'source',
      text: t.sourceReviewed(format(new Date(`${listing.reviewedDate}T00:00:00Z`), dayOptions[lang], 'UTC')),
    })
  if (listing.lastConfirmed)
    labels.push({ kind: 'source', text: t.lastConfirmed(format(new Date(listing.lastConfirmed), dayOptions[lang])) })
  return labels
}
