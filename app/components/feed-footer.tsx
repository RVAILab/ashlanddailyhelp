import { useLocation } from 'react-router'
import type { FeedStatus } from '../../server/feed/listings.ts'
import type { Messages } from '../i18n/en.ts'
import { useI18n } from '../i18n/provider.tsx'

export type FooterFeed = FeedStatus extends infer Status
  ? Status extends { state: 'stored' }
    ? Status & { asOf: string }
    : Status
  : never

export function FeedFooter({ feed, text = false }: { feed: FooterFeed; text?: boolean }) {
  const { t } = useI18n()
  const { pathname, search } = useLocation()
  const back = encodeURIComponent(`${pathname}${search}`)
  const lines = [
    { numbers: ['911'], what: t.home.emergency.emergency },
    { numbers: ['988', '541-774-8201'], what: t.home.emergency.crisis },
    { numbers: ['211'], what: t.home.emergency.services },
  ]
  return (
    <footer className="site-footer">
      <nav aria-label={t.home.emergency.label} className="emergency">
        {lines.map(line => (
          <p key={line.what}>
            {line.numbers.map((number, index) => (
              <span key={number}>
                {index > 0 && <span aria-hidden="true"> • </span>}
                <a href={`tel:${number.replace(/\D/g, '')}`}>
                  <span className="visually-hidden">{t.home.emergency.call} </span>
                  {number}
                </a>
              </span>
            ))}{' '}
            <span className="emergency-what">{line.what}</span>
          </p>
        ))}
      </nav>
      {content(feed, t)}
      <p>
        <a href={`/text?to=${text ? 'off' : 'on'}&return=${back}`} rel="nofollow">
          {text ? t.feed.fullVersion : t.feed.textOnly}
        </a>
      </p>
      <p>
        <a href="/forget" rel="nofollow">
          {t.feed.clearDevice}
        </a>
      </p>
    </footer>
  )
}

function content(feed: FooterFeed, t: Messages) {
  switch (feed.state) {
    case 'stored':
      return (
        <>
          <p>
            {t.feed.asOf} <time dateTime={feed.generatedAt}>{feed.asOf}</time>.
          </p>
          {feed.updateFailing && <p>{t.feed.updateFailing}</p>}
          {feed.dataset === 'FICTIONAL_DEMONSTRATION' && <p>{t.feed.demonstration}</p>}
        </>
      )
    case 'none':
      return <p>{t.feed.none}</p>
    case 'unavailable':
      return (
        <p>
          {t.feed.unavailable} <a href="tel:211">211</a>.
        </p>
      )
  }
}
