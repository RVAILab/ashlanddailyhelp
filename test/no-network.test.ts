import { describe, expect, it } from 'vitest'

describe('during tests', () => {
  it('a request that would leave the machine fails', async () => {
    await expect(fetch('https://steward.ashlanddailyhelp.com/feed/listings.json')).rejects.toThrow(
      'tests must not reach the network',
    )
  })
})
