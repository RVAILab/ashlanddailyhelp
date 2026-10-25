import type { StoredListing } from '../../server/feed/contract.ts'
import { listingsFeedStatus } from '../../server/feed/listings.ts'
import { pageAlerts } from '../../server/feed/page-alerts.ts'
import { findListing } from '../../server/listings/listing.ts'
import { searchListings } from '../../server/listings/search.ts'
import { groupToday } from '../../server/today/group.ts'
import { services } from '../context.ts'
import { langFromPath, localePath, messagesFor } from '../i18n/index.ts'
import { useI18n } from '../i18n/provider.tsx'
import { categories } from '../lib/categories.ts'
import { formatAsOf } from '../lib/format.ts'
import { listingDetail } from '../lib/listing-detail.ts'
import { qrSvg } from '../lib/qr.ts'
import { parseIds, savedIds } from '../lib/saved-list.ts'
import type { Route } from './+types/print'

export const handle = { hydrate: false }

export async function loader({ request, url, context }: Route.LoaderArgs) {
  const lang = langFromPath(url.pathname)
  const t = messagesFor(lang)
  const db = context.get(services).database()
  const now = new Date()
  const category = categories.find(id => id === url.searchParams.get('category'))
  let title = t.list.title
  let back = '/list'
  let listings: StoredListing[] = []
  if (db) {
    if (url.searchParams.get('view') === 'today') {
      title = t.today.title
      back = '/today'
      const closed = new Set((await pageAlerts(db, lang, now)).closedListings)
      const groups = groupToday(await searchListings(db, {}, now, lang), now, closed)
      listings = [...groups.openNow, ...groups.later, ...groups.notConfirmed].map(entry => entry.listing)
    } else if (category) {
      title = t.categories[category]
      back = `/resources?category=${category}`
      listings = await searchListings(db, { category }, now, lang)
    } else {
      const ids = url.searchParams.has('ids')
        ? parseIds(url.searchParams.get('ids'))
        : savedIds(request.headers.get('Cookie'))
      listings = (await Promise.all(ids.map(id => findListing(db, id, now)))).filter(listing => listing !== null)
      back = `/list?ids=${listings.map(listing => listing.id).join('.')}`
    }
  }
  const feed = db ? await listingsFeedStatus(db) : { state: 'unavailable' as const }
  const backUrl = `${url.origin}${localePath(back, lang)}`
  return {
    title,
    backUrl,
    qr: qrSvg(backUrl),
    asOf: feed.state === 'stored' ? formatAsOf(feed.generatedAt, lang) : null,
    demonstration: feed.state === 'stored' && feed.dataset === 'FICTIONAL_DEMONSTRATION',
    rows: listings.map(listing => {
      const detail = listingDetail(listing, lang)
      const field = (key: 'schedule' | 'address' | 'requirements') =>
        detail.fields.find(shown => shown.key === key)?.text ?? t.detail.notConfirmed
      return {
        id: listing.id,
        name: listing.name,
        address: field('address'),
        phone: detail.phone,
        hours: field('schedule'),
        requirements: field('requirements'),
        warnings: detail.labels
          .filter(label => label.kind === 'warning' || label.kind === 'caution')
          .map(label => label.text),
      }
    }),
  }
}

export function meta({ location }: Route.MetaArgs) {
  const t = messagesFor(langFromPath(location.pathname))
  return [{ title: `${t.print.title} · ${t.siteName}` }, { name: 'robots', content: 'noindex' }]
}

export default function Print({ loaderData }: Route.ComponentProps) {
  const { title, backUrl, qr, asOf, demonstration, rows } = loaderData
  const { t } = useI18n()
  return (
    <main className="print-sheet">
      <h1>
        {t.siteName}: {title}
      </h1>
      <p className="print-note">{t.print.confirm}</p>
      {demonstration && <p className="print-note">{t.feed.demonstration}</p>}
      {rows.length === 0 ? (
        <p>{t.print.empty}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th scope="col">{t.print.place}</th>
              <th scope="col">{t.print.when}</th>
              <th scope="col">{t.print.bring}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td>
                  <strong>{row.name}</strong>
                  <br />
                  {row.address}
                  {row.phone && (
                    <>
                      <br />
                      {row.phone}
                    </>
                  )}
                </td>
                <td>
                  {row.warnings.map(warning => (
                    <strong key={warning} className="print-warning">
                      {warning}
                      <br />
                    </strong>
                  ))}
                  {row.hours}
                </td>
                <td>{row.requirements}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="print-back">
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: SVG made on the server from our own URL */}
        <div className="print-qr" role="img" aria-label={t.print.qr} dangerouslySetInnerHTML={{ __html: qr }} />
        <p>
          {t.print.back} <strong>{backUrl}</strong>
          {asOf && (
            <>
              <br />
              {t.feed.asOf} {asOf}.
            </>
          )}
          <br />
          {t.print.help}
        </p>
      </div>
    </main>
  )
}
