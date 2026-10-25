import { data } from 'react-router'
import { langFromPath, messagesFor } from '../i18n/index.ts'
import { useI18n } from '../i18n/provider.tsx'
import type { Route } from './+types/not-found'

export function loader() {
  return data(null, { status: 404 })
}

export function meta({ location }: Route.MetaArgs) {
  const t = messagesFor(langFromPath(location.pathname))
  return [{ title: `${t.errors.notFound} · ${t.siteName}` }]
}

export default function NotFound() {
  const { t, path } = useI18n()
  return (
    <main>
      <h1>{t.errors.notFound}</h1>
      <p>
        {t.errors.notFoundDetail} <a href={path('/')}>{t.errors.home}</a>.
      </p>
    </main>
  )
}
