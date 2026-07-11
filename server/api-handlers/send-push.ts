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

type OrderValidationRow = {
  id: string;
  order_code: string | null;
  customer_phone: string | null;
  status?: string | null;
  payment_status?: string | null;
};

type MembershipValidationRow = {
  id: string;
  customer_phone: string | null;
  status?: string | null;
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

const cleanOrderCode = (orderCode?: string | null) => {
  return String(orderCode || '').trim().slice(0, 80);
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

const getHeaderValue = (
  headers: ApiRequest['headers'],
  key: string
): string => {
  const direct = headers?.[key];
  const lower = headers?.[key.toLowerCase()];
  const value = direct || lower;

  if (Array.isArray(value)) {
    return value[0] || '';
  }

  return String(value || '');
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

const sanitizeRelativeUrl = (rawUrl?: string | null) => {
  const fallback = '/?tracking=1';

  if (!rawUrl || typeof rawUrl !== 'string') {
    return fallback;
  }

  try {
    const url = new URL(rawUrl, 'https://pollazo.local');

    if (url.origin !== 'https://pollazo.local') {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
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

const buildPlusUrl = (payload: PushPayload) => {
  const params = new URLSearchParams();

  params.set('plus', '1');

  if (payload.membershipId) {
    params.set('membershipId', payload.membershipId);
  }

  if (payload.membershipReminder) {
    params.set('membershipReminder', payload.membershipReminder);
  }

  return `/?${params.toString()}`;
};

const getTargetUrl = (payload: PushPayload) => {
  if (payload.notificationType === 'plus') {
    return payload.url ? sanitizeRelativeUrl(payload.url) : buildPlusUrl(payload);
  }

  return payload.url ? sanitizeRelativeUrl(payload.url) : buildTrackingUrl(payload);
};

const getPushText = (payload: PushPayload) => {
  if (payload.title && payload.body) {
    return {
      title: String(payload.title).slice(0, 90),
      body: String(payload.body).slice(0, 240),
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

const validateOrderPayload = async (
  supabase: ReturnType<typeof createClient>,
  payload: PushPayload,
  cleanCustomerTail: string
) => {
  const orderCode = cleanOrderCode(payload.orderCode);

  if (!orderCode) {
    return {
      ok: true,
      order: null as OrderValidationRow | null,
    };
  }

  const { data, error } = await supabase
    .from('orders')
    .select('id, order_code, customer_phone, status, payment_status')
    .eq('order_code', orderCode)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error validating push order:', error);

    return {
      ok: false,
      status: 500,
      error: 'Could not validate order',
      order: null as OrderValidationRow | null,
    };
  }

  const order = data as OrderValidationRow | null;

  if (!order) {
    return {
      ok: false,
      status: 404,
      error: 'Order not found',
      order: null as OrderValidationRow | null,
    };
  }

  const orderPhoneTail = cleanPhoneTail(order.customer_phone);

  if (!orderPhoneTail || orderPhoneTail !== cleanCustomerTail) {
    return {
      ok: false,
      status: 403,
      error: 'Order does not belong to this customer',
      order,
    };
  }

  return {
    ok: true,
    order,
  };
};

const validateMembershipPayload = async (
  supabase: ReturnType<typeof createClient>,
  payload: PushPayload,
  cleanCustomerTail: string
) => {
  if (payload.notificationType !== 'plus' || !payload.membershipId) {
    return {
      ok: true,
      membership: null as MembershipValidationRow | null,
    };
  }

  const { data, error } = await supabase
    .from('customer_memberships')
    .select('id, customer_phone, status')
    .eq('id', payload.membershipId)
    .maybeSingle();

  if (error) {
    console.error('Error validating membership push:', error);

    return {
      ok: false,
      status: 500,
      error: 'Could not validate membership',
      membership: null as MembershipValidationRow | null,
    };
  }

  const membership = data as MembershipValidationRow | null;

  if (!membership) {
    return {
      ok: false,
      status: 404,
      error: 'Membership not found',
      membership: null as MembershipValidationRow | null,
    };
  }

  const membershipPhoneTail = cleanPhoneTail(membership.customer_phone);

  if (!membershipPhoneTail || membershipPhoneTail !== cleanCustomerTail) {
    return {
      ok: false,
      status: 403,
      error: 'Membership does not belong to this customer',
      membership,
    };
  }

  return {
    ok: true,
    membership,
  };
};

const getRequestOrigin = (req: ApiRequest) => {
  const origin = getHeaderValue(req.headers, 'origin');
  const referer = getHeaderValue(req.headers, 'referer');

  return {
    origin,
    referer,
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
  const requestOrigin = getRequestOrigin(req);

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

  const orderValidation = await validateOrderPayload(
    supabase,
    payload,
    cleanCustomerTail
  );

  if (!orderValidation.ok) {
    return res.status(orderValidation.status || 403).json({
      ok: false,
      error: orderValidation.error || 'Invalid order push request',
    });
  }

  const membershipValidation = await validateMembershipPayload(
    supabase,
    payload,
    cleanCustomerTail
  );

  if (!membershipValidation.ok) {
    return res.status(membershipValidation.status || 403).json({
      ok: false,
      error: membershipValidation.error || 'Invalid membership push request',
    });
  }

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
  const targetUrl = getTargetUrl({
    ...payload,
    orderCode:
      payload.orderCode ||
      orderValidation.order?.order_code ||
      undefined,
  });

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
    orderCode: payload.orderCode || orderValidation.order?.order_code || null,
    status: payload.status || orderValidation.order?.status || null,
    paymentStatus:
      payload.paymentStatus ||
      orderValidation.order?.payment_status ||
      null,
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
    requestOrigin,
  });
}
