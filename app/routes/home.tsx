import { Link } from 'react-router'
import { langFromPath, messagesFor } from '../i18n/index.ts'
import { useI18n } from '../i18n/provider.tsx'
import type { Route } from './+types/home'

export function meta({ location }: Route.MetaArgs) {
  return [{ title: messagesFor(langFromPath(location.pathname)).siteName }]
}

export default function Home() {
  const { t, path } = useI18n()
  return (
    <main>
      <h1>{t.siteName}</h1>
      <p>{t.home.tagline}</p>
      <p>
        <Link to={path('/resources')}>{t.home.findHelp}</Link>
      </p>
    </main>
  )
}
