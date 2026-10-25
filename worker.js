// Static assets answer /index.html with a redirect to /. sw.js pre-caches ./index.html and serves that copy to offline
// navigations, which browsers refuse when it came from a redirect, so serve the page itself here, as Apache did.
// The worker also sees paths with no matching asset; those pass through to the assets' own 404.
export default {
  fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/index.html') url.pathname = '/';
    return env.ASSETS.fetch(new Request(url, request));
  },
};
