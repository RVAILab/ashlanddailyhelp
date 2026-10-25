import { sql } from 'drizzle-orm'
import { customType, index, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import type { FeedAlert, FeedEvent, StoredListing } from '../server/feed/contract.ts'

const instant = (name: string) => timestamp(name, { withTimezone: true })

const tsvector = customType<{ data: string }>({ dataType: () => 'tsvector' })

// One row per feed file. The header columns describe the copy in use; the error columns, the last failed refresh.
export const feedFiles = pgTable('feed_files', {
  name: text().primaryKey(),
  etag: text(),
  schemaVersion: text('schema_version'),
  generatedAt: instant('generated_at'),
  dataset: text(),
  storedAt: instant('stored_at'),
  checkedAt: instant('checked_at').notNull(),
  lastError: text('last_error'),
  lastErrorAt: instant('last_error_at'),
})

export const listings = pgTable(
  'listings',
  {
    id: text().primaryKey(),
    position: integer().notNull(),
    endsAt: instant('ends_at'),
    data: jsonb().$type<StoredListing>().notNull(),
    // Kept in step with data by Postgres, weighted so a match in the name ranks above one in the description or tags.
    // `search` is stemmed English; `words` is unstemmed, so part-words ("navigat") and common words still match.
    search: tsvector()
      .notNull()
      .generatedAlwaysAs(
        sql`setweight(to_tsvector('english', coalesce(data->>'name', '')), 'A')
          || setweight(to_tsvector('english', coalesce(data->>'provider', '')), 'B')
          || setweight(to_tsvector('english', coalesce(data->>'description', '')), 'C')
          || setweight(jsonb_to_tsvector('english', coalesce(data->'tags', '[]'::jsonb), '["string"]'), 'C')`,
      ),
    // Spanish words for searching, rebuilt by the translation run from stored translations (not generated: another table).
    searchEs: tsvector('search_es'),
    words: tsvector()
      .notNull()
      .generatedAlwaysAs(
        sql`setweight(to_tsvector('simple', coalesce(data->>'name', '')), 'A')
          || setweight(to_tsvector('simple', coalesce(data->>'provider', '')), 'B')
          || setweight(to_tsvector('simple', coalesce(data->>'description', '')), 'C')
          || setweight(jsonb_to_tsvector('simple', coalesce(data->'tags', '[]'::jsonb), '["string"]'), 'C')`,
      ),
  },
  table => [
    index('listings_search').using('gin', table.search),
    index('listings_words').using('gin', table.words),
    index('listings_search_es').using('gin', table.searchEs),
  ],
)

// A machine translation of one piece of listing text, keyed by a hash of the language and the English, so the same
// text is translated once however many listings use it, and changed text gets a new key.
export const translations = pgTable('translations', {
  hash: text().primaryKey(),
  lang: text().notNull(),
  english: text().notNull(),
  text: text().notNull(),
  model: text().notNull(),
  translatedAt: instant('translated_at').notNull(),
})

// Text whose translation batch failed, so the next attempt waits instead of being paid for on every run.
export const translationFailures = pgTable('translation_failures', {
  hash: text().primaryKey(),
  attempts: integer().notNull(),
  failedAt: instant('failed_at').notNull(),
})

// Dated one-off events (proposed in steward #40). `lastsUntil` is when an event stops being shown: its end, or the end
// of its local day when it has none.
export const events = pgTable('events', {
  id: text().primaryKey(),
  position: integer().notNull(),
  lastsUntil: instant('lasts_until').notNull(),
  data: jsonb().$type<FeedEvent>().notNull(),
})

// Time-bound notices (proposed in steward #41), shown until they end.
export const alerts = pgTable('alerts', {
  id: text().primaryKey(),
  position: integer().notNull(),
  endsAt: instant('ends_at').notNull(),
  data: jsonb().$type<FeedAlert>().notNull(),
})
