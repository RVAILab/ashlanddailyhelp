import type { FeedAlert } from '../../server/feed/contract.ts'
import { type Lang, locales, messagesFor } from '../i18n/index.ts'

export interface AlertView {
  id: string
  severity: 'urgent' | 'notice'
  severityText: string
  title: string
  message: string
  when: string
  status: string | null
  listingIds: string[]
}

// Worked out on the server, like listing labels, so the times are the same in the page and after hydration.
export function alertView(alert: FeedAlert, lang: Lang): AlertView {
  const t = messagesFor(lang).alerts
  const time = (iso: string) =>
    new Intl.DateTimeFormat(locales[lang], {
      timeZone: 'America/Los_Angeles',
      // Spanish reads more easily with full day names than abbreviations such as "mar".
      weekday: lang === 'es' ? 'long' : 'short',
      hour: 'numeric',
      minute: '2-digit',
    })
      .format(new Date(iso))
      .replace(/\s/g, ' ')
  const status =
    alert.status === 'canceled'
      ? alert.note || t.canceled
      : alert.status === 'may_be_canceled'
        ? alert.note || t.mayBeCanceled
        : null
  return {
    id: alert.id,
    severity: alert.severity,
    severityText: t[alert.severity],
    title: alert.title,
    message: alert.message,
    when: t.window(time(alert.startsAt), time(alert.endsAt)),
    status,
    listingIds: alert.listingIds ?? [],
  }
}
