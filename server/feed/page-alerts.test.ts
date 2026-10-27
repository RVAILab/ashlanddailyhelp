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
    expect(await pageAlerts(db, 'en', new Date())).toMatchObject({
      alerts: [],
      byListing: {},
      closedListings: [],
      closedUntil: {},
    })
    expect(await pageAlerts(null, 'en', new Date())).toMatchObject({
      alerts: [],
      byListing: {},
      closedListings: [],
      closedUntil: {},
    })
    vi.restoreAllMocks()
  })
})

describe('pageAlerts, from the review', () => {
  const store = async (change: (feed: { alerts: Array<Record<string, unknown>> }) => void) => {
    const db = await testDatabase()
    await storeListings(db)
    const feed = JSON.parse(readFileSync('test/fixtures/proposed/alerts.json', 'utf8'))
    change(feed)
    await refreshFeedFile(alertsFile, {
      db,
      baseUrl: 'https://feed.example.org/',
      fetch: feedHost(json(feed)).fetch,
      now: () => new Date(),
    })
    return db
  }

  it('says a named listing’s alert was canceled, rather than repeating "open"', async () => {
    const db = await store(feed =>
      Object.assign(feed.alerts[1] ?? {}, { status: 'canceled', note: 'Canceled: the shelter will not open.' }),
    )
    const page = await pageAlerts(db, 'en', new Date('2026-10-25T18:00:00Z'))
    expect(page.byListing['ohra-shelter']).toBe(
      'Severe weather shelter open Sunday night: Canceled: the shelter will not open.',
    )
    await db.close()
  })

  it('names the listings an in-effect closure or cancellation shuts', async () => {
    const db = await store(feed =>
      Object.assign(feed.alerts[1] ?? {}, {
        kind: 'closure',
        startsAt: '2026-10-25T08:00:00-07:00',
        eventIds: ['breakfast-1'],
      }),
    )
    const page = await pageAlerts(db, 'en', new Date('2026-10-25T18:00:00Z'))
    expect(page.closedListings).toEqual(['ohra-shelter'])
    expect(Object.keys(page.closedUntil)).toEqual(['ohra-shelter', 'breakfast-1'])
    expect(page.closedUntil['breakfast-1']).toBe(page.closedUntil['ohra-shelter'])
    await db.close()
  })

  it('keeps a listing shut until the last of the closures naming it ends', async () => {
    const db = await store(feed => {
      Object.assign(feed.alerts[0] ?? {}, { kind: 'closure' })
      const shelter = feed.alerts[1] ?? {}
      Object.assign(shelter, { kind: 'closure', startsAt: '2026-10-25T08:00:00-07:00' })
      feed.alerts.push({
        ...shelter,
        id: 'shorter-closure',
        startsAt: '2026-10-25T09:00:00-07:00',
        endsAt: '2026-10-25T20:00:00-07:00',
      })
    })
    const page = await pageAlerts(db, 'en', new Date('2026-10-25T18:00:00Z'))
    expect(page.closedListings).toContain('ohra-shelter')
    expect(page.closedUntil).toEqual({ 'ohra-shelter': '2026-10-26T07:30:00-07:00' })
    await db.close()
  })

  it('waits until a day before an alert starts to show it', async () => {
    const db = await store(feed =>
      Object.assign(feed.alerts[0] ?? {}, {
        startsAt: '2026-10-27T08:00:00-07:00',
        endsAt: '2026-10-28T08:00:00-07:00',
      }),
    )
    const ids = (await pageAlerts(db, 'en', new Date('2026-10-25T18:00:00Z'))).alerts.map(alert => alert.id)
    expect(ids).not.toContain('notice-smoke')
    await db.close()
  })

  it('says when the alerts are a demonstration, and when the next one ends', async () => {
    const db = await store(() => {})
    const page = await pageAlerts(db, 'en', new Date('2026-10-25T18:00:00Z'))
    expect(page.demonstration).toBe(true)
    expect(page.nextEnd).toBe('2026-10-26T14:30:00.000Z')
    await db.close()
  })
})
