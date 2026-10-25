import { localReturn } from '../lib/local-path.ts'
import { listCookie, savedIds, toggled } from '../lib/saved-list.ts'
import type { Route } from './+types/list-toggle'

// Adds a listing to, or removes it from, the list saved on this device, then goes back; works without JavaScript.
// A link from another website changes nothing, so a page elsewhere can't edit someone's list.
export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id') ?? ''
  const back = localReturn(url.searchParams.get('return'), url.origin, '/list')
  const headers = new Headers({ Location: back, 'Cache-Control': 'no-store' })
  const fromHere = request.headers.get('Sec-Fetch-Site') !== 'cross-site'
  if (fromHere && /^[a-z0-9][a-z0-9-]*$/.test(id))
    headers.set(
      'Set-Cookie',
      listCookie(toggled(savedIds(request.headers.get('Cookie')), id), url.protocol === 'https:'),
    )
  return new Response(null, { status: 303, headers })
}
