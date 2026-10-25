import type { FeedListing } from '../../contract/steward/feed.ts'

export interface ListingLabel {
  kind: 'warning' | 'caution' | 'time' | 'source'
  text: string
}

const pacific = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', ...options })
const endTime = pacific({ weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const pacificDay = pacific({ month: 'short', day: 'numeric' })
const calendarDay = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' })
const plain = (text: string) => text.replace(/\s/g, ' ')

// Worked out on the server, so the words and dates on a card are the same in the page and after hydration.
export function listingLabels(listing: FeedListing): ListingLabel[] {
  const labels: ListingLabel[] = []
  if (listing.conflict) labels.push({ kind: 'warning', text: 'Schedule needs checking' })
  if (listing.mayBeCanceled) labels.push({ kind: 'warning', text: listing.mayBeCanceled })
  if (listing.unconfirmed) labels.push({ kind: 'caution', text: 'Not yet confirmed by provider' })
  if (listing.tags.includes('FICTIONAL_DEMONSTRATION')) labels.push({ kind: 'caution', text: 'Fictional example' })
  if (listing.endsAt) labels.push({ kind: 'time', text: `Ends ${plain(endTime.format(new Date(listing.endsAt)))}` })
  labels.push({
    kind: 'source',
    text:
      listing.provenanceLabel ??
      `Source reviewed · ${calendarDay.format(new Date(`${listing.reviewedDate}T00:00:00Z`))}`,
  })
  if (listing.lastConfirmed)
    labels.push({ kind: 'source', text: `Last confirmed ${pacificDay.format(new Date(listing.lastConfirmed))}` })
  return labels
}
