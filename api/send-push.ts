import { createClient } from '@supabase/supabase-js';
import webPush from 'web-push';
import { readPanelSession } from './_panel-session.js';

type ApiRequest = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  setHeader: (name: string, value: string | string[]) => void;
  status: (code: number) => {
    json: (payload: unknown) => void;
  };
};

type PushRequestPayload = {
  orderCode?: unknown;
  customerPhone?: unknown;
  title?: unknown;
  body?: unknown;
  url?: unknown;
  tag?: unknown;
};

type OrderRow = {
  id: string;
  order_code: string;
  customer_phone: string;
  status: string | null;
  payment_status: string | null;
};

type PushSubscriptionRow = {
  id: string;
  customer_phone: string;
  subscription: unknown;
};

type WebPushSubscription = Parameters<typeof webPush.sendNotification>[0];

const DEFAULT_ICON = '/logo-final.png';

const STATUS_ICONS: Record<string, string> = {
  Recibido: '/notification-confirmed.png',
  Preparando: '/notification-preparing.png',
  Enviado: '/notification-sent.png',
  Entregado: '/notification-delivered.png',
  Cancelado: '/notification-cancelled.png',
};

const parseBody = (body: unknown): PushRequestPayload => {
  if (!body) return {};

  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body) as unknown;
      return parsed && typeof parsed === 'object'
        ? (parsed as PushRequestPayload)
        : {};
    } catch {
      return {};
    }
  }

  return typeof body === 'object'
    ? (body as PushRequestPayload)
    : {};
};

const cleanText = (value: unknown, maxLength: number) => {
  return String(value || '').trim().slice(0, maxLength);
};

const cleanPhoneTail = (value: unknown) => {
  return cleanText(value, 40).replace(/\D/g, '').slice(-9);
};

