// Keeps Daily Help usable without a connection. Pages come from the network first and from the last saved copy when
// offline or when the server fails; hashed build assets, fonts and art are saved once (a new build has new names, and
// old ones are trimmed). Only pages without a search are saved, so the saved set stays bounded by the number of pages.
const PAGES = 'daily-help-pages-v2'
const ASSETS = 'daily-help-assets-v2'
const MAX_ASSETS = 80
// Never answered from the device: checks, the language switch, clearing, reports and any API.
const NEVER = [
  /^\/health/,
  /^\/language/,
  /^\/forget/,
  /^\/list\/(toggle|save)/,
  /^\/(es\/)?report/,
  /^\/(es\/)?ask/,
  /^\/api\//,
  /^\/cdn-cgi\//,
  /^\/offline-pages\.json/,
]
// Query parameters React Router adds to route-data requests; a request with only these is a plain page's data.
const ROUTER_PARAMS = new Set(['_routes', 'index'])

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) if (name !== PAGES && name !== ASSETS) await caches.delete(name)
      await self.clients.claim()
    })(),
  )
})

// The page asks once it has loaded, so saving every listing never holds up a visit.
self.addEventListener('message', event => {
  if (event.data === 'save-pages') event.waitUntil(saveListedPages())
})

async function saveListedPages() {
  let pages = []
  try {
    pages = await (await fetch('/offline-pages.json', { cache: 'no-store' })).json()
  } catch {
    return
  }
  const cache = await caches.open(PAGES)
  // A few at a time, so an old phone on a slow connection isn't swamped.
  for (let start = 0; start < pages.length; start += 4) {
    await Promise.all(
      pages.slice(start, start + 4).map(async page => {
        try {
          const response = await fetch(page)
          if (response.ok) await cache.put(page, response)
        } catch {
          // Saved the next time it is visited.
        }
      }),
    )
  }
}

const plainPage = url => [...url.searchParams.keys()].every(key => ROUTER_PARAMS.has(key))

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)
  if (url.origin === self.location.origin && url.pathname === '/text') {
    event.respondWith(switchMode(request))
    return
  }
  if (request.method !== 'GET' || url.origin !== self.location.origin || NEVER.some(path => path.test(url.pathname)))
    return
  if (/^\/(assets|fonts|art)\//.test(url.pathname)) event.respondWith(savedFirst(request))
  else event.respondWith(networkFirst(request, url))
})

// Saved pages carry the mode they were saved in, so switching text-only mode forgets them; they are saved again in
// the new mode as they are visited.
async function switchMode(request) {
  try {
    const response = await fetch(request)
    await caches.delete(PAGES)
    return response
  } catch {
    return offlinePage()
  }
}

async function savedFirst(request) {
  const cache = await caches.open(ASSETS)
  const saved = await cache.match(request)
  if (saved) return saved
  const response = await fetch(request)
  if (response.ok) {
    await cache.put(request, response.clone())
    const keys = await cache.keys()
    for (const old of keys.slice(0, Math.max(0, keys.length - MAX_ASSETS))) await cache.delete(old)
  }
  return response
}

async function networkFirst(request, url) {
  const cache = await caches.open(PAGES)
  try {
    const response = await fetch(request)
    if (response.ok && plainPage(url)) await cache.put(request, response.clone())
    if (response.status < 500) return response
    return (await saved(cache, request, url)) ?? response
  } catch {
    return (await saved(cache, request, url)) ?? offlinePage()
  }
}

// Pages vary on language headers that the copies saved in the background didn't send, so Vary is ignored. A search
// page offline falls back to the saved page without the search (every saved listing), never another search's results.
async function saved(cache, request, url) {
  const exact = await cache.match(request, { ignoreVary: true })
  if (exact) return exact
  // A shared list or sheet must never fall back to this device's own list.
  if (request.mode !== 'navigate' || plainPage(url) || ['/list', '/print'].includes(url.pathname)) return undefined
  return cache.match(url.pathname, { ignoreVary: true })
}

function offlinePage() {
  return new Response(
    '<!doctype html><meta charset="utf-8"><title>Offline</title><p>You’re offline, and this page isn’t saved on this device. For help finding services, call <a href="tel:211">211</a>.</p>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}
