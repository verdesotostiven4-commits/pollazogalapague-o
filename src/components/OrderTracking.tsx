import {
  AlertCircle,
  Banknote,
  Bell,
  BellOff,
  BellRing,
  Building,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Crown,
  Gift,
  Info,
  MapPin,
  MessageCircle,
  Navigation,
  PackageSearch,
  QrCode,
  ReceiptText,
  RefreshCw,
  Route,
  ShieldCheck,
  ShoppingBag,
  TimerReset,
  Truck,
  Volume2,
  X,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  getPushPermission,
  isPushSupported,
  registerPushNotifications,
} from '../utils/pushNotifications';
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

type PushCardFeedback = {
  tone: 'green' | 'orange' | 'red' | 'blue';
  message: string;
};

const STORE_LOCATION = {
  lat: -0.736323,
  lng: -90.321829,
};

const NOTICE_AUTO_CLOSE_MS = 6500;
const PUSH_CARD_HIDE_KEY = 'pollazo_hide_push_card_until';
const WHATSAPP_NUMBER = '593989795628';

const statusSteps: Array<{ status: OrderStatus; label: string; icon: LucideIcon }> = [
  { status: 'Por Confirmar', label: 'Por confirmar', icon: Clock3 },
  { status: 'Recibido', label: 'Confirmado', icon: ClipboardList },
  { status: 'Preparando', label: 'Empacando', icon: ShoppingBag },
  { status: 'Enviado', label: 'En camino', icon: Truck },
  { status: 'Entregado', label: 'Entregado', icon: CheckCircle2 },
];

const cleanPhoneTail = (phone?: string | null) => {
  return String(phone || '').replace(/\D/g, '').slice(-9);
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

const parseMoney = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = Number.parseFloat(
    String(value || '0')
      .replace(',', '.')
      .replace(/[^0-9.-]/g, '')
  );

  return Number.isFinite(parsed) ? parsed : 0;
};

