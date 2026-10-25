import { z } from 'zod'
import { FeedListing, ListingsFeed } from '../../contract/steward/feed.ts'

// The steward writes with strict schemas; reading, we drop fields we don't know, since a minor version may add some.
export const ListingsFile = z
  .object({ ...ListingsFeed.shape, listings: z.array(z.object(FeedListing.shape)) })
  .superRefine((feed, ctx) => {
    const seen = new Set<string>()
    for (const listing of feed.listings) {
      if (seen.has(listing.id)) ctx.addIssue({ code: 'custom', message: `duplicate listing id ${listing.id}` })
      seen.add(listing.id)
    }
  })

export type ListingsFile = z.infer<typeof ListingsFile>

export const KNOWN_MAJOR = '1'
