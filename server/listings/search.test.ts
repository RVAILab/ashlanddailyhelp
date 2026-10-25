import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { testDatabase } from '../../test/db.ts'
import { sampleListingsFeed } from '../../test/feed.ts'
import { storeListings } from '../../test/listings.ts'
import { searchListings } from './search.ts'

const now = new Date('2026-10-25T18:00:00Z')
type Db = Awaited<ReturnType<typeof testDatabase>>
type Listing = { id: string }

describe('searchListings', () => {
  let db: Db
  let feed: ReturnType<typeof sampleListingsFeed>
  beforeAll(async () => {
    db = await testDatabase()
    const sample = sampleListingsFeed()
    const ended = {
      ...sample.listings[1],
      id: 'ended-pop-up',
      name: 'Ended shower pop-up',
      endsAt: '2026-10-25T17:00:00.000Z',
    }
    feed = await storeListings(db, { ...sample, listings: [...sample.listings, ended] })
  })
  afterAll(() => db.close())

  const ids = async (filters: Parameters<typeof searchListings>[1]) =>
    (await searchListings(db, filters, now)).map(listing => listing.id)
  const current = () =>
    feed.listings.filter((listing: Listing) => listing.id !== 'ended-pop-up').map((listing: Listing) => listing.id)

  it('gives every current listing in feed order without filters', async () => {
    expect(await ids({})).toEqual(current())
  })

  it('leaves out listings past their endsAt, and keeps them until then', async () => {
    expect(await ids({ query: 'pop-up' })).toEqual([])
    const earlier = await searchListings(db, { query: 'pop-up' }, new Date('2026-10-25T16:00:00Z'))
    expect(earlier.map(listing => listing.id)).toEqual(['ended-pop-up'])
  })

  it('filters by category', async () => {
    expect(await ids({ category: 'hygiene' })).toEqual(['ohra-showers'])
  })

  it('covers Ashland: listings there, and county-wide or statewide ones that include it', async () => {
    const all = await ids({})
    expect(all).toContain('ohra-showers')
    expect(all).toContain('access-pantries')
    expect(all).toContain('211-directory')
  })

  it('leaves out listings that serve only other towns', async () => {
    const other = await testDatabase()
    const sample = sampleListingsFeed()
    await storeListings(other, {
      ...sample,
      listings: [
        sample.listings[0],
        { ...sample.listings[1], id: 'grants-pass-only', area: 'Grants Pass', coverage: ['Grants Pass'] },
      ],
    })
    expect((await searchListings(other, {}, now)).map(listing => listing.id)).toEqual([sample.listings[0].id])
    await other.close()
  })

  it('matches words in the name, provider, description and tags', async () => {
    expect(await ids({ query: 'fresh start' })).toEqual(['ohra-showers'])
    expect(await ids({ query: 'Rogue Retreat' })).toContain('rogue-retreat')
    expect(await ids({ query: 'eligibility' })).toEqual(['rogue-retreat'])
    expect(await ids({ query: 'documents' })).toEqual(['ohra-navigation'])
  })

  it('matches the start of a word, so "show" finds showers and "navigat" finds navigation', async () => {
    expect(await ids({ query: 'show' })).toContain('ohra-showers')
    expect(await ids({ query: 'navigat' })).toEqual(expect.arrayContaining(['ohra-navigation', 'ohra-shelter']))
  })

  it('requires every word', async () => {
    expect(await ids({ query: 'OHRA showers' })).toEqual(['ohra-showers'])
  })

  it('still finds listings when every word is a common one', async () => {
    expect(await ids({ query: 'the' })).not.toEqual([])
  })

  it('ranks a match in the name above one in the description', async () => {
    const ranked = await testDatabase()
    const sample = sampleListingsFeed()
    const [one, two] = sample.listings
    await storeListings(ranked, {
      ...sample,
      listings: [
        { ...one, id: 'in-description', description: 'Ask about the quokka program.' },
        { ...two, id: 'in-name', name: 'Quokka breakfast' },
      ],
    })
    const found = await searchListings(ranked, { query: 'quokka' }, now)
    expect(found.map(listing => listing.id)).toEqual(['in-name', 'in-description'])
    await ranked.close()
  })

  it('treats punctuation and query syntax as plain text', async () => {
    expect(await ids({ query: "food & (shelter | !') :*" })).toEqual(await ids({ query: 'food shelter' }))
    expect(await ids({ query: '   ' })).toEqual(current())
    expect(await ids({ query: '!!!' })).toEqual(current())
  })

  it('finds nothing for words no listing has', async () => {
    expect(await ids({ query: 'zzyzx' })).toEqual([])
  })
})
