import { type Lang, locales } from '../i18n/index.ts'

const asOf = (lang: Lang) =>
  new Intl.DateTimeFormat(locales[lang], {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })

// Runs on the server only, so the page and its hydration agree whatever the browser's date formatting does.
export function formatAsOf(iso: string, lang: Lang): string {
  return asOf(lang).format(new Date(iso)).replace(/\s/g, ' ')
}
