import { listCookie, parseIds, savedIds } from '../lib/saved-list.ts'
import type { Route } from './+types/list-save'

// Keeps a shared list on this device, added to anything already saved.
export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const ids = [...new Set([...savedIds(request.headers.get('Cookie')), ...parseIds(url.searchParams.get('ids'))])]
  return new Response(null, {
    status: 303,
    headers: {
      Location: '/list',
      'Set-Cookie': listCookie(ids, url.protocol === 'https:'),
      'Cache-Control': 'no-store',
    },
  })
}
