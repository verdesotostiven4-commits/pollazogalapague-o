const CACHE_VERSION = 'pollazo-cache-clean-v53';

const DEFAULT_ICON = '/pollazo-icon-192-v34.png';
const DEFAULT_BADGE = '/pollazo-icon-192-v34.png';

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

const isPlusUrl = rawUrl => {
  try {
    const url = new URL(rawUrl || '', self.location.origin);

    return (
      url.searchParams.get('plus') === '1' ||
      url.searchParams.has('membershipReminder') ||
      url.searchParams.has('membershipId')
    );
  } catch {
    return false;
  }
};

const toSameOriginUrl = (rawUrl, fallbackPath) => {
  try {
    const url = new URL(rawUrl || fallbackPath, self.location.origin);

    if (url.origin !== self.location.origin) {
      return fallbackPath;
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return fallbackPath;
  }
};

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
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
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
  }
});

self.addEventListener('push', event => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const notificationType = data.notificationType || data.type || 'order';
  const isPlus = notificationType === 'plus' || Boolean(data.membershipId || data.membershipReminder);
  const title = data.title || (isPlus ? 'Pollazo Plus' : 'La Casa del Pollazo');
  const body = data.body || (isPlus ? 'Tienes novedades en tu membresía.' : 'Tienes una actualización de tu pedido.');
  const icon = data.icon || (isPlus ? DEFAULT_ICON : getIconByStatus(data.status));
  const badge = data.badge || DEFAULT_BADGE;
  const defaultPath = isPlus
    ? `/?plus=1${data.membershipId ? `&membershipId=${encodeURIComponent(data.membershipId)}` : ''}${data.membershipReminder ? `&membershipReminder=${encodeURIComponent(data.membershipReminder)}` : ''}`
    : `/?tracking=1${data.orderCode ? `&orderCode=${encodeURIComponent(data.orderCode)}` : ''}${data.status ? `&status=${encodeURIComponent(data.status)}` : ''}`;

  const rawUrl = data.url || defaultPath;
  const targetUrl = toSameOriginUrl(rawUrl, isPlus ? '/?plus=1' : '/?tracking=1');

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag: isPlus
        ? `pollazo-plus-${data.membershipId || data.membershipReminder || 'general'}`
        : `pollazo-order-${data.orderCode || data.status || Date.now()}`,
      renotify: true,
      vibrate: [80, 40, 80],
      data: {
        url: targetUrl,
        notificationType,
        orderCode: data.orderCode || null,
        status: data.status || null,
        paymentStatus: data.paymentStatus || null,
        membershipId: data.membershipId || null,
        membershipReminder: data.membershipReminder || null,
      },
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const data = event.notification.data || {};
  const isPlus = data.notificationType === 'plus' || isPlusUrl(data.url);
  const fallbackUrl = isPlus ? '/?plus=1' : '/?tracking=1';
  const targetUrl = toSameOriginUrl(data.url, fallbackUrl);

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        const sameOriginClients = clients.filter(client => {
          try {
            return new URL(client.url).origin === self.location.origin;
          } catch {
            return false;
          }
        });

        for (const client of sameOriginClients) {
          if ('focus' in client) {
            client.focus();
          }

          if ('navigate' in client) {
            return client.navigate(targetUrl).then(openedClient => {
              if (openedClient && 'focus' in openedClient) {
                return openedClient.focus();
              }

              return openedClient;
            });
          }

          client.postMessage(
            isPlus
              ? {
                  type: 'POLLAZO_OPEN_PLUS',
                  url: targetUrl,
                  membershipId: data.membershipId || null,
                  membershipReminder: data.membershipReminder || null,
                }
              : {
                  type: 'POLLAZO_OPEN_TRACKING',
                  url: targetUrl,
                  orderCode: data.orderCode || null,
                  status: data.status || null,
                  paymentStatus: data.paymentStatus || null,
                }
          );

          return client;
        }

        return self.clients.openWindow(targetUrl);
      })
  );
});
