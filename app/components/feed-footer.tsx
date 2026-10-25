import type { FeedStatus } from '../../server/feed/listings.ts'
import type { Messages } from '../i18n/en.ts'
import { useI18n } from '../i18n/provider.tsx'

export type FooterFeed = FeedStatus extends infer Status
  ? Status extends { state: 'stored' }
    ? Status & { asOf: string }
    : Status
  : never

export function FeedFooter({ feed }: { feed: FooterFeed }) {
  const { t } = useI18n()
  const numbers = [
    ['911', t.home.emergency.emergency],
    ['988', t.home.emergency.crisis],
    ['211', t.home.emergency.services],
  ] as const
  return (
    <footer className="site-footer">
      <nav aria-label={t.home.emergency.label} className="emergency">
        {numbers.map(([number, what]) => (
          <a key={number} href={`tel:${number}`}>
            <strong>
              <span className="visually-hidden">{t.home.emergency.call} </span>
              {number}
            </strong>{' '}
            <span>{what}</span>
          </a>
        ))}
      </nav>
      {content(feed, t)}
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
