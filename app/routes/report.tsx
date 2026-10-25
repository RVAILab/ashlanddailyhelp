import { data, Link } from 'react-router'
import { findListing } from '../../server/listings/listing.ts'
import { services } from '../context.ts'
import { langFromPath, messagesFor } from '../i18n/index.ts'
import { useI18n } from '../i18n/provider.tsx'
import { listingDetail } from '../lib/listing-detail.ts'
import type { Route } from './+types/report'

export const handle = { hydrate: false }

export async function loader({ url, context }: Route.LoaderArgs) {
  const { database, correctionsEmail } = context.get(services)
  const lang = langFromPath(url.pathname)
  const t = messagesFor(lang)
  const db = database()
  const id = url.searchParams.get('listing') ?? ''
  const listing = db && /^[a-z0-9][a-z0-9-]*$/.test(id) ? await findListing(db, id, new Date()) : null
  if (!listing) return data({ listing: null, mailto: null }, { status: 404 })
  const page = `${url.origin}/resources/${listing.id}`
  const translation = url.searchParams.get('about') === 'translation'
  const mailto = correctionsEmail
    ? `mailto:${correctionsEmail}?subject=${encodeURIComponent(t.providers.subject(listing.name))}&body=${encodeURIComponent(t.providers.body(listing.id, page, translation))}`
    : null
  return data({ listing: listingDetail(listing, lang), mailto })
}

export function meta({ location }: Route.MetaArgs) {
  const t = messagesFor(langFromPath(location.pathname))
  return [{ title: `${t.providers.reportTitle} · ${t.siteName}` }, { name: 'robots', content: 'noindex' }]
}

export default function Report({ loaderData }: Route.ComponentProps) {
  const { listing, mailto } = loaderData
  const { t, path } = useI18n()
  if (!listing)
    return (
      <main>
        <h1>{t.detail.notFound}</h1>
        <p>
          <Link to={path('/providers')}>{t.providers.title}</Link>
        </p>
      </main>
    )
  return (
    <main className="report">
      <h1>{t.providers.reportTitle}</h1>
      <p>{t.providers.reportIntro}</p>
      <h2>
        <Link to={path(`/resources/${listing.id}`)}>{listing.name}</Link>
      </h2>
      <dl className="listing-fields">
        {listing.fields.map(field => (
          <div key={field.key}>
            <dt>{field.label}</dt>
            <dd>{field.text}</dd>
          </div>
        ))}
      </dl>
      <section aria-labelledby="where-heading">
        <h2 id="where-heading">{t.providers.whereFrom}</h2>
        {listing.provenance.length === 0 ? (
          <p>{t.providers.noSources}</p>
        ) : (
          <ul>
            {listing.provenance.flatMap(field =>
              field.entries.map((entry, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: entries have no id
                <li key={`${field.field}-${index}`}>
                  <strong>{field.field}:</strong> {entry.ref} ({entry.source}){entry.quote ? `, “${entry.quote}”` : ''}.{' '}
                  {entry.seen}.
                </li>
              )),
            )}
          </ul>
        )}
        <ul>
          {listing.sources.map(source => (
            <li key={source.url}>
              <a href={source.url}>{source.name}</a>
            </li>
          ))}
        </ul>
      </section>
      {mailto ? (
        <>
          <p>
            <a className="call-211" href={mailto}>
              {t.providers.request}
            </a>
          </p>
          <p>{t.providers.requestHelp}</p>
        </>
      ) : (
        <p>{t.providers.noAddress}</p>
      )}
    </main>
  )
}
