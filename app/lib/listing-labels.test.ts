import { describe, expect, it } from 'vitest'
import { sampleListingsFeed } from '../../test/feed.ts'
import { listingLabels } from './listing-labels.ts'

const { provenanceLabel: _, ...base } = sampleListingsFeed().listings[0]

describe('listingLabels', () => {
  it('shows where the listing came from and when it was reviewed', () => {
    expect(listingLabels({ ...base, reviewedDate: '2026-10-23' })).toEqual([
      { kind: 'source', text: 'Source reviewed · Oct 23' },
    ])
    expect(listingLabels({ ...base, provenanceLabel: 'Posted by Peace House' })).toEqual([
      { kind: 'source', text: 'Posted by Peace House' },
    ])
  })

  it('puts warnings first: a schedule conflict, then a possible cancellation', () => {
    const labels = listingLabels({
      ...base,
      conflict: true,
      mayBeCanceled: 'May be canceled tonight. Call before traveling.',
    })
    expect(labels.slice(0, 2)).toEqual([
      { kind: 'warning', text: 'Schedule needs checking' },
      { kind: 'warning', text: 'May be canceled tonight. Call before traveling.' },
    ])
  })

  it('says when a listing is not yet confirmed, or is a fictional example', () => {
    expect(listingLabels({ ...base, unconfirmed: true })).toContainEqual({
      kind: 'caution',
      text: 'Not yet confirmed by provider',
    })
    expect(listingLabels({ ...base, tags: ['FICTIONAL_DEMONSTRATION'] })).toContainEqual({
      kind: 'caution',
      text: 'Fictional example',
    })
  })

  it('gives the end time and the last confirmation in Pacific time', () => {
    const labels = listingLabels({ ...base, endsAt: '2026-10-26T14:30:00.000Z', lastConfirmed: '2026-10-23T05:00:00Z' })
    expect(labels).toContainEqual({ kind: 'time', text: 'Ends Mon, Oct 26, 7:30 AM' })
    expect(labels).toContainEqual({ kind: 'source', text: 'Last confirmed Oct 22' })
  })

  it('adds nothing for fields that are absent or false', () => {
    expect(listingLabels({ ...base, conflict: false })).toHaveLength(1)
  })
})
