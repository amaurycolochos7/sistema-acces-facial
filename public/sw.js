const CACHE_NAME = 'access-control-v1';
const KIOSK_ASSETS = [
  '/kiosk',
  '/offline',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(KIOSK_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only cache kiosk-related requests
  if (url.pathname.startsWith('/kiosk') || url.pathname === '/offline') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request).then((r) => r || caches.match('/offline')))
    );
    return;
  }

  // Cache CDN model files aggressively
  if (url.hostname === 'cdn.jsdelivr.net' && url.pathname.includes('/human/models/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Let API calls and other requests pass through
});

// Listen for sync events
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-access-logs') {
    event.respondWith(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'SYNC_PENDING_LOGS' }));
      })
    );
  }
});
