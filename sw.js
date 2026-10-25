const CACHE = 'hub-preview-7ec2c5d0f10a';
const SHELL = ['index.html', 'styles.css', 'direction.css', 'experience.css', 'pulse.css', 'pages.css', 'app.js', 'core.js', 'data.js', 'icon.svg', 'manifest.webmanifest', 'fonts/fraunces-normal.woff2', 'fonts/fraunces-italic.woff2', 'fonts/instrument-sans-normal.woff2'];
const FILES = ['./', ...SHELL.map(path => './' + path)];
// Artwork is cached only after the browser has requested it, so offline pages keep the images a visitor already saw.
const ART = /^art\/[a-z0-9-]+\.(?:avif|webp|jpg|png)$/;
// The steward feed's listings.json is kept like the shell (network first, last good copy offline), on this origin or the feed host.
// pulse.json is deliberately not cached: offline, Pulse keeps the figures already on screen.
const LISTINGS = /(?:^|\/)listings\.json$/;
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith('hub-preview-') && key !== CACHE) await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const listings = LISTINGS.test(url.pathname);
  if (event.request.method !== 'GET' || (url.origin !== self.location.origin && !listings)) return;
  // Cache only the public shell and listings.json. Never add API, account, report, or private paths here.
  const path = url.pathname.slice(new URL(self.registration.scope).pathname.length);
  if (!listings && path !== '' && !SHELL.includes(path) && !ART.test(path)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = event.request.mode === 'navigate' ? new URL('./index.html', self.registration.scope).href : url.origin + url.pathname;
    try {
      const response = await fetch(event.request);
      // shortcut: the worker checks only JSON and major version 1 before replacing the stored listings; app.js runs the full check (core.js checkListingsFeed). Move the check here if a bad v1 file ever gets stored.
      const good = response.ok && (!listings || await response.clone().json().then(feed => /^1\./.test(feed.schemaVersion) && Array.isArray(feed.listings), () => false));
      if (good) await cache.put(key, response.clone());
      return response;
    } catch {
      const stored = await cache.match(key);
      return stored || new Response('This page is not available offline. Reconnect and try again.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    }
  })());
});
