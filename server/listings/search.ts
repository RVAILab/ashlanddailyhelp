import { and, asc, desc, type SQL, sql } from 'drizzle-orm'
import type { FeedListing } from '../../contract/steward/feed.ts'
import type { Category } from '../../contract/steward/values.ts'
import { listings } from '../../db/schema.ts'
import type { Database } from '../db.ts'
import { isCurrent } from '../feed/listings.ts'
import { withoutAccents } from '../translate/run.ts'
import { SERVED_PLACES } from './scope.ts'

export interface ListingFilters {
  query?: string
  category?: Category
}

// Each word becomes a prefix term, all required, so "show" finds "showers" and no input can break the query syntax.
function prefixQuery(words: string): string | null {
  const terms = words.toLowerCase().match(/[\p{L}\p{N}]+/gu)
  return terms ? terms.map(term => `${term}:*`).join(' & ') : null
}

export async function searchListings(
  db: Database,
  filters: ListingFilters,
  now: Date,
  lang: 'en' | 'es' = 'en',
): Promise<FeedListing[]> {
  const conditions: Array<SQL | undefined> = [isCurrent(now)]
  if (filters.category) conditions.push(sql`${listings.data}->'categories' ? ${filters.category}`)
  const places = sql.join(
    SERVED_PLACES.map(place => sql`${place}`),
    sql`, `,
  )
  conditions.push(
    sql`(${listings.data}->>'area' in (${places}) or ${listings.data}->'coverage' ?| array[${places}]::text[])`,
  )
  const terms = filters.query ? prefixQuery(filters.query) : null
  const stemmed = sql`to_tsquery('english', ${terms})`
  const plain = sql`to_tsquery('simple', ${terms})`
  // On Spanish pages, words also match the stored Spanish translations, compared without accents.
  const spanishTerms = terms && lang === 'es' ? withoutAccents(terms) : null
  const spanish = sql`to_tsquery('spanish', ${spanishTerms})`
  const inSpanish = spanishTerms ? sql` or coalesce(${listings.searchEs} @@ ${spanish}, false)` : sql``
  if (terms) conditions.push(sql`(${listings.search} @@ ${stemmed} or ${listings.words} @@ ${plain}${inSpanish})`)
  const spanishRank = spanishTerms ? sql` + coalesce(ts_rank(${listings.searchEs}, ${spanish}), 0)` : sql``
  const rank = sql`ts_rank(${listings.search}, ${stemmed}) + ts_rank(${listings.words}, ${plain})${spanishRank}`
  const rows = await db
    .select({ data: listings.data })
    .from(listings)
    .where(and(...conditions))
    .orderBy(...(terms ? [desc(rank)] : []), asc(listings.position))
  return rows.map(row => row.data)
}
