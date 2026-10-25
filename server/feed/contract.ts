import { z } from 'zod'
import { FeedListing, FeedProvenance, ListingsFeed } from '../../contract/steward/feed.ts'

export const KNOWN_MAJOR = '1'

// The steward writes with strict schemas, but a minor version may add fields at any depth. Reading, we first drop
// fields we don't know, then apply the steward's own schema, refinements included, to what is left.
const KnownListingsFields = z.object({
  ...ListingsFeed.shape,
  listings: z.array(
    z.object({
      ...FeedListing.shape,
      provenance: z.record(z.string(), z.array(z.object(FeedProvenance.shape))).optional(),
    }),
  ),
})

export const ListingsFile = KnownListingsFields.pipe(ListingsFeed)

export type ListingsFile = z.infer<typeof ListingsFeed>
