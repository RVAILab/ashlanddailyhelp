import { z } from 'zod'
import { FeedListing, FeedProvenance, ListingsFeed } from '../../contract/steward/feed.ts'

export const KNOWN_MAJOR = '1'

const Instant = z.iso.datetime({ offset: true })

// Proposed in steward #39 and not yet in its contract: a listing's opening windows for the next days.
export const Opening = z.object({
  startsAt: Instant,
  endsAt: Instant.optional(),
  location: z.string().optional(),
  status: z.enum(['may_be_canceled', 'canceled']).optional(),
  note: z.string().optional(),
})

export type Opening = z.infer<typeof Opening>

// The steward writes with strict schemas, but a minor version may add fields at any depth. Reading, we drop fields we
// don't know (keeping the proposed `openings`), then apply the steward's own schema, refinements included, to the rest.
const KnownListingsFields = z.object({
  ...ListingsFeed.shape,
  listings: z.array(
    z.object({
      ...FeedListing.shape,
      provenance: z.record(z.string(), z.array(z.object(FeedProvenance.shape))).optional(),
      openings: z.array(Opening).optional(),
    }),
  ),
})

export const ListingsFile = KnownListingsFields.superRefine((file, ctx) => {
  const steward = ListingsFeed.safeParse({ ...file, listings: file.listings.map(({ openings: _, ...rest }) => rest) })
  if (!steward.success)
    for (const issue of steward.error.issues) ctx.addIssue({ code: 'custom', message: issue.message, path: issue.path })
})

export type ListingsFile = z.infer<typeof KnownListingsFields>
export type StoredListing = ListingsFile['listings'][number]
