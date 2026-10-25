import { sql } from 'drizzle-orm'
import { services } from '../context.ts'
import type { Route } from './+types/health'

type DatabaseStatus = 'ok' | 'unavailable' | 'not_configured'

async function databaseStatus(context: Route.LoaderArgs['context']): Promise<DatabaseStatus> {
  try {
    const db = context.get(services).database()
    if (!db) return 'not_configured'
    await db.execute(sql`select 1`)
    return 'ok'
  } catch (error) {
    console.error('health: database query failed', error)
    return 'unavailable'
  }
}

export async function loader({ context }: Route.LoaderArgs) {
  const database = await databaseStatus(context)
  const ok = database === 'ok'
  return Response.json({ ok, database }, { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } })
}
