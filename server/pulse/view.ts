import type { PulseEvent, PulseReport } from '../../contract/steward/feed.ts'

export interface PulseData {
  week: { start: string; end: string; dates: string[] }
  events: PulseEvent[]
  reports: PulseReport[]
}

export type Unit = PulseEvent['unit']
export type DayStatus = 'reported' | 'partial' | 'not_recorded' | 'canceled' | 'awaiting' | 'none'

export interface PulseDay {
  date: string
  scheduled: number
  reported: number
  // The known amount, or null when unknown or held back as fewer than 10. Never 0 for unknown.
  amount: number | null
  fewerThanTen: boolean
  status: DayStatus
}

export interface PulseUnit {
  unit: Unit
  scheduled: number
  measured: number
  total: number | null
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
// Steward decision 14: a single provider's daily figure under 10 is shown as "fewer than 10".
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
    const days = week.dates.map((date): PulseDay => {
      const that = scheduled.filter(event => event.date === date)
      const reported = that.flatMap(event => byEvent.get(event.id) ?? [])
      const withAmount = measured.filter(({ event }) => event.date === date)
      const amount = withAmount.length ? withAmount.reduce((total, { report }) => total + report.value, 0) : null
      const fewerThanTen =
        amount !== null && amount < SMALL && new Set(withAmount.map(({ event }) => event.provider)).size === 1
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
        amount: fewerThanTen ? null : amount,
        fewerThanTen,
        status,
      }
    })
    return [
      {
        unit,
        scheduled: scheduled.length,
        measured: measured.length,
        total: measured.length ? sum() : null,
        counted: sum('counted'),
        estimated: sum('estimated'),
        days,
        scaleMax: niceMax(Math.max(0, ...days.map(day => day.amount ?? 0))),
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
