import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { refreshFeedFile } from '../../server/feed/ingest.ts'
import { pulseFile, refreshPublishedWeeks } from '../../server/feed/pulse.ts'
import { testDatabase } from '../../test/db.ts'
import { feedHost, json } from '../../test/feed.ts'
import { loaderArgs } from '../../test/route.ts'
import { loader } from './pulse.tsx'
import { loader as csv } from './pulse-csv.ts'

const sample = (path: string) => JSON.parse(readFileSync(`test/fixtures/feed-sample/${path}`, 'utf8'))

async function storePulse(db: Awaited<ReturnType<typeof testDatabase>>, feed: unknown) {
  await refreshFeedFile(pulseFile, {
    db,
    baseUrl: 'https://feed.example.org/',
    fetch: feedHost(json(feed)).fetch,
    now: () => new Date(),
  })
}

describe('/pulse', () => {
  let db: Awaited<ReturnType<typeof testDatabase>>
  beforeAll(async () => {
    db = await testDatabase()
    await storePulse(db, sample('pulse.json'))
  })
  afterAll(() => db.close())

  it('shows this week so far, labelled fictional, with its days ready to draw', async () => {
    const page = await loader(loaderArgs('/pulse', { database: () => db }))
    expect(page.week).toMatchObject({ live: true, fictional: true, weekStart: '2026-10-19' })
    expect(page.weeks[0]).toMatchObject({ live: true, label: 'This week so far' })
    const meals = page.week?.units.find(unit => unit.unit === 'meals')
    expect(meals?.days.map(day => day.label)).toContain('Tue, Oct 20')
    expect(meals?.days.find(day => day.label === 'Tue, Oct 20')).toMatchObject({ amount: 124, percent: 62 })
  })

  it('says when there is nothing yet, and when an unknown week is asked for', async () => {
    const empty = await testDatabase()
    expect((await loader(loaderArgs('/pulse', { database: () => empty }))).week).toBeNull()
    await empty.close()
    expect((await loader(loaderArgs('/pulse?week=2020-01-06', { database: () => db }))).week).toBeNull()
  })

  it('exports the week as CSV, naming the dataset on every row', async () => {
    const response = await csv(loaderArgs('/pulse.csv', { database: () => db }))
    expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8')
    const lines = (await response.text()).trim().split('\r\n')
    expect(lines[0]).toBe('dataset,week_start,revision,date,provider,service,unit,outcome,method,value,unmet,reasons')
    expect(lines.slice(1).every(line => line.startsWith('FICTIONAL_DEMONSTRATION,2026-10-19,live,'))).toBe(true)
    expect(lines).toContain(
      'FICTIONAL_DEMONSTRATION,2026-10-19,live,2026-10-20,Sample meal team A,Community meal,meals,completed,counted,124,observed,supplies',
    )
    expect(lines.find(line => line.includes('demo-')) ?? '').toBe('')
  })
})

describe('/pulse with a published week', () => {
  let db: Awaited<ReturnType<typeof testDatabase>>
  beforeAll(async () => {
    db = await testDatabase()
    const published = {
      weekStart: '2026-10-19',
      revision: 1,
      publishedAt: '2026-10-26T16:00:00.000Z',
      note: null,
      path: 'weeks/2026-10-19-r1.json',
    }
    const week = {
      start: '2026-10-26',
      end: '2026-11-01',
      dates: ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'],
    }
    await storePulse(db, { ...sample('pulse.json'), week, events: [], reports: [], publishedWeeks: [published] })
    await refreshPublishedWeeks({
      db,
      baseUrl: 'https://feed.example.org/',
      fetch: feedHost(json(sample('weeks/2026-10-19-r1.json'))).fetch,
    })
  })
  afterAll(() => db.close())

  it('lists the published week by its Monday, and opens it with its own CSV link', async () => {
    const page = await loader(loaderArgs('/pulse?week=2026-10-19', { database: () => db }))
    expect(page.week).toMatchObject({ live: false, revision: 1, csv: '/pulse.csv?week=2026-10-19' })
    expect(page.weeks.map(week => [week.label, week.href, week.current])).toEqual([
      ['This week so far', '/pulse', false],
      ['Week of Oct 19', '/pulse?week=2026-10-19', true],
    ])
  })

  it('names the week in Spanish with the whole month', async () => {
    const page = await loader(loaderArgs('/es/pulse', { database: () => db }))
    expect(page.weeks.map(week => week.label)).toEqual(['Esta semana hasta ahora', 'Semana del 19 de octubre'])
  })

  it('exports the published week with its revision on every row', async () => {
    const response = await csv(loaderArgs('/pulse.csv?week=2026-10-19', { database: () => db }))
    const rows = (await response.text()).trim().split('\r\n').slice(1)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every(row => row.split(',')[2] === '1')).toBe(true)
  })
})

describe('/pulse without a database or a week', () => {
  it('shows no weeks, and the CSV is not found', async () => {
    expect(await loader(loaderArgs('/pulse'))).toEqual({ weeks: [], week: null })
    expect((await csv(loaderArgs('/pulse.csv'))).status).toBe(404)
    const db = await testDatabase()
    expect((await csv(loaderArgs('/pulse.csv?week=2020-01-06', { database: () => db }))).status).toBe(404)
    await db.close()
  })
})

describe('/pulse.csv cells', () => {
  it('quotes commas and quotes, and never lets a spreadsheet read a cell as a formula', async () => {
    const db = await testDatabase()
    const feed = sample('pulse.json')
    feed.events[0].provider = '=HYPERLINK("http://example.org")'
    feed.events[0].service = 'Meals, hot'
    await storePulse(db, feed)
    const text = await (await csv(loaderArgs('/pulse.csv', { database: () => db }))).text()
    expect(text).toContain(',"\'=HYPERLINK(""http://example.org"")","Meals, hot",')
    await db.close()
  })
})

describe('/pulse with a small figure held back', () => {
  it('draws a held-back day only as far as its certain part, and holds the figure back in the CSV', async () => {
    const db = await testDatabase()
    const feed = sample('pulse.json')
    feed.events.push({ ...feed.events[0], id: 'demo-meal-small', provider: 'Sample meal team C' })
    feed.reports.push({ ...feed.reports[0], eventId: 'demo-meal-small', value: 5, reasons: [] })
    await storePulse(db, feed)
    const page = await loader(loaderArgs('/pulse', { database: () => db }))
    const meals = page.week?.units.find(unit => unit.unit === 'meals')
    expect(meals?.days.find(day => day.date === '2026-10-20')).toMatchObject({
      amount: null,
      held: { kind: 'atLeast', atLeast: 124 },
      percent: 62,
    })
    const text = await (await csv(loaderArgs('/pulse.csv', { database: () => db }))).text()
    expect(text).toContain(',Sample meal team C,Community meal,meals,completed,counted,held back: a figure under 10,')
    await db.close()
  })
})
