import { Form, Link } from 'react-router'
import { listingsByProvider } from '../../server/listings/providers.ts'
import { services } from '../context.ts'
import { langFromPath, messagesFor } from '../i18n/index.ts'
import { useI18n } from '../i18n/provider.tsx'
import type { Route } from './+types/providers'

export const handle = { hydrate: false }

export async function loader({ url, context }: Route.LoaderArgs) {
  const name = url.searchParams.get('name')?.trim().slice(0, 100) ?? ''
  const db = context.get(services).database()
  const found = db && name ? await listingsByProvider(db, name, new Date()) : []
  return { name, listings: found.map(listing => ({ id: listing.id, name: listing.name, provider: listing.provider })) }
}

export function meta({ location }: Route.MetaArgs) {
  const t = messagesFor(langFromPath(location.pathname))
  return [{ title: `${t.providers.title} · ${t.siteName}` }]
}

export default function Providers({ loaderData }: Route.ComponentProps) {
  const { name, listings } = loaderData
  const { t, path } = useI18n()
  return (
    <main>
      <h1>{t.providers.title}</h1>
      <p>{t.providers.intro}</p>
      <Form method="get" className="search-form" role="search">
        <label>
          {t.providers.name}
          <input type="search" name="name" defaultValue={name} maxLength={100} />
        </label>
        <button type="submit">{t.providers.submit}</button>
      </Form>
      {name &&
        (listings.length === 0 ? (
          <p>{t.providers.none}</p>
        ) : (
          <ul className="others">
            {listings.map(listing => (
              <li key={listing.id}>
                <Link to={path(`/report?listing=${listing.id}`)}>
                  {listing.name} ({listing.provider}): {t.providers.check}
                </Link>
              </li>
            ))}
          </ul>
        ))}
    </main>
  )
}
