import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { alertsFile } from '../server/feed/alerts.ts'
import { WeekFile } from '../server/feed/contract.ts'
import { eventsFile } from '../server/feed/events.ts'
import { listingsFile } from '../server/feed/listings.ts'
import { pulseFile } from '../server/feed/pulse.ts'

export const LIVE_FEED_URL = 'https://steward.ashlanddailyhelp.com/feed/'
export const LIVE_FEED_DIR = 'test/fixtures/feed-live'
const MAX_AGE_MS = 24 * 60 * 60 * 1000
const STAMP = 'snapshot.json'

interface RefreshOptions {
  dir?: string
  baseUrl?: string
  fetch?: typeof globalThis.fetch
  now?: Date
}

export type LiveFeedOutcome = { result: 'fresh' } | { result: 'refreshed' } | { result: 'kept'; error: string }

// Copies the steward's live feed into a committed fixture at most once a day, so tests see recent real listings
// without reaching the network while they run. Any failure keeps the snapshot already there.
export async function refreshLiveFeed({
  dir = LIVE_FEED_DIR,
  baseUrl = LIVE_FEED_URL,
  fetch = globalThis.fetch,
  now = new Date(),
}: RefreshOptions = {}): Promise<LiveFeedOutcome> {
  const fetchedAt = await lastFetched(dir)
  if (fetchedAt && now.getTime() - fetchedAt.getTime() < MAX_AGE_MS) return { result: 'fresh' }
  try {
    const files = await download(baseUrl, fetch)
    files.set(STAMP, JSON.stringify({ fetchedAt: now.toISOString(), from: baseUrl }))
    await replace(dir, files)
    return { result: 'refreshed' }
  } catch (error) {
    return { result: 'kept', error: error instanceof Error ? error.message : String(error) }
  }
}

async function lastFetched(dir: string): Promise<Date | null> {
  const stamp = await readFile(join(dir, STAMP), 'utf8').catch(() => null)
  const fetchedAt: unknown = stamp ? JSON.parse(stamp).fetchedAt : null
  return typeof fetchedAt === 'string' ? new Date(fetchedAt) : null
}

// Every file is checked against the contract before any is written, so a snapshot is never half old, half new.
async function download(baseUrl: string, fetch: typeof globalThis.fetch): Promise<Map<string, string>> {
  const files = new Map<string, string>()
  const get = async (path: string, optional = false) => {
    const response = await fetch(new URL(path, baseUrl), { headers: { Accept: 'application/json' } })
    if (optional && response.status === 404) return null
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`)
    const body = await response.text()
    files.set(path, body)
    return JSON.parse(body)
  }
  for (const spec of [listingsFile, eventsFile, alertsFile]) {
    const body = await get(spec.name, spec.optional)
    if (body !== null) spec.schema.parse(body)
  }
  const pulse = await get(pulseFile.name, pulseFile.optional)
  if (pulse !== null)
    for (const week of pulseFile.schema.parse(pulse).publishedWeeks ?? []) WeekFile.parse(await get(week.path))
  return files
}

async function replace(dir: string, files: Map<string, string>) {
  const next = `${dir}.next`
  await rm(next, { recursive: true, force: true })
  for (const [path, body] of files) {
    await mkdir(dirname(join(next, path)), { recursive: true })
    await writeFile(join(next, path), body.endsWith('\n') ? body : `${body}\n`)
  }
  await rm(dir, { recursive: true, force: true })
  await rename(next, dir)
}
