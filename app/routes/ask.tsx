import { Link } from 'react-router'
import { answerQuestion } from '../../server/chat/answer.ts'
import { AskForm, MAX_QUESTION } from '../components/ask-form.tsx'
import { services } from '../context.ts'
import { langFromPath, messagesFor } from '../i18n/index.ts'
import { useI18n } from '../i18n/provider.tsx'
import { formatAsOf } from '../lib/format.ts'
import type { Route } from './+types/ask'

export const handle = { hydrate: false }

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

// Asking posts to this action rather than following a link, so crawlers and link previews never spend a model call.
export async function action({ request, url, context }: Route.ActionArgs): Promise<AskResult> {
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
  const reply = await answerQuestion({ db, answerer, question, lang, now: new Date() })
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

export function meta({ location }: Route.MetaArgs) {
  const t = messagesFor(langFromPath(location.pathname))
  return [{ title: `${t.ask.title} · ${t.siteName}` }, { name: 'robots', content: 'noindex' }]
}

export default function Ask({ actionData }: Route.ComponentProps) {
  const { t, path } = useI18n()
  return (
    <main className="ask">
      <h1>{t.ask.title}</h1>
      <p>{t.ask.intro}</p>
      {actionData?.state === 'answered' && <Answer result={actionData} />}
      {actionData && actionData.state !== 'answered' && (
        <p className="notice" role="status">
          {actionData.state === 'empty'
            ? t.ask.empty
            : actionData.state === 'limited'
              ? t.ask.limited
              : t.ask.unavailable}
        </p>
      )}
      <AskForm heading={actionData?.state === 'answered' ? t.ask.again : undefined} />
      <p className="ask-note">{t.ask.offline}</p>
      <p>
        <Link to={path('/today')}>{t.next.more}</Link>
      </p>
    </main>
  )
}

function Answer({ result }: { result: Extract<AskResult, { state: 'answered' }> }) {
  const { t, path } = useI18n()
  const { answer } = result
  return (
    <section aria-labelledby="answer-heading" className="ask-answer">
      <h2 id="answer-heading">
        {t.ask.youAsked}: <q>{result.question}</q>
      </h2>
      {answer.paragraphs.map((paragraph, index) => (
        <p key={paragraph} className={answer.crisis && index === 0 ? 'ask-crisis' : undefined}>
          <Dialable text={paragraph} />
        </p>
      ))}
      {answer.citations.length > 0 && (
        <>
          <h3>{t.ask.sources}</h3>
          <ul>
            {answer.citations.map(citation => (
              <li key={citation.id}>
                {citation.listingId ? (
                  <Link to={path(`/resources/${citation.listingId}`)}>{citation.name}</Link>
                ) : (
                  citation.name
                )}
                {citation.site && <> ({t.ask.from(citation.site)})</>}
              </li>
            ))}
          </ul>
        </>
      )}
      {answer.asOf && <p className="ask-note">{t.chat.asOf(answer.asOf)}</p>}
    </section>
  )
}

// Phone numbers in an answer, crisis lines included, are one tap to call.
const PHONE = /(\b(?:911|988|211)\b|\b\d{3}-\d{3}-\d{4}\b)/

function Dialable({ text }: { text: string }) {
  return text.split(PHONE).map((part, index) =>
    index % 2 === 1 ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: the parts of one fixed string, never reordered
      <a key={index} href={`tel:${part.replace(/\D/g, '')}`}>
        {part}
      </a>
    ) : (
      part
    ),
  )
}
