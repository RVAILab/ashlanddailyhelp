import { isLang, LANG_COOKIE, langFromPath, localePath } from '../i18n/index.ts'
import type { Route } from './+types/language'

const YEAR = 60 * 60 * 24 * 365

// Only a path on this site: "/x", never "//host" or "/\host", which browsers treat as another site.
const localReturn = (value: string | null) => (value && /^\/(?![/\\])/.test(value) ? value : '/')

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const back = localReturn(url.searchParams.get('return'))
  const to = url.searchParams.get('to')
  if (!isLang(to))
    return new Response(null, { status: 302, headers: { Location: localePath(back, langFromPath(back)) } })
  const secure = url.protocol === 'https:' ? '; Secure' : ''
  return new Response(null, {
    status: 302,
    headers: {
      Location: localePath(back, to),
      'Set-Cookie': `${LANG_COOKIE}=${to}; Path=/; Max-Age=${YEAR}; SameSite=Lax${secure}`,
    },
  })
}
