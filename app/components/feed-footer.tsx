import type { FeedStatus } from '../../server/feed/listings.ts'

export type FooterFeed = FeedStatus extends infer Status
  ? Status extends { state: 'stored' }
    ? Status & { asOf: string }
    : Status
  : never

export function FeedFooter({ feed }: { feed: FooterFeed }) {
  return <footer className="site-footer">{content(feed)}</footer>
}

function content(feed: FooterFeed) {
  switch (feed.state) {
    case 'stored':
      return (
        <>
          <p>
            Listings as of <time dateTime={feed.generatedAt}>{feed.asOf}</time>.
          </p>
          {feed.updateFailing && <p>The latest update could not be loaded, so these listings may be out of date.</p>}
          {feed.dataset === 'FICTIONAL_DEMONSTRATION' && (
            <p>This is demonstration data. Some listings are fictional.</p>
          )}
        </>
      )
    case 'none':
      return <p>Listings have not loaded yet.</p>
    case 'unavailable':
      return (
        <p>
          Listings are unavailable right now. For help finding services, call <a href="tel:211">211</a>.
        </p>
      )
  }
}
