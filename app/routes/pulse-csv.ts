import { storedPulseWeek } from '../../server/feed/pulse.ts'
import { heldEvents } from '../../server/pulse/view.ts'
import { services } from '../context.ts'
import { weekParam } from '../lib/pulse-week.ts'
import type { Route } from './+types/pulse-csv'

const HEADER = [
  'dataset',
  'week_start',
  'revision',
  'date',
  'provider',
  'service',
  'unit',
  'outcome',
  'method',
  'value',
  'unmet',
  'reasons',
]

// Quoted when needed, and never read as a formula by a spreadsheet.
function cell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe
}

// One row per scheduled event. Every row names the dataset, so fictional numbers stay labelled wherever the file goes;
// an amount from a provider's daily figure under 10 is held back, as on the page.
export async function loader({ url, context }: Route.LoaderArgs) {
  const db = context.get(services).database()
  const week = db ? await storedPulseWeek(db, weekParam(url.searchParams)) : null
  if (!week) return new Response('No Pulse week here.', { status: 404 })
  const reports = new Map(week.data.reports.map(report => [report.eventId, report]))
  const held = heldEvents(week.data)
  const rows = week.data.events.map(event => {
    const report = reports.get(event.id)
    const value = report?.value ?? null
    return [
      week.dataset,
      week.weekStart,
      week.live ? 'live' : String(week.revision),
      event.date,
      event.provider,
      event.service,
      event.unit,
      report?.outcome ?? 'awaiting_report',
      report?.method ?? '',
      value === null ? '' : held.has(event.id) ? 'held back: a figure under 10' : String(value),
      report?.unmet ?? '',
      report?.reasons.join(' ') ?? '',
    ]
  })
  const body = `${[HEADER, ...rows].map(row => row.map(cell).join(',')).join('\r\n')}\r\n`
  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="daily-help-pulse-${week.weekStart}.csv"`,
    },
  })
}
