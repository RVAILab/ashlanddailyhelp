import { asc, gt, isNull, or } from 'drizzle-orm'
import type { FeedListing } from '../../contract/steward/feed.ts'
import { listings } from '../../db/schema.ts'
import type { Database } from '../db.ts'
import { ListingsFile } from './contract.ts'
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

export async function currentListings(db: Database, now: Date): Promise<FeedListing[]> {
  const rows = await db
    .select({ data: listings.data })
    .from(listings)
    .where(or(isNull(listings.endsAt), gt(listings.endsAt, now)))
    .orderBy(asc(listings.position))
  return rows.map(row => row.data)
}

export interface FeedHeader {
  generatedAt: string
  dataset: string
}

// Every page shows this, so a database problem leaves the footer empty rather than failing the page.
export async function listingsFeedHeader(db: Database | null): Promise<FeedHeader | null> {
  if (!db) return null
  try {
    const status = await feedFileStatus(db, listingsFile.name)
    if (!status?.generatedAt || !status.dataset) return null
    return { generatedAt: status.generatedAt.toISOString(), dataset: status.dataset }
  } catch (error) {
    console.error('feed: could not read the listings header', error)
    return null
  }
}
