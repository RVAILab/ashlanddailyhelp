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
      { url: 'https://ohrahelps.org/a', name: 'ohrahelps.org/a' },
      { url: 'https://www.facebook.com/ohra', name: 'facebook.com/ohra' },
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
        fromFeed: false,
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
        fromFeed: false,
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
      fromFeed: false,
      entries: [
        {
          source: 'Sitio web',
          url: 'https://ohrahelps.org/a',
          ref: 'ohrahelps.org',
          quote: 'Tue & Thu 9-12',
          seen: 'Consultado el 23 de octubre',
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

describe('listingDetail, safely', () => {
  it('never turns a javascript:, data: or other non-web address into a link', () => {
    const detail = listingDetail(
      {
        ...base,
        source: 'javascript:alert(1)',
        sourceUrls: ['data:text/html,hi', 'https://ohrahelps.org/a'],
        provenance: {
          cost: [
            { sourceType: 'website', sourceRef: 'javascript:alert(2)', span: null, observedAt: '2026-10-23T17:00:00Z' },
          ],
        },
      },
      'en',
    )
    expect(detail.sources.map(source => source.url)).toEqual(['https://ohrahelps.org/a'])
    expect(detail.provenance[0]?.entries[0]).toMatchObject({ url: null, ref: 'javascript:alert(2)' })
  })

  it('drops the provenance of a sensitive location’s address, and recognises the wording loosely', () => {
    const detail = listingDetail(
      {
        ...base,
        address: '  location not published.  Call the provider. ',
        provenance: {
          address: [
            {
              sourceType: 'website',
              sourceRef: 'https://example.org/',
              span: '123 Hidden Ln',
              observedAt: '2026-10-23T17:00:00Z',
            },
          ],
          cost: [
            {
              sourceType: 'website',
              sourceRef: 'https://example.org/',
              span: 'Free',
              observedAt: '2026-10-23T17:00:00Z',
            },
          ],
        },
      },
      'en',
    )
    expect(detail.location).toEqual({ published: false })
    expect(JSON.stringify(detail)).not.toContain('123 Hidden Ln')
    expect(detail.provenance.map(field => field.field)).toEqual(['Cost'])
  })
})

describe('listingDetail, wording', () => {
  it('says "Not confirmed" for the steward’s "Unknown" and for an empty description', () => {
    const detail = listingDetail({ ...base, capacity: 'Unknown', description: '' }, 'es')
    expect(detail.fields.find(field => field.key === 'capacity')).toMatchObject({
      text: 'No confirmado',
      fromFeed: false,
    })
    expect(detail.description).toEqual({ text: 'No confirmado', fromFeed: false })
  })

  it('maps the street address within a longer description, and nothing without one', () => {
    expect(listingDetail({ ...base, address: 'OHRA Center: 2350 Ashland St, Ashland' }, 'en').location).toEqual({
      published: true,
      mapUrl: 'https://www.google.com/maps/search/?api=1&query=2350%20Ashland%20St%2C%20Ashland',
    })
    expect(listingDetail({ ...base, address: 'Room 3, behind the church' }, 'en').location).toEqual({
      published: true,
      mapUrl: null,
    })
  })

  it('names each source by its site and page, so two pages on one site read differently', () => {
    const detail = listingDetail(
      { ...base, source: 'https://ohrahelps.org/get-help/', sourceUrls: ['https://ohrahelps.org/events/'] },
      'en',
    )
    expect(detail.sources.map(source => source.name)).toEqual(['ohrahelps.org/get-help', 'ohrahelps.org/events'])
  })

  it('lists provenance in the order of the details, skipping fields with no sources', () => {
    const seen = {
      sourceType: 'website',
      sourceRef: 'https://ohrahelps.org/',
      span: null,
      observedAt: '2026-10-23T17:00:00Z',
    } as const
    const detail = listingDetail({ ...base, provenance: { cost: [seen], schedule: [seen], access: [] } }, 'en')
    expect(detail.provenance.map(field => field.field)).toEqual(['When', 'Cost'])
  })

  it('gives the review date once: in the labels, or with the sources when a provenance label replaces it', () => {
    const { provenanceLabel: _, ...unlabelled } = base
    expect(listingDetail(unlabelled, 'en').reviewed).toBeNull()
    expect(listingDetail({ ...base, provenanceLabel: 'Posted by OHRA' }, 'en').reviewed).toBe('Source reviewed Oct 23')
  })
})

describe('listingDetail with stored translations', () => {
  it('shows the Spanish where a translation exists, marks it translated, and keeps the rest English', () => {
    const translated = new Map([
      [base.schedule.trim(), 'El sitio web indica martes y jueves.'],
      [base.description.trim(), 'Servicios de regadera y lavandería.'],
    ])
    const detail = listingDetail(base, 'es', translated)
    expect(detail.translated).toBe(true)
    expect(detail.description).toEqual({
      text: 'Servicios de regadera y lavandería.',
      fromFeed: false,
      translated: true,
    })
    expect(detail.fields.find(field => field.key === 'schedule')).toMatchObject({
      text: 'El sitio web indica martes y jueves.',
      fromFeed: false,
      translated: true,
    })
    expect(detail.fields.find(field => field.key === 'access')).toMatchObject({ text: base.access, fromFeed: true })
  })

  it('is not translated without translations', () => {
    expect(listingDetail(base, 'es').translated).toBe(false)
  })
})
