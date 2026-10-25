import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { testDatabase } from '../../test/db.ts'
import { storeListings } from '../../test/listings.ts'
import { answerQuestion } from './answer.ts'
import type { Answerer, ModelAnswer } from './claude.ts'
import { gatherContext } from './context.ts'
import { isCrisis } from './crisis.ts'

const now = new Date('2026-10-25T18:00:00Z')

function fake(reply: ModelAnswer | Error): Answerer & { asked: Array<Parameters<Answerer['answer']>[0]> } {
  const asked: Array<Parameters<Answerer['answer']>[0]> = []
  return {
    asked,
    async answer(input) {
      asked.push(input)
      if (reply instanceof Error) throw reply
      return { ...reply, usage: { inputTokens: 100, outputTokens: 20 } }
    },
  }
}

describe('answerQuestion', () => {
  let db: Awaited<ReturnType<typeof testDatabase>>
  beforeAll(async () => {
    db = await testDatabase()
    await storeListings(db)
  })
  afterAll(() => db.close())

  const ask = (question: string, answerer: Answerer, lang: 'en' | 'es' = 'en') =>
    answerQuestion({ db, answerer, question, lang, now })

  it('answers from the matching listings only, citing them with their sources, as of the feed time', async () => {
    const answerer = fake({
      known: true,
      answer: 'Their website lists showers on Tuesdays.',
      cited: ['ohra-showers', 'made-up'],
    })
    const reply = await ask('Where can I take a shower?', answerer)
    expect(answerer.asked[0]?.listings.map(listing => listing.id)).toContain('ohra-showers')
    expect(reply).toMatchObject({ known: true, crisis: false })
    expect(reply.text).toContain('Their website lists showers on Tuesdays.')
    expect(reply.citations.map(citation => citation.id)).toEqual(['ohra-showers'])
    expect(reply.citations[0]?.source).toMatch(/^https?:\/\//)
    expect(reply.asOf).toBe('2026-10-25T19:00:00.000Z')
  })

  it('says it doesn’t know and points to 211 when nothing in the directory matches, without asking the model', async () => {
    const answerer = fake({ known: true, answer: 'Guessing.', cited: [] })
    const reply = await ask('Where can I fix my bicycle?', answerer)
    expect(answerer.asked).toHaveLength(0)
    expect(reply).toMatchObject({ known: false, citations: [] })
    expect(reply.text).toContain('211')
  })

  it('treats an answer that cites nothing as not known', async () => {
    const reply = await ask('shower', fake({ known: true, answer: 'Open every day 9 to 5.', cited: [] }))
    expect(reply.known).toBe(false)
    expect(reply.text).not.toContain('9 to 5')
    expect(reply.text).toContain('211')
  })

  it('puts crisis numbers first, then still answers', async () => {
    const reply = await ask(
      'I want to kill myself and I need a shelter tonight',
      fake({ known: true, answer: 'Their page lists a shelter.', cited: ['ohra-shelter'] }),
    )
    expect(reply.crisis).toBe(true)
    expect(reply.text.search(/\d/)).toBe(reply.text.indexOf('911'))
    expect(reply.text.indexOf('988')).toBeLessThan(reply.text.indexOf('Their page lists a shelter.'))
    expect(reply.text).toContain('Their page lists a shelter.')
  })

  it('gives the 211 answer when the model fails, and logs no question text', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const logs = vi.spyOn(console, 'log').mockImplementation(() => {})
    const reply = await ask('private question about showers', fake(new Error('overloaded')))
    expect(reply.known).toBe(false)
    expect(reply.text).toContain('211')
    const logged = JSON.stringify([...errors.mock.calls, ...logs.mock.calls])
    expect(logged).not.toContain('private question')
    vi.restoreAllMocks()
  })

  it('answers in Spanish when asked in Spanish', async () => {
    const answerer = fake({ known: false, answer: '', cited: [] })
    const reply = await ask('¿Dónde puedo arreglar mi bicicleta?', answerer, 'es')
    expect(reply.text).toContain('211')
    expect(reply.lang).toBe('es')
  })
})

describe('gatherContext', () => {
  it('finds listings word by word when the whole question matches nothing, and keeps the alerts and events', async () => {
    const db = await testDatabase()
    await storeListings(db)
    const context = await gatherContext(db, 'is there somewhere to get groceries this week?', now, 'en')
    expect(context.listings.map(listing => listing.id)).toContain('access-pantries')
    expect(context.listings.length).toBeLessThanOrEqual(8)
    expect(context).toHaveProperty('alerts')
    expect(context).toHaveProperty('events')
    await db.close()
  })
})

describe('gatherContext, everyday words', () => {
  it('finds the kind of help an everyday word means', async () => {
    const db = await testDatabase()
    await storeListings(db)
    const ids = async (question: string) => (await gatherContext(db, question, now, 'en')).listings.map(l => l.id)
    expect(await ids('I have nowhere to sleep tonight')).toContain('ohra-shelter')
    expect(await ids('I’m hungry')).toContain('access-pantries')
    expect(await ids('dónde puedo dormir')).toContain('ohra-shelter')
    await db.close()
  })
})

describe('isCrisis', () => {
  it('knows crisis words in English and Spanish, and not everyday ones', () => {
    for (const text of [
      'I want to kill myself',
      'thinking about suicide',
      'my friend overdosed',
      'quiero matarme',
      'sobredosis',
    ])
      expect(isCrisis(text), text).toBe(true)
    for (const text of ['where can I shower', 'food bank hours', 'I need a killer deal on shoes'])
      expect(isCrisis(text), text).toBe(false)
  })
})
