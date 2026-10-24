const CACHE = 'hub-preview-374f54525890';
const SHELL = ['index.html', 'styles.css', 'direction.css', 'experience.css', 'pulse.css', 'pages.css', 'app.js', 'core.js', 'data.js', 'icon.svg', 'manifest.webmanifest', 'fonts/fraunces-normal.woff2', 'fonts/fraunces-italic.woff2', 'fonts/instrument-sans-normal.woff2'];
const FILES = ['./', ...SHELL.map(path => './' + path)];
// Artwork is cached only after the browser has requested it, so offline pages keep the images a visitor already saw.
const ART = /^art\/[a-z0-9-]+\.(?:avif|webp|jpg|png)$/;
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith('hub-preview-') && key !== CACHE) await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Cache only the public shell. Never add API, account, report, or private paths here.
  const path = url.pathname.slice(new URL(self.registration.scope).pathname.length);
  if (path !== '' && !SHELL.includes(path) && !ART.test(path)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = event.request.mode === 'navigate' ? new URL('./index.html', self.registration.scope).href : url.origin + url.pathname;
    try {
      const response = await fetch(event.request);
      if (response.ok) await cache.put(key, response.clone());
      return response;
    } catch {
      const stored = await cache.match(key);
      return stored || new Response('This page is not available offline. Reconnect and try again.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    }
  })());
});
