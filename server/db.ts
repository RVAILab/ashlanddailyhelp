import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../db/schema.ts'

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>

export interface DatabaseConnection {
  db: Database
  close: () => Promise<void>
}

export function connect(connectionString: string): DatabaseConnection {
  // A page should fail fast, not hang, when the database is slow to answer.
  const client = postgres(connectionString, {
    max: 5,
    fetch_types: false,
    connect_timeout: 5,
    onnotice: () => {},
    connection: { statement_timeout: 10_000 },
  })
  return { db: drizzle({ client, schema }), close: () => client.end() }
}
