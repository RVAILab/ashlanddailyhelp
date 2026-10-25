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

export async function runIngest(
  env: IngestEnv,
  { open = connect, fetch = globalThis.fetch }: IngestDeps = {},
): Promise<RefreshOutcome | null> {
  const url = databaseUrl(env)
  if (!env.FEED_BASE_URL || !url) {
    console.warn(`feed: not refreshed, ${env.FEED_BASE_URL ? 'no database is configured' : 'FEED_BASE_URL is not set'}`)
    return null
  }
  const connection = open(url)
  try {
    const outcome = await refreshFeedFile(listingsFile, {
      db: connection.db,
      baseUrl: env.FEED_BASE_URL,
      fetch,
      now: () => new Date(),
    })
    console.log(`feed: listings.json ${outcome.result}`)
    return outcome
  } finally {
    await connection.close()
  }
}
