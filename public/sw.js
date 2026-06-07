const CACHE_VERSION = 'pollazo-cache-clean-v40';

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
      return new URL(fallbackPath, self.location.origin);
    }

    return url;
  } catch {
    return new URL(fallbackPath, self.location.origin);
  }
};

const ensureTrackingUrl = (rawUrl, payload = {}) => {
  const url = toSameOriginUrl(rawUrl, '/?tracking=1');

  url.searchParams.set('tracking', '1');

  if (payload.orderCode && !url.searchParams.has('orderCode')) {
    url.searchParams.set('orderCode', payload.orderCode);
  }

  if (payload.status && !url.searchParams.has('status')) {
    url.searchParams.set('status', payload.status);
  }

  if (payload.paymentStatus && !url.searchParams.has('paymentStatus')) {
    url.searchParams.set('paymentStatus', payload.paymentStatus);
  }

  return url.href;
};

const ensurePlusUrl = (rawUrl, payload = {}) => {
  const url = toSameOriginUrl(rawUrl, '/?plus=1');

  url.searchParams.set('plus', '1');

  if (payload.membershipId && !url.searchParams.has('membershipId')) {
    url.searchParams.set('membershipId', payload.membershipId);
  }

  if (payload.membershipReminder && !url.searchParams.has('membershipReminder')) {
    url.searchParams.set('membershipReminder', payload.membershipReminder);
  }

  return url.href;
};

const getNotificationKind = payload => {
  if (
    payload?.notificationType === 'plus' ||
    payload?.membershipReminder ||
    payload?.membershipId ||
    isPlusUrl(payload?.url)
  ) {
    return 'plus';
  }

  return 'tracking';
};

const buildClientMessage = (kind, payload = {}) => {
  if (kind === 'plus') {
    const url = ensurePlusUrl(payload.url, payload);

    return {
      type: 'POLLAZO_OPEN_PLUS',
      url,
      membershipId: payload.membershipId || null,
      membershipReminder: payload.membershipReminder || null,
    };
  }

  const url = ensureTrackingUrl(payload.url, payload);

  return {
    type: 'POLLAZO_OPEN_TRACKING',
    url,
    orderCode: payload.orderCode || null,
    status: payload.status || null,
    paymentStatus: payload.paymentStatus || null,
  };
};

const sendMessageToClient = (client, kind, payload = {}) => {
  try {
    if (!client || !('postMessage' in client)) return;

    client.postMessage(buildClientMessage(kind, payload));
  } catch {
    // Mensaje opcional.
  }
};

const isSameWindowTarget = (clientUrl, targetUrl) => {
  try {
    const current = new URL(clientUrl);
    const target = new URL(targetUrl);

    return (
      current.origin === target.origin &&
      current.pathname === target.pathname &&
      current.search === target.search &&
      current.hash === target.hash
    );
  } catch {
    return false;
  }
};

const focusOrNavigateClient = async (client, targetUrl, kind, payload = {}) => {
  if (!client) return null;

  try {
    sendMessageToClient(client, kind, {
      ...payload,
      url: targetUrl,
    });

    const shouldNavigate = !isSameWindowTarget(client.url, targetUrl);

    if (shouldNavigate && 'navigate' in client) {
      const navigatedClient = await client.navigate(targetUrl);

      if (navigatedClient) {
        sendMessageToClient(navigatedClient, kind, {
          ...payload,
          url: targetUrl,
        });

        if ('focus' in navigatedClient) {
          const focused = await navigatedClient.focus();

          sendMessageToClient(focused || navigatedClient, kind, {
            ...payload,
            url: targetUrl,
          });

          return focused || navigatedClient;
        }

        return navigatedClient;
      }
    }

    if ('focus' in client) {
      const focused = await client.focus();

      sendMessageToClient(focused || client, kind, {
        ...payload,
        url: targetUrl,
      });

      return focused || client;
    }

    return client;
  } catch {
    try {
      if ('focus' in client) {
        return await client.focus();
      }
    } catch {
      // Fallback silencioso.
    }

    return client;
  }
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
    notificationType: null,
    membershipId: null,
    membershipReminder: null,
    timestamp: Date.now(),
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

  const kind = getNotificationKind(payload);
  const statusIcon = getIconByStatus(payload.status);
  const finalIcon = payload.icon || (kind === 'plus' ? DEFAULT_ICON : statusIcon);
  const finalBadge = payload.badge || (kind === 'plus' ? DEFAULT_BADGE : statusIcon);

  const targetUrl =
    kind === 'plus'
      ? ensurePlusUrl(payload.url, payload)
      : ensureTrackingUrl(payload.url, payload);

  const title = payload.title || 'La Casa del Pollazo';

  const options = {
    body: payload.body || 'Tu pedido fue actualizado.',
    icon: finalIcon,
    badge: finalBadge,
    tag:
      payload.tag ||
      (kind === 'plus'
        ? `pollazo-plus-${payload.membershipReminder || payload.membershipId || 'update'}-${payload.timestamp || Date.now()}`
        : `pollazo-order-${payload.orderCode || 'update'}-${payload.status || payload.paymentStatus || 'changed'}-${payload.timestamp || Date.now()}`),
    data: {
      url: targetUrl,
      kind,
      orderCode: payload.orderCode || null,
      status: payload.status || null,
      paymentStatus: payload.paymentStatus || null,
      membershipId: payload.membershipId || null,
      membershipReminder: payload.membershipReminder || null,
    },
    vibrate: kind === 'plus' ? [90, 45, 90, 45, 160] : [120, 60, 120, 60, 180],
    requireInteraction: false,
    renotify: true,
    silent: false,
    timestamp: payload.timestamp || Date.now(),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const notificationData = event.notification?.data || {};
  const kind = notificationData.kind === 'plus' ? 'plus' : 'tracking';

  const messagePayload = {
    url: notificationData.url || null,
    orderCode: notificationData.orderCode || null,
    status: notificationData.status || null,
    paymentStatus: notificationData.paymentStatus || null,
    membershipId: notificationData.membershipId || null,
    membershipReminder: notificationData.membershipReminder || null,
  };

  const targetUrl =
    kind === 'plus'
      ? ensurePlusUrl(notificationData.url, messagePayload)
      : ensureTrackingUrl(notificationData.url, messagePayload);

  event.waitUntil(
    self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then(async clientList => {
        const sameOriginClients = clientList.filter(client => {
          try {
            return new URL(client.url).origin === self.location.origin;
          } catch {
            return false;
          }
        });

        const focusedClient =
          sameOriginClients.find(client => client.focused) ||
          sameOriginClients.find(client => isSameWindowTarget(client.url, targetUrl)) ||
          sameOriginClients[0];

        if (focusedClient) {
          return focusOrNavigateClient(
            focusedClient,
            targetUrl,
            kind,
            {
              ...messagePayload,
              url: targetUrl,
            }
          );
        }

        if (self.clients.openWindow) {
          const openedClient = await self.clients.openWindow(targetUrl);

          if (openedClient) {
            sendMessageToClient(openedClient, kind, {
              ...messagePayload,
              url: targetUrl,
            });
          }

          return openedClient;
        }

        return null;
      })
  );
});
