import type { Lang } from '../../app/i18n/index.ts'
import type { Category } from '../../contract/steward/values.ts'
import type { Database } from '../db.ts'
import { currentAlerts } from '../feed/alerts.ts'
import type { StoredListing } from '../feed/contract.ts'
import { upcomingEvents } from '../feed/events.ts'
import { feedFileStatus } from '../feed/ingest.ts'
import { servesAshland } from '../listings/scope.ts'
import { searchListings } from '../listings/search.ts'

const MAX_LISTINGS = 8
const WEEK = 7 * 24 * 60 * 60 * 1000
// Words that say nothing about the kind of help, so searching for them alone would match everything or nothing.
const FILLER = new Set(
  'a an and any are can do does get go have how i in is it me my near need of on or place places some somewhere the there this to today tomorrow want week what when where which who with you your free help'.split(
    ' ',
  ),
)

// What a model may see of a listing: the published fields, never provenance quotes or coordinates.
function forModel(listing: StoredListing) {
  return {
    id: listing.id,
    name: listing.name,
    provider: listing.provider,
    categories: listing.categories,
    area: listing.area,
    description: listing.description,
    schedule: listing.schedule,
    address: listing.address,
    access: listing.access,
    requirements: listing.requirements,
    cost: listing.cost,
    accessibility: listing.accessibility,
    phone: listing.phone,
    source: listing.source,
    scheduleNeedsChecking: listing.conflict === true,
    notConfirmedByProvider: listing.unconfirmed === true,
    mayBeCanceled: listing.mayBeCanceled ?? null,
    openings: (listing.openings ?? []).slice(0, 14),
  }
}

export type ContextListing = ReturnType<typeof forModel>

export interface ChatContext {
  asOf: string | null
  now: string
  listings: ContextListing[]
  alerts: Array<{ id: string; title: string; message: string; startsAt: string; endsAt: string; listingIds: string[] }>
  events: Array<{ id: string; title: string; provider: string; date: string; startsAt: string | null; address: string }>
}

// Everyday words for each kind of help, in English and Spanish, so "nowhere to sleep" finds shelters.
const KINDS: Record<Category, RegExp> = {
  food: /\b(hungry|eat|eating|meal|meals|lunch|dinner|breakfast|groceries|hambre|comer|comida|despensa)\b/i,
  housing: /\b(sleep|sleeping|bed|beds|tent|camp|camping|housing|homeless|rent|dormir|cama|albergue|vivienda)\b/i,
  hygiene: /\b(shower|showers|wash|bathe|laundry|toilet|bathroom|ducha|regadera|bañarme|lavar)\b/i,
  health: /\b(sick|doctor|clinic|medicine|dentist|pain|mental|enfermo|médico|clínica|medicina)\b/i,
  essentials: /\b(clothes|clothing|coat|shoes|phone|id|blanket|ropa|teléfono|identificación|cobija)\b/i,
}

// The whole question first; when it finds too little, each meaningful word, ranked by how many words a listing matches.
async function findListings(db: Database, question: string, now: Date, lang: Lang): Promise<StoredListing[]> {
  const whole = await searchListings(db, { query: question.slice(0, 100) }, now, lang)
  if (whole.length >= 3) return whole.slice(0, MAX_LISTINGS)
  const words = [...new Set(question.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [])].filter(word => !FILLER.has(word))
  const hits = new Map<string, { listing: StoredListing; score: number; first: number }>()
  whole.forEach((listing, index) => {
    hits.set(listing.id, { listing, score: words.length + 1, first: index })
  })
  for (const word of words.slice(0, 8))
    (await searchListings(db, { query: word }, now, lang)).forEach((listing, index) => {
      const hit = hits.get(listing.id)
      if (hit) hit.score++
      else hits.set(listing.id, { listing, score: 1, first: 1000 + index })
    })
  for (const category of Object.keys(KINDS) as Category[])
    if (KINDS[category].test(question))
      (await searchListings(db, { category }, now, lang)).forEach((listing, index) => {
        const hit = hits.get(listing.id)
        if (hit) hit.score++
        else hits.set(listing.id, { listing, score: 1, first: 2000 + index })
      })
  return [...hits.values()]
    .sort((a, b) => b.score - a.score || a.first - b.first)
    .slice(0, MAX_LISTINGS)
    .map(hit => hit.listing)
}

export async function gatherContext(db: Database, question: string, now: Date, lang: Lang): Promise<ChatContext> {
  const listings = await findListings(db, question, now, lang)
  const alerts = (await currentAlerts(db, now)).filter(alert => servesAshland(alert.area, alert.coverage))
  const events = (await upcomingEvents(db, now)).filter(
    event => servesAshland(event.area) && Date.parse(`${event.date}T00:00:00Z`) <= now.getTime() + WEEK,
  )
  const file = await feedFileStatus(db, 'listings.json')
  return {
    asOf: file?.generatedAt?.toISOString() ?? null,
    now: now.toISOString(),
    listings: listings.map(forModel),
    alerts: alerts.map(alert => ({
      id: alert.id,
      title: alert.title,
      message: alert.message,
      startsAt: alert.startsAt,
      endsAt: alert.endsAt,
      listingIds: alert.listingIds ?? [],
    })),
    events: events.slice(0, 20).map(event => ({
      id: event.id,
      title: event.title,
      provider: event.provider,
      date: event.date,
      startsAt: event.startsAt ?? null,
      address: event.address,
    })),
  }
}
