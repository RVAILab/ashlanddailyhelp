import { describe, expect, it } from 'vitest'
import { sampleListingsFeed } from '../../test/feed.ts'
import { ListingsFile } from './contract.ts'

describe('ListingsFile', () => {
  it('keeps opening windows (feed 1.4) and drops other unknown fields', () => {
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

  const geo = { lat: 42.19406, lng: -122.70948, source: 'geocoded', by: 'census:Public_AR_Current' }

  it('keeps proposed map coordinates (steward #62)', () => {
    const feed = sampleListingsFeed()
    const parsed = ListingsFile.parse({ ...feed, listings: [{ ...feed.listings[0], geo }] })
    expect(parsed.listings[0]?.geo).toEqual(geo)
  })

  it('refuses coordinates off the globe', () => {
    const feed = sampleListingsFeed()
    const off = { ...feed, listings: [{ ...feed.listings[0], geo: { ...geo, lat: 142 } }] }
    expect(ListingsFile.safeParse(off).success).toBe(false)
  })

  it('never keeps coordinates for a sensitive location, whatever the feed sends', () => {
    const feed = sampleListingsFeed()
    const provenance = {
      geo: [
        {
          sourceType: 'website',
          sourceRef: 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=12+Hidden+Ln',
          observedAt: '2026-10-25T21:40:00Z',
          span: null,
        },
      ],
    }
    const hidden = { ...feed.listings[0], address: 'Location not published. Call the provider.', geo, provenance }
    const parsed = ListingsFile.parse({ ...feed, listings: [hidden] }).listings[0]
    expect(parsed).not.toHaveProperty('geo')
    expect(parsed?.provenance).not.toHaveProperty('geo')
  })
})