const sanitizeRelativeUrl = (value: unknown) => {
  const fallback = '/?tracking=1';
  const raw = cleanText(value, 500);

  if (!raw) return fallback;

  try {
    const url = new URL(raw, 'https://pollazo.local');

    if (url.origin !== 'https://pollazo.local') {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
};

const getStatusMessage = (order: OrderRow) => {
  const code = order.order_code;

  if (order.status === 'Recibido') {
    return {
      title: 'Pedido confirmado ✅',
      body: `Tu pedido ${code} fue aceptado. Ya puedes seguir su avance.`,
    };
  }

  if (order.status === 'Preparando') {
    return {
      title: 'Ya estamos empacando 📦',
      body: `Tu pedido ${code} está en preparación.`,
    };
  }

  if (order.status === 'Enviado') {
    return {
      title: 'Tu pedido va en camino 🛵',
      body: `Prepárate para recibir tu pedido ${code}.`,
    };
  }

  if (order.status === 'Entregado') {
    return {
      title: 'Pedido entregado 😋',
      body:
        order.payment_status === 'confirmado'
          ? 'Pedido entregado y pago registrado. Gracias por comprar en La Casa del Pollazo.'
          : 'Tu pedido fue entregado. El cobro permanece pendiente de confirmación administrativa.',
    };
  }

  if (order.status === 'Cancelado') {
    return {
      title: 'Pedido cancelado ❌',
      body: `Tu pedido ${code} fue cancelado. Escríbenos si necesitas ayuda.`,
    };
  }

  if (order.payment_status === 'confirmado') {
    return {
      title: 'Pago confirmado ✅',
      body: `El pago del pedido ${code} fue registrado correctamente.`,
    };
  }

  if (order.payment_status === 'rechazado') {
    return {
      title: 'Pago no confirmado ⚠️',
      body: `El cobro del pedido ${code} no pudo confirmarse. Comunícate con el local.`,
    };
  }

  return {
    title: 'Pedido actualizado 🔔',
    body: `Tu pedido ${code} tiene una actualización.`,
  };
};

const getNotificationIcon = (order: OrderRow) => {
  if (order.status && STATUS_ICONS[order.status]) {
    return STATUS_ICONS[order.status];
  }

  if (order.payment_status === 'confirmado') {
    return '/notification-confirmed.png';
  }

  if (order.payment_status === 'rechazado') {
    return '/notification-cancelled.png';
  }

  return DEFAULT_ICON;
};

const getErrorDetails = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return { statusCode: null, body: '' };
  }

  const record = error as Record<string, unknown>;
  const statusCode =
    typeof record.statusCode === 'number' ? record.statusCode : null;

  return {
    statusCode,
    body: cleanText(record.body, 500),
  };
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed',
    });
  }

  const session = readPanelSession(req);

  if (!session) {
    return res.status(401).json({
      ok: false,
      error: 'Unauthorized',
    });
  }

  const payload = parseBody(req.body);
  const orderCode = cleanText(payload.orderCode, 80);
  const requestedPhoneTail = cleanPhoneTail(payload.customerPhone);

  if (!orderCode) {
    return res.status(400).json({
      ok: false,
      error: 'Missing orderCode',
    });
  }

  const supabaseUrl =
    String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const serviceRoleKey = String(
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  ).trim();
  const vapidPublicKey = String(
    process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY || ''
  ).trim();
  const vapidPrivateKey = String(process.env.VAPID_PRIVATE_KEY || '').trim();
  const vapidSubject = String(
    process.env.VAPID_SUBJECT || 'mailto:admin@pollazo.app'
  ).trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(503).json({
      ok: false,
      error: 'Missing Supabase server env vars',
    });
  }

  if (!vapidPublicKey || !vapidPrivateKey) {
    return res.status(503).json({
      ok: false,
      error: 'Missing VAPID env vars',
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .select('id, order_code, customer_phone, status, payment_status')
    .eq('order_code', orderCode)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (orderError) {
    console.error('send-push order lookup failed:', {
      code: orderError.code,
      message: orderError.message,
      orderCode,
    });

    return res.status(500).json({
      ok: false,
      error: 'Could not validate order',
    });
  }

  const order = orderData as OrderRow | null;

  if (!order) {
    return res.status(404).json({
      ok: false,
      error: 'Order not found',
    });
  }

  const authoritativePhoneTail = cleanPhoneTail(order.customer_phone);

  if (!authoritativePhoneTail) {
    return res.status(409).json({
      ok: false,
      error: 'Order does not have a valid customer phone',
    });
  }

  if (
    requestedPhoneTail &&
    requestedPhoneTail !== authoritativePhoneTail
  ) {
    return res.status(403).json({
      ok: false,
      error: 'Order does not belong to this customer',
    });
  }

  const customTitle = cleanText(payload.title, 90);
  const customBody = cleanText(payload.body, 240);
  const hasCustomText = Boolean(customTitle || customBody);

  if (hasCustomText && session.role !== 'admin') {
    return res.status(403).json({
      ok: false,
      error: 'Only the admin panel can send custom notifications',
    });
  }

  if (hasCustomText && (!customTitle || !customBody)) {
    return res.status(400).json({
      ok: false,
      error: 'Custom notifications require title and body',
    });
  }

  const { data: subscriptionData, error: subscriptionError } = await supabase
    .from('push_subscriptions')
    .select('id, customer_phone, subscription')
    .order('created_at', { ascending: false });

  if (subscriptionError) {
    console.error('send-push subscription lookup failed:', {
      code: subscriptionError.code,
      message: subscriptionError.message,
      orderCode,
    });

    return res.status(500).json({
      ok: false,
      error: 'Could not read push subscriptions',
    });
  }

  const subscriptions = ((subscriptionData || []) as PushSubscriptionRow[])
    .filter(row => cleanPhoneTail(row.customer_phone) === authoritativePhoneTail);

  if (subscriptions.length === 0) {
    return res.status(200).json({
      ok: true,
      sent: 0,
      failed: 0,
      expiredDeleted: 0,
      message: 'No push subscriptions for this customer',
    });
  }

  webPush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );

  const defaultText = getStatusMessage(order);
  const text = hasCustomText
    ? { title: customTitle, body: customBody }
    : defaultText;
  const icon = getNotificationIcon(order);
  const targetUrl = sanitizeRelativeUrl(payload.url);
  const safeTag = cleanText(payload.tag, 120);
  const tag =
    safeTag ||
    `pollazo-order-${order.order_code}-${order.status || order.payment_status || 'updated'}`;

  const notificationPayload = JSON.stringify({
    title: text.title,
    body: text.body,
    url: targetUrl,
    icon,
    badge: icon,
    tag,
    orderCode: order.order_code,
    status: order.status,
    paymentStatus: order.payment_status,
    timestamp: Date.now(),
  });

  let sent = 0;
  let failed = 0;
  const expiredSubscriptionIds: string[] = [];

  await Promise.all(
    subscriptions.map(async row => {
      try {
        await webPush.sendNotification(
          row.subscription as WebPushSubscription,
          notificationPayload,
          {
            TTL: 60 * 60,
            headers: {
              Urgency: 'high',
            },
          }
        );
        sent += 1;
      } catch (error) {
        failed += 1;
        const details = getErrorDetails(error);

        if (details.statusCode === 404 || details.statusCode === 410) {
          expiredSubscriptionIds.push(row.id);
        }

        console.error('send-push delivery failed:', {
          orderCode: order.order_code,
          statusCode: details.statusCode,
          body: details.body,
        });
      }
    })
  );

  if (expiredSubscriptionIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('push_subscriptions')
      .delete()
      .in('id', expiredSubscriptionIds);

    if (deleteError) {
      console.warn('Could not remove expired push subscriptions:', {
        code: deleteError.code,
        message: deleteError.message,
      });
    }
  }

  return res.status(200).json({
    ok: true,
    sent,
    failed,
    expiredDeleted: expiredSubscriptionIds.length,
    orderCode: order.order_code,
    status: order.status,
    paymentStatus: order.payment_status,
  });
}
