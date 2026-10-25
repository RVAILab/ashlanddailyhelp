import { z } from 'zod'
import {
  FeedListing,
  FeedOpening,
  FeedProvenance,
  ListingsFeed,
  PulseEvent,
  PulseFeed,
  PulseReport,
  PulseSnapshot,
  WeekSnapshot,
} from '../../contract/steward/feed.ts'

export const KNOWN_MAJOR = '1'

const Instant = z.iso.datetime({ offset: true })

// Read loosely (unknown fields dropped), then checked by the steward's own schema with the rest of the listing.
export const Opening = z.object(FeedOpening.shape)

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
// don't know (keeping the proposed `geo`), then apply the steward's own schema, refinements included, to the rest.
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
    listings: file.listings.map(({ geo: _, ...rest }) => rest),
  })
  if (!steward.success)
    for (const issue of steward.error.issues) ctx.addIssue({ code: 'custom', message: issue.message, path: issue.path })
}).transform(file => ({
  ...file,
  // A sensitive location is never placed on a map, even if a feed ever sends its coordinates or their sources (a
  // geocoder's link carries the address).
  listings: file.listings.map(({ geo, provenance, ...listing }): StoredListing => {
    if (!sensitive(listing.address))
      return { ...listing, ...(geo ? { geo } : {}), ...(provenance ? { provenance } : {}) }
    if (!provenance) return listing
    const { geo: _, ...kept } = provenance
    return { ...listing, provenance: kept }
  }),
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

// pulse.json and the frozen weeks/ files, read the same way: unknown fields dropped at every level, then the steward's
// own schema, refinements included, applied to the rest.
const pulseArrays = {
  events: z.array(z.object(PulseEvent.shape)),
  reports: z.array(z.object(PulseReport.shape)),
}
const Snapshot = z.object(PulseSnapshot.shape)

function stewardCheck(schema: z.ZodType) {
  return (file: unknown, ctx: z.RefinementCtx) => {
    const steward = schema.safeParse(file)
    if (!steward.success)
      for (const issue of steward.error.issues)
        ctx.addIssue({ code: 'custom', message: issue.message, path: issue.path })
  }
}

export const PulseFile = z
  .object({
    ...PulseFeed.shape,
    ...pulseArrays,
    snapshots: z.array(Snapshot),
    publishedWeeks: z.array(Snapshot).optional(),
  })
  .superRefine(stewardCheck(PulseFeed))

export type PulseFile = z.infer<typeof PulseFile>

export const WeekFile = z
  .object({
    ...WeekSnapshot.shape,
    ...pulseArrays,
    amounts: z.array(z.object(WeekSnapshot.shape.amounts.element.shape)),
    coverage: z.object(WeekSnapshot.shape.coverage.shape),
    outcomes: z.object(WeekSnapshot.shape.outcomes.shape),
  })
  .superRefine(stewardCheck(WeekSnapshot))

export type WeekFile = z.infer<typeof WeekFile>
