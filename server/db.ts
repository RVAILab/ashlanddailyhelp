import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../db/schema.ts'

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>

export interface DatabaseConnection {
  db: Database
  close: () => Promise<void>
}

// Hyperdrive pools connections at the edge, so each request opens a small client and closes it afterwards.
export function connect(connectionString: string): DatabaseConnection {
  const client = postgres(connectionString, { max: 5, fetch_types: false })
  return { db: drizzle({ client, schema }), close: () => client.end() }
}
