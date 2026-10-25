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

// Proposed in steward #62 and not yet in its contract: the listing's map location.
export const Geo = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  source: z.enum(['geocoded', 'provider']),
  matchedAddress: z.string().optional(),
  by: z.string().optional(),
  observedAt: Instant.optional(),
})

// The steward's wording for a location that must not be published (FEED.md), matched loosely.
const sensitive = (address: string) =>
  address.trim().replace(/\s+/g, ' ').toLowerCase() === 'location not published. call the provider.'

// The steward writes with strict schemas, but a minor version may add fields at any depth. Reading, we drop fields we
// don't know (keeping the proposed `openings`), then apply the steward's own schema, refinements included, to the rest.
const KnownListingsFields = z.object({
  ...ListingsFeed.shape,
  listings: z.array(
    z.object({
      ...FeedListing.shape,
      provenance: z.record(z.string(), z.array(z.object(FeedProvenance.shape))).optional(),
      openings: z.array(Opening).optional(),
      geo: Geo.optional(),
    }),
  ),
})

export const ListingsFile = KnownListingsFields.superRefine((file, ctx) => {
  const steward = ListingsFeed.safeParse({
    ...file,
    listings: file.listings.map(({ openings: _, geo: __, ...rest }) => rest),
  })
  if (!steward.success)
    for (const issue of steward.error.issues) ctx.addIssue({ code: 'custom', message: issue.message, path: issue.path })
}).transform(file => ({
  ...file,
  // A sensitive location is never placed on a map, even if a feed ever sends its coordinates.
  listings: file.listings.map(
    ({ geo, ...listing }): StoredListing => (geo && !sensitive(listing.address) ? { ...listing, geo } : listing),
  ),
}))

export type ListingsFile = z.infer<typeof KnownListingsFields>
export type StoredListing = ListingsFile['listings'][number]

// Proposed in steward #40 and not yet in its contract: dated one-off events.
const Day = z.iso.date()
const Text = z.string()

export const FeedEvent = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]+$/),
  title: z.string().min(1),
  provider: z.string().min(1),
  categories: z.array(z.enum(['food', 'housing', 'hygiene', 'health', 'essentials'])).min(1),
  description: Text,
  date: Day,
  startsAt: Instant.optional(),
  endsAt: Instant.optional(),
  address: Text,
  area: Text,
  cost: Text,
  requirements: Text,
  listingId: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]*$/)
    .optional(),
  seriesId: z.string().optional(),
  phone: z.string().optional(),
  source: z.url().optional(),
  status: z.enum(['may_be_canceled', 'canceled']).optional(),
  note: z.string().optional(),
  provenanceLabel: z.string().optional(),
  unconfirmed: z.boolean().optional(),
  conflict: z.boolean().optional(),
})

export type FeedEvent = z.infer<typeof FeedEvent>

export const EventsFile = z.object({
  schemaVersion: z.string().regex(/^1\.\d+$/),
  generatedAt: Instant,
  dataset: z.enum(['FICTIONAL_DEMONSTRATION', 'LIVE']),
  events: z.array(FeedEvent),
})

export type EventsFile = z.infer<typeof EventsFile>

// Proposed in steward #41 and not yet in its contract: time-bound notices.
export const FeedAlert = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]+$/),
  kind: z.enum(['shelter_opening', 'closure', 'cancellation', 'weather', 'other']),
  severity: z.enum(['urgent', 'notice']),
  title: z.string().min(1),
  message: z.string().min(1),
  startsAt: Instant,
  endsAt: Instant,
  area: z.string(),
  provenanceLabel: z.string(),
  coverage: z.array(z.string()).optional(),
  listingIds: z.array(z.string()).optional(),
  eventIds: z.array(z.string()).optional(),
  status: z.enum(['may_be_canceled', 'canceled', 'withdrawn']).optional(),
  note: z.string().optional(),
  source: z.url().optional(),
  unconfirmed: z.boolean().optional(),
})

export type FeedAlert = z.infer<typeof FeedAlert>

export const AlertsFile = z.object({
  schemaVersion: z.string().regex(/^1\.\d+$/),
  generatedAt: Instant,
  dataset: z.enum(['FICTIONAL_DEMONSTRATION', 'LIVE']),
  alerts: z.array(FeedAlert),
})

export type AlertsFile = z.infer<typeof AlertsFile>
