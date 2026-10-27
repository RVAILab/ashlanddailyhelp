import { createHmac } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { validTwilioSignature, within } from './twilio.ts'

const url = 'https://ashlanddailyhelp.com/sms'
const params = { Body: 'Where can I shower?', From: '+15415550100', To: '+15415550199', MessageSid: 'SM123' }
// Twilio's scheme: HMAC-SHA1 of the URL followed by each parameter name and value, sorted by name, in base64.
const reference = (token: string) =>
  createHmac('sha1', token)
    .update(
      url +
        Object.keys(params)
          .sort()
          .map(key => key + params[key as keyof typeof params])
          .join(''),
    )
    .digest('base64')

describe('validTwilioSignature', () => {
  it('accepts the provider’s signature and refuses anything else', async () => {
    expect(await validTwilioSignature(url, params, reference('secret-token'), 'secret-token')).toBe(true)
    expect(await validTwilioSignature(url, params, reference('other-token'), 'secret-token')).toBe(false)
    expect(
      await validTwilioSignature(url, { ...params, Body: 'changed' }, reference('secret-token'), 'secret-token'),
    ).toBe(false)
    expect(await validTwilioSignature(url, params, null, 'secret-token')).toBe(false)
    expect(await validTwilioSignature(url, params, reference('secret-token').slice(0, 8), 'secret-token')).toBe(false)
    expect(await validTwilioSignature(url, params, 'not base64!', 'secret-token')).toBe(false)
  })
})

describe('within', () => {
  it('gives up after the time allowed, so a slow answer never outlasts Twilio’s wait', async () => {
    vi.useFakeTimers()
    const slow = within(12_000, new Promise(() => {}))
    await vi.advanceTimersByTimeAsync(12_000)
    expect(await slow).toBeNull()
    vi.useRealTimers()
    expect(await within(1000, Promise.resolve('answer'))).toBe('answer')
    expect(await within(1000, Promise.reject(new Error('failed')))).toBeNull()
  })
})
