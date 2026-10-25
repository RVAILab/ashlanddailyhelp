import { eq, inArray, sql } from 'drizzle-orm'
import { listings, translations } from '../../db/schema.ts'
import type { Database } from '../db.ts'
import { currentListings } from '../feed/listings.ts'
import { TRANSLATION_MODEL, type Translator } from './claude.ts'
import { translationsFor } from './lookup.ts'
import { hashText, translatableTexts } from './texts.ts'

export const withoutAccents = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '')

interface Options {
  lang: 'es'
  now: Date
  maxTexts?: number
  batchSize?: number
}

// Translates current listings' text that has no stored translation yet: at most maxTexts per run, so spending is
// bounded and paid once per distinct text. A failed batch stores nothing and is tried again on the next run.
export async function translatePending(
  db: Database,
  translator: Translator,
  { lang, now, maxTexts = 200, batchSize = 40 }: Options,
) {
  const current = await currentListings(db, now)
  const byHash = new Map<string, string>()
  for (const listing of current)
    for (const { english } of translatableTexts(listing)) byHash.set(await hashText(lang, english), english)
  const stored = byHash.size
    ? new Set(
        (
          await db
            .select({ hash: translations.hash })
            .from(translations)
            .where(inArray(translations.hash, [...byHash.keys()]))
        ).map(row => row.hash),
      )
    : new Set<string>()
  const pending = [...byHash].filter(([hash]) => !stored.has(hash))
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
            translatedAt: new Date(),
          })),
        )
        .onConflictDoNothing()
      translated += batch.length
    } catch (error) {
      failed += batch.length
      console.error(`translate: a batch of ${batch.length} failed`, error)
    }
  }
  if (translated > 0) await rebuildSpanishSearch(db, current, lang)
  console.log(
    `translate: ${lang}: ${translated} translated, ${failed} failed, ${pending.length - sending.length} left; ${usage.inputTokens} input and ${usage.outputTokens} output tokens (${usage.cacheReadTokens} from cache)`,
  )
  return { translated, failed, remaining: pending.length - sending.length, usage }
}

async function rebuildSpanishSearch(db: Database, current: Awaited<ReturnType<typeof currentListings>>, lang: 'es') {
  for (const listing of current) {
    const english = translatableTexts(listing).map(text => text.english)
    const spanish = await translationsFor(db, english, lang)
    const words = withoutAccents([listing.name, listing.provider, ...spanish.values()].join(' '))
    await db
      .update(listings)
      .set({ searchEs: sql`to_tsvector('spanish', ${words})` })
      .where(eq(listings.id, listing.id))
  }
}
