import { Link } from 'react-router'
import { pulseWeeksList, storedPulseWeek } from '../../server/feed/pulse.ts'
import { type DayStatus, pulseWeek, type Unit } from '../../server/pulse/view.ts'
import { services } from '../context.ts'
import { type Lang, langFromPath, locales, messagesFor } from '../i18n/index.ts'
import { useI18n } from '../i18n/provider.tsx'
import { weekParam } from '../lib/pulse-week.ts'
import type { Route } from './+types/pulse'

export const handle = { hydrate: false }

const dayLabel = (lang: Lang, date: string) =>
  new Intl.DateTimeFormat(locales[lang], { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }).format(
    new Date(`${date}T12:00:00Z`),
  )

export async function loader({ url, context }: Route.LoaderArgs) {
  const lang = langFromPath(url.pathname)
  const t = messagesFor(lang)
  const db = context.get(services).database()
  if (!db) return { weeks: [], week: null }
  const asked = weekParam(url.searchParams)
  const stored = await storedPulseWeek(db, asked)
  const weeks = (await pulseWeeksList(db)).map(week => ({
    ...week,
    label: week.live ? t.pulse.thisWeek : t.pulse.weekOf(dayLabel(lang, week.weekStart)),
    href: week.live ? '/pulse' : `/pulse?week=${week.weekStart}`,
    current: stored ? week.live === stored.live && week.weekStart === stored.weekStart : false,
  }))
  if (!stored) return { weeks, week: null }
  const view = pulseWeek(stored.data)
  return {
    weeks,
    week: {
      weekStart: stored.weekStart,
      live: stored.live,
      revision: stored.revision,
      note: stored.note,
      fictional: stored.dataset === 'FICTIONAL_DEMONSTRATION',
      csv: stored.live ? '/pulse.csv' : `/pulse.csv?week=${stored.weekStart}`,
      providers: view.providers,
      unmet: view.unmet,
      units: view.units.map(unit => ({
        ...unit,
        days: unit.days.map(day => ({
          ...day,
          label: dayLabel(lang, day.date),
          percent: day.amount === null ? 0 : Math.round((day.amount / unit.scaleMax) * 100),
        })),
      })),
    },
  }
}

export function meta({ location }: Route.MetaArgs) {
  const t = messagesFor(langFromPath(location.pathname))
  return [{ title: `${t.pulse.title} · ${t.siteName}` }]
}

export default function Pulse({ loaderData }: Route.ComponentProps) {
  const { weeks, week } = loaderData
  const { t, path } = useI18n()
  return (
    <main className="pulse">
      <h1>{t.pulse.title}</h1>
      <p>{t.pulse.intro}</p>
      {week?.fictional && <p className="notice">{t.pulse.fictional}</p>}
      {weeks.length > 0 && (
        <nav aria-labelledby="weeks-heading" className="pulse-weeks">
          <h2 id="weeks-heading">{t.pulse.weeksHeading}</h2>
          <ul>
            {weeks.map(item => (
              <li key={`${item.weekStart}-${item.live}`}>
                <Link to={path(item.href)} aria-current={item.current ? 'page' : undefined}>
                  {item.label}
                </Link>
                {item.revision !== null && item.revision > 1 && <span> ({t.pulse.revision(item.revision)})</span>}
                {item.note && <p className="pulse-note">{t.pulse.correction(item.note)}</p>}
              </li>
            ))}
          </ul>
        </nav>
      )}
      {!week ? (
        <p>{t.pulse.none}</p>
      ) : (
        <>
          {week.live && <p className="notice">{t.pulse.live}</p>}
          <p>{t.pulse.providers(week.providers.reported, week.providers.scheduled)}</p>
          {week.units.length === 0 && <p>{t.pulse.empty}</p>}
          {week.units.map(unit => (
            <UnitChart key={unit.unit} unit={unit} />
          ))}
          <section aria-labelledby="unmet-heading">
            <h2 id="unmet-heading">{t.pulse.unmetHeading}</h2>
            {week.unmet.length === 0 ? (
              <p>{t.pulse.unmetNone}</p>
            ) : (
              <ul>
                {week.unmet.map(item => (
                  <li key={item.reason}>
                    {t.pulse.reasons[item.reason]}: {t.pulse.unmet(item.events)}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <p>
            <a href={week.csv} download>
              {t.pulse.csv}
            </a>
          </p>
        </>
      )}
    </main>
  )
}

interface ChartUnit {
  unit: Unit
  scheduled: number
  measured: number
  total: number | null
  counted: number
  estimated: number
  scaleMax: number
  days: Array<{
    date: string
    label: string
    amount: number | null
    fewerThanTen: boolean
    percent: number
    status: DayStatus
  }>
}

function UnitChart({ unit }: { unit: ChartUnit }) {
  const { t } = useI18n()
  const name = t.pulse.units[unit.unit]
  const heading = `pulse-${unit.unit}`
  return (
    <section aria-labelledby={heading} className="pulse-unit">
      <h2 id={heading}>{name}</h2>
      <p className="pulse-total">
        {unit.total === null
          ? t.pulse.unknownTotal
          : t.pulse.total(unit.total, name.toLowerCase(), unit.counted, unit.estimated)}{' '}
        {t.pulse.from(unit.measured, unit.scheduled)}
      </p>
      <p className="pulse-scale">{t.pulse.scale(unit.scaleMax)}</p>
      <ol className="pulse-days">
        {unit.days.map(day => {
          const amount = day.fewerThanTen ? t.pulse.fewer : day.amount === null ? '' : String(day.amount)
          return (
            <li key={day.date}>
              <span className="pulse-day">{day.label}</span>
              <span className="pulse-track" aria-hidden="true">
                {day.amount !== null && <span className="pulse-bar" style={{ width: `${day.percent}%` }} />}
              </span>
              <span className="pulse-value">
                {amount && <strong>{amount}</strong>} {t.pulse.status[day.status]}
              </span>
            </li>
          )
        })}
      </ol>
      <p className="pulse-axis" aria-hidden="true">
        <span>0</span>
        <span>{unit.scaleMax / 2}</span>
        <span>{unit.scaleMax}</span>
      </p>
    </section>
  )
}
