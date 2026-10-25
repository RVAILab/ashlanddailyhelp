// The feed: the only thing Daily Help reads from the steward. See docs/FEED.md.
// listings[] items use the site's data.js `resources` field names; events[] and reports[]
// are exactly the arrays core.js aggregateReports and reportSeries consume.
import { z } from 'zod'
import { Category, Dataset, Method, Outcome, SiteUnit, SourceType, Unmet, UnmetReason } from './values.ts'

// The site puts event ids into HTML attributes, so they are limited to these characters.
export const EventId = z.string().regex(/^[A-Za-z0-9_-]+$/, 'event ids use letters, digits, _ and - only')

// Major.minor. A new optional field is a minor bump; a breaking change is a new major.
export const FEED_SCHEMA_VERSION = '1.3'

const Day = z.iso.date()
const Iso = z.iso.datetime({ offset: true })
const SchemaVersion = z.string().regex(/^1\.\d+$/)

// Where one field's value came from: the source, the exact supporting text, and when it was seen.
export const FeedProvenance = z.strictObject({
  sourceType: SourceType,
  sourceRef: z.string().min(1), // usually a URL
  span: z.string().nullable(),
  observedAt: Iso,
})

export const FeedListing = z.strictObject({
  // Site fields (data.js resources, including the shared `evidence` fields)
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  name: z.string().min(1),
  provider: z.string().min(1),
  categories: z.array(Category).min(1),
  area: z.string(),
  coverage: z.array(z.string()),
  description: z.string(),
  address: z.string(),
  schedule: z.string(),
  access: z.string(),
  requirements: z.string(),
  cost: z.string(),
  phone: z.string().nullable(),
  source: z.url(),
  tags: z.array(z.string()),
  conflict: z.boolean().optional(),
  reviewedDate: Day,
  verification: z.string(),
  providerConfirmedAt: z.string().nullable(),
  capacity: z.string(),
  accessibility: z.string(),
  // Steward additions (all optional; consumers that don't know them ignore them)
  provenanceLabel: z.string().optional(), // "Added by Daily Help from peacehouse.net", "Posted by Peace House"
  unconfirmed: z.boolean().optional(), // "Not yet confirmed by provider"
  mayBeCanceled: z.string().optional(), // the note to show, e.g. "May be canceled tonight. Reported by ... Call before traveling."
  endsAt: Iso.optional(), // time-bound listings disappear after this
  sourceUrls: z.array(z.url()).optional(), // every source behind the listing, `source` first
  provenance: z.record(z.string(), z.array(FeedProvenance)).optional(), // field name -> its sources (1.1)
  lastConfirmed: Iso.optional(), // when a source last confirmed it; set once stale or every source is failing (1.2)
})

export const ListingsFeed = z
  .strictObject({
    schemaVersion: SchemaVersion,
    generatedAt: Iso,
    dataset: Dataset,
    listings: z.array(FeedListing),
  })
  .superRefine((feed, ctx) => {
    const seen = new Set<string>()
    for (const l of feed.listings) {
      if (seen.has(l.id)) ctx.addIssue({ code: 'custom', message: `duplicate listing id ${l.id}` })
      seen.add(l.id)
    }
  })

export const PulseEvent = z.strictObject({
  id: EventId,
  provider: z.string().min(1),
  service: z.string().min(1),
  unit: SiteUnit,
  date: Day,
})

// Same rules as core.js validateReport. Unknown is null, never 0.
export const PulseReport = z
  .strictObject({
    eventId: EventId,
    outcome: Outcome,
    value: z.number().int().min(0).max(100_000).nullable(),
    method: Method,
    unmet: Unmet,
    reasons: z.array(UnmetReason),
  })
  .superRefine((r, ctx) => {
    if ((r.method === 'not_recorded') !== (r.value === null))
      ctx.addIssue({ code: 'custom', message: 'value is null exactly when method is not_recorded' })
    if ((r.outcome === 'canceled' || r.outcome === 'unknown') && r.value !== null)
      ctx.addIssue({ code: 'custom', message: 'canceled or unknown outcomes carry no amount' })
    if (r.unmet !== 'observed' && r.reasons.length)
      ctx.addIssue({ code: 'custom', message: 'reasons only when unmet need is observed' })
    if (new Set(r.reasons).size !== r.reasons.length)
      ctx.addIssue({ code: 'custom', message: 'reasons must be unique' })
  })

export const PulseSnapshot = z.strictObject({
  weekStart: Day,
  revision: z.number().int().min(1),
  publishedAt: Iso,
  note: z.string().nullable(),
  path: z.string().regex(/^weeks\/\d{4}-\d{2}-\d{2}-r\d+\.json$/), // the frozen revision, relative to pulse.json (1.3)
})

