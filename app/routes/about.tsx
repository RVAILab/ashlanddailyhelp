import { Link } from 'react-router'
import { langFromPath, messagesFor } from '../i18n/index.ts'
import { useI18n } from '../i18n/provider.tsx'
import type { Route } from './+types/about'

export const handle = { hydrate: false }

export function meta({ location }: Route.MetaArgs) {
  const t = messagesFor(langFromPath(location.pathname))
  return [{ title: `${t.about.title} · ${t.siteName}` }]
}

export default function About() {
  const { t, path } = useI18n()
  return (
    <main className="about">
      <h1>{t.about.title}</h1>
      <p>{t.about.intro}</p>
      <h2>{t.about.sourcesHeading}</h2>
      <p>{t.about.sources}</p>
      <p>{t.about.callAhead}</p>
      <h2>{t.about.labelsHeading}</h2>
      <dl>
        {t.about.labels.map(([label, meaning]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{meaning}</dd>
          </div>
        ))}
      </dl>
      <h2>{t.about.privacyHeading}</h2>
      <p>{t.about.privacy}</p>
      <h2 id="providers">{t.about.providersHeading}</h2>
      <p>{t.about.providers}</p>
      <p>
        <Link to={path('/providers')}>{t.providers.title}</Link>
      </p>
    </main>
  )
}
