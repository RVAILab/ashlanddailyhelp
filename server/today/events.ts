import type { FeedEvent } from '../feed/contract.ts'

const pacificDate = (at: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(at)
const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)

export interface EventGroups {
  today: FeedEvent[]
  finished: FeedEvent[]
  tomorrow: FeedEvent[]
  thisWeek: FeedEvent[]
}

// Today's events (finished ones apart), tomorrow's, and the rest of the next seven days, by Pacific date.
export function groupEvents(list: FeedEvent[], now: Date): EventGroups {
  const today = pacificDate(now)
  const tomorrow = addDays(today, 1)
  const weekEnd = addDays(today, 7)
  const groups: EventGroups = { today: [], finished: [], tomorrow: [], thisWeek: [] }
  for (const event of list) {
    if (event.date === today) {
      const over = event.endsAt ? new Date(event.endsAt) <= now : false
      groups[over ? 'finished' : 'today'].push(event)
    } else if (event.date === tomorrow) groups.tomorrow.push(event)
    else if (event.date > tomorrow && event.date < weekEnd) groups.thisWeek.push(event)
  }
  return groups
}
