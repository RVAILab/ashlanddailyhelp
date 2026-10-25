import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { testDatabase } from '../../test/db.ts'
import { feedHost, json } from '../../test/feed.ts'
import { storeListings } from '../../test/listings.ts'
import { alertsFile } from './alerts.ts'
import { refreshFeedFile } from './ingest.ts'
import { pageAlerts } from './page-alerts.ts'

describe('pageAlerts', () => {
  it('gives the current alerts ready to show, the names of what they affect, and the alert naming each listing', async () => {
    const db = await testDatabase()
    await storeListings(db)
    const feed = JSON.parse(readFileSync('test/fixtures/proposed/alerts.json', 'utf8'))
    await refreshFeedFile(alertsFile, {
      db,
      baseUrl: 'https://feed.example.org/',
      fetch: feedHost(json(feed)).fetch,
      now: () => new Date(),
    })
    const page = await pageAlerts(db, 'en', new Date('2026-10-25T18:00:00Z'))
    expect(page.alerts.map(alert => [alert.id, alert.severityText])).toEqual([
      ['shelter-sunday', 'Urgent'],
      ['notice-smoke', 'Notice'],
    ])
    expect(page.alerts[0]?.when).toBe('From Sun 7:00 PM to Mon 7:30 AM')
    expect(page.listingNames['ohra-shelter']).toBe('Talk through shelter options')
    expect(page.byListing).toEqual({ 'ohra-shelter': 'Severe weather shelter open Sunday night' })
    await db.close()
  })

  it('shows no alerts, rather than failing the page, when they can’t be read', async () => {
    const db = await testDatabase()
    await db.close()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await pageAlerts(db, 'en', new Date())).toEqual({ alerts: [], listingNames: {}, byListing: {} })
    expect(await pageAlerts(null, 'en', new Date())).toEqual({ alerts: [], listingNames: {}, byListing: {} })
    vi.restoreAllMocks()
  })
})
