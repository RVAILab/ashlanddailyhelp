import { Link } from 'react-router'
import { langFromPath, messagesFor } from '../i18n/index.ts'
import { useI18n } from '../i18n/provider.tsx'
import { categories } from '../lib/categories.ts'
import type { Route } from './+types/home'

export const handle = { hydrate: false }

export function meta({ location }: Route.MetaArgs) {
  return [{ title: messagesFor(langFromPath(location.pathname)).siteName }]
}

export default function Home() {
  const { t, path } = useI18n()
  return (
    <main className="home">
      <h1>{t.home.title}</h1>
      <p>{t.home.tagline}</p>
      <p>
        <Link to={path('/today')} className="today-link">
          {t.today.link}
        </Link>
      </p>
      <section aria-labelledby="kinds-heading">
        <h2 id="kinds-heading">{t.home.kinds}</h2>
        <ul className="kinds">
          {categories.map(id => (
            <li key={id}>
              <Link to={path(`/resources?category=${id}`)}>
                <strong>{t.categories[id]}</strong>
                <span>{t.home.hints[id]}</span>
              </Link>
            </li>
          ))}
          <li>
            <Link to={path('/resources')} className="search-all">
              <strong>{t.home.searchAll}</strong>
            </Link>
          </li>
        </ul>
      </section>
      <section aria-labelledby="others-heading">
        <h2 id="others-heading">{t.home.others}</h2>
        <ul className="others">
          <li>
            <Link to={path('/resources')}>{t.home.helping}</Link>
          </li>
          <li>
            <Link to={`${path('/about')}#providers`}>{t.home.providers}</Link>
          </li>
          <li>
            <Link to={path('/about')}>{t.home.about}</Link>
          </li>
        </ul>
      </section>
    </main>
  )
}
