import type { ActionFunctionArgs } from 'react-router'
import { answerQuestion } from '../../server/chat/answer.ts'
import { MAX_QUESTION } from '../components/ask-form.tsx'
import { services } from '../context.ts'
import { langFromPath } from '../i18n/index.ts'
import { formatAsOf } from './format.ts'

const siteName = (url: string | null) => (url && URL.canParse(url) ? new URL(url).hostname.replace(/^www\./, '') : null)

export type AskResult =
  | { state: 'empty' | 'unavailable' | 'limited' }
  | {
      state: 'answered'
      question: string
      answer: {
        paragraphs: string[]
        crisis: boolean
        known: boolean
        asOf: string | null
        citations: Array<{ id: string; name: string; site: string | null; listingId: string | null }>
      }
    }

// Asking posts rather than following a link, so crawlers and link previews never spend a model call.
export async function askAction(
  { request, url, context }: ActionFunctionArgs,
  depth: 'brief' | 'full' = 'brief',
): Promise<AskResult> {
  const lang = langFromPath(url.pathname)
  const { database, answerer, askAllowed } = context.get(services)
  const form = await request.formData()
  const question = String(form.get('q') ?? '')
    .trim()
    .slice(0, MAX_QUESTION)
  if (!question) return { state: 'empty' }
  const db = database()
  if (!db || !answerer) return { state: 'unavailable' }
  const key = request.headers.get('CF-Connecting-IP') ?? 'local'
  if (askAllowed && !(await askAllowed(key))) return { state: 'limited' }
  const reply = await answerQuestion({ db, answerer, question, lang, now: new Date(), depth })
  return {
    state: 'answered',
    question,
    answer: {
      paragraphs: reply.text.split(/\n{2,}/),
      crisis: reply.crisis,
      known: reply.known,
      asOf: reply.asOf ? formatAsOf(reply.asOf, lang) : null,
      citations: reply.citations.map(citation => ({
        id: citation.id,
        name: citation.name,
        site: siteName(citation.source),
        listingId: citation.listingId,
      })),
    },
  }
}
