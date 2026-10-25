// Keeps Daily Help usable without a connection: pages and route data come from the network first and from the last
// saved copy when offline; hashed build assets are saved once (a new build has new names, so a deploy replaces them).
const CACHE = 'daily-help-v1'
const PAGE_LIST = '/offline-pages.json'
// Never answered from the device: checks, the language switch, clearing the device, and Cloudflare's own paths.
const NEVER = [/^\/health/, /^\/language/, /^\/forget/, /^\/cdn-cgi\//, /^\/offline-pages\.json/]

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      await self.clients.claim()
      await saveMainPages()
    })(),
  )
})

async function saveMainPages() {
  const cache = await caches.open(CACHE)
  let pages = []
  try {
    pages = await (await fetch(PAGE_LIST, { cache: 'no-store' })).json()
  } catch {
    return
  }
  for (const page of pages) {
    try {
      const response = await fetch(page)
      if (response.ok) await cache.put(page, response)
    } catch {
      // Offline or failing now; the page is saved the next time it is visited.
    }
  }
}

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || NEVER.some(path => path.test(url.pathname)))
    return
  if (url.pathname.startsWith('/assets/')) event.respondWith(savedFirst(request))
  else event.respondWith(networkFirst(request))
})

async function savedFirst(request) {
  const cache = await caches.open(CACHE)
  const saved = await cache.match(request, { ignoreVary: true })
  if (saved) return saved
  const response = await fetch(request)
  if (response.ok) await cache.put(request, response.clone())
  return response
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) await cache.put(request, response.clone())
    return response
  } catch {
    // Pages vary on language headers that the copies saved at install time didn't send, so ignore Vary here.
    const saved =
      (await cache.match(request, { ignoreVary: true })) ??
      (await cache.match(request, { ignoreVary: true, ignoreSearch: true }))
    if (saved) return saved
    return new Response(
      '<!doctype html><title>Offline</title><p>You’re offline, and this page isn’t saved on this device. For help finding services, call <a href="tel:211">211</a>.</p>',
      {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      },
    )
  }
}
