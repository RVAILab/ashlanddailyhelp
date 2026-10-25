import { and, asc, desc, type SQL, sql } from 'drizzle-orm'
import type { FeedListing } from '../../contract/steward/feed.ts'
import type { Category } from '../../contract/steward/values.ts'
import { listings } from '../../db/schema.ts'
import type { Database } from '../db.ts'
import { isCurrent } from '../feed/listings.ts'
import { withoutAccents } from '../translate/run.ts'

export interface ListingFilters {
  query?: string
  category?: Category
  area?: string
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
  if (filters.area)
    conditions.push(
      sql`(${listings.data}->>'area' = ${filters.area} or ${listings.data}->'coverage' ? ${filters.area})`,
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

const FIRST_AREAS = ['Ashland', 'Jackson County']

export async function listingAreas(db: Database, now: Date): Promise<string[]> {
  const rows = await db
    .selectDistinct({ area: sql<string>`place` })
    .from(
      sql`${listings}, lateral (select ${listings.data}->>'area' as place union select jsonb_array_elements_text(${listings.data}->'coverage')) places`,
    )
    .where(isCurrent(now))
  const areas = rows.map(row => row.area).filter(Boolean)
  const rest = areas.filter(area => !FIRST_AREAS.includes(area)).sort((a, b) => a.localeCompare(b, 'en'))
  return [...FIRST_AREAS.filter(area => areas.includes(area)), ...rest]
}
