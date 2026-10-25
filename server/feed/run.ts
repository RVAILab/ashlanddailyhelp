import { connect, type DatabaseConnection } from '../db.ts'
import { databaseUrl } from '../request-database.ts'
import { type RefreshOutcome, refreshFeedFile } from './ingest.ts'
import { listingsFile } from './listings.ts'

interface IngestEnv {
  FEED_BASE_URL?: string
  DATABASE_URL?: string
  HYPERDRIVE?: { connectionString: string }
}

interface IngestDeps {
  open?: (url: string) => DatabaseConnection
  fetch?: typeof globalThis.fetch
}

// The folder that holds the feed files, so each file resolves inside it whether or not the setting ends in a slash.
export function feedFolder(value: string | undefined): string | null {
  if (!value || !URL.canParse(value)) return null
  const url = new URL(value)
  if (url.protocol !== 'https:' && url.protocol !== 'http:' && url.protocol !== 'file:') return null
  if (!url.pathname.endsWith('/')) url.pathname += '/'
  return url.href
}

export async function runIngest(
  env: IngestEnv,
  { open = connect, fetch = globalThis.fetch }: IngestDeps = {},
): Promise<RefreshOutcome | null> {
  const baseUrl = feedFolder(env.FEED_BASE_URL)
  const url = databaseUrl(env)
  if (!baseUrl || !url) {
    const why = !env.FEED_BASE_URL
      ? 'FEED_BASE_URL is not set'
      : !baseUrl
        ? `FEED_BASE_URL is not a URL: ${env.FEED_BASE_URL}`
        : 'no database is configured'
    console.warn(`feed: not refreshed, ${why}`)
    return null
  }
  const connection = open(url)
  try {
    const outcome = await refreshFeedFile(listingsFile, { db: connection.db, baseUrl, fetch, now: () => new Date() })
    console.log(`feed: listings.json ${outcome.result}`)
    return outcome
  } finally {
    await connection.close().catch(error => console.error('feed: could not close the database connection', error))
  }
}
