import { asc, gt } from 'drizzle-orm'
import { events } from '../../db/schema.ts'
import type { Database } from '../db.ts'
import { EventsFile, type FeedEvent } from './contract.ts'
import type { FeedFileSpec } from './ingest.ts'

// The end of a local date in Pacific time: the next day's midnight there, whichever offset applies.
export function endOfPacificDay(date: string): Date {
  const noonUtc = new Date(`${date}T12:00:00Z`)
  const offset = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', timeZoneName: 'longOffset' })
    .formatToParts(noonUtc)
    .find(part => part.type === 'timeZoneName')
    ?.value.replace('GMT', '')
  const next = new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)
  return new Date(`${next}T00:00:00${offset || '-08:00'}`)
}

const lastsUntil = (event: FeedEvent) => (event.endsAt ? new Date(event.endsAt) : endOfPacificDay(event.date))

export const eventsFile: FeedFileSpec<EventsFile> = {
  name: 'events.json',
  schema: EventsFile,
  optional: true,
  clear: async tx => {
    await tx.delete(events)
  },
  store: async (tx, file) => {
    await tx.delete(events)
    if (file.events.length === 0) return
    await tx
      .insert(events)
      .values(file.events.map((data, position) => ({ id: data.id, position, lastsUntil: lastsUntil(data), data })))
  },
}

const pacificDate = (at: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(at)
const previousDay = (date: string) => new Date(Date.parse(`${date}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10)

// Events from the start of today on, including ones that finished earlier today (the page folds those away).
export async function upcomingEvents(db: Database, now: Date): Promise<FeedEvent[]> {
  const startOfToday = endOfPacificDay(previousDay(pacificDate(now)))
  const rows = await db
    .select({ data: events.data })
    .from(events)
    .where(gt(events.lastsUntil, startOfToday))
    .orderBy(asc(events.position))
  return rows
    .map(row => row.data)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        Date.parse(a.startsAt ?? a.date) - Date.parse(b.startsAt ?? b.date) ||
        a.id.localeCompare(b.id),
    )
}
