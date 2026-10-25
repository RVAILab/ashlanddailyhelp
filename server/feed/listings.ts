import { asc, gt, isNull, or } from 'drizzle-orm'
import { Dataset } from '../../contract/steward/values.ts'
import { listings } from '../../db/schema.ts'
import type { Database } from '../db.ts'
import { ListingsFile, type StoredListing } from './contract.ts'
import { type FeedFileSpec, feedFileStatus } from './ingest.ts'

export const listingsFile: FeedFileSpec<ListingsFile> = {
  name: 'listings.json',
  schema: ListingsFile,
  store: async (tx, file) => {
    await tx.delete(listings)
    if (file.listings.length === 0) return
    await tx.insert(listings).values(
      file.listings.map((data, position) => ({
        id: data.id,
        position,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        data,
      })),
    )
  },
}

// A time-bound listing (a shelter open tonight) stops being current at its endsAt, even before the next refresh.
export const isCurrent = (now: Date) => or(isNull(listings.endsAt), gt(listings.endsAt, now))

export async function currentListings(db: Database, now: Date): Promise<StoredListing[]> {
  const rows = await db
    .select({ data: listings.data })
    .from(listings)
    .where(isCurrent(now))
    .orderBy(asc(listings.position))
  return rows.map(row => row.data)
}

export type FeedStatus =
  | { state: 'stored'; generatedAt: string; dataset: Dataset; updateFailing: boolean }
  | { state: 'none' }
  | { state: 'unavailable' }

// Every page shows this, so a slow or failing database leaves the footer saying so rather than holding up the page.
export async function listingsFeedStatus(db: Database | null, timeoutMs = 2_000): Promise<FeedStatus> {
  if (!db) return { state: 'unavailable' }
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const status = await Promise.race([
      feedFileStatus(db, listingsFile.name),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`no answer within ${timeoutMs} ms`)), timeoutMs)
      }),
    ])
    if (!status?.generatedAt || !status.dataset) return { state: 'none' }
    const dataset = Dataset.parse(status.dataset)
    return {
      state: 'stored',
      generatedAt: status.generatedAt.toISOString(),
      dataset,
      updateFailing: status.lastError !== null,
    }
  } catch (error) {
    console.error('feed: could not read the listings status', error)
    return { state: 'unavailable' }
  } finally {
    clearTimeout(timer)
  }
}
