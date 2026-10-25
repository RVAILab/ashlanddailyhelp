// Enum values shared with Daily Help. They must match the site's data.js and core.js exactly.
import { z } from 'zod'

export const Category = z.enum(['food', 'housing', 'hygiene', 'health', 'essentials'])

// Units are extensible: rows in the units table (meals, sessions, encounters, items to start).
// The site's core.js aggregates only meals, sessions and encounters today (see feed/build.ts SITE_UNITS).
export const Unit = z.string().regex(/^[a-z][a-z_]*$/, 'unit ids are lowercase words')
// The units the site's Pulse can draw; pulse.json carries only these (others stay in the database).
export const SiteUnit = z.enum(['meals', 'sessions', 'encounters'])

export const Outcome = z.enum(['completed', 'partial', 'canceled', 'unknown'])
export const Method = z.enum(['counted', 'estimated', 'not_recorded'])
export const Unmet = z.enum(['none_observed', 'observed', 'not_assessed'])
export const UnmetReason = z.enum(['capacity', 'supplies', 'transportation', 'timing', 'requirement', 'other'])

// Derived for display from outcome, method and value; never stored.
export const DisplayStatus = z.enum([
  'counted',
  'estimated',
  'not_recorded',
  'measured_zero',
  'partial',
  'awaiting_report',
  'canceled',
  'no_event',
])

export const ProviderStage = z.enum(['harvested', 'claimed', 'integrated'])
export const SourceType = z.enum([
  'website',
  'ics',
  'social_post',
  'scanned_packet',
  'email',
  'city_alert',
  'flyer_photo',
  'sheet',
  'web_research',
  'funder_report',
  'public_correction',
  'human',
])
export const SourceStatus = z.enum(['active', 'paused', 'failing', 'retired'])
export const ReviewState = z.enum(['auto', 'shadow', 'approved', 'rejected', 'pending', 'expired'])
export const Disposition = z.enum([
  'published',
  'published_unconfirmed',
  'queued',
  'merged',
  'unchanged',
  'rejected',
  'expired',
  'stored', // kept, never shown: a count without consent, or a youth-serving provider's count
])
// Who settled an item; the run summary's burden counter is counted from this.
export const DecidedBy = z.enum(['code', 'decision_model', 'research', 'coordinator'])
export const Dataset = z.enum(['FICTIONAL_DEMONSTRATION', 'LIVE'])

export type Category = z.infer<typeof Category>
export type Unit = z.infer<typeof Unit>
export type Outcome = z.infer<typeof Outcome>
export type Method = z.infer<typeof Method>
export type Unmet = z.infer<typeof Unmet>
export type UnmetReason = z.infer<typeof UnmetReason>
export type DisplayStatus = z.infer<typeof DisplayStatus>
export type ProviderStage = z.infer<typeof ProviderStage>
export type SourceType = z.infer<typeof SourceType>
export type SourceStatus = z.infer<typeof SourceStatus>
export type ReviewState = z.infer<typeof ReviewState>
export type Disposition = z.infer<typeof Disposition>
export type DecidedBy = z.infer<typeof DecidedBy>
export type Dataset = z.infer<typeof Dataset>
