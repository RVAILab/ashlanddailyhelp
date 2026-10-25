import { type ActionFunctionArgs, RouterContextProvider } from 'react-router'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Answerer } from '../../server/chat/claude.ts'
import { testDatabase } from '../../test/db.ts'
import { storeListings } from '../../test/listings.ts'
import { type AppServices, services } from '../context.ts'
import { action } from './ask.tsx'

const answerer: Answerer = {
  answer: async () => ({
    known: true,
    answer: 'Their website lists showers on Tuesdays and Thursdays.',
    cited: ['ohra-showers'],
    usage: { inputTokens: 1, outputTokens: 1 },
  }),
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
