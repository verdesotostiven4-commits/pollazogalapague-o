import type { SupabaseClient } from '@supabase/supabase-js';
import webPush from 'web-push';

type DeliveryPushKind = 'assigned' | 'nearby' | 'arrived';

type PushSubscriptionRow = {
  id: string;
  customer_phone: string;
  subscription: unknown;
};

const cleanPhoneTail = (value?: string | null) =>
  String(value || '').replace(/\D/g, '').slice(-9);

const copyFor = (kind: DeliveryPushKind, orderCode: string) => {
  if (kind === 'assigned') {
    return {
      title: 'Repartidor asignado 🛵',
      body: `Ya hay un repartidor encargado del pedido ${orderCode}. Puedes seguir el mapa desde la app.`,
      tag: `pollazo-rider-assigned-${orderCode}`,
    };
  }

  if (kind === 'nearby') {
    return {
      title: 'Tu pedido está cerca 📍',
      body: `El repartidor del pedido ${orderCode} está entrando a tu zona.`,
      tag: `pollazo-rider-nearby-${orderCode}`,
    };
  }

  return {
    title: 'El repartidor llegó ✅',
    body: `Tu pedido ${orderCode} llegó al punto de entrega.`,
    tag: `pollazo-rider-arrived-${orderCode}`,
  };
};

export const sendDeliveryTrackingPush = async (
  supabase: SupabaseClient,
  orderCode: string,
  kind: DeliveryPushKind
) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@pollazo.app';

  if (!publicKey || !privateKey || !orderCode) return;

  const orderResult = await supabase
    .from('orders')
    .select('customer_phone,status')
    .eq('order_code', orderCode)
    .maybeSingle();

  if (orderResult.error || !orderResult.data?.customer_phone) return;

  const customerTail = cleanPhoneTail(orderResult.data.customer_phone);
  if (!customerTail) return;

  const subscriptionsResult = await supabase
    .from('push_subscriptions')
    .select('id,customer_phone,subscription')
    .order('created_at', { ascending: false });

  if (subscriptionsResult.error) return;

  const subscriptions = ((subscriptionsResult.data || []) as PushSubscriptionRow[]).filter(
    row => cleanPhoneTail(row.customer_phone) === customerTail
  );

  if (subscriptions.length === 0) return;

  webPush.setVapidDetails(subject, publicKey, privateKey);
  const text = copyFor(kind, orderCode);
  const status = kind === 'assigned' ? 'Preparando' : 'Enviado';
  const payload = JSON.stringify({
    title: text.title,
    body: text.body,
    url: `/?tracking=1&orderCode=${encodeURIComponent(orderCode)}&status=${encodeURIComponent(status)}`,
    icon: '/logo-final.png',
    badge: '/logo-final.png',
    tag: text.tag,
    orderCode,
    status,
    notificationType: 'tracking',
    timestamp: Date.now(),
  });
  const expiredIds: string[] = [];

  await Promise.all(
    subscriptions.map(async row => {
      try {
        await webPush.sendNotification(row.subscription as webPush.PushSubscription, payload, {
          TTL: 60 * 60,
          headers: { Urgency: 'high' },
        });
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          expiredIds.push(row.id);
        }
      }
    })
  );

  if (expiredIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', expiredIds);
  }
};
