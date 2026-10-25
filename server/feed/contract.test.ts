import { describe, expect, it } from 'vitest'
import { sampleListingsFeed } from '../../test/feed.ts'
import { ListingsFile } from './contract.ts'

describe('ListingsFile', () => {
  it('keeps proposed opening windows (steward #39) and drops other unknown fields', () => {
    const feed = sampleListingsFeed()
    const openings = [
      {
        startsAt: '2026-10-26T13:00:00-07:00',
        endsAt: '2026-10-26T15:00:00-07:00',
        status: 'canceled',
        note: 'Canceled.',
      },
    ]
    const parsed = ListingsFile.parse({ ...feed, listings: [{ ...feed.listings[0], openings, somethingNew: 1 }] })
    expect(parsed.listings[0]?.openings).toEqual(openings)
    expect(parsed.listings[0]).not.toHaveProperty('somethingNew')
  })

  it('still applies the steward’s own checks to the rest', () => {
    const feed = sampleListingsFeed()
    expect(ListingsFile.safeParse({ ...feed, listings: [feed.listings[0], feed.listings[0]] }).success).toBe(false)
    expect(
      ListingsFile.safeParse({ ...feed, listings: [{ ...feed.listings[0], openings: [{ startsAt: 'soon' }] }] })
        .success,
    ).toBe(false)
  })
})
