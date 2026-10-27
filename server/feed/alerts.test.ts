import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { testDatabase } from '../../test/db.ts'
import { feedHost, json } from '../../test/feed.ts'
import { alertsFile, currentAlerts } from './alerts.ts'
import { refreshFeedFile } from './ingest.ts'

const sample = () => JSON.parse(readFileSync('test/fixtures/proposed/alerts.json', 'utf8'))

describe('alerts.json', () => {
  let db: Awaited<ReturnType<typeof testDatabase>>
  beforeEach(async () => {
    db = await testDatabase()
  })
  afterEach(async () => {
    vi.restoreAllMocks()
    await db.close()
  })
  const refresh = (reply: Response) =>
    refreshFeedFile(alertsFile, {
      db,
      baseUrl: 'https://feed.example.org/',
      fetch: feedHost(reply).fetch,
      now: () => new Date('2026-10-25T18:00:00Z'),
    })

  it('gives current alerts, urgent first, leaving out withdrawn ones', async () => {
    await refresh(json(sample()))
    const ids = (await currentAlerts(db, new Date('2026-10-25T18:00:00Z'))).map(alert => alert.id)
    expect(ids).toEqual(['shelter-sunday', 'notice-smoke'])
  })

  it('drops an alert once it has ended, before the next refresh', async () => {
    await refresh(json(sample()))
    const ids = (await currentAlerts(db, new Date('2026-10-26T15:00:00Z'))).map(alert => alert.id)
    expect(ids).toEqual(['notice-smoke'])
  })

  it('records a 404 quietly while the steward does not publish alerts', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await refresh(new Response('', { status: 404 }))).toEqual({ result: 'absent' })
    expect(error).not.toHaveBeenCalled()
  })

  it('rejects an alert without an end time', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const feed = sample()
    delete feed.alerts[0].endsAt
    expect((await refresh(json(feed))).result).toBe('failed')
  })

  it('lists alerts of the same severity by when they start, then by id', async () => {
    const feed = sample()
    const notice = feed.alerts[0]
    feed.alerts = [
      { ...notice, id: 'later', startsAt: '2026-10-25T09:00:00-07:00' },
      { ...notice, id: 'b-same-start' },
      { ...notice, id: 'a-same-start' },
    ]
    await refresh(json(feed))
    const ids = (await currentAlerts(db, new Date('2026-10-25T18:00:00Z'))).map(alert => alert.id)
    expect(ids).toEqual(['a-same-start', 'b-same-start', 'later'])
  })

  it('clears the alerts when the steward publishes none', async () => {
    await refresh(json(sample()))
    await refresh(json({ ...sample(), generatedAt: '2026-10-25T19:00:00Z', alerts: [] }))
    expect(await currentAlerts(db, new Date('2026-10-25T18:00:00Z'))).toEqual([])
  })
})
