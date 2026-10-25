import { gt } from 'drizzle-orm'
import { alerts } from '../../db/schema.ts'
import type { Database } from '../db.ts'
import { AlertsFile, type FeedAlert } from './contract.ts'
import type { FeedFileSpec } from './ingest.ts'

export const alertsFile: FeedFileSpec<AlertsFile> = {
  name: 'alerts.json',
  schema: AlertsFile,
  optional: true,
  clear: async tx => {
    await tx.delete(alerts)
  },
  store: async (tx, file) => {
    await tx.delete(alerts)
    if (file.alerts.length === 0) return
    await tx
      .insert(alerts)
      .values(file.alerts.map((data, position) => ({ id: data.id, position, endsAt: new Date(data.endsAt), data })))
  },
}

const severityOrder = { urgent: 0, notice: 1 } as const

// Alerts still in effect: not ended (even before the next refresh) and not withdrawn; urgent first, then by start.
export async function currentAlerts(db: Database, now: Date): Promise<FeedAlert[]> {
  const rows = await db.select({ data: alerts.data }).from(alerts).where(gt(alerts.endsAt, now))
  return rows
    .map(row => row.data)
    .filter(alert => alert.status !== 'withdrawn')
    .sort(
      (a, b) =>
        severityOrder[a.severity] - severityOrder[b.severity] ||
        Date.parse(a.startsAt) - Date.parse(b.startsAt) ||
        a.id.localeCompare(b.id),
    )
}
