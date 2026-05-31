import {
  Truck,
  CheckCircle2,
  ClipboardList,
  X,
  ShoppingBag,
  Info,
  PackageSearch,
  Clock3,
  MapPin,
  TimerReset,
  Navigation,
  RefreshCw,
  ShieldCheck,
  Banknote,
  QrCode,
  Building,
  AlertCircle,
  XCircle,
  BellRing,
  Volume2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Order, OrderStatus, PaymentMethod, PaymentStatus } from '../types';

interface Props {
  isOpen?: boolean;
  onClose?: () => void;
}

type TrackingNoticeTone = 'green' | 'orange' | 'blue' | 'red';

interface TrackingNotice {
  id: string;
  orderId?: string;
  title: string;
  message: string;
  tone: TrackingNoticeTone;
  createdAt: number;
}

interface OrderSnapshot {
  id: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus | null;
  updatedAt?: string | null;
}

const STORE_LOCATION = {
  lat: -0.736323,
  lng: -90.321829,
};

const NOTICE_AUTO_CLOSE_MS = 6500;

const statusSteps: Array<{ status: OrderStatus; label: string; icon: LucideIcon }> = [
  { status: 'Por Confirmar', label: 'Por confirmar', icon: Clock3 },
  { status: 'Recibido', label: 'Confirmado', icon: ClipboardList },
  { status: 'Preparando', label: 'Empacando', icon: ShoppingBag },
  { status: 'Enviado', label: 'En camino', icon: Truck },
  { status: 'Entregado', label: 'Entregado', icon: CheckCircle2 },
];

const cleanPhoneTail = (phone?: string | null) => {
  return (phone || '').replace(/\D/g, '').slice(-9);
};

const toRadians = (value: number) => {
  return (value * Math.PI) / 180;
};

const parseCoordinate = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const getOrderLocation = (order: Order | null) => {
  if (!order) return null;

  const lat = parseCoordinate(order.lat);
  const lng = parseCoordinate(order.lng);

  if (lat === null || lng === null) {
    return null;
  }

  return { lat, lng };
};

