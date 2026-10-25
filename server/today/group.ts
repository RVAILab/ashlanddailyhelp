import type { Opening, StoredListing } from '../feed/contract.ts'

export interface TodayEntry {
  listing: StoredListing
  window?: Opening
  canceled?: string
}

export interface TodayGroups {
  openNow: TodayEntry[]
  later: TodayEntry[]
  closed: TodayEntry[]
  notConfirmed: TodayEntry[]
  nextChange: Date | null
}

const pacificDate = (at: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(at)
const at = (iso: string) => new Date(iso)

// Which of today's groups each listing belongs in, worked out in Pacific time from its opening windows. A listing is
// never "open" without windows, when its schedule needs checking or may be canceled, or when today's window is canceled.
export function groupToday(listings: StoredListing[], now: Date): TodayGroups {
  const today = pacificDate(now)
  const groups: TodayGroups = { openNow: [], later: [], closed: [], notConfirmed: [], nextChange: null }
  const changes: number[] = []
  for (const listing of listings) {
    const openings = listing.openings ?? []
    if (openings.length === 0 || listing.conflict || listing.mayBeCanceled) {
      groups.notConfirmed.push({ listing })
      continue
    }
    const todays = openings.filter(
      window =>
        pacificDate(at(window.startsAt)) === today ||
        (at(window.startsAt) <= now && window.endsAt !== undefined && at(window.endsAt) > now),
    )
    for (const window of todays) {
      if (at(window.startsAt) > now) changes.push(at(window.startsAt).getTime())
      if (window.endsAt && at(window.endsAt) > now) changes.push(at(window.endsAt).getTime())
    }
    const usable = todays.filter(window => window.status !== 'canceled')
    const open = usable.find(window => at(window.startsAt) <= now && window.endsAt && at(window.endsAt) > now)
    const next = usable
      .filter(window => at(window.startsAt) > now)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
    const startedWithoutEnd = usable.some(window => at(window.startsAt) <= now && !window.endsAt)
    if (open) groups.openNow.push({ listing, window: open })
    else if (next) groups.later.push({ listing, window: next })
    else if (startedWithoutEnd) groups.notConfirmed.push({ listing })
    else {
      const canceled = todays.find(window => window.status === 'canceled')
      groups.closed.push(canceled ? { listing, canceled: canceled.note ?? '' } : { listing })
    }
  }
  const time = (entry: TodayEntry, key: 'startsAt' | 'endsAt') => at(entry.window?.[key] ?? '').getTime()
  groups.openNow.sort((a, b) => time(a, 'endsAt') - time(b, 'endsAt'))
  groups.later.sort((a, b) => time(a, 'startsAt') - time(b, 'startsAt'))
  groups.nextChange = changes.length ? new Date(Math.min(...changes)) : null
  return groups
}
