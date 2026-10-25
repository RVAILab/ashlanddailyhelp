import { Link } from 'react-router'
import { useI18n } from '../i18n/provider.tsx'
import type { AlertView } from '../lib/alert-view.ts'

const shapes = { urgent: '▲', notice: '●' } as const

// A plain region, not a live one: screen readers read the alerts once, with the page, not on every refresh.
export function AlertList({ alerts, listingNames }: { alerts: AlertView[]; listingNames: Record<string, string> }) {
  const { t, path } = useI18n()
  if (alerts.length === 0) return null
  return (
    <section aria-label={t.alerts.label} className="alerts">
      {alerts.map(alert => (
        <article key={alert.id} aria-labelledby={`alert-${alert.id}`} className={`alert alert-${alert.severity}`}>
          <p className="alert-severity">
            <span aria-hidden="true">{shapes[alert.severity]}</span> {alert.severityText}
          </p>
          <h2 id={`alert-${alert.id}`}>{alert.title}</h2>
          {alert.status && <p className="label label-warning">{alert.status}</p>}
          <p>{alert.message}</p>
          <p className="alert-when">{alert.when}</p>
          {alert.listingIds
            .filter(id => listingNames[id])
            .map(id => (
              <p key={id}>
                {t.alerts.affects} <Link to={path(`/resources/${id}`)}>{listingNames[id]}</Link>
              </p>
            ))}
        </article>
      ))}
    </section>
  )
}
