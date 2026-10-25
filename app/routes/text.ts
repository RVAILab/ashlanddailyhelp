import { localReturn } from '../lib/local-path.ts'
import { TEXT_COOKIE } from '../lib/text-mode.ts'
import type { Route } from './+types/text'

const YEAR = 60 * 60 * 24 * 365

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const back = localReturn(url.searchParams.get('return'), url.origin, '/')
  const to = url.searchParams.get('to')
  if (to !== 'on' && to !== 'off') return new Response(null, { status: 302, headers: { Location: back } })
  const secure = url.protocol === 'https:' ? '; Secure' : ''
  return new Response(null, {
    status: 302,
    headers: {
      Location: back,
      'Set-Cookie': `${TEXT_COOKIE}=${to}; Path=/; Max-Age=${YEAR}; SameSite=Lax; HttpOnly${secure}`,
    },
  })
}
