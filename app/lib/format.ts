import { type Lang, locales } from '../i18n/index.ts'

// Spanish uses full day, month and zone names, which read more easily than abbreviations such as "dom" or "PDT".
const asOfOptions: Record<Lang, Intl.DateTimeFormatOptions> = {
  en: { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZoneName: 'short' },
  es: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZoneName: 'long' },
}

// Runs on the server only, so the page and its hydration agree whatever the browser's date formatting does.
export function formatAsOf(iso: string, lang: Lang): string {
  const format = new Intl.DateTimeFormat(locales[lang], {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    minute: '2-digit',
    ...asOfOptions[lang],
  })
  return format.format(new Date(iso)).replace(/\s/g, ' ')
}

export const clock = (lang: Lang, iso: string | Date) =>
  new Intl.DateTimeFormat(locales[lang], { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit' })
    .format(new Date(iso))
    .replace(/\s/g, ' ')
