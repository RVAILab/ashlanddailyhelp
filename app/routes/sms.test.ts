import { createHash, createHmac } from 'node:crypto'
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
import { action } from './sms.ts'

afterEach(() => {
  vi.useRealTimers()
})

const TOKEN = 'test-auth-token'
const URL_ = 'https://ashlanddailyhelp.com/sms'

const answerer: Answerer = {
  answer: async () => ({
    known: true,
    answer: 'Their website lists showers on Tuesdays & Thursdays.',
    cited: ['ohra-showers'],
    usage: { inputTokens: 1, outputTokens: 1 },
  }),
}

function text(body: string, provided: Partial<AppServices>, { sign = TOKEN } = {}): ActionFunctionArgs {
  const params = { Body: body, From: '+15415550100', To: '+15415550199', MessageSid: 'SM1' }
  const signature = createHmac('sha1', sign)
    .update(
      URL_ +
        Object.keys(params)
          .sort()
          .map(key => key + params[key as keyof typeof params])
          .join(''),
    )
    .digest('base64')
  const context = new RouterContextProvider()
  context.set(services, { database: () => null, ...provided })
  const request = new Request(URL_, {
    method: 'POST',
    body: new URLSearchParams(params),
    headers: { 'X-Twilio-Signature': signature, 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return { request, url: new URL(URL_), pattern: '/sms', params: {}, context }
}

async function storeEvents(db: Awaited<ReturnType<typeof testDatabase>>) {
  await refreshFeedFile(eventsFile, {
    db,
    baseUrl: 'https://feed.example.org/',
    fetch: feedHost(json(JSON.parse(readFileSync('test/fixtures/proposed/events.json', 'utf8')))).fetch,
    now: () => new Date(),
  })
}

describe('/sms', () => {
  let db: Awaited<ReturnType<typeof testDatabase>>
  beforeAll(async () => {
    db = await testDatabase()
    await storeListings(db)
  })
  afterAll(() => db.close())
  const ready = () => ({ database: () => db, answerer, smsAuthToken: TOKEN })

  it('answers a text with a short TwiML message naming each place’s address and phone', async () => {
    const response = await action(text('Where can I shower?', ready()))
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/xml; charset=utf-8')
    const body = await response.text()
    expect(body).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?><Response><Message>/)
    expect(body).toContain('Tuesdays &amp; Thursdays')
    expect(body).toContain('541-631-2235')
  })

  it('lists no place for an answer that cites an event rather than a listing', async () => {
    // The sample events are on Oct 25 and 26, 2026.
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-25T18:00:00Z') })
    await storeEvents(db)
    const events: Answerer = {
      answer: async () => ({
        known: true,
        answer: 'A pancake breakfast is listed for Sunday.',
        cited: ['breakfast-1'],
        usage: { inputTokens: 1, outputTokens: 1 },
      }),
    }
    const body = await (await action(text('Is there a pancake breakfast?', { ...ready(), answerer: events }))).text()
    expect(body).toContain('A pancake breakfast is listed for Sunday.')
    expect(body).not.toMatch(/Pancake breakfast, /)
  })

  it('refuses a text that isn’t signed by the provider', async () => {
    expect((await action(text('hi', ready(), { sign: 'wrong' }))).status).toBe(403)
  })

  it('isn’t open until a number is set up', async () => {
    expect((await action(text('hi', { database: () => db, answerer }))).status).toBe(503)
  })

  it('answers HELP with what the number does and the crisis numbers, and STOP without a message', async () => {
    const help = await (await action(text('HELP', ready()))).text()
    expect(help).toContain('988')
    expect(help).toContain('STOP')
    expect(await (await action(text('stop', ready()))).text()).toBe('<?xml version="1.0" encoding="UTF-8"?><Response/>')
  })

  it('welcomes a sender back after START, and answers an empty text with HELP', async () => {
    expect(await (await action(text('START', ready()))).text()).toContain('You can text Daily Help again.')
    expect(await (await action(text('   ', ready()))).text()).toContain('Reply STOP to stop.')
  })

  it('sends the 211 answer when the answer takes longer than Twilio waits', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const stuck: Answerer = { answer: () => new Promise(() => {}) }
    let done = false
    const reply = action(text('Where can I shower?', { ...ready(), answerer: stuck })).finally(() => {
      done = true
    })
    // The signature check and the database answer on the real clock, so time moves on only between their steps.
    while (!done) {
      await new Promise(resolve => setImmediate(resolve))
      await vi.advanceTimersByTimeAsync(1_000)
    }
    const body = await (await reply).text()
    expect(body).toContain('211')
    expect(body).not.toContain('541-631-2235')
    expect(errors).toHaveBeenCalledWith('sms: no answer within', 12_000, 'ms')
    vi.restoreAllMocks()
  })

  it('limits by a hash of the number, and never logs or passes on the number itself', async () => {
    const askAllowed = vi.fn(async (_key: string) => false)
    const logs = vi.spyOn(console, 'log').mockImplementation(() => {})
    const response = await action(text('Where can I shower?', { ...ready(), askAllowed }))
    expect(await response.text()).toContain('211')
    const key = askAllowed.mock.calls[0]?.[0] ?? ''
    expect(key).toMatch(/^[0-9a-f]{64}$/)
    expect(key).not.toContain('5415550100')
    expect(key).not.toBe(createHash('sha256').update('sms:+15415550100').digest('hex'))
    expect(JSON.stringify(logs.mock.calls)).not.toContain('5415550100')
    vi.restoreAllMocks()
  })
})
