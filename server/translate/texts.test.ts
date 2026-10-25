import { describe, expect, it } from 'vitest'
import { sampleListingsFeed } from '../../test/feed.ts'
import { hashText, translatableTexts } from './texts.ts'

const listing = sampleListingsFeed().listings.find((entry: { id: string }) => entry.id === 'ohra-showers')

describe('translatableTexts', () => {
  it('collects the prose a reader needs, never names, addresses, phones or links', () => {
    const texts = translatableTexts({
      ...listing,
      capacity: 'About 20 showers a day.',
      mayBeCanceled: 'May be canceled tonight.',
    })
    expect(texts.map(text => text.field)).toEqual([
      'description',
      'schedule',
      'access',
      'requirements',
      'cost',
      'accessibility',
      'capacity',
      'mayBeCanceled',
    ])
    const sent = texts.map(text => text.english).join('\n')
    for (const kept of [listing.name, listing.address, listing.phone, listing.source]) expect(sent).not.toContain(kept)
  })

  it('skips empty text and the steward’s "Unknown"', () => {
    const fields = translatableTexts({ ...listing, capacity: 'Unknown', cost: '  ' }).map(text => text.field)
    expect(fields).not.toContain('capacity')
    expect(fields).not.toContain('cost')
  })
})

describe('hashText', () => {
  it('is stable, depends on the language, and ignores surrounding space', async () => {
    expect(await hashText('es', 'Free')).toBe(await hashText('es', ' Free '))
    expect(await hashText('es', 'Free')).not.toBe(await hashText('es', 'Free.'))
    expect(await hashText('es', 'Free')).toMatch(/^[0-9a-f]{64}$/)
  })
})
