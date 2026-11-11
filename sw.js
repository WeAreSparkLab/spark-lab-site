// Service worker (registered from /apps and /socials).
// Pages are always fetched from the network so a new release is seen straight
// away; the cache is only an offline fallback. Bumping CACHE_NAME clears any
// copy of the old homepage held by an earlier version of this worker.
const CACHE_NAME = 'sparklab-v2';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => k !== CACHE_NAME && caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode !== 'navigate') return;            // assets: leave to the browser's own HTTP cache
  event.respondWith(
    fetch(request)
      .then((res) => { const copy = res.clone(); caches.open(CACHE_NAME).then((c) => c.put(request, copy)); return res; })
      .catch(() => caches.match(request))
  );
});
