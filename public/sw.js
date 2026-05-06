const CACHE_NAME = 'pollazo-cache-v2';

// 1. Instalación: Forzamos a la nueva versión a tomar el control
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 2. Activación: Borramos TODA la basura de las versiones anteriores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Estrategia: Buscar siempre en internet primero para evitar pantallas blancas
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
