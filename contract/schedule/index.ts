// Schedule model and occurrence generation. Pure: no clock, no I/O.
// Holds every pattern in the county packet (fixtures/jackson-county-packet/README.md).
// Visit limits ("every other week", "once per week across ACCESS pantries") are barriers, not schedule.
import { z } from 'zod'
import { TIME_ZONE } from '../feed/week.ts'

const Day = z.iso.date()
const Time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'time is HH:MM, 24-hour')

// Index matches Date#getUTCDay().
export const Weekday = z.enum(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'])
export const Condition = z.enum(['weather_permitting', 'rsvp', 'appointment_only', 'referral'])
const WeekOfMonth = z.union([z.int().min(1).max(5), z.literal('last')])

export const ScheduleRule = z
  .strictObject({
    days: z.array(Weekday).min(1),
    weeks: z.union([z.literal('every'), z.array(WeekOfMonth).min(1)]).default('every'),
    start: Time,
    end: Time.optional(), // earlier than start means it ends the next morning
    location: z.string().min(1).optional(),
    stops: z.array(z.strictObject({ name: z.string().min(1), time: Time })).min(1).optional(),
  })
  .refine(r => !r.stops || r.stops[0]!.time === r.start, 'a route starts at its first stop')

export const Schedule = z
  .strictObject({
    textAsPrinted: z.string().min(1), // kept for provenance
    rules: z.array(ScheduleRule).default([]),
    include: z
      .array(z.strictObject({ date: Day, start: Time.optional(), end: Time.optional(), location: z.string().min(1).optional() }))
      .default([]),
    exclude: z.array(Day).default([]),
    conditions: z.array(Condition).default([]),
    countOnly: z.string().min(1).optional(), // "two Mondays and one Sunday each month": no predictable dates
  })
  .refine(s => !s.countOnly || (s.rules.length === 0 && s.include.length === 0), 'a count-only schedule holds no rules or listed dates')

export type Schedule = z.output<typeof Schedule>
export type ScheduleInput = z.input<typeof Schedule>
export type ScheduleRule = z.output<typeof ScheduleRule>

export const parseSchedule = (input: ScheduleInput): Schedule => Schedule.parse(input)

export interface Occurrence {
  date: string // local YYYY-MM-DD the occurrence starts on
  start?: string // local HH:MM; absent when only the date is printed
  end?: string
  endDate?: string // the next day for overnight windows
  startsAt?: string // ISO 8601 with the local offset
  endsAt?: string
  location?: string
  stop?: { index: number; name: string } // 1-based, for routes
}

export const HORIZON_DAYS = 56

export const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
const dow = (day: string) => new Date(`${day}T00:00:00Z`).getUTCDay()

function weekMatches(day: string, weeks: ScheduleRule['weeks']): boolean {
  if (weeks === 'every') return true
  const [y, m, d] = day.split('-').map(Number) as [number, number, number]
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return weeks.some(w => (w === 'last' ? d + 7 > daysInMonth : Math.ceil(d / 7) === w))
}

// Minutes the zone is ahead of UTC at the instant `utcMs`.
function offsetAt(utcMs: number, timeZone: string): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })
      .formatToParts(new Date(utcMs))
      .map(x => [x.type, Number(x.value)]),
  ) as Record<'year' | 'month' | 'day' | 'hour' | 'minute', number>
  return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(utcMs / 60_000) * 60_000) / 60_000
}

// shortcut: a wall time that falls in the spring-forward gap gets an offset that does not exist; no packet service runs at 2 am.
export function zonedIso(day: string, time: string, timeZone: string): string {
  const wall = Date.parse(`${day}T${time}:00Z`)
  const off = offsetAt(wall - offsetAt(wall, timeZone) * 60_000, timeZone) // second pass settles DST edges; ambiguous times take the earlier
  const a = Math.abs(off)
  return `${day}T${time}:00${off < 0 ? '-' : '+'}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`
}

function occurrence(date: string, start: string | undefined, end: string | undefined, location: string | undefined, timeZone: string): Occurrence {
  const o: Occurrence = { date }
  if (location) o.location = location
  if (!start) return o
  o.start = start
  o.startsAt = zonedIso(date, start, timeZone)
  if (end) {
    o.end = end
    o.endDate = end <= start ? addDays(date, 1) : date
    o.endsAt = zonedIso(o.endDate, end, timeZone)
  }
  return o
}

// Local dates from `fromDate` through `untilDate` inclusive (default: 8 weeks). Count-only schedules yield none.
export function generateOccurrences(schedule: Schedule, fromDate: string, untilDate = addDays(fromDate, HORIZON_DAYS - 1), timeZone = TIME_ZONE): Occurrence[] {
  if (schedule.countOnly) return []
  const out: Occurrence[] = []
  for (let day = fromDate; day <= untilDate; day = addDays(day, 1)) {
    if (schedule.exclude.includes(day)) continue
    // A listed date replaces the weekly hours that day ("Thanksgiving: 10 to 12 instead of 1 to 3").
    const listed = schedule.include.filter(inc => inc.date === day)
    if (listed.length) {
      for (const inc of listed) out.push(occurrence(day, inc.start, inc.end, inc.location, timeZone))
      continue
    }
    const weekday = Weekday.options[dow(day)]!
    for (const r of schedule.rules) {
      if (!r.days.includes(weekday) || !weekMatches(day, r.weeks)) continue
      if (r.stops) r.stops.forEach((s, i) => out.push({ ...occurrence(day, s.time, undefined, s.name, timeZone), stop: { index: i + 1, name: s.name } }))
      else out.push(occurrence(day, r.start, r.end, r.location, timeZone))
    }
  }
  const seen = new Set<string>()
  return out
    .filter(o => {
      const key = `${o.date}|${o.start}|${o.location}|${o.stop?.index}`
      return !seen.has(key) && seen.add(key)
    })
    .sort((a, b) => a.date.localeCompare(b.date) || (a.start ?? '').localeCompare(b.start ?? '') || (a.stop?.index ?? 0) - (b.stop?.index ?? 0))
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number) as [number, number]
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`
}

// "Tue, Oct 27 · 4:00 pm", or "Thu, Oct 22" when no time is printed.
export function formatOccurrence(o: Occurrence): string {
  const [, m, d] = o.date.split('-').map(Number) as [number, number, number]
  const date = `${WEEKDAY_NAMES[dow(o.date)]}, ${MONTH_NAMES[m - 1]} ${d}`
  return o.start ? `${date} · ${formatTime(o.start)}` : date
}

// The next few times in plain language. Routes show their first stop only.
export function nextTimesText(schedule: Schedule, fromDate: string, count = 3, timeZone = TIME_ZONE): string {
  if (schedule.countOnly) return 'dates vary'
  const next = generateOccurrences(schedule, fromDate, undefined, timeZone).filter(o => !o.stop || o.stop.index === 1)
  return next.length ? next.slice(0, count).map(formatOccurrence).join('; ') : 'no dates in the next 8 weeks'
}
