import type { Opening, StoredListing } from '../feed/contract.ts'

export interface TodayEntry {
  listing: StoredListing
  // The window that decides the group: the open one, or the next one today.
  window?: Opening
  // All of today's windows, in time order.
  today: Opening[]
  canceled?: string
  mayBeCanceled?: string
}

export interface TodayGroups {
  openNow: TodayEntry[]
  later: TodayEntry[]
  closed: TodayEntry[]
  notConfirmed: TodayEntry[]
  nextChange: Date | null
}

const pacificDate = (at: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(at)
const time = (iso: string) => Date.parse(iso)

// Which of today's groups each listing belongs in, worked out in Pacific time from its opening windows. A listing is
// never "open" without windows, when its schedule needs checking or may be canceled, when today's window may be or is
// canceled, or when its windows don't reach today (a stale copy says nothing about today).
export function groupToday(listings: StoredListing[], now: Date): TodayGroups {
  const today = pacificDate(now)
  const groups: TodayGroups = { openNow: [], later: [], closed: [], notConfirmed: [], nextChange: null }
  const changes: number[] = []
  const nowMs = now.getTime()
  for (const listing of listings) {
    const openings = [...(listing.openings ?? [])].sort((a, b) => time(a.startsAt) - time(b.startsAt))
    const coversToday = openings.some(
      window =>
        pacificDate(new Date(window.startsAt)) >= today || (window.endsAt !== undefined && time(window.endsAt) > nowMs),
    )
    if (openings.length === 0 || !coversToday || listing.conflict || listing.mayBeCanceled) {
      groups.notConfirmed.push({ listing, today: [] })
      continue
    }
    const todays = openings.filter(
      window =>
        pacificDate(new Date(window.startsAt)) === today ||
        (time(window.startsAt) <= nowMs && window.endsAt !== undefined && time(window.endsAt) > nowMs),
    )
    for (const window of todays) {
      if (time(window.startsAt) > nowMs) changes.push(time(window.startsAt))
      if (window.endsAt && time(window.endsAt) > nowMs) changes.push(time(window.endsAt))
    }
    const doubtful = todays.find(
      window => window.status === 'may_be_canceled' && (!window.endsAt || time(window.endsAt) > nowMs),
    )
    if (doubtful) {
      groups.notConfirmed.push({ listing, today: todays, mayBeCanceled: doubtful.note ?? '' })
      continue
    }
    const usable = todays.filter(window => window.status !== 'canceled')
    const open = usable.find(window => time(window.startsAt) <= nowMs && window.endsAt && time(window.endsAt) > nowMs)
    const next = usable.find(window => time(window.startsAt) > nowMs)
    const startedWithoutEnd = usable.some(window => time(window.startsAt) <= nowMs && !window.endsAt)
    if (open) groups.openNow.push({ listing, window: open, today: todays })
    else if (next) groups.later.push({ listing, window: next, today: todays })
    else if (startedWithoutEnd) groups.notConfirmed.push({ listing, today: todays })
    else {
      const canceled = todays.find(window => window.status === 'canceled')
      groups.closed.push(
        canceled ? { listing, today: todays, canceled: canceled.note ?? '' } : { listing, today: todays },
      )
    }
  }
  const at = (entry: TodayEntry, key: 'startsAt' | 'endsAt') => time(entry.window?.[key] ?? '')
  groups.openNow.sort((a, b) => at(a, 'endsAt') - at(b, 'endsAt'))
  groups.later.sort((a, b) => at(a, 'startsAt') - at(b, 'startsAt'))
  groups.nextChange = changes.length ? new Date(Math.min(...changes)) : null
  return groups
}
