import { and, desc, eq, isNotNull, notInArray } from 'drizzle-orm'
import type { PulseSnapshot } from '../../contract/steward/feed.ts'
import { pulseWeeks } from '../../db/schema.ts'
import type { Database } from '../db.ts'
import type { PulseData } from '../pulse/view.ts'
import { PulseFile, WeekFile } from './contract.ts'
import type { FeedFileSpec, RefreshDeps } from './ingest.ts'

const LIVE = 'live'
const weekKey = (weekStart: string, revision: number) => `${weekStart}-r${revision}`
const pulseData = ({ week, events, reports }: PulseData): PulseData => ({ week, events, reports })

export const pulseFile: FeedFileSpec<PulseFile> = {
  name: 'pulse.json',
  schema: PulseFile,
  optional: true,
  clear: async tx => {
    await tx.delete(pulseWeeks)
  },
  store: async (tx, file) => {
    const row = {
      key: LIVE,
      weekStart: file.week.start,
      revision: null,
      publishedAt: null,
      note: null,
      dataset: file.dataset,
      data: { ...pulseData(file), publishedWeeks: file.publishedWeeks ?? [] },
    }
    await tx.insert(pulseWeeks).values(row).onConflictDoUpdate({ target: pulseWeeks.key, set: row })
  },
}

// The latest revision of each published week, as pulse.json lists them.
function latestRevisions(published: PulseSnapshot[]): PulseSnapshot[] {
  const latest = new Map<string, PulseSnapshot>()
  for (const week of published)
    if ((latest.get(week.weekStart)?.revision ?? 0) < week.revision) latest.set(week.weekStart, week)
  return [...latest.values()]
}

// Week files are frozen once published, so each revision is fetched once; a newer revision replaces the older one.
// A file that can't be read is left for the next run and never stops the others.
export async function refreshPublishedWeeks({ db, baseUrl, fetch }: Pick<RefreshDeps, 'db' | 'baseUrl' | 'fetch'>) {
  const [live] = await db.select({ data: pulseWeeks.data }).from(pulseWeeks).where(eq(pulseWeeks.key, LIVE))
  const wanted = latestRevisions(live?.data.publishedWeeks ?? [])
  const keys = wanted.map(week => weekKey(week.weekStart, week.revision))
  await db
    .delete(pulseWeeks)
    .where(
      keys.length
        ? and(isNotNull(pulseWeeks.revision), notInArray(pulseWeeks.key, keys))
        : isNotNull(pulseWeeks.revision),
    )
  const stored = new Set((await db.select({ key: pulseWeeks.key }).from(pulseWeeks)).map(row => row.key))
  for (const week of wanted) {
    const key = weekKey(week.weekStart, week.revision)
    if (stored.has(key)) continue
    try {
      const response = await fetch(new URL(week.path, baseUrl), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(20_000),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const file = WeekFile.parse(await response.json())
      await db.insert(pulseWeeks).values({
        key,
        weekStart: file.weekStart,
        revision: file.revision,
        publishedAt: new Date(file.publishedAt),
        note: file.note,
        dataset: file.dataset,
        data: pulseData(file),
      })
    } catch (error) {
      console.error(`pulse: could not store ${week.path}`, error)
    }
  }
}

export interface StoredPulseWeek {
  weekStart: string
  live: boolean
  revision: number | null
  note: string | null
  publishedAt: string | null
  dataset: string
  data: PulseData
}

// The live week (weekStart null) or the stored revision of a published week.
export async function storedPulseWeek(db: Database, weekStart: string | null): Promise<StoredPulseWeek | null> {
  const [row] = await db
    .select()
    .from(pulseWeeks)
    .where(
      weekStart === null
        ? eq(pulseWeeks.key, LIVE)
        : and(eq(pulseWeeks.weekStart, weekStart), isNotNull(pulseWeeks.revision)),
    )
    .orderBy(desc(pulseWeeks.revision))
    .limit(1)
  if (!row) return null
  return {
    weekStart: row.weekStart,
    live: row.revision === null,
    revision: row.revision,
    note: row.note,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    dataset: row.dataset,
    data: pulseData(row.data),
  }
}

// This week so far, then the published weeks, newest first.
export async function pulseWeeksList(db: Database) {
  const rows = await db
    .select({
      weekStart: pulseWeeks.weekStart,
      revision: pulseWeeks.revision,
      note: pulseWeeks.note,
      publishedAt: pulseWeeks.publishedAt,
    })
    .from(pulseWeeks)
    .orderBy(desc(pulseWeeks.weekStart))
  const live = rows.filter(row => row.revision === null)
  const published = rows.filter(row => row.revision !== null)
  return [...live, ...published].map(row => ({
    weekStart: row.weekStart,
    live: row.revision === null,
    revision: row.revision,
    note: row.note,
    publishedAt: row.publishedAt?.toISOString() ?? null,
  }))
}
