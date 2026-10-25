import { eq } from 'drizzle-orm'
import type { z } from 'zod'
import type { Dataset } from '../../contract/steward/values.ts'
import { feedFiles } from '../../db/schema.ts'
import type { Database } from '../db.ts'
import { KNOWN_MAJOR } from './contract.ts'

interface FeedHeader {
  schemaVersion: string
  generatedAt: string
  dataset: z.infer<typeof Dataset>
}

export interface FeedFileSpec<File extends FeedHeader> {
  name: string
  schema: z.ZodType<File>
  store: (tx: Database, file: File) => Promise<void>
}

export interface RefreshDeps {
  db: Database
  baseUrl: string
  fetch: typeof globalThis.fetch
  now: () => Date
}

export type RefreshOutcome = { result: 'stored' } | { result: 'unchanged' } | { result: 'failed'; error: string }

class FeedRejected extends Error {}

async function download(url: string, etag: string | null, fetch: RefreshDeps['fetch']): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (etag) headers['If-None-Match'] = etag
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) })
  if (response.status !== 304 && !response.ok) throw new FeedRejected(`HTTP ${response.status}`)
  return response
}

async function parse<File extends FeedHeader>(spec: FeedFileSpec<File>, response: Response): Promise<File> {
  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new FeedRejected('not valid JSON')
  }
  const version = (body as { schemaVersion?: unknown } | null)?.schemaVersion
  if (typeof version === 'string' && version.split('.')[0] !== KNOWN_MAJOR)
    throw new FeedRejected(`unknown major version ${version}`)
  const checked = spec.schema.safeParse(body)
  if (!checked.success) throw new FeedRejected(`does not match the feed contract: ${checked.error.message}`)
  return checked.data
}

export async function refreshFeedFile<File extends FeedHeader>(
  spec: FeedFileSpec<File>,
  { db, baseUrl, fetch, now }: RefreshDeps,
): Promise<RefreshOutcome> {
  const url = new URL(spec.name, baseUrl).href
  const [stored] = await db.select({ etag: feedFiles.etag }).from(feedFiles).where(eq(feedFiles.name, spec.name))
  const checkedAt = now()
  try {
    const response = await download(url, stored?.etag ?? null, fetch)
    if (response.status === 304) {
      await db.update(feedFiles).set({ checkedAt }).where(eq(feedFiles.name, spec.name))
      return { result: 'unchanged' }
    }
    const file = await parse(spec, response)
    const header = {
      etag: response.headers.get('ETag'),
      schemaVersion: file.schemaVersion,
      generatedAt: new Date(file.generatedAt),
      dataset: file.dataset,
      storedAt: checkedAt,
      checkedAt,
      lastError: null,
      lastErrorAt: null,
    }
    await db.transaction(async tx => {
      await spec.store(tx, file)
      await tx
        .insert(feedFiles)
        .values({ name: spec.name, ...header })
        .onConflictDoUpdate({ target: feedFiles.name, set: header })
    })
    return { result: 'stored' }
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : String(cause)
    console.error(`feed: ${url} was not stored: ${error}`)
    await db
      .insert(feedFiles)
      .values({ name: spec.name, checkedAt, lastError: error, lastErrorAt: checkedAt })
      .onConflictDoUpdate({ target: feedFiles.name, set: { checkedAt, lastError: error, lastErrorAt: checkedAt } })
    return { result: 'failed', error }
  }
}

export async function feedFileStatus(db: Database, name: string) {
  const [row] = await db.select().from(feedFiles).where(eq(feedFiles.name, name))
  return row ?? null
}
