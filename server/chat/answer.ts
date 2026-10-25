import { type Lang, messagesFor } from '../../app/i18n/index.ts'
import type { Database } from '../db.ts'
import type { Answerer } from './claude.ts'
import { gatherContext } from './context.ts'
import { isCrisis } from './crisis.ts'

export interface ChatAnswer {
  text: string
  citations: Array<{ id: string; name: string; source: string }>
  asOf: string | null
  crisis: boolean
  known: boolean
  lang: Lang
}

const LANGUAGE_NAMES = { en: 'English', es: 'Spanish' } as const

interface AskInput {
  db: Database
  answerer: Answerer
  question: string
  lang: Lang
  now: Date
}

// One answer for every channel. The model answers only from what Postgres holds for this question; the rules that
// keep people safe are enforced here rather than trusted to it. Nothing about the question is stored or logged.
export async function answerQuestion({ db, answerer, question, lang, now }: AskInput): Promise<ChatAnswer> {
  const t = messagesFor(lang).chat
  const crisis = isCrisis(question)
  const context = await gatherContext(db, question, now, lang)
  const started = Date.now()
  const reply = (known: boolean, body: string, citations: ChatAnswer['citations'] = []): ChatAnswer => ({
    text: [crisis ? t.crisis : null, body].filter(Boolean).join('\n\n'),
    citations,
    asOf: context.asOf,
    crisis,
    known,
    lang,
  })
  if (context.listings.length === 0 && context.events.length === 0) {
    console.log('chat:', JSON.stringify({ known: false, cited: 0, matched: 0, ms: 0 }))
    return reply(false, t.unknown)
  }
  try {
    const answer = await answerer.answer({ ...context, question, language: LANGUAGE_NAMES[lang] })
    const retrieved = new Map(context.listings.map(listing => [listing.id, listing]))
    const events = new Set(context.events.map(event => event.id))
    const cited = [...new Set(answer.cited)].filter(id => retrieved.has(id) || events.has(id))
    const known = answer.known && answer.answer.trim() !== '' && cited.length > 0
    console.log(
      'chat:',
      JSON.stringify({
        known,
        cited: cited.length,
        matched: context.listings.length,
        ms: Date.now() - started,
        tokens: answer.usage,
      }),
    )
    if (!known) return reply(false, t.unknown)
    const citations = cited.flatMap(id => {
      const listing = retrieved.get(id)
      return listing ? [{ id, name: listing.name, source: listing.source }] : []
    })
    return reply(true, `${answer.answer.trim()}\n\n${t.confirm}`, citations)
  } catch (error) {
    console.error('chat: the answer failed', error instanceof Error ? error.message : 'unknown error')
    return reply(false, t.unknown)
  }
}
