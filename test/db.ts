import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import * as schema from '../db/schema.ts'
import type { Database } from '../server/db.ts'

export async function testDatabase(): Promise<Database & { close: () => Promise<void> }> {
  const client = new PGlite()
  const db = drizzle({ client, schema })
  await migrate(db, { migrationsFolder: 'db/migrations' })
  return Object.assign(db, { close: () => client.close() })
}
