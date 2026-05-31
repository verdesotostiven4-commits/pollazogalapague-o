const CACHE_VERSION = 'pollazo-cache-clean-v35';

const DEFAULT_ICON = '/logo-final.png';
const DEFAULT_BADGE = '/logo-final.png';

const STATUS_ICONS = {
  Recibido: '/notification-confirmed.png',
  Preparando: '/notification-preparing.png',
  Enviado: '/notification-sent.png',
  Entregado: '/notification-delivered.png',
  Cancelado: '/notification-cancelled.png',
};

const getIconByStatus = status => {
  if (status && STATUS_ICONS[status]) {
    return STATUS_ICONS[status];
  }

  return DEFAULT_ICON;
};

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
    url: '/?tracking=1',
    icon: DEFAULT_ICON,
    badge: DEFAULT_BADGE,
    tag: 'pollazo-order-update',
    orderCode: null,
    status: null,
    paymentStatus: null,
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

  const statusIcon = getIconByStatus(payload.status);
  const finalIcon = payload.icon || statusIcon;
  const finalBadge = payload.badge || statusIcon;

  const title = payload.title || 'La Casa del Pollazo';

  const options = {
    body: payload.body || 'Tu pedido fue actualizado.',
    icon: finalIcon,
    badge: finalBadge,
    tag: payload.tag || 'pollazo-order-update',
    data: {
      url: payload.url || '/?tracking=1',
      orderCode: payload.orderCode || null,
      status: payload.status || null,
      paymentStatus: payload.paymentStatus || null,
    },
    vibrate: [120, 60, 120, 60, 180],
    requireInteraction: false,
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const rawTargetUrl = event.notification?.data?.url || '/?tracking=1';
  const targetUrl = new URL(rawTargetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then(clientList => {
        for (const client of clientList) {
          const clientUrl = new URL(client.url);

          if (clientUrl.origin === self.location.origin && 'focus' in client) {
            if ('navigate' in client) {
              return client.navigate(targetUrl).then(() => client.focus());
            }

            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }

        return null;
      })
  );
});
