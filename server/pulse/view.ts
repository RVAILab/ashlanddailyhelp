import type { PulseEvent, PulseReport } from '../../contract/steward/feed.ts'

export interface PulseData {
  week: { start: string; end: string; dates: string[] }
  events: PulseEvent[]
  reports: PulseReport[]
}

export type Unit = PulseEvent['unit']
export type DayStatus = 'reported' | 'partial' | 'not_recorded' | 'canceled' | 'awaiting' | 'none'

// How a held-back amount is shown: "fewer than 10", "at least N" (the part that is certain), or only that small
// figures are held back.
export type Held = { kind: 'fewer' } | { kind: 'atLeast'; atLeast: number } | { kind: 'small' }

export interface PulseDay {
  date: string
  scheduled: number
  reported: number
  // The exact amount, or null when unknown or held back. Never 0 for unknown.
  amount: number | null
  held: Held | null
  status: DayStatus
}

export interface PulseUnit {
  unit: Unit
  scheduled: number
  measured: number
  // The exact total, or null when unknown or held back; then atLeast is the certain part, if any.
  total: number | null
  atLeast: number | null
  // Every amount in the unit is a small figure, so nothing about it is shown.
  smallOnly: boolean
  // Whether the counted and estimated parts can be shown without isolating a small figure.
  split: boolean
  counted: number
  estimated: number
  days: PulseDay[]
  scaleMax: number
}

export interface PulseWeek {
  units: PulseUnit[]
  unmet: Array<{ reason: PulseReport['reasons'][number]; events: number }>
  providers: { reported: number; scheduled: number }
}

const UNITS: Unit[] = ['meals', 'sessions', 'encounters']
// Steward decision 14: a provider's daily figure under 10 is never shown. It must not be worked out by subtraction
// either, so a day or a week that includes one shows only the part made of larger figures, never its exact sum.
const SMALL = 10

const hasAmount = (report: PulseReport): report is PulseReport & { value: number } =>
  report.value !== null && (report.outcome === 'completed' || report.outcome === 'partial')

// The smallest of 1, 2 or 5 times a power of ten at or above the largest amount, so bars share a scale from zero.
export function niceMax(largest: number): number {
  if (largest <= 0) return 10
  const power = 10 ** Math.floor(Math.log10(largest))
  return ([1, 2, 5, 10].map(step => step * power).find(step => step >= largest) ?? 10 * power) || 10
}

// The legacy core.js aggregateReports and reportSeries, with the small-number rule, as one week's view.
export function pulseWeek({ week, events, reports }: PulseData): PulseWeek {
  const byEvent = new Map(reports.map(report => [report.eventId, report]))
  const units = UNITS.flatMap((unit): PulseUnit[] => {
    const scheduled = events.filter(event => event.unit === unit)
    if (scheduled.length === 0) return []
    const measured = scheduled.flatMap(event => {
      const report = byEvent.get(event.id)
      return report && hasAmount(report) ? [{ event, report }] : []
    })
    const sum = (method?: PulseReport['method']) =>
      measured
        .filter(({ report }) => !method || report.method === method)
        .reduce((total, { report }) => total + report.value, 0)
    // Each provider's figure for each day, the unit the small-number rule protects.
    const providerDays = new Map<string, { date: string; value: number }>()
    for (const { event, report } of measured) {
      const key = `${event.date}\u0000${event.provider}`
      providerDays.set(key, { date: event.date, value: (providerDays.get(key)?.value ?? 0) + report.value })
    }
    const figures = [...providerDays.values()]
    const large = (list: typeof figures) => list.filter(figure => figure.value >= SMALL)
    const total = (list: typeof figures) => list.reduce((sum, figure) => sum + figure.value, 0)
    const days = week.dates.map((date): PulseDay => {
      const that = scheduled.filter(event => event.date === date)
      const reported = that.flatMap(event => byEvent.get(event.id) ?? [])
      const withAmount = measured.filter(({ event }) => event.date === date)
      const today = figures.filter(figure => figure.date === date)
      const small = today.some(figure => figure.value < SMALL)
      const certain = total(large(today))
      const held: Held | null = !small
        ? null
        : total(today) < SMALL
          ? { kind: 'fewer' }
          : certain > 0
            ? { kind: 'atLeast', atLeast: certain }
            : { kind: 'small' }
      const status: DayStatus = !that.length
        ? 'none'
        : !reported.length
          ? 'awaiting'
          : reported.every(report => report.outcome === 'canceled')
            ? 'canceled'
            : !withAmount.length
              ? 'not_recorded'
              : withAmount.length < that.length
                ? 'partial'
                : 'reported'
      return {
        date,
        scheduled: that.length,
        reported: reported.length,
        amount: withAmount.length && !small ? total(today) : null,
        held,
        status,
      }
    })
    const anySmall = figures.some(figure => figure.value < SMALL)
    const certain = total(large(figures))
    return [
      {
        unit,
        scheduled: scheduled.length,
        measured: measured.length,
        total: measured.length && !anySmall ? sum() : null,
        atLeast: anySmall && certain > 0 ? certain : null,
        smallOnly: anySmall && certain === 0,
        split: measured.length > 0 && !anySmall,
        counted: anySmall ? 0 : sum('counted'),
        estimated: anySmall ? 0 : sum('estimated'),
        days,
        scaleMax: niceMax(
          Math.max(0, ...days.map(day => day.amount ?? (day.held?.kind === 'atLeast' ? day.held.atLeast : 0))),
        ),
      },
    ]
  })
  const unmet = new Map<PulseReport['reasons'][number], number>()
  for (const report of reports)
    if (report.unmet === 'observed')
      for (const reason of new Set(report.reasons)) unmet.set(reason, (unmet.get(reason) ?? 0) + 1)
  const known = new Map(events.map(event => [event.id, event.provider]))
  return {
    units,
    unmet: [...unmet].map(([reason, count]) => ({ reason, events: count })).sort((a, b) => b.events - a.events),
    providers: {
      reported: new Set(reports.flatMap(report => known.get(report.eventId) ?? [])).size,
      scheduled: new Set(events.map(event => event.provider)).size,
    },
  }
}

// Events whose provider's figure for that day is under 10: an export with a row per event must hold them back too.
export function heldEvents({ events, reports }: PulseData): Set<string> {
  const byEvent = new Map(reports.map(report => [report.eventId, report]))
  const figures = new Map<string, number>()
  const key = (event: PulseEvent) => `${event.unit}\u0000${event.date}\u0000${event.provider}`
  for (const event of events) {
    const report = byEvent.get(event.id)
    if (report && hasAmount(report)) figures.set(key(event), (figures.get(key(event)) ?? 0) + report.value)
  }
  return new Set(
    events.filter(event => (figures.get(key(event)) ?? Number.POSITIVE_INFINITY) < SMALL).map(event => event.id),
  )
}
