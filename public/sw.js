const CACHE_VERSION = 'pollazo-cache-v30';

const APP_SHELL = [
  '/',
  '/manifest.json?v=30',
  '/favicon-32x32.png?v=30',
  '/apple-touch-icon.png?v=30',
  '/icons/icon-192.png?v=30',
  '/icons/icon-512.png?v=30',
  '/icons/maskable-192.png?v=30',
  '/icons/maskable-512.png?v=30',
];

self.addEventListener('install', event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      return cache.addAll(APP_SHELL).catch(() => undefined);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (
    url.pathname.startsWith('/src/') ||
    url.pathname.includes('@vite') ||
    url.pathname.includes('node_modules')
  ) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then(cache => {
            cache.put('/', copy).catch(() => undefined);
          });
          return response;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_VERSION).then(cache => {
          cache.put(request, copy).catch(() => undefined);
        });
        return response;
      });
    })
  );
});
