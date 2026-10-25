import { listCookie, savedIds, toggled } from '../lib/saved-list.ts'
import type { Route } from './+types/list-toggle'

const localReturn = (value: string | null) =>
  value && /^\/(?![/\\])/.test(value) ? value.replace(/^\/+/, '/') : '/list'

// Adds a listing to, or removes it from, the list saved on this device, then goes back; works without JavaScript.
export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id') ?? ''
  const back = localReturn(url.searchParams.get('return'))
  const headers = new Headers({ Location: back, 'Cache-Control': 'no-store' })
  if (/^[a-z0-9][a-z0-9-]*$/.test(id))
    headers.set(
      'Set-Cookie',
      listCookie(toggled(savedIds(request.headers.get('Cookie')), id), url.protocol === 'https:'),
    )
  return new Response(null, { status: 303, headers })
}