const getOptionalDate = (order: Order, key: string): Date | null => {
  const value = (order as unknown as Record<string, unknown>)[key];

  if (!value) return null;

  const parsed = new Date(String(value));

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const distanceKmBetween = (
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const isRecentOrder = (order: Order) => {
  const createdAt = order.created_at ? new Date(order.created_at).getTime() : 0;

  if (!createdAt || Number.isNaN(createdAt)) {
    return false;
  }

  return createdAt > Date.now() - 24 * 60 * 60 * 1000;
};

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getOrderItemCount = (order: Order) => {
  return (order.items || []).reduce((sum: number, item: any) => {
    return sum + Number(item?.quantity || 1);
  }, 0);
};

const hasFreshOrVariableItems = (order: Order) => {
  return (order.items || []).some((item: any) => {
    const name = String(item?.name || item?.product?.name || '').toLowerCase();
    const category = String(item?.category || item?.product?.category || '').toLowerCase();

    return (
      item?.custom_price ||
      item?.product?.custom_price ||
      item?.product?.is_variable ||
      category.includes('pollo') ||
      name.includes('pollo') ||
      name.includes('pechuga') ||
      name.includes('alas') ||
      name.includes('cuartos') ||
      name.includes('menudencia')
    );
  });
};

const getPrepMinutes = (order: Order) => {
  const itemCount = getOrderItemCount(order);
  const hasFresh = hasFreshOrVariableItems(order);

  let min = 4;
  let max = 8;

  if (itemCount >= 4 && itemCount <= 8) {
    min += 3;
    max += 5;
  }

  if (itemCount > 8) {
    min += 6;
    max += 10;
  }

  if (hasFresh) {
    min += 4;
    max += 8;
  }

  if (order.payment_method === 'transferencia' || order.payment_method === 'deuna') {
    min += 2;
    max += 4;
  }

  return { min, max };
};

const getDeliveryMinutes = (distanceKm: number | null) => {
  if (distanceKm === null) {
    return { min: 8, max: 18 };
  }

  if (distanceKm <= 0) {
    return { min: 5, max: 10 };
  }

  const baseMin = Math.ceil(distanceKm * 4) + 4;
  const baseMax = Math.ceil(distanceKm * 6) + 8;

  return {
    min: Math.max(5, baseMin),
    max: Math.max(10, baseMax),
  };
};

const getTimingBaseDate = (order: Order, now: Date) => {
  const createdAt = order.created_at ? new Date(order.created_at) : now;
  const confirmedAt = getOptionalDate(order, 'confirmed_at');
  const updatedAt = getOptionalDate(order, 'updated_at');

  if (order.status === 'Enviado') {
    return updatedAt || confirmedAt || createdAt;
  }

  if (order.status === 'Preparando') {
    return updatedAt || confirmedAt || createdAt;
  }

  if (order.status === 'Recibido') {
    return confirmedAt || updatedAt || createdAt;
  }

  return createdAt;
};

const estimateOrderTiming = (order: Order, now: Date) => {
  const baseDate = getTimingBaseDate(order, now);
  const customerLocation = getOrderLocation(order);

  const distanceKm = customerLocation
    ? distanceKmBetween(STORE_LOCATION, customerLocation)
    : null;

  const prep = getPrepMinutes(order);
  const delivery = getDeliveryMinutes(distanceKm);

  let minMinutes = prep.min + delivery.min;
  let maxMinutes = prep.max + delivery.max;

  if (order.status === 'Preparando') {
    minMinutes = Math.max(6, delivery.min + 3);
    maxMinutes = Math.max(12, delivery.max + 8);
  }

  if (order.status === 'Enviado') {
    minMinutes = delivery.min;
    maxMinutes = delivery.max;
  }

  if (order.status === 'Entregado') {
    minMinutes = 0;
    maxMinutes = 0;
  }

  const earliest = new Date(baseDate.getTime() + minMinutes * 60 * 1000);
  const latest = new Date(baseDate.getTime() + maxMinutes * 60 * 1000);
  const remainingMs = latest.getTime() - now.getTime();
  const remainingMinutes = Math.max(0, Math.ceil(remainingMs / 60000));

  return {
    distanceKm,
    minMinutes,
    maxMinutes,
    earliest,
    latest,
    remainingMinutes,
  };
};

const getStatusMessage = (status: OrderStatus) => {
  switch (status) {
    case 'Por Confirmar':
      return 'Recibimos tu pedido. El negocio está revisando disponibilidad y método de pago.';
    case 'Recibido':
      return '¡Pedido confirmado! Ya tenemos tu compra en el sistema.';
    case 'Preparando':
      return 'Estamos empacando tus productos con cuidado.';
    case 'Enviado':
      return '¡Tu pedido va en camino a tu casa!';
    case 'Entregado':
      return '¡Pedido entregado! ¡Gracias por comprar en La Casa del Pollazo!';
    case 'Cancelado':
      return 'Este pedido fue cancelado.';
    default:
      return 'Estamos revisando el estado de tu pedido.';
  }
};

const getPaymentMethodLabel = (method?: PaymentMethod | null) => {
  if (method === 'efectivo') return 'Efectivo';
  if (method === 'deuna') return 'Deuna';
  if (method === 'transferencia') return 'Transferencia';
  if (method === 'tarjeta') return 'Tarjeta';
  return 'No definido';
};

const getPaymentIcon = (method?: PaymentMethod | null): LucideIcon => {
  if (method === 'efectivo') return Banknote;
  if (method === 'deuna') return QrCode;
  if (method === 'transferencia') return Building;
  if (method === 'tarjeta') return ShieldCheck;

  return AlertCircle;
};

const getPaymentStatusLabel = (status?: PaymentStatus | null) => {
  if (status === 'contra_entrega') return 'Pago contra entrega';
  if (status === 'validando') return 'Pago en validación';
  if (status === 'confirmado') return 'Pago confirmado';
  if (status === 'rechazado') return 'Pago rechazado';
  if (status === 'pendiente') return 'Pago pendiente';

  return 'Estado pendiente';
};

const getPaymentStatusTone = (status?: PaymentStatus | null) => {
  if (status === 'confirmado') {
    return {
      wrapper: 'bg-green-50 border-green-100',
      icon: 'bg-white text-green-600',
      title: 'text-green-700',
      text: 'text-green-700/75',
    };
  }

  if (status === 'validando') {
    return {
      wrapper: 'bg-blue-50 border-blue-100',
      icon: 'bg-white text-blue-600',
      title: 'text-blue-700',
      text: 'text-blue-700/75',
    };
  }

  if (status === 'contra_entrega') {
    return {
      wrapper: 'bg-orange-50 border-orange-100',
      icon: 'bg-white text-orange-600',
      title: 'text-orange-700',
      text: 'text-orange-700/75',
    };
  }

  if (status === 'rechazado') {
    return {
      wrapper: 'bg-red-50 border-red-100',
      icon: 'bg-white text-red-500',
      title: 'text-red-600',
      text: 'text-red-600/75',
    };
  }

  return {
    wrapper: 'bg-gray-50 border-gray-100',
    icon: 'bg-white text-gray-500',
    title: 'text-gray-700',
    text: 'text-gray-500',
  };
};

const getPaymentHelpText = (order: Order) => {
  if (order.payment_status === 'confirmado') {
    return 'Tu pago ya fue validado. El pedido puede avanzar normalmente.';
  }

  if (order.payment_status === 'rechazado') {
    return 'El pago no fue aceptado. Comunícate por WhatsApp para resolverlo.';
  }

  if (order.payment_method === 'efectivo') {
    return 'Pagarás al recibir. El negocio debe aceptar el pedido antes de prepararlo.';
  }

  if (order.payment_method === 'deuna') {
    return 'Estamos validando tu comprobante de Deuna antes de confirmar el pedido.';
  }

  if (order.payment_method === 'transferencia') {
    return 'Estamos validando tu comprobante de transferencia antes de confirmar el pedido.';
  }

  if (order.payment_method === 'tarjeta') {
    return 'El pedido avanzará cuando el pago con tarjeta sea aprobado.';
  }

  return 'El negocio revisará el método de pago antes de preparar tu pedido.';
};

const getPendingPaymentText = (order: Order) => {
  if (order.payment_method === 'efectivo') {
    return 'Tu pedido espera confirmación del negocio antes de prepararse. El pago será contra entrega.';
  }

  if (order.payment_method === 'deuna') {
    return 'Tu pedido espera validación del pago por Deuna antes de activar el tiempo estimado.';
  }

  if (order.payment_method === 'transferencia') {
    return 'Tu pedido espera validación de transferencia antes de activar el tiempo estimado.';
  }

  if (order.payment_method === 'tarjeta') {
    return 'Tu pedido espera aprobación del pago con tarjeta antes de activar el tiempo estimado.';
  }

  return 'Cuando el negocio confirme tu pedido, aquí aparecerá el tiempo estimado de entrega.';
};

const getHeaderIcon = (status?: OrderStatus) => {
  if (status === 'Cancelado') return XCircle;
  if (status === 'Por Confirmar') return Clock3;
  if (status === 'Entregado') return CheckCircle2;
  if (status === 'Enviado') return Truck;

  return PackageSearch;
};

const getNoticeClasses = (tone: TrackingNoticeTone) => {
  if (tone === 'green') {
    return {
      wrapper: 'bg-green-50 border-green-100 text-green-700',
      icon: 'bg-white text-green-600',
      button: 'bg-green-500 text-white',
    };
  }

  if (tone === 'blue') {
    return {
      wrapper: 'bg-blue-50 border-blue-100 text-blue-700',
      icon: 'bg-white text-blue-600',
      button: 'bg-blue-500 text-white',
    };
  }

  if (tone === 'red') {
    return {
      wrapper: 'bg-red-50 border-red-100 text-red-600',
      icon: 'bg-white text-red-500',
      button: 'bg-red-500 text-white',
    };
  }

  return {
    wrapper: 'bg-orange-50 border-orange-100 text-orange-700',
    icon: 'bg-white text-orange-600',
    button: 'bg-orange-500 text-white',
  };
};

const buildTrackingNotice = (
  order: Order,
  previous: OrderSnapshot | null
): Omit<TrackingNotice, 'id' | 'createdAt'> | null => {
  if (!previous || previous.id !== order.id) {
    return null;
  }

  if (previous.status !== order.status) {
    if (order.status === 'Recibido') {
      return {
        orderId: order.id,
        tone: 'green',
        title: 'Pedido confirmado',
        message: 'El negocio aceptó tu pedido. Ahora empieza el seguimiento.',
      };
    }

    if (order.status === 'Preparando') {
      return {
        orderId: order.id,
        tone: 'blue',
        title: 'Ya estamos empacando',
        message: 'Tu pedido está en preparación. Te avisaremos cuando salga a ruta.',
      };
    }

    if (order.status === 'Enviado') {
      return {
        orderId: order.id,
        tone: 'orange',
        title: 'Tu pedido va en camino',
        message: 'Prepárate para recibirlo. Revisa tu referencia y mantente atento.',
      };
    }

    if (order.status === 'Entregado') {
      return {
        orderId: order.id,
        tone: 'green',
        title: 'Pedido entregado',
        message: '¡Gracias por comprar en La Casa del Pollazo!',
      };
    }

    if (order.status === 'Cancelado') {
      return {
        orderId: order.id,
        tone: 'red',
        title: 'Pedido cancelado',
        message: 'Tu pedido fue cancelado. Escríbenos si necesitas ayuda.',
      };
    }

    if (order.status === 'Por Confirmar') {
      return {
        orderId: order.id,
        tone: 'orange',
        title: 'Pedido recibido',
        message: 'Estamos revisando disponibilidad y método de pago.',
      };
    }
  }

  if (previous.paymentStatus !== order.payment_status) {
    if (order.payment_status === 'confirmado') {
      return {
        orderId: order.id,
        tone: 'green',
        title: 'Pago confirmado',
        message: 'Tu pago fue validado. El pedido puede avanzar normalmente.',
      };
    }

    if (order.payment_status === 'rechazado') {
      return {
        orderId: order.id,
        tone: 'red',
        title: 'Pago rechazado',
        message: 'No se pudo validar el pago. Comunícate con el negocio para resolverlo.',
      };
    }

    if (order.payment_status === 'validando') {
      return {
        orderId: order.id,
        tone: 'blue',
        title: 'Pago en validación',
        message: 'Estamos revisando tu pago. Te avisaremos cuando sea confirmado.',
      };
    }
  }

  return null;
};

const triggerTrackingVibration = () => {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([80, 45, 80, 45, 130]);
    }
  } catch {
    // Vibración opcional.
  }
};

