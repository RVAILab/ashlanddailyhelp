import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { testDatabase } from '../../test/db.ts'
import { feedHost, json } from '../../test/feed.ts'
import { eventsFile, upcomingEvents } from './events.ts'
import { feedFileStatus, refreshFeedFile } from './ingest.ts'

const sample = () => JSON.parse(readFileSync('test/fixtures/proposed/events.json', 'utf8'))

describe('refreshing events.json', () => {
  let db: Awaited<ReturnType<typeof testDatabase>>
  beforeEach(async () => {
    db = await testDatabase()
  })
  afterEach(async () => {
    vi.restoreAllMocks()
    await db.close()
  })
  const refresh = (reply: Response) =>
    refreshFeedFile(eventsFile, {
      db,
      baseUrl: 'https://feed.example.org/',
      fetch: feedHost(reply).fetch,
      now: () => new Date('2026-10-25T18:00:00Z'),
    })

  it('stores the events in the shape proposed in steward #40, dropping fields it does not know', async () => {
    const feed = sample()
    feed.events[0].somethingNew = true
    expect(await refresh(json(feed))).toEqual({ result: 'stored' })
    const events = await upcomingEvents(db, new Date('2026-10-25T00:00:00Z'))
    expect(events.map(event => event.id)).toEqual(['breakfast-1', 'flu-clinic-1', 'giveaway-1', 'showers-pop-up-1'])
    expect(events[1]).not.toHaveProperty('somethingNew')
  })

  it('leaves out events that have ended, or whose day has passed when they have no end time', async () => {
    await refresh(json(sample()))
    const ids = (await upcomingEvents(db, new Date('2026-10-27T18:00:00Z'))).map(event => event.id)
    expect(ids).toEqual(['showers-pop-up-1'])
  })

  it('records a 404 quietly as not published yet', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await refresh(new Response('missing', { status: 404 }))).toEqual({ result: 'absent' })
    expect(error).not.toHaveBeenCalled()
    expect(await feedFileStatus(db, 'events.json')).toMatchObject({ lastError: 'not published yet' })
  })

  it('rejects an event without a date or with a bad id', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const feed = sample()
    feed.events[0].id = 'bad id'
    expect((await refresh(json(feed))).result).toBe('failed')
  })
})

describe('events, from the review', () => {
  let db: Awaited<ReturnType<typeof testDatabase>>
  beforeEach(async () => {
    db = await testDatabase()
  })
  afterEach(async () => {
    vi.restoreAllMocks()
    await db.close()
  })
  const refresh = (reply: Response) =>
    refreshFeedFile(eventsFile, {
      db,
      baseUrl: 'https://feed.example.org/',
      fetch: feedHost(reply).fetch,
      now: () => new Date('2026-10-25T18:00:00Z'),
    })

  it('keeps events that finished earlier today, so the page can fold them away', async () => {
    await refresh(json(sample()))
    const ids = (await upcomingEvents(db, new Date('2026-10-25T18:00:00Z'))).map(event => event.id)
    expect(ids).toContain('breakfast-1')
  })

  it('lists a day’s events with no start time first, then by start time, then by id', async () => {
    const feed = sample()
    const [flu] = feed.events
    feed.events = [
      { ...flu, id: 'b-same-time' },
      { ...flu, id: 'a-same-time' },
      { ...flu, id: 'all-day', startsAt: undefined, endsAt: undefined },
    ]
    await refresh(json(feed))
    const ids = (await upcomingEvents(db, new Date('2026-10-25T00:00:00Z'))).map(event => event.id)
    expect(ids).toEqual(['all-day', 'a-same-time', 'b-same-time'])
  })

  it('clears stored events when the steward publishes none', async () => {
    await refresh(json(sample()))
    await refresh(json({ ...sample(), generatedAt: '2026-10-25T19:00:00Z', events: [] }))
    expect(await upcomingEvents(db, new Date('2026-10-25T00:00:00Z'))).toEqual([])
  })

  it('clears stored events when the steward stops publishing the file', async () => {
    await refresh(json(sample()))
    await refresh(new Response('', { status: 404 }))
    expect(await upcomingEvents(db, new Date('2026-10-25T00:00:00Z'))).toEqual([])
  })
})

describe('endOfPacificDay', () => {
  it('is the next local midnight, on both daylight-saving days', async () => {
    const { endOfPacificDay } = await import('./events.ts')
    expect(endOfPacificDay('2026-10-31').toISOString()).toBe('2026-11-01T07:00:00.000Z')
    expect(endOfPacificDay('2026-11-01').toISOString()).toBe('2026-11-02T08:00:00.000Z')
    expect(endOfPacificDay('2027-03-13').toISOString()).toBe('2027-03-14T08:00:00.000Z')
    expect(endOfPacificDay('2027-03-14').toISOString()).toBe('2027-03-15T07:00:00.000Z')
  })
})
