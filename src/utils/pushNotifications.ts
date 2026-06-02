import { supabase } from '../lib/supabase';

type PushRegisterResult = {
  ok: boolean;
  reason?: string;
  permission?: NotificationPermission;
  endpoint?: string;
};

type PushRegisterOptions = {
  forceRefresh?: boolean;
};

type RegisterPushApiResponse = {
  ok: boolean;
  error?: string;
  details?: unknown;
  subscription?: {
    id?: string;
    customer_phone?: string;
    endpoint?: string;
    last_seen_at?: string;
  };
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

const saveSubscriptionWithApi = async ({
  customerPhone,
  subscription,
  oldEndpoint,
}: {
  customerPhone: string;
  subscription: PushSubscription;
  oldEndpoint?: string;
}) => {
  const response = await fetch('/api/register-push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customerPhone,
      endpoint: subscription.endpoint,
      oldEndpoint: oldEndpoint || null,
      subscription: subscriptionToJson(subscription),
      userAgent: navigator.userAgent,
    }),
  });

  let result: RegisterPushApiResponse;

  try {
    result = await response.json();
  } catch {
    result = {
      ok: false,
      error: 'La API no devolvió una respuesta válida.',
    };
  }

  if (!response.ok || !result.ok) {
    return {
      ok: false,
      error: result.error || `No se pudo guardar la suscripción. HTTP ${response.status}`,
      details: result.details,
    };
  }

  return {
    ok: true,
    data: result.subscription,
  };
};

const deleteSubscriptionFromSupabase = async (endpoint: string) => {
  try {
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);
  } catch (error) {
    console.warn('No se pudo borrar suscripción vieja desde cliente:', error);
  }
};

const createFreshSubscription = async (
  registration: ServiceWorkerRegistration
) => {
  if (!VAPID_PUBLIC_KEY) {
    throw new Error('Missing VAPID public key');
  }

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
};

export const registerPushNotifications = async (
  customerPhone: string,
  options: PushRegisterOptions = {}
): Promise<PushRegisterResult> => {
  const phone = cleanPhone(customerPhone);
  const forceRefresh = options.forceRefresh === true;

  if (!phone) {
    localStorage.removeItem('pollazo_push_enabled');

    return {
      ok: false,
      reason: 'Primero necesitamos tu número de WhatsApp para activar avisos.',
    };
  }

  if (!isPushSupported()) {
    localStorage.removeItem('pollazo_push_enabled');

    return {
      ok: false,
      reason: 'Este navegador no soporta notificaciones push web.',
    };
  }

  if (!VAPID_PUBLIC_KEY) {
    localStorage.removeItem('pollazo_push_enabled');

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
    localStorage.removeItem('pollazo_push_enabled');

    return {
      ok: false,
      permission,
      reason: 'No se activaron las notificaciones. Puedes permitirlas desde ajustes del navegador.',
    };
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      updateViaCache: 'none',
    });

    await registration.update().catch(() => undefined);
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    let oldEndpoint = '';

    if (subscription && forceRefresh) {
      oldEndpoint = subscription.endpoint;

      try {
        await deleteSubscriptionFromSupabase(oldEndpoint);
        await subscription.unsubscribe();
      } catch (unsubscribeError) {
        console.warn('No se pudo limpiar suscripción anterior:', unsubscribeError);
      }

      subscription = null;
    }

    if (!subscription) {
      subscription = await createFreshSubscription(registration);
    }

    let saveResult = await saveSubscriptionWithApi({
      customerPhone: phone,
      subscription,
      oldEndpoint,
    });

    if (!saveResult.ok) {
      console.warn('Primer intento guardando push falló:', saveResult.error);

      const failedEndpoint = subscription.endpoint;

      try {
        await deleteSubscriptionFromSupabase(failedEndpoint);
        await subscription.unsubscribe();
      } catch (unsubscribeError) {
        console.warn('No se pudo limpiar suscripción vieja:', unsubscribeError);
      }

      subscription = await createFreshSubscription(registration);

      saveResult = await saveSubscriptionWithApi({
        customerPhone: phone,
        subscription,
        oldEndpoint: failedEndpoint,
      });
    }

    if (!saveResult.ok) {
      console.error('Error guardando push subscription:', saveResult.error, saveResult.details);

      localStorage.removeItem('pollazo_push_enabled');

      return {
        ok: false,
        permission,
        reason: `No se pudo guardar este dispositivo para notificaciones: ${saveResult.error}`,
      };
    }

    localStorage.setItem('pollazo_push_enabled', '1');

    return {
      ok: true,
      permission,
      endpoint: subscription.endpoint,
    };
  } catch (error) {
    console.error('Error activando push notifications:', error);

    try {
      const registration = await navigator.serviceWorker.ready;
      const oldSubscription = await registration.pushManager.getSubscription();

      if (oldSubscription) {
        await deleteSubscriptionFromSupabase(oldSubscription.endpoint);
        await oldSubscription.unsubscribe();
      }
    } catch {
      // Limpieza opcional.
    }

    localStorage.removeItem('pollazo_push_enabled');

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
      await deleteSubscriptionFromSupabase(subscription.endpoint);
    }
  } catch (error) {
    console.error('Error desactivando push notifications:', error);
  } finally {
    localStorage.removeItem('pollazo_push_enabled');
  }
};