export default function OrderTracking({
  isOpen = false,
  onClose = () => {},
}: Props) {
  const { orders, refreshData } = useAdmin();
  const { customerPhone } = useUser();

  const [now, setNow] = useState(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [trackingNotice, setTrackingNotice] = useState<TrackingNotice | null>(null);

  const previousOrderSnapshotRef = useRef<OrderSnapshot | null>(null);
  const initializedNoticeWatcherRef = useRef(false);
  const alertAudioRef = useRef<AudioContext | null>(null);
  const autoCloseTimerRef = useRef<number | null>(null);

  const cleanUserPhone = cleanPhoneTail(customerPhone);

  const activeOrder = useMemo(() => {
    if (!cleanUserPhone) {
      return null;
    }

    return (
      orders
        ?.filter(order => {
          const cleanOrder = cleanPhoneTail(order.customer_phone);

          return cleanOrder === cleanUserPhone && isRecentOrder(order);
        })
        .sort((a, b) => {
          const dateA = new Date(a.updated_at || a.created_at || '').getTime();
          const dateB = new Date(b.updated_at || b.created_at || '').getTime();

          return dateB - dateA;
        })[0] || null
    );
  }, [cleanUserPhone, orders]);

  const playTrackingSound = useCallback((tone: TrackingNoticeTone) => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextClass) return;

      if (alertAudioRef.current) {
        alertAudioRef.current.close().catch(() => undefined);
        alertAudioRef.current = null;
      }

      const ctx = new AudioContextClass();
      alertAudioRef.current = ctx;

      const notes =
        tone === 'red'
          ? [392, 349.23]
          : tone === 'green'
            ? [523.25, 659.25, 783.99]
            : tone === 'blue'
              ? [440, 587.33, 659.25]
              : [493.88, 659.25, 880];

      notes.forEach((frequency, index) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + index * 0.12;
        const duration = 0.18;

        oscillator.connect(gain);
        gain.connect(ctx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.08, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

        oscillator.start(start);
        oscillator.stop(start + duration);
      });

      window.setTimeout(() => {
        if (alertAudioRef.current) {
          alertAudioRef.current.close().catch(() => undefined);
          alertAudioRef.current = null;
        }
      }, 900);
    } catch {
      // Algunos navegadores bloquean audio sin interacción previa.
    }
  }, []);

  const showBrowserNotification = useCallback((notice: Omit<TrackingNotice, 'id' | 'createdAt'>) => {
    try {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;

      const notification = new Notification(notice.title, {
        body: notice.message,
        icon: '/logo-final.png',
        badge: '/logo-final.png',
        tag: `pollazo-${notice.orderId || 'tracking'}`,
        requireInteraction: false,
      });

      window.setTimeout(() => {
        notification.close();
      }, 6500);
    } catch {
      // Notificación del sistema opcional.
    }
  }, []);

  const raiseTrackingNotice = useCallback(
    (notice: Omit<TrackingNotice, 'id' | 'createdAt'>) => {
      const nextNotice: TrackingNotice = {
        ...notice,
        id: `${notice.orderId || 'tracking'}-${Date.now()}`,
        createdAt: Date.now(),
      };

      setTrackingNotice(nextNotice);
      triggerTrackingVibration();
      playTrackingSound(notice.tone);
      showBrowserNotification(notice);

      try {
        if (notice.tone === 'red') {
          document.title = '⚠️ Pedido - Pollazo';
        } else if (notice.title.toLowerCase().includes('camino')) {
          document.title = '🛵 En camino - Pollazo';
        } else {
          document.title = '🔔 Pedido actualizado';
        }
      } catch {
        // Título opcional.
      }
    },
    [playTrackingSound, showBrowserNotification]
  );

  const refreshTracking = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await refreshData();
      setNow(new Date());
    } catch (error) {
      console.error('No se pudo refrescar el rastreo:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshData]);

  useEffect(() => {
    return () => {
      if (alertAudioRef.current) {
        alertAudioRef.current.close().catch(() => undefined);
        alertAudioRef.current = null;
      }

      if (autoCloseTimerRef.current) {
        window.clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }

      try {
        document.title = 'La Casa del Pollazo';
      } catch {
        // Ignorar.
      }
    };
  }, []);

  useEffect(() => {
    if (!trackingNotice) {
      try {
        document.title = 'La Casa del Pollazo';
      } catch {
        // Ignorar.
      }

      return undefined;
    }

    if (autoCloseTimerRef.current) {
      window.clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }

    const noticeId = trackingNotice.id;

    autoCloseTimerRef.current = window.setTimeout(() => {
      setTrackingNotice(current => {
        if (current?.id === noticeId) {
          return null;
        }

        return current;
      });

      autoCloseTimerRef.current = null;
    }, NOTICE_AUTO_CLOSE_MS);

    return () => {
      if (autoCloseTimerRef.current) {
        window.clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
    };
  }, [trackingNotice]);

  useEffect(() => {
    if (!isOpen) return undefined;

    setNow(new Date());

    const clock = window.setInterval(() => {
      setNow(new Date());
    }, 10000);

    return () => window.clearInterval(clock);
  }, [isOpen]);

  useEffect(() => {
    if (!cleanUserPhone) return undefined;

    if (isOpen) {
      refreshTracking();
    }

    const interval = window.setInterval(refreshTracking, isOpen ? 6000 : 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [cleanUserPhone, isOpen, refreshTracking]);

  useEffect(() => {
    if (!isSupabaseConfigured || !cleanUserPhone) {
      return undefined;
    }

    const channel = supabase
      .channel(`pollazo_tracking_${cleanUserPhone}_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        payload => {
          const nextRow = payload.new as { customer_phone?: string } | null;
          const oldRow = payload.old as { customer_phone?: string } | null;

          const changedPhone =
            cleanPhoneTail(nextRow?.customer_phone) ||
            cleanPhoneTail(oldRow?.customer_phone);

          if (changedPhone === cleanUserPhone) {
            refreshTracking();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cleanUserPhone, refreshTracking]);

  useEffect(() => {
    if (!cleanUserPhone) return undefined;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshTracking();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', refreshTracking);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', refreshTracking);
    };
  }, [cleanUserPhone, refreshTracking]);

  useEffect(() => {
    if (!cleanUserPhone) {
      previousOrderSnapshotRef.current = null;
      initializedNoticeWatcherRef.current = false;
      return;
    }

    const nextSnapshot: OrderSnapshot | null = activeOrder
      ? {
          id: activeOrder.id,
          status: activeOrder.status,
          paymentStatus: activeOrder.payment_status || null,
          updatedAt: activeOrder.updated_at || activeOrder.created_at || null,
        }
      : null;

    if (!initializedNoticeWatcherRef.current) {
      previousOrderSnapshotRef.current = nextSnapshot;
      initializedNoticeWatcherRef.current = true;
      return;
    }

    if (!nextSnapshot || !activeOrder) {
      previousOrderSnapshotRef.current = null;
      return;
    }

    const previousSnapshot = previousOrderSnapshotRef.current;
    const notice = buildTrackingNotice(activeOrder, previousSnapshot);

    previousOrderSnapshotRef.current = nextSnapshot;

    if (notice) {
      raiseTrackingNotice(notice);
    }
  }, [
    activeOrder,
    activeOrder?.id,
    activeOrder?.payment_status,
    activeOrder?.status,
    activeOrder?.updated_at,
    cleanUserPhone,
    raiseTrackingNotice,
  ]);

  const renderTrackingNotice = (compact = false) => {
    if (!trackingNotice) return null;

    const classes = getNoticeClasses(trackingNotice.tone);

    return (
      <div
        className={`rounded-[28px] border p-4 shadow-xl animate-in slide-in-from-top-4 duration-300 ${classes.wrapper} ${
          compact ? 'w-[calc(100vw-24px)] max-w-md' : 'mb-5'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0 ${classes.icon}`}>
            <BellRing size={22} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-black uppercase italic leading-tight">
              {trackingNotice.title}
            </p>
            <p className="text-[11px] font-bold leading-relaxed mt-1 opacity-80">
              {trackingNotice.message}
            </p>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => setTrackingNotice(null)}
                className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase active:scale-95 transition-all ${classes.button}`}
              >
                Entendido
              </button>

              <div className="flex items-center gap-1 text-[9px] font-black uppercase opacity-60">
                <Volume2 size={12} />
                Se cierra solo
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setTrackingNotice(null)}
            className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center active:scale-90 transition-transform"
            aria-label="Cerrar aviso"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    );
  };

  if (!isOpen) {
    if (!trackingNotice) return null;

    return (
      <div className="fixed left-0 right-0 top-4 z-[10001] flex justify-center px-3 pointer-events-none">
        <div className="pointer-events-auto">
          {renderTrackingNotice(true)}
        </div>
      </div>
    );
  }

  const hasActiveOrder = Boolean(activeOrder);
  const currentStatus = activeOrder?.status;
  const currentStatusIdx = currentStatus
    ? statusSteps.findIndex(step => step.status === currentStatus)
    : -1;

  const canShowEta =
    activeOrder &&
    currentStatus &&
    currentStatus !== 'Por Confirmar' &&
    currentStatus !== 'Entregado' &&
    currentStatus !== 'Cancelado';

  const estimate = canShowEta ? estimateOrderTiming(activeOrder, now) : null;
  const orderLocation = getOrderLocation(activeOrder);
  const PaymentIcon = activeOrder ? getPaymentIcon(activeOrder.payment_method) : AlertCircle;
  const paymentTone = activeOrder ? getPaymentStatusTone(activeOrder.payment_status) : null;
  const HeaderIcon = getHeaderIcon(currentStatus);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md bg-white rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95 duration-300 border border-white/20 max-h-[92vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Cerrar rastreo"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-8">
          <div
            className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 ${
              currentStatus === 'Cancelado'
                ? 'bg-red-100 text-red-500'
                : currentStatus === 'Por Confirmar'
                  ? 'bg-orange-100 text-orange-500'
                  : currentStatus === 'Entregado'
                    ? 'bg-green-100 text-green-600'
                    : hasActiveOrder
                      ? 'bg-green-100 text-green-600'
                      : 'bg-orange-100 text-orange-500'
            }`}
          >
            <HeaderIcon size={40} />
          </div>

          <h2 className="text-2xl font-black text-gray-900 uppercase italic leading-none">
            {hasActiveOrder
              ? currentStatus === 'Por Confirmar'
                ? 'Esperando Confirmación'
                : currentStatus === 'Entregado'
                  ? 'Pedido Entregado'
                  : currentStatus === 'Cancelado'
                    ? 'Pedido Cancelado'
                    : 'Pedido en Curso'
              : 'Rastreo en Vivo'}
          </h2>

          <p className="text-sm font-bold text-gray-400 mt-2">
            {hasActiveOrder
              ? `Código: ${activeOrder?.order_code || 'Sin código'}`
              : 'Sigue tu compra paso a paso'}
          </p>

          {hasActiveOrder && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5">
                <RefreshCw
                  size={12}
                  className={`text-orange-500 ${isRefreshing ? 'animate-spin' : ''}`}
                />
                <span className="text-[9px] font-black uppercase text-gray-400">
                  En vivo
                </span>
              </div>

              <button
                type="button"
                onClick={refreshTracking}
                className="inline-flex items-center gap-1 bg-orange-50 text-orange-600 border border-orange-100 rounded-full px-3 py-1.5 text-[9px] font-black uppercase active:scale-95 transition-all"
              >
                Actualizar
              </button>
            </div>
          )}
        </div>

        {renderTrackingNotice(false)}

        {hasActiveOrder && currentStatus && activeOrder ? (
          <div className="py-2">
            {currentStatus !== 'Cancelado' && (
              <div className="relative flex justify-between items-center px-1 mb-8">
                <div className="absolute left-0 right-0 top-[20px] h-[3px] bg-gray-100 rounded-full" />

                {statusSteps.map((step, idx) => {
                  const isCompleted = currentStatusIdx >= idx;
                  const isCurrent = currentStatus === step.status;
                  const Icon = step.icon;

                  return (
                    <div key={step.status} className="flex flex-col items-center gap-2 z-10">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                          isCompleted
                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
                            : 'bg-white border-2 border-gray-100 text-gray-300'
                        } ${isCurrent ? 'scale-125 ring-4 ring-orange-100' : ''}`}
                      >
                        <Icon size={18} />
                      </div>

                      <span
                        className={`text-[7px] font-black uppercase tracking-tighter text-center max-w-[58px] leading-tight ${
                          isCompleted ? 'text-gray-900' : 'text-gray-300'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div
              className={`p-4 rounded-2xl border text-center shadow-sm ${
                currentStatus === 'Cancelado'
                  ? 'bg-red-50 border-red-100'
                  : currentStatus === 'Por Confirmar'
                    ? 'bg-orange-50 border-orange-100'
                    : 'bg-green-50 border-green-100'
              }`}
            >
              <p
                className={`text-xs font-black uppercase italic leading-relaxed ${
                  currentStatus === 'Cancelado'
                    ? 'text-red-600'
                    : currentStatus === 'Por Confirmar'
                      ? 'text-orange-600'
                      : 'text-green-700'
                }`}
              >
                {getStatusMessage(currentStatus)}
              </p>
            </div>

            {paymentTone && (
              <div className={`mt-4 rounded-[28px] border p-4 ${paymentTone.wrapper}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0 ${paymentTone.icon}`}>
                    <PaymentIcon size={20} />
                  </div>

                  <div className="min-w-0">
                    <p className={`text-[10px] font-black uppercase leading-tight ${paymentTone.title}`}>
                      {getPaymentMethodLabel(activeOrder.payment_method)} · {getPaymentStatusLabel(activeOrder.payment_status)}
                    </p>
                    <p className={`text-[11px] font-bold leading-relaxed mt-1.5 ${paymentTone.text}`}>
                      {getPaymentHelpText(activeOrder)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {currentStatus === 'Por Confirmar' && (
              <div className="mt-4 bg-yellow-50 border border-yellow-100 rounded-[28px] p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-yellow-600 shadow-sm flex-shrink-0">
                    <ShieldCheck size={20} />
                  </div>

                  <div>
                    <p className="text-[10px] font-black text-yellow-700 uppercase">
                      Tiempo estimado bloqueado
                    </p>
                    <p className="text-[11px] font-bold text-yellow-700/80 leading-relaxed mt-1">
                      {getPendingPaymentText(activeOrder)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {estimate && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3">
                  <div className="flex items-center gap-2 text-orange-600 mb-1">
                    <TimerReset size={15} />
                    <span className="text-[8px] font-black uppercase">
                      Llegada estimada
                    </span>
                  </div>
                  <p className="text-xs font-black text-gray-900 leading-snug">
                    {formatTime(estimate.earliest)} - {formatTime(estimate.latest)}
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3">
                  <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <Navigation size={15} />
                    <span className="text-[8px] font-black uppercase">
                      Distancia aprox.
                    </span>
                  </div>
                  <p className="text-xs font-black text-gray-900 leading-snug">
                    {estimate.distanceKm !== null
                      ? `${estimate.distanceKm.toFixed(1)} km`
                      : 'Sin GPS exacto'}
                  </p>
                </div>

                <div className="col-span-2 bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
                  <p className="text-[10px] font-black uppercase text-green-700 leading-relaxed">
                    {currentStatus === 'Enviado'
                      ? `Tu pedido debería llegar en aproximadamente ${estimate.remainingMinutes} min.`
                      : `Tu pedido está estimado para llegar entre ${estimate.minMinutes} y ${estimate.maxMinutes} min desde la confirmación.`}
                  </p>
                </div>
              </div>
            )}

            {currentStatus === 'Entregado' && (
              <div className="mt-4 bg-green-50 border border-green-100 rounded-[28px] p-4 text-center">
                <CheckCircle2 size={28} className="text-green-600 mx-auto mb-2" />
                <p className="text-[10px] font-black text-green-700 uppercase leading-relaxed">
                  Gracias por tu compra. Tu historial y experiencia se actualizarán si aplica.
                </p>
              </div>
            )}

            {currentStatus === 'Cancelado' && (
              <div className="mt-4 bg-red-50 border border-red-100 rounded-[28px] p-4 text-center">
                <XCircle size={28} className="text-red-500 mx-auto mb-2" />
                <p className="text-[10px] font-black text-red-600 uppercase leading-relaxed">
                  Si crees que hubo un error, comunícate por WhatsApp con el negocio.
                </p>
              </div>
            )}

            {activeOrder.reference && (
              <div className="mt-4 bg-blue-50 border border-blue-100 rounded-2xl p-3 flex items-start gap-3">
                <MapPin size={17} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] font-bold text-blue-700 uppercase leading-relaxed">
                  Referencia: {activeOrder.reference}
                </p>
              </div>
            )}

            {!orderLocation &&
              currentStatus !== 'Por Confirmar' &&
              currentStatus !== 'Cancelado' && (
                <div className="mt-4 bg-orange-50 border border-orange-100 rounded-2xl p-3 flex items-start gap-3">
                  <MapPin size={17} className="text-orange-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] font-bold text-orange-700 uppercase leading-relaxed">
                    No encontramos GPS exacto en este pedido. El tiempo se calcula como zona cercana.
                  </p>
                </div>
              )}

            {activeOrder.created_at && (
              <p className="text-center text-[10px] text-gray-300 font-bold uppercase mt-4">
                Se actualiza automáticamente cuando el admin o repartidor cambia el estado
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-gray-500 font-bold leading-relaxed text-center px-2">
              Aquí podrás ver el progreso de tu compra en tiempo real. Cuando realices un pedido y lo confirmemos, se activará este seguimiento automático. 🛵💨
            </p>

            <div className="p-5 bg-blue-50 rounded-[32px] flex items-center gap-4 border border-blue-100 shadow-sm">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-500 shadow-sm flex-shrink-0">
                <Info size={24} />
              </div>

              <p className="text-[10px] font-black text-blue-700 uppercase leading-tight text-left">
                Te avisaremos cuando el pedido cambie de estado mientras estás usando la app. Si aceptaste permisos, también recibirás notificaciones reales del pedido.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-5 bg-gray-900 text-white font-black rounded-[24px] text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl"
            >
              ¡Entendido!
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
