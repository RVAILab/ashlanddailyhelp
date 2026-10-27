import { data, Link } from 'react-router'
import { pageAlerts } from '../../server/feed/page-alerts.ts'
import { AlertList } from '../components/alert-list.tsx'
import { AskForm } from '../components/ask-form.tsx'
import { services } from '../context.ts'
import { langFromPath, messagesFor } from '../i18n/index.ts'
import { useI18n } from '../i18n/provider.tsx'
import { categories } from '../lib/categories.ts'
import { textOnly } from '../lib/text-mode.ts'
import type { Route } from './+types/home'

export const handle = { hydrate: false }

// Art and motion are extras, left out in text-only mode.
export async function loader({ request, url, context }: Route.LoaderArgs) {
  let db = null
  try {
    db = context.get(services).database()
  } catch (error) {
    console.error('home: could not open the database', error)
  }
  const art = !textOnly(request.headers)
  return data({ ...(await pageAlerts(db, langFromPath(url.pathname), new Date())), art })
}

const art = (name: string) => ({
  avif: `/art/${name}.avif`,
  webp: `/art/${name}.webp`,
})

// The valley fills the right of the page on wide screens and runs edge to edge below the copy on narrow ones.
const VALLEY_SIZES = '(min-width: 64rem) min(84vw, 1500px), 100vw'
const valley = (name: string, widths: number[], type: string) =>
  widths.map(width => `/art/${name}-${width}.${type} ${width}w`).join(', ')

export function meta({ location }: Route.MetaArgs) {
  return [{ title: messagesFor(langFromPath(location.pathname)).siteName }]
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { t, path } = useI18n()
  const { art: showArt } = loaderData
  return (
    <main className={showArt ? 'home home-motion' : 'home'}>
      <div className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span aria-hidden="true">✳</span> {t.home.eyebrow}
          </p>
          <h1>
            <span>{t.home.hero.first}</span> <span>{t.home.hero.second}</span> <em>{t.home.hero.emphasis}</em>
          </h1>
          <p className="lede">{t.home.tagline}</p>
          <search>
            <form action={path('/resources')} method="get" className="hero-search">
              <label htmlFor="hero-q" className="visually-hidden">
                {t.home.searchLabel}
              </label>
              <input id="hero-q" name="q" type="search" placeholder={t.home.kinds} />
              <button type="submit">
                {t.home.find} <span aria-hidden="true">→</span>
              </button>
            </form>
          </search>
          <p>
            <Link to={path('/today')} className="today-link">
              {t.today.link} <span aria-hidden="true">→</span>
            </Link>
          </p>
          <p>
            <Link to={path('/next')} className="next-link">
              {t.next.link}
            </Link>
          </p>
        </div>
        {showArt && (
          <picture className="hero-art">
            <source
              type="image/avif"
              media="(max-width: 40rem)"
              srcSet={valley('valley-m', [640, 960], 'avif')}
              sizes="100vw"
              width="640"
              height="498"
            />
            <source
              type="image/webp"
              media="(max-width: 40rem)"
              srcSet={valley('valley-m', [640, 960], 'webp')}
              sizes="100vw"
              width="640"
              height="498"
            />
            <source type="image/avif" srcSet={valley('valley', [960, 1440, 2048], 'avif')} sizes={VALLEY_SIZES} />
            <source type="image/webp" srcSet={valley('valley', [960, 1440, 2048], 'webp')} sizes={VALLEY_SIZES} />
            <img
              src="/art/valley-960.jpg"
              srcSet={valley('valley', [960, 1440], 'jpg')}
              sizes={VALLEY_SIZES}
              alt=""
              width="1440"
              height="806"
              decoding="async"
              fetchPriority="low"
            />
          </picture>
        )}
      </div>
      <AlertList
        alerts={loaderData.alerts}
        listingNames={loaderData.listingNames}
        demonstration={loaderData.demonstration}
      />
      <section aria-labelledby="kinds-heading">
        <h2 id="kinds-heading">{t.home.kinds}</h2>
        <ul className="kinds">
          {categories.map(id => (
            <li key={id}>
              <Link to={path(`/resources?category=${id}`)}>
                {showArt && <TileArt name={`cat-${id}-160`} />}
                <strong>{t.categories[id]}</strong>
                <span>{t.home.hints[id]}</span>
              </Link>
            </li>
          ))}
          <li>
            <Link to={path('/resources')} className="search-all">
              {showArt && <TileArt name="cat-all-160" />}
              <strong>{t.home.searchAll}</strong>
            </Link>
          </li>
        </ul>
      </section>
      <section aria-labelledby="ask-heading" className="ask-entry">
        <h2 id="ask-heading">{t.ask.title}</h2>
        <p>{t.ask.intro}</p>
        <AskForm id="home-ask-q" />
      </section>
      <p className="belonging">
        {t.home.belonging.map((line, index) => (
          <span key={line}>
            {index > 0 && <span aria-hidden="true">✳ </span>}
            <em>{line}</em>{' '}
          </span>
        ))}
      </p>
      <section aria-labelledby="others-heading">
        <h2 id="others-heading">{t.home.others}</h2>
        <ul className="others">
          <li>
            <Link to={path('/resources')}>{t.home.helping}</Link>
          </li>
          <li>
            <Link to={path('/providers')}>{t.home.providers}</Link>
          </li>
          <li>
            <Link to={path('/pulse')}>{t.home.pulse}</Link>
          </li>
          <li>
            <Link to={path('/about')}>{t.home.about}</Link>
          </li>
        </ul>
      </section>
    </main>
  )
}

function TileArt({ name }: { name: string }) {
  return (
    <picture>
      <source type="image/avif" srcSet={art(name).avif} />
      <source type="image/webp" srcSet={art(name).webp} />
      <img src={`/art/${name}.png`} alt="" width="56" height="56" loading="lazy" decoding="async" />
    </picture>
  )
}
