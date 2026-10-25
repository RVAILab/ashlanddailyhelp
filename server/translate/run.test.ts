import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { testDatabase } from '../../test/db.ts'
import { sampleListingsFeed } from '../../test/feed.ts'
import { storeListings } from '../../test/listings.ts'
import type { Translator } from './claude.ts'
import { translationsFor } from './lookup.ts'
import { translatePending } from './run.ts'

function fakeTranslator(fail: (ids: string[]) => boolean = () => false) {
  const batches: string[][] = []
  const translator: Translator = {
    translate: async texts => {
      batches.push(texts.map(text => text.text))
      if (fail(texts.map(text => text.id))) throw new Error('API error')
      return {
        translations: new Map(texts.map(text => [text.id, `ES: ${text.text}`])),
        usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0 },
      }
    },
  }
  return { translator, batches }
}

describe('translatePending', () => {
  let db: Awaited<ReturnType<typeof testDatabase>>
  beforeEach(async () => {
    db = await testDatabase()
    const sample = sampleListingsFeed()
    await storeListings(db, { ...sample, listings: sample.listings.slice(0, 3) })
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(async () => {
    vi.restoreAllMocks()
    await db.close()
  })

  it('translates each distinct text once, and stores it for the pages', async () => {
    const { translator, batches } = fakeTranslator()
    const first = await translatePending(db, translator, { lang: 'es', now: new Date() })
    expect(first.translated).toBeGreaterThan(0)
    const sent = batches.flat()
    expect(new Set(sent).size).toBe(sent.length)
    const [english] = sent
    expect((await translationsFor(db, [english ?? ''], 'es')).get(english ?? '')).toBe(`ES: ${english}`)

    const again = await translatePending(db, translator, { lang: 'es', now: new Date() })
    expect(again.translated).toBe(0)
    expect(batches.flat()).toHaveLength(sent.length)
  })

  it('sends no more than the per-run limit, leaving the rest for the next run', async () => {
    const { translator, batches } = fakeTranslator()
    const run = await translatePending(db, translator, { lang: 'es', now: new Date(), maxTexts: 4, batchSize: 3 })
    expect(batches.flat()).toHaveLength(4)
    expect(batches.map(batch => batch.length)).toEqual([3, 1])
    expect(run.remaining).toBeGreaterThan(0)
  })

  it('keeps going when one batch fails, storing nothing for it', async () => {
    let calls = 0
    const { translator } = fakeTranslator(() => ++calls === 1)
    const run = await translatePending(db, translator, { lang: 'es', now: new Date(), batchSize: 3 })
    expect(run.failed).toBe(3)
    expect(run.translated).toBeGreaterThan(0)
    expect(console.error).toHaveBeenCalled()
  })

  it('logs what it sent and the tokens it used', async () => {
    await translatePending(db, fakeTranslator().translator, { lang: 'es', now: new Date() })
    expect(console.log).toHaveBeenCalledWith(
      expect.stringMatching(/^translate: es: \d+ translated, 0 failed, 0 left; \d+ input and \d+ output tokens/),
    )
  })
})
