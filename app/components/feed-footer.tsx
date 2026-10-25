import type { FeedHeader } from '../../server/feed/listings.ts'

const asOf = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

export function FeedFooter({ feed }: { feed: FeedHeader | null }) {
  return (
    <footer className="site-footer">
      {feed ? (
        <>
          <p>Listings as of {asOf.format(new Date(feed.generatedAt))}.</p>
          {feed.dataset === 'FICTIONAL_DEMONSTRATION' && (
            <p>This is demonstration data. Some listings are fictional.</p>
          )}
        </>
      ) : (
        <p>Listings have not loaded yet.</p>
      )}
    </footer>
  )
}
