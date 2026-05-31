import { supabase } from '../lib/supabase';

type PushRegisterResult = {
  ok: boolean;
  reason?: string;
  permission?: NotificationPermission;
};

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

const cleanPhone = (phone?: string | null) => {
  return String(phone || '').replace(/\D/g, '');
};

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);

  const base64 = `${base64String}${padding}`
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
};

const subscriptionToJson = (subscription: PushSubscription) => {
  return subscription.toJSON();
};

export const isPushSupported = () => {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
};

export const getPushPermission = (): NotificationPermission => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  return Notification.permission;
};

export const registerPushNotifications = async (
  customerPhone: string
): Promise<PushRegisterResult> => {
  const phone = cleanPhone(customerPhone);

  if (!phone) {
    return {
      ok: false,
      reason: 'Primero necesitamos tu número de WhatsApp para activar avisos.',
    };
  }

  if (!isPushSupported()) {
    return {
      ok: false,
      reason: 'Este navegador no soporta notificaciones push web.',
    };
  }

  if (!VAPID_PUBLIC_KEY) {
    return {
      ok: false,
      reason: 'Falta configurar VITE_VAPID_PUBLIC_KEY en Vercel.',
    };
  }

  let permission = Notification.permission;

  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }

  if (permission !== 'granted') {
    return {
      ok: false,
      permission,
      reason: 'No se activaron las notificaciones. Puedes permitirlas desde ajustes del navegador.',
    };
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const subscriptionJson = subscriptionToJson(subscription);

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          customer_phone: phone,
          endpoint: subscription.endpoint,
          subscription: subscriptionJson,
          user_agent: navigator.userAgent,
          last_seen_at: new Date().toISOString(),
        },
        {
          onConflict: 'endpoint',
        }
      );

    if (error) {
      console.error('Error guardando push subscription:', error);

      return {
        ok: false,
        permission,
        reason: 'No se pudo guardar este dispositivo para notificaciones.',
      };
    }

    localStorage.setItem('pollazo_push_enabled', '1');

    return {
      ok: true,
      permission,
    };
  } catch (error) {
    console.error('Error activando push notifications:', error);

    return {
      ok: false,
      permission,
      reason: 'No se pudo activar las notificaciones en este dispositivo.',
    };
  }
};

export const unregisterPushNotifications = async () => {
  if (!isPushSupported()) {
    localStorage.removeItem('pollazo_push_enabled');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();

      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', subscription.endpoint);
    }
  } catch (error) {
    console.error('Error desactivando push notifications:', error);
  } finally {
    localStorage.removeItem('pollazo_push_enabled');
  }
};
