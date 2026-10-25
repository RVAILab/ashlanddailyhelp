// "Clear this device": the browser removes everything this site stored (saved pages, storage, the language cookie,
// and the service worker) on seeing Clear-Site-Data, so it works without JavaScript. The homepage it returns to
// doesn't register the worker again straight away.
export function loader() {
  return new Response(null, {
    status: 303,
    headers: { Location: '/?cleared', 'Clear-Site-Data': '"cache", "cookies", "storage"', 'Cache-Control': 'no-store' },
  })
}
