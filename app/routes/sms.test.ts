import { createHmac } from 'node:crypto'
import { type ActionFunctionArgs, RouterContextProvider } from 'react-router'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Answerer } from '../../server/chat/claude.ts'
import { testDatabase } from '../../test/db.ts'
import { storeListings } from '../../test/listings.ts'
import { type AppServices, services } from '../context.ts'
import { action } from './sms.ts'

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

  it('limits by a hash of the number, and never logs or passes on the number itself', async () => {
    const askAllowed = vi.fn(async (_key: string) => false)
    const logs = vi.spyOn(console, 'log').mockImplementation(() => {})
    const response = await action(text('Where can I shower?', { ...ready(), askAllowed }))
    expect(await response.text()).toContain('211')
    const key = askAllowed.mock.calls[0]?.[0] ?? ''
    expect(key).toMatch(/^[0-9a-f]{64}$/)
    expect(key).not.toContain('5415550100')
    expect(JSON.stringify(logs.mock.calls)).not.toContain('5415550100')
    vi.restoreAllMocks()
  })
})
