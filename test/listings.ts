import type { Database } from '../server/db.ts'
import { refreshFeedFile } from '../server/feed/ingest.ts'
import { listingsFile } from '../server/feed/listings.ts'
import { feedHost, json, sampleListingsFeed } from './feed.ts'

// Stores a listings feed (the sample feed unless given one) the way the scheduled ingest would.
export async function storeListings(db: Database, feed = sampleListingsFeed()) {
  const outcome = await refreshFeedFile(listingsFile, {
    db,
    baseUrl: 'https://feed.example.org/',
    fetch: feedHost(json(feed)).fetch,
    now: () => new Date('2026-10-25T18:00:00Z'),
  })
  if (outcome.result !== 'stored') throw new Error(`sample feed not stored: ${JSON.stringify(outcome)}`)
  return feed
}
