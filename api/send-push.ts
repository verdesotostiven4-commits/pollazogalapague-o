import { createClient } from '@supabase/supabase-js';
import webPush from 'web-push';

type ApiRequest = {
  method?: string;
  body?: any;
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => {
    json: (payload: unknown) => void;
  };
};

type PushPayload = {
  customerPhone?: string;
  orderCode?: string;
  status?: string;
  paymentStatus?: string;
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
  notificationType?: 'tracking' | 'plus';
  membershipId?: string | null;
  membershipReminder?: string | null;
};

type PushSubscriptionRow = {
  id: string;
  customer_phone: string;
  endpoint: string;
  subscription: any;
};

const DEFAULT_ICON = '/logo-final.png';

const STATUS_ICONS: Record<string, string> = {
  Recibido: '/notification-confirmed.png',
  Preparando: '/notification-preparing.png',
  Enviado: '/notification-sent.png',
  Entregado: '/notification-delivered.png',
  Cancelado: '/notification-cancelled.png',
};

const cleanPhoneTail = (phone?: string | null) => {
  return String(phone || '').replace(/\D/g, '').slice(-9);
};

const getBody = (req: ApiRequest): PushPayload => {
  if (!req.body) return {};

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return req.body;
};

const getNotificationIcon = (payload: PushPayload) => {
  if (payload.status && STATUS_ICONS[payload.status]) {
    return STATUS_ICONS[payload.status];
  }

  if (payload.paymentStatus === 'confirmado') {
    return '/notification-confirmed.png';
  }

  if (payload.paymentStatus === 'rechazado') {
    return '/notification-cancelled.png';
  }

  return DEFAULT_ICON;
};

const buildTrackingUrl = (payload: PushPayload) => {
  const params = new URLSearchParams();

  params.set('tracking', '1');

  if (payload.orderCode) {
    params.set('orderCode', payload.orderCode);
  }

  if (payload.status) {
    params.set('status', payload.status);
  }

  return `/?${params.toString()}`;
};

const getPushText = (payload: PushPayload) => {
  if (payload.title && payload.body) {
    return {
      title: payload.title,
      body: payload.body,
    };
  }

  if (payload.notificationType === 'plus') {
    return {
      title: 'Pollazo Plus 👑',
      body: 'Tienes una actualización importante sobre tu membresía Plus.',
    };
  }

  if (payload.status === 'Recibido') {
    return {
      title: 'Pedido confirmado ✅',
      body: `Tu pedido ${payload.orderCode || ''} fue aceptado. Ya empieza el seguimiento.`,
    };
  }

  if (payload.status === 'Preparando') {
    return {
      title: 'Ya estamos empacando 📦',
      body: `Tu pedido ${payload.orderCode || ''} está en preparación.`,
    };
  }

  if (payload.status === 'Enviado') {
    return {
      title: 'Tu pedido va en camino 🛵',
      body: `Prepárate para recibir tu pedido ${payload.orderCode || ''}.`,
    };
  }

  if (payload.status === 'Entregado') {
    return {
      title: 'Pedido entregado 😋',
      body: 'Gracias por comprar en La Casa del Pollazo.',
    };
  }

  if (payload.status === 'Cancelado') {
    return {
      title: 'Pedido cancelado ❌',
      body: `Tu pedido ${payload.orderCode || ''} fue cancelado.`,
    };
  }

  if (payload.paymentStatus === 'confirmado') {
    return {
      title: 'Pago confirmado ✅',
      body: `Tu pago del pedido ${payload.orderCode || ''} fue validado.`,
    };
  }

  if (payload.paymentStatus === 'rechazado') {
    return {
      title: 'Pago rechazado ⚠️',
      body: `No pudimos validar el pago del pedido ${payload.orderCode || ''}.`,
    };
  }

  return {
    title: 'Pedido actualizado 🔔',
    body: `Tu pedido ${payload.orderCode || ''} fue actualizado.`,
  };
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed',
    });
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;

  const supabaseServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  const vapidPublicKey =
    process.env.VAPID_PUBLIC_KEY ||
    process.env.VITE_VAPID_PUBLIC_KEY;

  const vapidPrivateKey =
    process.env.VAPID_PRIVATE_KEY;

  const vapidSubject =
    process.env.VAPID_SUBJECT || 'mailto:admin@pollazo.app';

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return res.status(500).json({
      ok: false,
      error: 'Missing Supabase server env vars',
    });
  }

  if (!vapidPublicKey || !vapidPrivateKey) {
    return res.status(500).json({
      ok: false,
      error: 'Missing VAPID env vars',
    });
  }

  const payload = getBody(req);
  const cleanCustomerTail = cleanPhoneTail(payload.customerPhone);

  if (!cleanCustomerTail) {
    return res.status(400).json({
      ok: false,
      error: 'Missing customerPhone',
    });
  }

  webPush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
    },
  });

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id, customer_phone, endpoint, subscription')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error reading push subscriptions:', error);

    return res.status(500).json({
      ok: false,
      error: 'Could not read push subscriptions',
    });
  }

  const subscriptions = ((data || []) as unknown as PushSubscriptionRow[]).filter(row => {
    return cleanPhoneTail(row.customer_phone) === cleanCustomerTail;
  });

  if (subscriptions.length === 0) {
    return res.status(200).json({
      ok: true,
      sent: 0,
      failed: 0,
      expiredDeleted: 0,
      message: 'No push subscriptions for this customer',
    });
  }

  const text = getPushText(payload);
  const notificationIcon = getNotificationIcon(payload);

  const targetUrl =
    payload.notificationType === 'plus'
      ? payload.url || '/?plus=1'
      : payload.url || buildTrackingUrl(payload);

  const uniqueTag =
    payload.tag ||
    `pollazo-${payload.notificationType || 'tracking'}-${payload.orderCode || cleanCustomerTail}-${payload.status || payload.paymentStatus || payload.membershipReminder || 'update'}-${Date.now()}`;

  const notificationPayload = JSON.stringify({
    title: text.title,
    body: text.body,
    url: targetUrl,
    icon: notificationIcon,
    badge: notificationIcon,
    tag: uniqueTag,
    orderCode: payload.orderCode || null,
    status: payload.status || null,
    paymentStatus: payload.paymentStatus || null,
    notificationType: payload.notificationType || null,
    membershipId: payload.membershipId || null,
    membershipReminder: payload.membershipReminder || null,
    timestamp: Date.now(),
  });

  let sent = 0;
  let failed = 0;
  const expiredSubscriptionIds: string[] = [];

  await Promise.all(
    subscriptions.map(async row => {
      try {
        await webPush.sendNotification(
          row.subscription,
          notificationPayload,
          {
            TTL: 60 * 60,
            headers: {
              Urgency: 'high',
            },
          }
        );

        sent += 1;
      } catch (sendError: any) {
        failed += 1;

        const statusCode = sendError?.statusCode;

        if (statusCode === 404 || statusCode === 410) {
          expiredSubscriptionIds.push(row.id);
        }

        console.error('Push send error:', {
          statusCode,
          body: sendError?.body,
        });
      }
    })
  );

  if (expiredSubscriptionIds.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('id', expiredSubscriptionIds);
  }

  return res.status(200).json({
    ok: true,
    sent,
    failed,
    expiredDeleted: expiredSubscriptionIds.length,
    icon: notificationIcon,
    tag: uniqueTag,
  });
}