const Week = z.strictObject({ start: Day, end: Day, dates: z.array(Day).length(7) })

// Event ids unique, at most one report per known event: core.js keys reports by eventId.
function checkPulseArrays(feed: { week: z.infer<typeof Week>; events: { id: string }[]; reports: { eventId: string }[] }, ctx: z.RefinementCtx) {
  const { start, end, dates } = feed.week
  if (dates[0] !== start || dates[6] !== end)
    ctx.addIssue({ code: 'custom', message: 'week.dates must run from week.start to week.end' })
  const ids = new Set<string>()
  for (const e of feed.events) {
    if (ids.has(e.id)) ctx.addIssue({ code: 'custom', message: `duplicate event id ${e.id}` })
    ids.add(e.id)
  }
  const reported = new Set<string>()
  for (const r of feed.reports) {
    if (!ids.has(r.eventId)) ctx.addIssue({ code: 'custom', message: `report for unknown event ${r.eventId}` })
    // core.js keys reports by eventId, so a second report would silently replace the first.
    if (reported.has(r.eventId)) ctx.addIssue({ code: 'custom', message: `two reports for event ${r.eventId}` })
    reported.add(r.eventId)
  }
}

export const PulseFeed = z
  .strictObject({
    schemaVersion: SchemaVersion,
    generatedAt: Iso,
    dataset: Dataset,
    week: Week,
    events: z.array(PulseEvent),
    reports: z.array(PulseReport),
    snapshots: z.array(PulseSnapshot), // this week's published revisions
    publishedWeeks: z.array(PulseSnapshot).optional(), // every published revision of every week, newest week first (1.3)
  })
  .superRefine(checkPulseArrays)

// How an amount reached the steward (docs/REVIEW_AND_PUBLISH.md section 8).
export const ArrivalPath = z.enum(['provider_report', 'report_sent_elsewhere', 'provider_post', 'photo', 'other', 'unknown'])

// weeks/<weekStart>-r<revision>.json: one frozen revision of a finished week. Written once, never changed (1.3).
// events and reports are the Pulse arrays exactly as frozen; the rest is what the snapshot adds.
export const WeekSnapshot = z
  .strictObject({
    schemaVersion: SchemaVersion,
    dataset: Dataset,
    weekStart: Day,
    revision: z.number().int().min(1),
    publishedAt: Iso,
    note: z.string().nullable(), // required from revision 2 on: what the correction changed
    week: Week,
    events: z.array(PulseEvent),
    reports: z.array(PulseReport),
    amounts: z.array(z.strictObject({ eventId: EventId, basis: z.enum(['counted', 'estimated']), arrival: ArrivalPath })),
    coverage: z.strictObject({ harvested: z.number().int().min(0), claimed: z.number().int().min(0), integrated: z.number().int().min(0) }),
    outcomes: z.strictObject({
      scheduled: z.number().int().min(0),
      knownOutcome: z.number().int().min(0), // happened (completed, partial) or canceled
      withAmount: z.number().int().min(0),
      knownOutcomeShare: z.number().min(0).max(1).nullable(), // null when nothing was scheduled
      amountShare: z.number().min(0).max(1).nullable(),
    }),
  })
  .superRefine((s, ctx) => {
    checkPulseArrays(s, ctx)
    if (s.revision > 1 && !s.note?.trim()) ctx.addIssue({ code: 'custom', message: 'a revision after the first needs a public note' })
    if (s.weekStart !== s.week.start) ctx.addIssue({ code: 'custom', message: 'weekStart must be week.start' })
    const withValue = new Set(s.reports.filter(r => r.value !== null).map(r => r.eventId))
    if (s.amounts.length !== withValue.size || s.amounts.some(a => !withValue.has(a.eventId)))
      ctx.addIssue({ code: 'custom', message: 'amounts must describe exactly the reports that carry a value' })
  })

export type FeedListing = z.infer<typeof FeedListing>
export type FeedProvenance = z.infer<typeof FeedProvenance>
export type ListingsFeed = z.infer<typeof ListingsFeed>
export type PulseEvent = z.infer<typeof PulseEvent>
export type PulseReport = z.infer<typeof PulseReport>
export type PulseSnapshot = z.infer<typeof PulseSnapshot>
export type PulseFeed = z.infer<typeof PulseFeed>
export type WeekSnapshot = z.infer<typeof WeekSnapshot>
export type ArrivalPath = z.infer<typeof ArrivalPath>
