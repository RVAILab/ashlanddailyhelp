import { sql } from 'drizzle-orm'
import { listings } from '../../db/schema.ts'

// The prototype covers Ashland and the Rogue Valley around it (demo, Oct 25): local, county-wide and statewide services.
export const SERVED_PLACES = ['Ashland', 'Medford', 'Rogue Valley', 'Jackson County', 'Oregon']

export const servesAshland = (area: string, coverage: readonly string[] = []) =>
  [area, ...coverage].some(place => SERVED_PLACES.includes(place))

// The same rule for listings queries: the listing's area, or any place it covers, is one of the served places.
export function servesAshlandSql() {
  const places = sql.join(
    SERVED_PLACES.map(place => sql`${place}`),
    sql`, `,
  )
  return sql`(${listings.data}->>'area' in (${places}) or ${listings.data}->'coverage' ?| array[${places}]::text[])`
}
