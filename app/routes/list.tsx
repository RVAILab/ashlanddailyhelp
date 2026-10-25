import { Link } from 'react-router'
import { findListing } from '../../server/listings/listing.ts'
import { ListingCardView } from '../components/listing-card.tsx'
import { services } from '../context.ts'
import { langFromPath, messagesFor } from '../i18n/index.ts'
import { useI18n } from '../i18n/provider.tsx'
import { toCard } from '../lib/card-data.ts'
import { parseIds, savedIds } from '../lib/saved-list.ts'
import type { Route } from './+types/list'

export const handle = { hydrate: false }

export async function loader({ request, url, context }: Route.LoaderArgs) {
  const lang = langFromPath(url.pathname)
  const saved = savedIds(request.headers.get('Cookie'))
  const shared = url.searchParams.has('ids')
  const ids = shared ? parseIds(url.searchParams.get('ids')) : saved
  const db = context.get(services).database()
  const now = new Date()
  const found = db
    ? (await Promise.all(ids.map(id => findListing(db, id, now)))).filter(listing => listing !== null)
    : []
  const cards = found.map(listing => toCard(listing, lang, { saved: saved.includes(listing.id) }))
  const present = cards.map(card => card.id)
  return {
    shared,
    cards,
    missing: ids.length - present.length,
    presentIds: present,
    shareUrl: present.length ? `${url.origin}/list?ids=${present.join('.')}` : null,
  }
}

export function meta({ location }: Route.MetaArgs) {
  const t = messagesFor(langFromPath(location.pathname))
  return [{ title: `${t.list.title} · ${t.siteName}` }, { name: 'robots', content: 'noindex' }]
}

export default function List({ loaderData }: Route.ComponentProps) {
  const { shared, cards, missing, presentIds, shareUrl } = loaderData
  const { t, path } = useI18n()
  return (
    <main>
      <h1>{shared ? t.list.sharedTitle : t.list.title}</h1>
      <p>{shared ? t.list.sharedIntro : t.list.intro}</p>
      {missing > 0 && <p className="notice">{t.list.missing(missing)}</p>}
      {cards.length === 0 ? (
        <p>
          {t.list.empty} <Link to={path('/resources')}>{t.home.searchAll}</Link>
        </p>
      ) : (
        cards.map(card => <ListingCardView key={card.id} listing={card} />)
      )}
      {shareUrl && (
        <section aria-labelledby="share-heading">
          <h2 id="share-heading">{t.list.share}</h2>
          <p className="share-url">{shareUrl}</p>
          <p>
            <a className="call-211" href={`sms:?&body=${encodeURIComponent(t.list.textBody(shareUrl))}`}>
              {t.list.text}
            </a>
          </p>
          {shared && (
            <p>
              <a href={`/list/save?ids=${presentIds.join('.')}`} rel="nofollow">
                {t.list.save}
              </a>
            </p>
          )}
        </section>
      )}
    </main>
  )
}
