import { and, eq } from 'drizzle-orm'
import type { FeedListing } from '../../contract/steward/feed.ts'
import { listings } from '../../db/schema.ts'
import type { Database } from '../db.ts'
import { isCurrent } from '../feed/listings.ts'

export async function findListing(db: Database, id: string, now: Date): Promise<FeedListing | null> {
  const [row] = await db
    .select({ data: listings.data })
    .from(listings)
    .where(and(eq(listings.id, id), isCurrent(now)))
  return row?.data ?? null
}
