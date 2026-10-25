import { langFromPath, localePath, preferredLang } from './index.ts'

// Where a page request should go instead, or null to show it. An English (unprefixed) page sends people whose saved
// choice or browser prefers Spanish to the Spanish page, but only on arrival: within the site, they chose the page.
export function languageRedirect(url: URL, headers: Headers): string | null {
  const prefix = url.pathname.match(/^\/es(?=\/|$)/i)?.[0]
  if (prefix && prefix !== '/es') return `/es${url.pathname.slice(3)}${url.search}`
  if (langFromPath(url.pathname) === 'es') return null
  const referer = headers.get('Referer')
  const fromSite =
    headers.get('Sec-Fetch-Site') === 'same-origin' ||
    (referer !== null && URL.canParse(referer) && new URL(referer).origin === url.origin)
  if (fromSite) return null
  const wanted = preferredLang({ cookie: headers.get('Cookie'), acceptLanguage: headers.get('Accept-Language') })
  return wanted === 'es' ? localePath(`${url.pathname}${url.search}`, 'es') : null
}
