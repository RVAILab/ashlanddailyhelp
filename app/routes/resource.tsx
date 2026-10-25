import { data, Link, useLocation } from 'react-router'
import { pageAlerts } from '../../server/feed/page-alerts.ts'
import { findListing } from '../../server/listings/listing.ts'
import { translationsFor } from '../../server/translate/lookup.ts'
import { translatableTexts } from '../../server/translate/texts.ts'
import { ListingStatus } from '../components/listing-status.tsx'
import { services } from '../context.ts'
import { langFromPath, messagesFor } from '../i18n/index.ts'
import { useI18n } from '../i18n/provider.tsx'
import { listingDetail } from '../lib/listing-detail.ts'
import type { Route } from './+types/resource'

export async function loader({ url, params, context }: Route.LoaderArgs) {
  const db = context.get(services).database()
  if (!db) throw data('The listings database is not configured.', { status: 503 })
  const lang = langFromPath(url.pathname)
  const listing = await findListing(db, params.id, new Date())
  if (!listing) return data({ listing: null }, { status: 404 })
  const translated =
    lang === 'es'
      ? await translationsFor(
          db,
          translatableTexts(listing).map(text => text.english),
          'es',
        )
      : new Map<string, string>()
  const detail = listingDetail(listing, lang, translated)
  const alert = (await pageAlerts(db, lang, new Date())).byListing[listing.id]
  if (alert) detail.labels.unshift({ kind: 'warning', text: alert })
  return data({ listing: detail })
}

export function meta({ loaderData, location }: Route.MetaArgs) {
  const t = messagesFor(langFromPath(location.pathname))
  return [{ title: `${loaderData?.listing?.name ?? t.detail.notFound} · ${t.siteName}` }]
}

const dialable = (phone: string) => phone.replace(/[^\d+]/g, '')

// A card links here with the search it came from, so "Back to search" returns to the same results.
const searchFrom = (state: unknown) =>
  typeof state === 'object' && state !== null && 'search' in state && typeof state.search === 'string'
    ? state.search
    : ''

export default function Resource({ loaderData }: Route.ComponentProps) {
  const { listing } = loaderData
  const { t, lang, path } = useI18n()
  const location = useLocation()
  const back = (
    <p>
      <Link to={path(`/resources${searchFrom(location.state)}`)}>{t.detail.backToSearch}</Link>
    </p>
  )
  if (!listing)
    return (
      <main>
        <h1>{t.detail.notFound}</h1>
        <p>{t.detail.notFoundDetail}</p>
        {back}
      </main>
    )
  // The steward writes listings in English; on other pages, mark that text so screen readers use an English voice.
  const feedLang = lang === 'en' ? undefined : 'en'
  return (
    <main className="listing-page">
      {back}
      <h1 lang={feedLang}>{listing.name}</h1>
      <p className="provider" lang={feedLang}>
        {listing.provider}
      </p>
      <ListingStatus labels={listing.labels} />
      {listing.translated && (
        <p className="machine-translated">
          {t.labels.machineTranslated} ·{' '}
          <a href={`/resources/${listing.id}`} hrefLang="en">
            {t.labels.viewEnglish}
          </a>
        </p>
      )}
      <p lang={listing.description.fromFeed ? feedLang : undefined}>{listing.description.text}</p>
      <p className="actions">
        {listing.phone && (
          <a className="action" href={`tel:${dialable(listing.phone)}`}>
            {t.detail.call(listing.phone)}
          </a>
        )}
        {listing.location.published && listing.location.mapUrl && (
          <a className="action" href={listing.location.mapUrl} target="_blank" rel="noopener noreferrer">
            {t.detail.map}
          </a>
        )}
      </p>
      <section aria-labelledby="details-heading">
        <h2 id="details-heading">{t.detail.details}</h2>
        <dl className="listing-fields">
          {listing.fields.map(field => (
            <div key={field.key}>
              <dt>{field.label}</dt>
              <dd lang={field.fromFeed ? feedLang : undefined}>{field.text}</dd>
            </div>
          ))}
          <div>
            <dt>{t.detail.fields.phone}</dt>
            <dd>{listing.phone ?? t.detail.notConfirmed}</dd>
          </div>
        </dl>
      </section>
      <section aria-labelledby="sources-heading">
        <h2 id="sources-heading">{t.detail.sources}</h2>
        <ul className="sources">
          {listing.sources.map(source => (
            <li key={source.url}>
              <a href={source.url} rel="noopener noreferrer">
                {source.name}
              </a>
            </li>
          ))}
        </ul>
        {listing.reviewed && <p>{listing.reviewed}</p>}
        <p>
          <Link to={path(`/report?listing=${listing.id}${listing.translated ? '&about=translation' : ''}`)}>
            {t.providers.reportLink}
          </Link>
        </p>
        <details className="provenance">
          <summary>{t.detail.whereFrom}</summary>
          {listing.provenance.length === 0 ? (
            <p>{t.detail.whereFromNone}</p>
          ) : (
            <dl>
              {listing.provenance.map(field => (
                <div key={field.field}>
                  <dt lang={field.fromFeed ? feedLang : undefined}>{field.field}</dt>
                  {field.entries.map((entry, index) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: entries have no id, and one source can be seen twice in a day
                    <dd key={index}>
                      {entry.url ? <a href={entry.url}>{entry.ref}</a> : <span lang={feedLang}>{entry.ref}</span>} (
                      {entry.source}).{' '}
                      {entry.quote && (
                        <>
                          <q lang={feedLang}>{entry.quote}</q>{' '}
                        </>
                      )}
                      {entry.seen}.
                    </dd>
                  ))}
                </div>
              ))}
            </dl>
          )}
        </details>
      </section>
    </main>
  )
}
