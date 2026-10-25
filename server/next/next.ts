import type { FeedEvent, Opening } from '../feed/contract.ts'
import type { TodayEntry, TodayGroups } from '../today/group.ts'

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

// Every usable window today, not only the one that decides the listing's group on /today.
function fromListing(entry: TodayEntry, now: number): NextPlace[] {
  return entry.today
    .filter(window => window.status !== 'canceled')
    .map((window: Opening) => ({
      source: 'listing' as const,
      id: entry.listing.id,
      name: entry.listing.name,
      provider: entry.listing.provider,
      where: window.location ?? entry.listing.address,
      phone: entry.listing.phone,
      listingId: entry.listing.id,
      startsAt: window.startsAt,
      endsAt: window.endsAt ?? null,
      openNow: time(window.startsAt) <= now,
    }))
}

function fromEvent(event: FeedEvent, now: number): NextPlace | null {
  if (!event.startsAt) return null
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

// The next meal or place to sleep: somewhere open now for at least half an hour more (open longest first), else the
// soonest start later today, else somewhere open now but closing soon. Doubtful or closed places are never picked;
// `closed` holds the events and listings that in-effect alerts close.
export function nextPlace(
  groups: TodayGroups,
  events: FeedEvent[],
  now: Date,
  kind: NextKind,
  closed: ReadonlySet<string>,
): NextPlace | null {
  const nowMs = now.getTime()
  const wanted = (categories: readonly string[]) => categories.includes(category[kind])
  const candidates = [
    ...[...groups.openNow, ...groups.later]
      .filter(entry => wanted(entry.listing.categories))
      .flatMap(entry => fromListing(entry, nowMs)),
    ...events
      .filter(
        event =>
          wanted(event.categories) &&
          !event.status &&
          !event.conflict &&
          !closed.has(event.id) &&
          !(event.listingId && closed.has(event.listingId)),
      )
      .map(event => fromEvent(event, nowMs)),
  ].filter(
    (place): place is NextPlace =>
      place !== null &&
      (place.endsAt ? time(place.endsAt) > nowMs : time(place.startsAt) > nowMs) &&
      (kind === 'meal' || overnight(place.startsAt, place.endsAt)),
  )
  const end = (place: NextPlace) => (place.endsAt ? time(place.endsAt) : Number.POSITIVE_INFINITY)
  const open = candidates.filter(place => place.openNow).sort((a, b) => end(b) - end(a))
  const staying = open.find(place => end(place) - nowMs >= STAY_OPEN)
  const later = candidates.filter(place => !place.openNow).sort((a, b) => time(a.startsAt) - time(b.startsAt))
  return staying ?? later[0] ?? open[0] ?? null
}
