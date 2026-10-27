import { readFileSync } from 'node:fs'
import { type ActionFunctionArgs, RouterContextProvider } from 'react-router'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Answerer } from '../../server/chat/claude.ts'
import { eventsFile } from '../../server/feed/events.ts'
import { refreshFeedFile } from '../../server/feed/ingest.ts'
import { testDatabase } from '../../test/db.ts'
import { feedHost, json } from '../../test/feed.ts'
import { storeListings } from '../../test/listings.ts'
import { type AppServices, services } from '../context.ts'
import { action } from './ask.tsx'

afterEach(() => {
  vi.useRealTimers()
})

const answerer: Answerer = {
  answer: async () => ({
    known: true,
    answer: 'Their website lists showers on Tuesdays and Thursdays.',
    cited: ['ohra-showers'],
    usage: { inputTokens: 1, outputTokens: 1 },
  }),
}

async function storeEvents(db: Awaited<ReturnType<typeof testDatabase>>) {
  await refreshFeedFile(eventsFile, {
    db,
    baseUrl: 'https://feed.example.org/',
    fetch: feedHost(json(JSON.parse(readFileSync('test/fixtures/proposed/events.json', 'utf8')))).fetch,
    now: () => new Date(),
  })
}

function post(question: string, provided: Partial<AppServices>, path = '/ask'): ActionFunctionArgs {
  const context = new RouterContextProvider()
  context.set(services, { database: () => null, ...provided })
  const url = new URL(path, 'https://ashlanddailyhelp.com')
  const request = new Request(url, {
    method: 'POST',
    body: new URLSearchParams({ q: question }),
    headers: { 'CF-Connecting-IP': '203.0.113.7' },
  })
  return { request, url, pattern: url.pathname, params: {}, context }
}

describe('/ask action', () => {
  let db: Awaited<ReturnType<typeof testDatabase>>
  beforeAll(async () => {
    db = await testDatabase()
    await storeListings(db)
  })
  afterAll(() => db.close())

  it('answers from the directory, with each cited listing', async () => {
    const result = await action(post('Where can I take a shower?', { database: () => db, answerer }))
    expect(result).toMatchObject({ state: 'answered', question: 'Where can I take a shower?' })
    if (result.state !== 'answered') throw new Error('not answered')
    expect(result.answer.citations.map(citation => citation.id)).toEqual(['ohra-showers'])
    expect(result.answer.paragraphs.join(' ')).toContain('Their website lists showers')
  })

  it('asks for a question when there is none', async () => {
    expect(await action(post('   ', { database: () => db, answerer }))).toMatchObject({ state: 'empty' })
    const context = new RouterContextProvider()
    context.set(services, { database: () => db, answerer })
    const url = new URL('https://ashlanddailyhelp.com/ask')
    const request = new Request(url, { method: 'POST', body: new URLSearchParams() })
    expect(await action({ request, url, pattern: '/ask', params: {}, context })).toMatchObject({ state: 'empty' })
  })

  it('names no site and gives no link for a cited event without a source', async () => {
    // The sample events are on Oct 25 and 26, 2026.
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-25T18:00:00Z') })
    await storeEvents(db)
    const events: Answerer = {
      answer: async () => ({
        known: true,
        answer: 'The coat giveaway was canceled.',
        cited: ['giveaway-1'],
        usage: { inputTokens: 1, outputTokens: 1 },
      }),
    }
    const result = await action(post('Is there a coat giveaway?', { database: () => db, answerer: events }))
    if (result.state !== 'answered') throw new Error('not answered')
    expect(result.answer.citations).toEqual([
      { id: 'giveaway-1', name: 'Coat giveaway', site: null, sourceUrl: null, listingId: null },
    ])
  })

  it('gives no listings date when no listings have loaded yet', async () => {
    const empty = await testDatabase()
    const result = await action(post('Where can I take a shower?', { database: () => empty, answerer }))
    if (result.state !== 'answered') throw new Error('not answered')
    expect(result.answer).toMatchObject({ known: false, asOf: null, citations: [] })
    expect(result.answer.paragraphs.join(' ')).toContain('211')
    await empty.close()
  })

  it('says asking isn’t available when chat isn’t set up', async () => {
    expect(await action(post('showers?', { database: () => db, answerer: null }))).toMatchObject({
      state: 'unavailable',
    })
    expect(await action(post('showers?', { database: () => null, answerer }))).toMatchObject({ state: 'unavailable' })
  })

  it('asks people to wait when the connection has asked too often, by its address only', async () => {
    const askAllowed = vi.fn(async () => false)
    expect(await action(post('showers?', { database: () => db, answerer, askAllowed }))).toMatchObject({
      state: 'limited',
    })
    expect(askAllowed).toHaveBeenCalledWith('203.0.113.7')
  })

  it('keeps questions to a sensible length', async () => {
    const result = await action(post('x'.repeat(2000), { database: () => db, answerer }))
    expect(result.state === 'answered' ? result.question.length : 0).toBe(300)
  })
})
