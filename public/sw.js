const CACHE_VERSION = 'pollazo-cache-clean-v33';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.clients.claim())
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
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(fetch(request));
});

self.addEventListener('push', event => {
  let payload = {
    title: 'La Casa del Pollazo',
    body: 'Tu pedido fue actualizado.',
    url: '/',
    icon: '/logo-final.png',
    badge: '/logo-final.png',
    tag: 'pollazo-order-update',
  };

  try {
    if (event.data) {
      const data = event.data.json();

      payload = {
        ...payload,
        ...data,
      };
    }
  } catch {
    try {
      payload.body = event.data ? event.data.text() : payload.body;
    } catch {
      // Mantener payload por defecto.
    }
  }

  const title = payload.title || 'La Casa del Pollazo';

  const options = {
    body: payload.body || 'Tu pedido fue actualizado.',
    icon: payload.icon || '/logo-final.png',
    badge: payload.badge || '/logo-final.png',
    tag: payload.tag || 'pollazo-order-update',
    data: {
      url: payload.url || '/',
      orderCode: payload.orderCode || null,
      status: payload.status || null,
    },
    vibrate: [120, 60, 120, 60, 180],
    requireInteraction: false,
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then(clientList => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();

            if ('navigate' in client) {
              return client.navigate(targetUrl);
            }

            return client;
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }

        return null;
      })
  );
});
