import { inArray } from 'drizzle-orm'
import { translations } from '../../db/schema.ts'
import type { Database } from '../db.ts'
import { hashText } from './texts.ts'

// The stored translation of each English text that has one; texts without one are left out.
export async function translationsFor(db: Database, texts: string[], lang: 'es'): Promise<Map<string, string>> {
  const english = [...new Set(texts.map(text => text.trim()).filter(Boolean))]
  if (english.length === 0) return new Map()
  const hashes = new Map(await Promise.all(english.map(async text => [await hashText(lang, text), text] as const)))
  const rows = await db
    .select({ hash: translations.hash, text: translations.text })
    .from(translations)
    .where(inArray(translations.hash, [...hashes.keys()]))
  return new Map(rows.map(row => [hashes.get(row.hash) ?? '', row.text]))
}
