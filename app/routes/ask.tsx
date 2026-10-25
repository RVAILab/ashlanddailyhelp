import { Link } from 'react-router'
import { AskForm } from '../components/ask-form.tsx'
import { ChatAnswerView } from '../components/chat-answer.tsx'
import { langFromPath, messagesFor } from '../i18n/index.ts'
import { useI18n } from '../i18n/provider.tsx'
import { askAction } from '../lib/ask-action.ts'
import type { Route } from './+types/ask'

export const handle = { hydrate: false }

export const action = (args: Route.ActionArgs) => askAction(args)

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
      {actionData?.state === 'answered' && <ChatAnswerView result={actionData} />}
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
