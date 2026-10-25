import { listCookie, merged, parseIds, savedIds } from '../lib/saved-list.ts'
import type { Route } from './+types/list-save'

// Keeps a shared list on this device, added to anything already saved.
export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  // A link from another website changes nothing.
  if (request.headers.get('Sec-Fetch-Site') === 'cross-site')
    return new Response(null, { status: 303, headers: { Location: '/list', 'Cache-Control': 'no-store' } })
  const ids = merged(savedIds(request.headers.get('Cookie')), parseIds(url.searchParams.get('ids')))
  return new Response(null, {
    status: 303,
    headers: {
      Location: '/list',
      'Set-Cookie': listCookie(ids, url.protocol === 'https:'),
      'Cache-Control': 'no-store',
    },
  })
}
