import { and, asc, sql } from 'drizzle-orm'
import { listings } from '../../db/schema.ts'
import type { Database } from '../db.ts'
import type { StoredListing } from '../feed/contract.ts'
import { isCurrent } from '../feed/listings.ts'
import { servesAshlandSql } from './scope.ts'

// A provider's listings by any part of its name, without regard to case; the name is matched as plain text.
export async function listingsByProvider(db: Database, name: string, now: Date): Promise<StoredListing[]> {
  const query = name.trim().slice(0, 100)
  if (!query) return []
  const rows = await db
    .select({ data: listings.data })
    .from(listings)
    .where(
      and(isCurrent(now), servesAshlandSql(), sql`strpos(lower(${listings.data}->>'provider'), lower(${query})) > 0`),
    )
    .orderBy(asc(listings.position))
  return rows.map(row => row.data)
}
