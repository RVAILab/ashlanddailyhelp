import { eq, inArray, isNull, sql } from 'drizzle-orm'
import { listings, translationFailures, translations } from '../../db/schema.ts'
import type { Database } from '../db.ts'
import { currentListings } from '../feed/listings.ts'
import { TRANSLATION_MODEL, type Translator } from './claude.ts'
import { translationsFor } from './lookup.ts'
import { hashText, translatableTexts } from './texts.ts'

export const withoutAccents = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '')

const HOUR = 60 * 60 * 1000

interface Options {
  lang: 'es'
  now: Date
  maxTexts?: number
  batchSize?: number
}

// Translates current listings' text that has no stored translation yet: at most maxTexts per run, so spending is
// bounded and paid once per distinct text. Text whose batch failed waits an hour per failure (at most a day) before
// it is sent again, so a refusal isn't paid for on every five-minute run.
export async function translatePending(
  db: Database,
  translator: Translator,
  { lang, now, maxTexts = 200, batchSize = 40 }: Options,
) {
  const current = await currentListings(db, now)
  const byHash = new Map<string, string>()
  for (const listing of current)
    for (const { english } of translatableTexts(listing)) byHash.set(await hashText(lang, english), english)
  const hashes = [...byHash.keys()]
  const stored = new Set(
    hashes.length
      ? (await db.select({ hash: translations.hash }).from(translations).where(inArray(translations.hash, hashes))).map(
          row => row.hash,
        )
      : [],
  )
  const waiting = new Set(
    hashes.length
      ? (await db.select().from(translationFailures).where(inArray(translationFailures.hash, hashes)))
          .filter(row => now.getTime() - row.failedAt.getTime() < Math.min(row.attempts, 24) * HOUR)
          .map(row => row.hash)
      : [],
  )
  const pending = [...byHash].filter(([hash]) => !stored.has(hash) && !waiting.has(hash))
  const sending = pending.slice(0, maxTexts)
  let translated = 0
  let failed = 0
  const usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 }
  for (let start = 0; start < sending.length; start += batchSize) {
    const batch = sending.slice(start, start + batchSize)
    try {
      const result = await translator.translate(
        batch.map(([id, text]) => ({ id, text })),
        lang,
      )
      usage.inputTokens += result.usage.inputTokens
      usage.outputTokens += result.usage.outputTokens
      usage.cacheReadTokens += result.usage.cacheReadTokens
      await db
        .insert(translations)
        .values(
          batch.map(([hash, english]) => ({
            hash,
            lang,
            english,
            text: result.translations.get(hash) ?? '',
            model: TRANSLATION_MODEL,
            translatedAt: now,
          })),
        )
        .onConflictDoNothing()
      translated += batch.length
    } catch (error) {
      failed += batch.length
      console.error(`translate: a batch of ${batch.length} failed`, error)
      await db
        .insert(translationFailures)
        .values(batch.map(([hash]) => ({ hash, attempts: 1, failedAt: now })))
        .onConflictDoUpdate({
          target: translationFailures.hash,
          set: { attempts: sql`${translationFailures.attempts} + 1`, failedAt: now },
        })
    }
  }
  // A refresh replaces the listing rows, emptying their Spanish search; rebuild those, and all of them after new text.
  const empty = new Set(
    (await db.select({ id: listings.id }).from(listings).where(isNull(listings.searchEs))).map(row => row.id),
  )
  const rebuild = translated > 0 ? current : current.filter(listing => empty.has(listing.id))
  if (rebuild.length) await rebuildSpanishSearch(db, rebuild, lang)
  const left = pending.length - sending.length
  console.log(
    `translate: ${lang}: ${translated} translated, ${failed} failed, ${left} left; ${usage.inputTokens} input and ${usage.outputTokens} output tokens (${usage.cacheReadTokens} from cache)`,
  )
  return { translated, failed, remaining: left, usage }
}

async function rebuildSpanishSearch(db: Database, rows: Awaited<ReturnType<typeof currentListings>>, lang: 'es') {
  for (const listing of rows) {
    const english = translatableTexts(listing).map(text => text.english)
    const spanish = await translationsFor(db, english, lang)
    const words = withoutAccents([listing.name, listing.provider, ...spanish.values()].join(' '))
    await db
      .update(listings)
      .set({ searchEs: sql`to_tsvector('spanish', ${words})` })
      .where(eq(listings.id, listing.id))
  }
}
