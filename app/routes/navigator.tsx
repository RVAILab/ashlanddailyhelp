import { Link } from 'react-router'
import { AskForm } from '../components/ask-form.tsx'
import { ChatAnswerView } from '../components/chat-answer.tsx'
import { langFromPath, messagesFor } from '../i18n/index.ts'
import { useI18n } from '../i18n/provider.tsx'
import { type AskResult, askAction } from '../lib/ask-action.ts'
import type { Route } from './+types/navigator'

export const handle = { hydrate: false }

// For caseworkers and outreach workers: the same answers as /ask, in full, with every source. Open to anyone, with no
// accounts (decided Oct 25): the listings are public and the rate limit applies.
export const action = (args: Route.ActionArgs) => askAction(args, 'full')

export function meta({ location }: Route.MetaArgs) {
  const t = messagesFor(langFromPath(location.pathname))
  return [{ title: `${t.navigator.title} · ${t.siteName}` }, { name: 'robots', content: 'noindex' }]
}

export default function Navigator({ actionData }: Route.ComponentProps) {
  const { t, path } = useI18n()
  return (
    <main className="ask navigator">
      <h1>{t.navigator.title}</h1>
      <p>{t.navigator.intro}</p>
      {actionData?.state === 'answered' && (
        <>
          <ChatAnswerView result={actionData} />
          <UseListings result={actionData} />
        </>
      )}
      {actionData && actionData.state !== 'answered' && (
        <p className="notice" role="status">
          {actionData.state === 'empty'
            ? t.ask.empty
            : actionData.state === 'limited'
              ? t.ask.limited
              : t.ask.unavailable}
        </p>
      )}
      <AskForm to="/navigator" heading={actionData?.state === 'answered' ? t.ask.again : undefined} />
      <p className="ask-note">{t.ask.offline}</p>
      <p>
        <Link to={path('/list')}>{t.list.title}</Link>
      </p>
    </main>
  )
}

function UseListings({ result }: { result: Extract<AskResult, { state: 'answered' }> }) {
  const { t, path } = useI18n()
  const ids = [...new Set(result.answer.citations.flatMap(citation => citation.listingId ?? []))]
  if (ids.length === 0) return null
  const list = ids.join('.')
  return (
    <section aria-labelledby="use-heading" className="navigator-use">
      <h2 id="use-heading">{t.navigator.use}</h2>
      <ul>
        <li>
          <Link to={path(`/list?ids=${list}`)}>{t.navigator.share}</Link>
        </li>
        <li>
          <a href={path(`/print?ids=${list}`)}>{t.navigator.print}</a>
        </li>
        <li>
          <a href={`/list/save?ids=${list}`} rel="nofollow">
            {t.navigator.save}
          </a>
        </li>
      </ul>
    </section>
  )
}
