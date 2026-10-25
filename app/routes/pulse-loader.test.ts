import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { refreshFeedFile } from '../../server/feed/ingest.ts'
import { pulseFile } from '../../server/feed/pulse.ts'
import { testDatabase } from '../../test/db.ts'
import { feedHost, json } from '../../test/feed.ts'
import { loaderArgs } from '../../test/route.ts'
import { loader } from './pulse.tsx'
import { loader as csv } from './pulse-csv.ts'

describe('/pulse', () => {
  let db: Awaited<ReturnType<typeof testDatabase>>
  beforeAll(async () => {
    db = await testDatabase()
    const feed = JSON.parse(readFileSync('test/fixtures/feed-sample/pulse.json', 'utf8'))
    await refreshFeedFile(pulseFile, {
      db,
      baseUrl: 'https://feed.example.org/',
      fetch: feedHost(json(feed)).fetch,
      now: () => new Date(),
    })
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
