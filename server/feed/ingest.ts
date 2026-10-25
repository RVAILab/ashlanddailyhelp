import { eq, sql } from 'drizzle-orm'
import type { z } from 'zod'
import type { Dataset } from '../../contract/steward/values.ts'
import { feedFiles } from '../../db/schema.ts'
import type { Database } from '../db.ts'
import { KNOWN_MAJOR } from './contract.ts'

interface FileHeader {
  schemaVersion: string
  generatedAt: string
  dataset: z.infer<typeof Dataset>
}

export interface FeedFileSpec<File extends FileHeader> {
  name: string
  schema: z.ZodType<File, unknown>
  store: (tx: Database, file: File) => Promise<void>
}

export interface RefreshDeps {
  db: Database
  baseUrl: string
  fetch: typeof globalThis.fetch
  now: () => Date
  timeoutMs?: number
}

export type RefreshOutcome = { result: 'stored' } | { result: 'unchanged' } | { result: 'failed'; error: string }

const ERROR_LENGTH = 500

class FeedRejected extends Error {}

async function within<T>(ms: number, work: Promise<T>, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new FeedRejected(`${what}: no answer within ${ms / 1000} s`)), ms)
  })
  try {
    return await Promise.race([work, timeout])
  } finally {
    clearTimeout(timer)
  }
}

function contractError(error: z.ZodError): string {
  const issues = error.issues.map(issue => `${issue.path.join('.') || 'file'}: ${issue.message}`)
  const shown = issues.slice(0, 3).join('; ')
  return `does not match the feed contract: ${shown}${issues.length > 3 ? ` (and ${issues.length - 3} more)` : ''}`
}

async function download(
  url: string,
  etag: string | undefined,
  { fetch, timeoutMs }: Required<Pick<RefreshDeps, 'fetch' | 'timeoutMs'>>,
) {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (etag) headers['If-None-Match'] = etag
  const signal = AbortSignal.timeout(timeoutMs)
  const response = await within(timeoutMs, fetch(url, { headers, signal }), 'could not reach the feed host')
  if (response.status === 304) return null
  if (!response.ok) throw new FeedRejected(`HTTP ${response.status}`)
  const body = await within(timeoutMs, response.text(), 'could not read the file').catch(cause => {
    throw cause instanceof FeedRejected ? cause : new FeedRejected(`could not read the file: ${String(cause)}`)
  })
  return { body, etag: response.headers.get('ETag') }
}

function parse<File extends FileHeader>(spec: FeedFileSpec<File>, body: string): File {
  let json: unknown
  try {
    json = JSON.parse(body)
  } catch {
    throw new FeedRejected('not valid JSON')
  }
  const version = (json as { schemaVersion?: unknown } | null)?.schemaVersion
  if (typeof version === 'string' && version.split('.')[0] !== KNOWN_MAJOR)
    throw new FeedRejected(`unknown major version ${version}`)
  const checked = spec.schema.safeParse(json)
  if (!checked.success) throw new FeedRejected(contractError(checked.error))
  return checked.data
}

export async function refreshFeedFile<File extends FileHeader>(
  spec: FeedFileSpec<File>,
  { db, baseUrl, fetch, now, timeoutMs = 15_000 }: RefreshDeps,
): Promise<RefreshOutcome> {
  const checkedAt = now()
  try {
    const url = new URL(spec.name, baseUrl).href
    const [stored] = await db.select({ etag: feedFiles.etag }).from(feedFiles).where(eq(feedFiles.name, spec.name))
    const downloaded = await download(url, stored?.etag ?? undefined, { fetch, timeoutMs })
    if (!downloaded) {
      await db
        .update(feedFiles)
        .set({ checkedAt, lastError: null, lastErrorAt: null })
        .where(eq(feedFiles.name, spec.name))
      return { result: 'unchanged' }
    }
    const file = parse(spec, downloaded.body)
    const header = {
      etag: downloaded.etag,
      schemaVersion: file.schemaVersion,
      generatedAt: new Date(file.generatedAt),
      dataset: file.dataset,
      storedAt: checkedAt,
      checkedAt,
      lastError: null,
      lastErrorAt: null,
    }
    await db.transaction(async tx => {
      // Overlapping refreshes (the schedule and a manual run) take turns rather than collide on the same rows.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`feed:${spec.name}`}))`)
      await spec.store(tx, file)
      await tx
        .insert(feedFiles)
        .values({ name: spec.name, ...header })
        .onConflictDoUpdate({ target: feedFiles.name, set: header })
    })
    return { result: 'stored' }
  } catch (cause) {
    const error = (cause instanceof Error ? cause.message : String(cause)).slice(0, ERROR_LENGTH)
    console.error(`feed: ${spec.name} from ${baseUrl} was not stored: ${error}`)
    await recordError(db, spec.name, error, checkedAt)
    return { result: 'failed', error }
  }
}

async function recordError(db: Database, name: string, error: string, at: Date) {
  try {
    await db
      .insert(feedFiles)
      .values({ name, checkedAt: at, lastError: error, lastErrorAt: at })
      .onConflictDoUpdate({ target: feedFiles.name, set: { checkedAt: at, lastError: error, lastErrorAt: at } })
  } catch (cause) {
    console.error(`feed: could not record the failure for ${name}`, cause)
  }
}

export async function feedFileStatus(db: Database, name: string) {
  const [row] = await db.select().from(feedFiles).where(eq(feedFiles.name, name))
  return row ?? null
}
