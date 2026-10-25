import type { FeedEvent, Opening, StoredListing } from '../feed/contract.ts'

export type NextKind = 'meal' | 'sleep'

export interface NextPlace {
  source: 'listing' | 'event'
  id: string
  name: string
  provider: string
  where: string
  phone: string | null
  listingId: string | null
  startsAt: string
  endsAt: string | null
  openNow: boolean
}

const STAY_OPEN = 30 * 60 * 1000
const AHEAD = 7 * 24 * 60 * 60 * 1000
const time = (iso: string) => Date.parse(iso)
const pacific = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso))
const part = (parts: Intl.DateTimeFormatPart[], type: string) => parts.find(p => p.type === type)?.value ?? ''

// The steward doesn't yet say which housing listings are places to sleep, so a window counts only if it runs
// overnight: past 10 PM Pacific, or into another day. A housing-help office's daytime hours never do.
function overnight(startsAt: string, endsAt: string | null) {
  if (!endsAt) return false
  const start = pacific(startsAt)
  const end = pacific(endsAt)
  const day = (parts: Intl.DateTimeFormatPart[]) => `${part(parts, 'year')}${part(parts, 'month')}${part(parts, 'day')}`
  return day(end) > day(start) || Number(part(end, 'hour')) >= 22
}

const category = { meal: 'food', sleep: 'housing' } as const

function fromListing(listing: StoredListing, window: Opening, now: number): NextPlace {
  return {
    source: 'listing',
    id: listing.id,
    name: listing.name,
    provider: listing.provider,
    where: window.location ?? listing.address,
    phone: listing.phone,
    listingId: listing.id,
    startsAt: window.startsAt,
    endsAt: window.endsAt ?? null,
    openNow: time(window.startsAt) <= now,
  }
}

function fromEvent(event: FeedEvent & { startsAt: string }, now: number): NextPlace {
  return {
    source: 'event',
    id: event.id,
    name: event.title,
    provider: event.provider,
    where: event.address,
    phone: event.phone ?? null,
    listingId: event.listingId ?? null,
    startsAt: event.startsAt,
    endsAt: event.endsAt ?? null,
    openNow: time(event.startsAt) <= now,
  }
}

// The next meal or place to sleep in the coming week: somewhere open now for at least half an hour more (open longest
// first), else the soonest start, else somewhere open now but closing soon. A listing whose schedule needs checking or
// may be canceled, a canceled or doubtful window or event, and anything an alert closes (`closedUntil`, by listing or
// event id) before the alert ends, is never picked.
export function nextPlace(
  listings: StoredListing[],
  events: FeedEvent[],
  now: Date,
  kind: NextKind,
  closedUntil: Readonly<Record<string, string>>,
): NextPlace | null {
  const nowMs = now.getTime()
  const wanted = (categories: readonly string[]) => categories.includes(category[kind])
  const doubtful = new Set(listings.filter(listing => listing.conflict || listing.mayBeCanceled).map(({ id }) => id))
  const closed = (id: string | undefined, startsAt: string) => {
    const until = id ? closedUntil[id] : undefined
    return until !== undefined && time(startsAt) < time(until)
  }
  const candidates = [
    ...listings
      .filter(listing => wanted(listing.categories) && !doubtful.has(listing.id))
      .flatMap(listing =>
        (listing.openings ?? [])
          .filter(window => !window.status && !closed(listing.id, window.startsAt))
          .map(window => fromListing(listing, window, nowMs)),
      ),
    ...events
      .filter(
        (event): event is FeedEvent & { startsAt: string } =>
          event.startsAt !== undefined &&
          wanted(event.categories) &&
          !event.status &&
          !event.conflict &&
          !(event.listingId && doubtful.has(event.listingId)) &&
          !closed(event.id, event.startsAt) &&
          !closed(event.listingId, event.startsAt),
      )
      .map(event => fromEvent(event, nowMs)),
  ].filter(
    place =>
      (place.endsAt ? time(place.endsAt) > nowMs : time(place.startsAt) > nowMs) &&
      time(place.startsAt) <= nowMs + AHEAD &&
      (kind === 'meal' || overnight(place.startsAt, place.endsAt)),
  )
  const end = (place: NextPlace) => (place.endsAt ? time(place.endsAt) : Number.POSITIVE_INFINITY)
  const open = candidates.filter(place => place.openNow).sort((a, b) => end(b) - end(a))
  const staying = open.find(place => end(place) - nowMs >= STAY_OPEN)
  const later = candidates.filter(place => !place.openNow).sort((a, b) => time(a.startsAt) - time(b.startsAt))
  return staying ?? later[0] ?? open[0] ?? null
}
