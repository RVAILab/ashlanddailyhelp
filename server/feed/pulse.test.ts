import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { testDatabase } from '../../test/db.ts'
import { feedHost, json } from '../../test/feed.ts'
import { refreshFeedFile } from './ingest.ts'
import { pulseFile, pulseWeeksList, refreshPublishedWeeks, storedPulseWeek } from './pulse.ts'

const sample = (path: string) => JSON.parse(readFileSync(`test/fixtures/feed-sample/${path}`, 'utf8'))
const deps = (db: Awaited<ReturnType<typeof testDatabase>>, fetch: typeof globalThis.fetch) => ({
  db,
  baseUrl: 'https://feed.example.org/',
  fetch,
  now: () => new Date('2026-10-26T18:00:00Z'),
})

const published = {
  weekStart: '2026-10-19',
  revision: 1,
  publishedAt: '2026-10-26T16:00:00.000Z',
  note: null,
  path: 'weeks/2026-10-19-r1.json',
}
const live = () => ({
  ...sample('pulse.json'),
  week: {
    start: '2026-10-26',
    end: '2026-11-01',
    dates: ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'],
  },
  events: [],
  reports: [],
  publishedWeeks: [published],
})

describe('Pulse ingest', () => {
  let db: Awaited<ReturnType<typeof testDatabase>>
  beforeEach(async () => {
    db = await testDatabase()
  })
  afterEach(() => db.close())

  it('stores the live week from pulse.json', async () => {
    expect((await refreshFeedFile(pulseFile, deps(db, feedHost(json(sample('pulse.json'))).fetch))).result).toBe(
      'stored',
    )
    const week = await storedPulseWeek(db, null)
    expect(week?.data.week.start).toBe('2026-10-19')
    expect(week?.data.events).toHaveLength(4)
    expect(week).toMatchObject({ live: true, dataset: 'FICTIONAL_DEMONSTRATION' })
  })

  it('fetches each published week once, then lists the weeks newest first with their notes', async () => {
    await refreshFeedFile(pulseFile, deps(db, feedHost(json(live())).fetch))
    const host = feedHost(json(sample('weeks/2026-10-19-r1.json')))
    await refreshPublishedWeeks(deps(db, host.fetch))
    await refreshPublishedWeeks(deps(db, feedHost().fetch))
    expect(host.requests.map(request => request.url)).toEqual(['https://feed.example.org/weeks/2026-10-19-r1.json'])
    expect(await pulseWeeksList(db)).toEqual([
      { weekStart: '2026-10-26', live: true, revision: null, note: null, publishedAt: null, corrections: [] },
      {
        weekStart: '2026-10-19',
        live: false,
        revision: 1,
        note: null,
        publishedAt: '2026-10-26T16:00:00.000Z',
        corrections: [],
      },
    ])
    expect((await storedPulseWeek(db, '2026-10-19'))?.data.reports.length).toBeGreaterThan(0)
  })

  it('keeps the other weeks when one week file can’t be read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await refreshFeedFile(pulseFile, deps(db, feedHost(json(live())).fetch))
    await refreshPublishedWeeks(deps(db, feedHost(new Response('nope', { status: 500 })).fetch))
    expect(await storedPulseWeek(db, '2026-10-19')).toBeNull()
    expect(await storedPulseWeek(db, null)).not.toBeNull()
    vi.restoreAllMocks()
  })

  it('clears every week when the steward stops publishing pulse.json', async () => {
    await refreshFeedFile(pulseFile, deps(db, feedHost(json(sample('pulse.json'))).fetch))
    const gone = await refreshFeedFile(pulseFile, deps(db, feedHost(new Response('', { status: 404 })).fetch))
    expect(gone.result).toBe('absent')
    expect(await storedPulseWeek(db, null)).toBeNull()
  })

  it('keeps a week’s revision until the correction replacing it is stored, and lists every correction note', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await refreshFeedFile(pulseFile, deps(db, feedHost(json(live())).fetch))
    await refreshPublishedWeeks(deps(db, feedHost(json(sample('weeks/2026-10-19-r1.json'))).fetch))
    const second = {
      ...published,
      revision: 2,
      note: 'A meal count was entered twice.',
      path: 'weeks/2026-10-19-r2.json',
    }
    await refreshFeedFile(pulseFile, deps(db, feedHost(json({ ...live(), publishedWeeks: [published, second] })).fetch))
    await refreshPublishedWeeks(deps(db, feedHost(new Response('', { status: 503 })).fetch))
    expect((await storedPulseWeek(db, '2026-10-19'))?.revision).toBe(1)
    const r2 = { ...sample('weeks/2026-10-19-r1.json'), revision: 2, note: second.note }
    await refreshPublishedWeeks(deps(db, feedHost(json(r2)).fetch))
    expect((await storedPulseWeek(db, '2026-10-19'))?.revision).toBe(2)
    const listed = (await pulseWeeksList(db)).find(week => week.weekStart === '2026-10-19')
    expect(listed?.corrections).toEqual([{ revision: 2, note: 'A meal count was entered twice.' }])
    vi.restoreAllMocks()
  })

  it('drops published weeks once pulse.json stops listing them', async () => {
    await refreshFeedFile(pulseFile, deps(db, feedHost(json(live())).fetch))
    await refreshPublishedWeeks(deps(db, feedHost(json(sample('weeks/2026-10-19-r1.json'))).fetch))
    const { publishedWeeks: _, ...unlisted } = live()
    await refreshFeedFile(
      pulseFile,
      deps(db, feedHost(json({ ...unlisted, generatedAt: '2026-10-26T19:00:00Z' })).fetch),
    )
    await refreshPublishedWeeks(deps(db, feedHost().fetch))
    expect(await storedPulseWeek(db, '2026-10-19')).toBeNull()
    expect((await pulseWeeksList(db)).map(week => week.live)).toEqual([true])
  })

  it('fetches only the latest revision of a week, whatever order they are listed in', async () => {
    const second = {
      ...published,
      revision: 2,
      note: 'A meal count was entered twice.',
      path: 'weeks/2026-10-19-r2.json',
    }
    await refreshFeedFile(pulseFile, deps(db, feedHost(json({ ...live(), publishedWeeks: [second, published] })).fetch))
    const host = feedHost(json({ ...sample('weeks/2026-10-19-r1.json'), revision: 2, note: second.note }))
    await refreshPublishedWeeks(deps(db, host.fetch))
    expect(host.requests.map(request => request.url)).toEqual(['https://feed.example.org/weeks/2026-10-19-r2.json'])
  })

  it('has no weeks to fetch or list before pulse.json has been stored', async () => {
    const host = feedHost()
    await refreshPublishedWeeks(deps(db, host.fetch))
    expect(host.requests).toEqual([])
    expect(await pulseWeeksList(db)).toEqual([])
  })

  it('refuses a week file that isn’t the revision listed for it', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await refreshFeedFile(pulseFile, deps(db, feedHost(json(live())).fetch))
    const wrong = { ...sample('weeks/2026-10-19-r1.json'), revision: 3, note: 'Another revision.' }
    await refreshPublishedWeeks(deps(db, feedHost(json(wrong)).fetch))
    expect(await storedPulseWeek(db, '2026-10-19')).toBeNull()
    vi.restoreAllMocks()
  })
})
