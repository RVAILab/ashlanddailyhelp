import { integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import type { FeedListing } from '../contract/steward/feed.ts'

const instant = (name: string) => timestamp(name, { withTimezone: true })

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

export const listings = pgTable('listings', {
  id: text().primaryKey(),
  position: integer().notNull(),
  endsAt: instant('ends_at'),
  data: jsonb().$type<FeedListing>().notNull(),
})