const moneyText = (value: unknown) => {
  return `$${parseMoney(value).toFixed(2)}`;
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

  return Number.isNaN(parsed.getTime()) ? null : parsed;
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
      return 'Recibimos tu pedido. El negocio está revisando disponibilidad, ubicación y método de pago.';
    case 'Recibido':
      return '¡Pedido confirmado! Ya tenemos tu compra en el sistema.';
    case 'Preparando':
      return 'Estamos empacando tus productos con cuidado.';
    case 'Enviado':
      return '¡Tu pedido va en camino a tu casa!';
    case 'Entregado':
      return '¡Pedido entregado! Gracias por comprar en La Casa del Pollazo.';
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

const getStatusTitle = (status?: OrderStatus) => {
  if (status === 'Por Confirmar') return 'Pedido recibido';
  if (status === 'Recibido') return 'Pedido confirmado';
  if (status === 'Preparando') return 'Empacando tu pedido';
  if (status === 'Enviado') return 'Tu pedido va en camino';
  if (status === 'Entregado') return 'Pedido entregado';
  if (status === 'Cancelado') return 'Pedido cancelado';

  return 'Rastreo en vivo';
};

const getHeroTone = (status?: OrderStatus) => {
  if (status === 'Cancelado') {
    return {
      hero: 'from-red-500 via-red-400 to-orange-400',
      glow: 'bg-red-300/30',
      chip: 'bg-red-50 text-red-500 border-red-100',
      message: 'bg-red-50 border-red-100 text-red-600',
    };
  }

  if (status === 'Entregado') {
    return {
      hero: 'from-green-500 via-emerald-400 to-yellow-400',
      glow: 'bg-green-300/30',
      chip: 'bg-green-50 text-green-600 border-green-100',
      message: 'bg-green-50 border-green-100 text-green-700',
    };
  }

  if (status === 'Por Confirmar') {
    return {
      hero: 'from-orange-500 via-orange-400 to-yellow-400',
      glow: 'bg-orange-300/30',
      chip: 'bg-orange-50 text-orange-600 border-orange-100',
      message: 'bg-orange-50 border-orange-100 text-orange-700',
    };
  }

  return {
    hero: 'from-orange-500 via-orange-400 to-yellow-400',
    glow: 'bg-yellow-300/30',
    chip: 'bg-blue-50 text-blue-600 border-blue-100',
    message: 'bg-green-50 border-green-100 text-green-700',
  };
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

const getPushFeedbackClasses = (tone: PushCardFeedback['tone']) => {
  if (tone === 'green') return 'bg-green-50 border-green-100 text-green-700';
  if (tone === 'red') return 'bg-red-50 border-red-100 text-red-600';
  if (tone === 'blue') return 'bg-blue-50 border-blue-100 text-blue-700';

  return 'bg-orange-50 border-orange-100 text-orange-700';
};

const getOrderPreviewText = (order: Order) => {
  const items = order.items || [];

  if (items.length === 0) return 'Pedido sin detalle';

  const firstItems = items
    .slice(0, 2)
    .map(item => item.name || item.product?.name || 'Producto')
    .join(', ');

  return items.length > 2 ? `${firstItems} +${items.length - 2}` : firstItems;
};

const getOrderDeliveryText = (order: Order) => {
  const deliveryFeeFinal = (order as unknown as { delivery_fee_final?: number | null })
    .delivery_fee_final;
  const delivery = Number(deliveryFeeFinal ?? order.delivery_fee ?? 0);

  return delivery <= 0 ? 'Gratis' : moneyText(delivery);
};

const getOrderBonusItems = (order: Order) => {
  const raw = (order as unknown as {
    bonus_items?: Array<{
      item_name?: string | null;
      quantity?: number | string | null;
      message?: string | null;
    }> | null;
  }).bonus_items;

  return Array.isArray(raw) ? raw : [];
};

const hasOrderMembershipApplied = (order: Order) => {
  return Boolean((order as unknown as { membership_applied?: boolean }).membership_applied);
};

const buildHelpWhatsAppUrl = (order: Order) => {
  const text = [
    `Hola, necesito ayuda con mi pedido ${order.order_code || 'actual'}.`,
    `Estado: ${order.status}.`,
    `Pago: ${getPaymentStatusLabel(order.payment_status)}.`,
  ].join('\n');

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
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

const getInitialPushPermission = () => {
  try {
    return getPushPermission();
  } catch {
    return 'default' as NotificationPermission;
  }
};

const getPushCardHidden = () => {
  try {
    const value = Number(localStorage.getItem(PUSH_CARD_HIDE_KEY) || '0');

    return value > Date.now();
  } catch {
    return false;
  }
};

const hidePushCardForNow = () => {
  try {
    const hideUntil = Date.now() + 12 * 60 * 60 * 1000;
    localStorage.setItem(PUSH_CARD_HIDE_KEY, String(hideUntil));
  } catch {
    // localStorage opcional.
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
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(
    getInitialPushPermission
  );
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const [pushFeedback, setPushFeedback] = useState<PushCardFeedback | null>(null);
  const [pushCardHidden, setPushCardHidden] = useState(getPushCardHidden);

  const previousOrderSnapshotRef = useRef<OrderSnapshot | null>(null);
  const initializedNoticeWatcherRef = useRef(false);
  const alertAudioRef = useRef<AudioContext | null>(null);
  const autoCloseTimerRef = useRef<number | null>(null);

  const cleanUserPhone = cleanPhoneTail(customerPhone);

  const activeOrder = useMemo(() => {
    if (!cleanUserPhone) return null;

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

  const pushSupported = useMemo(() => isPushSupported(), []);

  const shouldShowPushCard =
    Boolean(activeOrder) &&
    Boolean(customerPhone) &&
    pushSupported &&
    pushPermission !== 'granted' &&
    !pushCardHidden;

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

  const showBrowserNotification = useCallback(
    (notice: Omit<TrackingNotice, 'id' | 'createdAt'>) => {
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
    },
    []
  );

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

  const handleEnablePush = useCallback(async () => {
    if (!customerPhone) {
      setPushFeedback({
        tone: 'orange',
        message: 'Primero necesitamos tu WhatsApp para activar avisos del pedido.',
      });
      return;
    }

    if (!pushSupported) {
      setPushFeedback({
        tone: 'red',
        message: 'Este navegador no permite notificaciones push web.',
      });
      return;
    }

    try {
      setIsEnablingPush(true);
      setPushFeedback({
        tone: 'blue',
        message: 'Activando avisos del pedido...',
      });

      const result = await registerPushNotifications(customerPhone);
      const nextPermission = getInitialPushPermission();

      setPushPermission(nextPermission);

      if (result.ok) {
        setPushFeedback({
          tone: 'green',
          message: 'Listo. Te avisaremos cuando tu pedido cambie de estado.',
        });

        try {
          localStorage.removeItem(PUSH_CARD_HIDE_KEY);
        } catch {
          // localStorage opcional.
        }

        window.setTimeout(() => {
          setPushFeedback(null);
        }, 4500);

        return;
      }

      setPushFeedback({
        tone: result.permission === 'denied' ? 'red' : 'orange',
        message:
          result.reason ||
          'No se pudieron activar los avisos. Puedes intentarlo otra vez desde el rastreo.',
      });
    } catch (error) {
      console.error('No se pudieron activar avisos del pedido:', error);

      setPushPermission(getInitialPushPermission());
      setPushFeedback({
        tone: 'red',
        message: 'No se pudieron activar los avisos en este dispositivo.',
      });
    } finally {
      setIsEnablingPush(false);
    }
  }, [customerPhone, pushSupported]);

  const handleHidePushCard = useCallback(() => {
    hidePushCardForNow();
    setPushCardHidden(true);
    setPushFeedback(null);
  }, []);

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
    setPushPermission(getInitialPushPermission());
    setPushCardHidden(getPushCardHidden());

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
        setPushPermission(getInitialPushPermission());
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
          compact ? 'w-[calc(100vw-24px)] max-w-md' : ''
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

  const renderPushCard = () => {
    if (!shouldShowPushCard) return null;

    return (
      <section className="rounded-[30px] border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-200 flex items-center justify-center flex-shrink-0">
            {pushPermission === 'denied' ? <BellOff size={22} /> : <Bell size={22} />}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-slate-900 uppercase italic leading-tight">
              Activa avisos del pedido
            </p>

            <p className="text-[11px] font-bold text-slate-500 leading-relaxed mt-1">
              Te avisaremos cuando tu pedido sea confirmado, esté en preparación, salga a ruta o sea entregado.
            </p>

            {pushFeedback && (
              <p className={`mt-3 rounded-2xl border px-3 py-2 text-[10px] font-black uppercase leading-relaxed ${getPushFeedbackClasses(pushFeedback.tone)}`}>
                {pushFeedback.message}
              </p>
            )}

            {pushPermission === 'denied' && (
              <p className="mt-3 rounded-2xl bg-red-50 border border-red-100 px-3 py-2 text-[10px] font-black uppercase leading-relaxed text-red-600">
                Las notificaciones están bloqueadas. Puedes permitirlas desde ajustes del navegador o de la app.
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {pushPermission !== 'denied' && (
                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={isEnablingPush}
                  className="flex-1 min-w-[150px] rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-orange-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {isEnablingPush ? 'Activando...' : 'Activar avisos 🔔'}
                </button>
              )}

              <button
                type="button"
                onClick={handleHidePushCard}
                className="rounded-2xl bg-slate-100 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 active:scale-95 transition-all"
              >
                Después
              </button>
            </div>
          </div>
        </div>
      </section>
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
  const heroTone = getHeroTone(currentStatus);
  const progressPercent =
    currentStatus && currentStatusIdx >= 0
      ? Math.round((currentStatusIdx / Math.max(1, statusSteps.length - 1)) * 100)
      : 0;

  const bonusItems = activeOrder ? getOrderBonusItems(activeOrder) : [];
  const plusApplied = activeOrder ? hasOrderMembershipApplied(activeOrder) : false;
  const activeHelpUrl = activeOrder ? buildHelpWhatsAppUrl(activeOrder) : '';

  return (
    <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-orange-950/20"
        onClick={onClose}
        aria-label="Cerrar rastreo"
      />

      <section className="relative z-10 w-full sm:max-w-md max-h-[94dvh] bg-white rounded-t-[42px] sm:rounded-[42px] shadow-2xl animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 border border-white/80 overflow-hidden flex flex-col">
        <header className={`relative overflow-hidden bg-gradient-to-br ${heroTone.hero} text-white px-5 pt-[calc(env(safe-area-inset-top)+18px)] sm:pt-5 pb-5 flex-shrink-0`}>
          <div className={`absolute -right-16 -top-16 w-52 h-52 ${heroTone.glow} rounded-full blur-3xl`} />
          <div className="absolute -left-16 -bottom-16 w-52 h-52 bg-white/15 rounded-full blur-3xl" />

          <button
            type="button"
            onClick={onClose}
            className="absolute top-[calc(env(safe-area-inset-top)+16px)] sm:top-4 right-4 w-10 h-10 bg-white/20 text-white rounded-full flex items-center justify-center active:scale-90 transition-transform z-10 border border-white/20"
            aria-label="Cerrar rastreo"
          >
            <X size={20} />
          </button>

          <div className="relative pr-12">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-[26px] flex items-center justify-center shadow-xl border bg-white/20 text-white border-white/25">
                <HeaderIcon size={34} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-white/75">
                  Rastreo Pollazo
                </p>

                <h2 className="text-2xl font-black uppercase italic leading-none mt-2">
                  {hasActiveOrder ? getStatusTitle(currentStatus) : 'Rastreo en vivo'}
                </h2>

                <p className="text-[12px] font-bold text-white/80 leading-relaxed mt-2 line-clamp-2">
                  {hasActiveOrder && activeOrder
                    ? `${activeOrder.order_code || 'Pedido'} · ${getOrderPreviewText(activeOrder)}`
                    : 'Sigue tu compra paso a paso cuando tengas un pedido activo.'}
                </p>
              </div>
            </div>

            {hasActiveOrder && (
              <div className="mt-5 flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 border bg-white/20 border-white/25 text-white">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-70 animate-ping" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                  </span>

                  <span className="text-[9px] font-black uppercase tracking-widest">
                    En vivo
                  </span>
                </div>

                <button
                  type="button"
                  onClick={refreshTracking}
                  className="inline-flex items-center gap-2 bg-white/20 text-white border border-white/25 rounded-full px-3 py-1.5 text-[9px] font-black uppercase active:scale-95 transition-all"
                >
                  <RefreshCw
                    size={12}
                    className={isRefreshing ? 'animate-spin' : ''}
                  />
                  Actualizar
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+18px)] space-y-4 bg-gradient-to-b from-orange-50/45 via-white to-white">
          {renderTrackingNotice(false)}

          {hasActiveOrder && currentStatus && activeOrder ? (
            <>
              {currentStatus !== 'Cancelado' && (
                <section className="bg-white border border-orange-100 rounded-[32px] p-4 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[9px] font-black text-orange-500 uppercase tracking-[0.24em]">
                        Progreso del pedido
                      </p>
                      <p className="text-xs font-bold text-gray-400 mt-1">
                        Actualización automática desde el negocio.
                      </p>
                    </div>

                    <span className={`rounded-full border px-3 py-1.5 text-[8px] font-black uppercase ${heroTone.chip}`}>
                      {currentStatus}
                    </span>
                  </div>

                  <div className="relative px-1 pt-1 pb-2">
                    <div className="absolute left-5 right-5 top-[21px] h-2 bg-orange-50 rounded-full" />
                    <div
                      className="absolute left-5 top-[21px] h-2 bg-gradient-to-r from-orange-500 to-yellow-400 rounded-full transition-all duration-700"
                      style={{ width: `calc((100% - 40px) * ${progressPercent / 100})` }}
                    />

                    <div className="relative flex justify-between">
                      {statusSteps.map((step, idx) => {
                        const isCompleted = currentStatusIdx >= idx;
                        const isCurrent = currentStatus === step.status;
                        const Icon = step.icon;

                        return (
                          <div key={step.status} className="flex flex-col items-center gap-2 z-10">
                            <div
                              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 ${
                                isCompleted
                                  ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-200'
                                  : 'bg-white border-orange-100 text-orange-200'
                              } ${isCurrent ? 'scale-110 ring-4 ring-orange-100 animate-pulse' : ''}`}
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
                  </div>
                </section>
              )}

              <section className={`rounded-[30px] border p-4 shadow-sm ${heroTone.message}`}>
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/85 flex items-center justify-center shadow-sm flex-shrink-0">
                    <HeaderIcon size={22} />
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase italic leading-tight">
                      {getStatusTitle(currentStatus)}
                    </p>
                    <p className="text-[11px] font-bold leading-relaxed mt-1.5 opacity-80">
                      {getStatusMessage(currentStatus)}
                    </p>
                  </div>
                </div>
              </section>

              {(plusApplied || bonusItems.length > 0) && (
                <section className="grid grid-cols-1 gap-3">
                  {plusApplied && (
                    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-100 rounded-[28px] p-4 shadow-sm flex items-start gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-100 flex-shrink-0">
                        <Crown size={22} />
                      </div>

                      <div>
                        <p className="text-[10px] font-black text-orange-700 uppercase tracking-widest">
                          Pollazo Plus aplicado
                        </p>
                        <p className="text-[11px] font-bold text-gray-500 leading-relaxed mt-1">
                          Tu membresía se aplicó en este pedido. Si era domicilio, el delivery queda gratis según cobertura.
                        </p>
                      </div>
                    </div>
                  )}

                  {bonusItems.length > 0 && (
                    <div className="bg-orange-50 border border-orange-100 rounded-[28px] p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <Gift size={17} className="text-orange-500" />
                        <p className="text-[10px] font-black text-orange-700 uppercase tracking-widest">
                          Regalo agregado
                        </p>
                      </div>

                      <div className="space-y-2">
                        {bonusItems.map((gift, index) => (
                          <div
                            key={`${gift.item_name || 'regalo'}-${index}`}
                            className="bg-white border border-orange-100 rounded-2xl p-3"
                          >
                            <p className="text-[11px] font-black text-gray-900 uppercase">
                              {Number(gift.quantity || 1)}x {gift.item_name || 'Sorpresa Pollazo'}
                            </p>
                            {gift.message && (
                              <p className="text-[10px] font-bold text-gray-400 mt-1 leading-relaxed">
                                {gift.message}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {renderPushCard()}

              {paymentTone && (
                <section className={`rounded-[30px] border p-4 shadow-sm ${paymentTone.wrapper}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0 ${paymentTone.icon}`}>
                      <PaymentIcon size={21} />
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
                </section>
              )}

              {currentStatus === 'Por Confirmar' && (
                <section className="bg-yellow-50 border border-yellow-100 rounded-[30px] p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center text-yellow-600 shadow-sm flex-shrink-0">
                      <ShieldCheck size={21} />
                    </div>

                    <div>
                      <p className="text-[10px] font-black text-yellow-700 uppercase tracking-widest">
                        Tiempo estimado pendiente
                      </p>

                      <p className="text-[11px] font-bold text-yellow-700/80 leading-relaxed mt-1">
                        {getPendingPaymentText(activeOrder)}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {estimate && (
                <section className="bg-white border border-orange-100 rounded-[32px] p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <TimerReset size={16} className="text-orange-500" />
                    <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest">
                      Tiempo estimado
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-orange-50 border border-orange-100 rounded-2xl p-3">
                      <div className="flex items-center gap-2 text-orange-600 mb-1">
                        <Clock3 size={15} />
                        <span className="text-[8px] font-black uppercase">
                          Llegada
                        </span>
                      </div>

                      <p className="text-xs font-black text-gray-900 leading-snug">
                        {formatTime(estimate.earliest)} - {formatTime(estimate.latest)}
                      </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3">
                      <div className="flex items-center gap-2 text-blue-600 mb-1">
                        <Navigation size={15} />
                        <span className="text-[8px] font-black uppercase">
                          Distancia
                        </span>
                      </div>

                      <p className="text-xs font-black text-gray-900 leading-snug">
                        {estimate.distanceKm !== null
                          ? `${estimate.distanceKm.toFixed(1)} km`
                          : 'Sin GPS exacto'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
                    <p className="text-[10px] font-black uppercase text-green-700 leading-relaxed">
                      {currentStatus === 'Enviado'
                        ? `Tu pedido debería llegar en aproximadamente ${estimate.remainingMinutes} min.`
                        : `Tu pedido está estimado para llegar entre ${estimate.minMinutes} y ${estimate.maxMinutes} min desde la confirmación.`}
                    </p>
                  </div>
                </section>
              )}

              <section className="bg-white border border-orange-100 rounded-[32px] p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <ReceiptText size={16} className="text-orange-500" />
                  <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest">
                    Resumen del pedido
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-orange-50 border border-orange-100 rounded-2xl p-3">
                    <p className="text-[8px] font-black text-orange-500 uppercase">
                      Productos
                    </p>
                    <p className="text-sm font-black text-gray-900 mt-1">
                      {getOrderItemCount(activeOrder)} unidad{getOrderItemCount(activeOrder) === 1 ? '' : 'es'}
                    </p>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-3">
                    <p className="text-[8px] font-black text-yellow-700 uppercase">
                      Delivery
                    </p>
                    <p className="text-sm font-black text-gray-900 mt-1">
                      {getOrderDeliveryText(activeOrder)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 bg-gray-50 border border-gray-100 rounded-2xl p-3 space-y-2">
                  <div className="flex justify-between text-[11px] font-bold text-gray-500">
                    <span>Subtotal</span>
                    <span>{moneyText(activeOrder.subtotal)}</span>
                  </div>

                  <div className="flex justify-between text-[11px] font-bold text-gray-500">
                    <span>Pago</span>
                    <span>{getPaymentMethodLabel(activeOrder.payment_method)}</span>
                  </div>

                  <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
                    <span className="text-xs font-black text-gray-900 uppercase">
                      Total
                    </span>
                    <span className="text-2xl font-black text-orange-600">
                      {moneyText(activeOrder.total)}
                    </span>
                  </div>
                </div>
              </section>

              {currentStatus === 'Entregado' && (
                <section className="bg-green-50 border border-green-100 rounded-[30px] p-5 text-center shadow-sm">
                  <CheckCircle2 size={34} className="text-green-600 mx-auto mb-3" />
                  <p className="text-xs font-black text-green-700 uppercase italic leading-tight">
                    Gracias por tu compra
                  </p>
                  <p className="text-[11px] font-bold text-green-700/75 leading-relaxed mt-2">
                    Tu historial y experiencia se actualizarán si aplica. Puedes repetir este pedido desde la pestaña Pedidos.
                  </p>
                </section>
              )}

              {currentStatus === 'Cancelado' && (
                <section className="bg-red-50 border border-red-100 rounded-[30px] p-5 text-center shadow-sm">
                  <XCircle size={34} className="text-red-500 mx-auto mb-3" />
                  <p className="text-xs font-black text-red-600 uppercase italic leading-tight">
                    Pedido cancelado
                  </p>
                  <p className="text-[11px] font-bold text-red-600/75 leading-relaxed mt-2">
                    Si crees que hubo un error, comunícate por WhatsApp con el negocio.
                  </p>
                </section>
              )}

              {activeOrder.reference && (
                <section className="bg-blue-50 border border-blue-100 rounded-[28px] p-4 flex items-start gap-3 shadow-sm">
                  <MapPin size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">
                      Referencia
                    </p>
                    <p className="text-[11px] font-bold text-blue-700 leading-relaxed mt-1">
                      {activeOrder.reference}
                    </p>
                  </div>
                </section>
              )}

              {!orderLocation &&
                currentStatus !== 'Por Confirmar' &&
                currentStatus !== 'Cancelado' && (
                  <section className="bg-orange-50 border border-orange-100 rounded-[28px] p-4 flex items-start gap-3 shadow-sm">
                    <MapPin size={18} className="text-orange-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] font-bold text-orange-700 uppercase leading-relaxed">
                      No encontramos GPS exacto en este pedido. El tiempo se calcula como zona cercana.
                    </p>
                  </section>
                )}

              <div className="grid grid-cols-2 gap-3">
                <a
                  href={activeHelpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-500 text-white rounded-[24px] py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-green-100"
                >
                  <MessageCircle size={16} />
                  Ayuda
                </a>

                <button
                  type="button"
                  onClick={refreshTracking}
                  className="bg-orange-50 text-orange-600 border border-orange-100 rounded-[24px] py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <Route size={16} />
                  Actualizar
                </button>
              </div>

              {activeOrder.created_at && (
                <p className="text-center text-[9px] text-gray-300 font-black uppercase leading-relaxed">
                  Se actualiza automáticamente cuando admin o repartidor cambian el estado.
                </p>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <section className="relative overflow-hidden bg-white border border-orange-100 rounded-[34px] p-6 text-center shadow-sm">
                <div className="absolute -right-12 -top-12 w-40 h-40 bg-orange-200/30 rounded-full blur-3xl" />
                <div className="absolute -left-12 -bottom-12 w-40 h-40 bg-yellow-200/30 rounded-full blur-3xl" />

                <div className="relative">
                  <div className="w-20 h-20 rounded-[30px] bg-gradient-to-br from-orange-500 to-yellow-400 text-white mx-auto flex items-center justify-center shadow-xl shadow-orange-100 mb-5">
                    <PackageSearch size={38} />
                  </div>

                  <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.26em]">
                    Sin pedido activo
                  </p>

                  <h3 className="text-2xl font-black text-gray-950 uppercase italic leading-none mt-2">
                    Aquí verás tu rastreo
                  </h3>

                  <p className="text-sm font-bold text-gray-500 leading-relaxed mt-4">
                    Cuando realices un pedido reciente, aquí aparecerán sus estados, pago, tiempo estimado, regalos Plus y ayuda.
                  </p>
                </div>
              </section>

              <section className="bg-blue-50 rounded-[30px] flex items-start gap-4 border border-blue-100 shadow-sm p-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-500 shadow-sm flex-shrink-0">
                  <Info size={24} />
                </div>

                <p className="text-[10px] font-black text-blue-700 uppercase leading-relaxed text-left">
                  Te avisaremos dentro de la app cuando el pedido cambie de estado. Si activas avisos, también recibirás notificaciones aunque cierres la app.
                </p>
              </section>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-5 bg-gradient-to-r from-orange-500 to-yellow-400 text-white font-black rounded-[26px] text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-orange-100"
              >
                ¡Entendido!
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
