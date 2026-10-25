import { describe, expect, it } from 'vitest'
import { sampleListingsFeed } from '../../test/feed.ts'
import { listingDetail } from './listing-detail.ts'

const base = sampleListingsFeed().listings.find((listing: { id: string }) => listing.id === 'ohra-showers')

describe('listingDetail', () => {
  it('gives every field in the steward’s words, with "Not confirmed" for anything empty', () => {
    const detail = listingDetail({ ...base, capacity: '  ' }, 'en')
    const field = (key: string) => detail.fields.find(entry => entry.key === key)
    expect(field('schedule')).toEqual({ key: 'schedule', label: 'When', text: base.schedule, fromFeed: true })
    expect(field('capacity')).toEqual({ key: 'capacity', label: 'Capacity', text: 'Not confirmed', fromFeed: false })
    expect(field('categories')).toEqual({
      key: 'categories',
      label: 'Kind of help',
      text: 'Showers and hygiene',
      fromFeed: false,
    })
    expect(detail.fields.map(entry => entry.key)).toEqual([
      'categories',
      'schedule',
      'address',
      'access',
      'requirements',
      'cost',
      'accessibility',
      'capacity',
      'area',
      'coverage',
    ])
  })

  it('links a street address to a map', () => {
    const detail = listingDetail({ ...base, address: '2350 Ashland St, Ashland, OR' }, 'en')
    expect(detail.location).toEqual({
      published: true,
      mapUrl: 'https://www.google.com/maps/search/?api=1&query=2350%20Ashland%20St%2C%20Ashland%2C%20OR',
    })
  })

  it('gives no map for a description of a place without a street number', () => {
    expect(listingDetail({ ...base, address: 'Alley entrance behind the church.' }, 'en').location).toEqual({
      published: true,
      mapUrl: null,
    })
  })

  it('never maps a sensitive location, and says so in the page’s language', () => {
    const sensitive = { ...base, address: 'Location not published. Call the provider.' }
    expect(listingDetail(sensitive, 'en').location).toEqual({ published: false })
    expect(listingDetail(sensitive, 'en').fields.find(entry => entry.key === 'address')).toMatchObject({
      text: 'Location not published. Call the provider.',
      fromFeed: false,
    })
    expect(listingDetail(sensitive, 'es').fields.find(entry => entry.key === 'address')?.text).toBe(
      'Ubicación no publicada. Llame a la organización.',
    )
  })

  it('lists the sources, the main one first, without repeats', () => {
    const detail = listingDetail(
      {
        ...base,
        source: 'https://ohrahelps.org/a',
        sourceUrls: ['https://ohrahelps.org/a', 'https://www.facebook.com/ohra'],
      },
      'en',
    )
    expect(detail.sources).toEqual([
      { url: 'https://ohrahelps.org/a', host: 'ohrahelps.org' },
      { url: 'https://www.facebook.com/ohra', host: 'facebook.com' },
    ])
  })

  it('says where each detail comes from, quoting the source', () => {
    const provenance = {
      schedule: [
        {
          sourceType: 'website',
          sourceRef: 'https://ohrahelps.org/a',
          span: 'Tue & Thu 9-12',
          observedAt: '2026-10-23T17:00:00Z',
        },
      ],
      cost: [
        {
          sourceType: 'scanned_packet',
          sourceRef: 'Jackson County packet, page 5',
          span: null,
          observedAt: '2026-10-22T17:00:00Z',
        },
      ],
    }
    const detail = listingDetail({ ...base, provenance }, 'en')
    expect(detail.provenance).toEqual([
      {
        field: 'When',
        entries: [
          {
            source: 'Website',
            url: 'https://ohrahelps.org/a',
            ref: 'ohrahelps.org',
            quote: 'Tue & Thu 9-12',
            seen: 'Seen Oct 23',
          },
        ],
      },
      {
        field: 'Cost',
        entries: [
          {
            source: 'County resource packet',
            url: null,
            ref: 'Jackson County packet, page 5',
            quote: null,
            seen: 'Seen Oct 22',
          },
        ],
      },
    ])
    expect(listingDetail({ ...base, provenance }, 'es').provenance[0]).toEqual({
      field: 'Cuándo',
      entries: [
        {
          source: 'Sitio web',
          url: 'https://ohrahelps.org/a',
          ref: 'ohrahelps.org',
          quote: 'Tue & Thu 9-12',
          seen: 'Visto el 23 de octubre',
        },
      ],
    })
  })

  it('gives no provenance when the feed has none', () => {
    expect(listingDetail(base, 'en').provenance).toEqual([])
  })

  it('carries the evidence labels and the review date', () => {
    const detail = listingDetail({ ...base, conflict: true, reviewedDate: '2026-10-23' }, 'en')
    expect(detail.labels[0]).toEqual({ kind: 'warning', text: 'Schedule needs checking' })
    expect(detail.reviewed).toBe('Source reviewed Oct 23')
  })
})
