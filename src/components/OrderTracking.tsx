import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Crown,
  MapPin,
  PackageSearch,
  ReceiptText,
  RefreshCw,
  TimerReset,
  Truck,
  X,
  XCircle,
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useLanguage } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import type { LanguageCode } from '../types';

interface Props {
  isOpen?: boolean;
  onClose?: () => void;
}

type PollazoOrderStatus =
  | 'Por Confirmar'
  | 'Recibido'
  | 'Preparando'
  | 'Enviado'
  | 'Entregado'
  | 'Cancelado';

type OrderLike = {
  id?: string;
  order_code?: string | null;
  customer_phone?: string | null;
  items?: Array<any> | null;
  subtotal?: number | string | null;
  delivery_fee?: number | string | null;
  delivery_fee_final?: number | string | null;
  total?: number | string | null;
  status?: PollazoOrderStatus;
  payment_status?: string | null;
  payment_method?: string | null;
  reference?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  membership_applied?: boolean | null;
  membership_plan?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  confirmed_at?: string | null;
  estimated_time?: string | number | null;
  estimatedTime?: string | number | null;
  estimated_minutes?: string | number | null;
  eta?: string | number | null;
  eta_text?: string | null;
  eta_label?: string | null;
  eta_minutes?: string | number | null;
  eta_min?: string | number | null;
  eta_max?: string | number | null;
  delivery_eta?: string | number | null;
};

type TextKey = keyof typeof TEXTS;

const STORE_LOCATION = {
  lat: -0.736323,
  lng: -90.321829,
};

const ACTIVE_OR_VISIBLE_STATUSES: PollazoOrderStatus[] = [
  'Por Confirmar',
  'Recibido',
  'Preparando',
  'Enviado',
  'Entregado',
  'Cancelado',
];

const STEP_STATUS: Array<{
  status: PollazoOrderStatus;
  labelKey: TextKey;
}> = [
  { status: 'Por Confirmar', labelKey: 'stepConfirm' },
  { status: 'Recibido', labelKey: 'stepConfirmed' },
  { status: 'Preparando', labelKey: 'stepPacking' },
  { status: 'Enviado', labelKey: 'stepRoute' },
  { status: 'Entregado', labelKey: 'stepDelivered' },
];

const TEXTS = {
  close: { es: 'Cerrar', en: 'Close' },
  understood: { es: 'Entendido', en: 'Got it' },
  trackingTitle: { es: 'Rastreo de pedido', en: 'Order tracking' },
  trackingSubtitle: { es: 'Una sola pantalla, clara y actualizada.', en: 'One clear, updated tracking screen.' },
  order: { es: 'Pedido', en: 'Order' },
  today: { es: 'Hoy', en: 'Today' },
  total: { es: 'Total', en: 'Total' },
  products: { es: 'Productos', en: 'Products' },
  units: { es: 'unidades', en: 'units' },
  delivery: { es: 'Delivery', en: 'Delivery' },
  free: { es: 'Gratis', en: 'Free' },
  currentState: { es: 'Estado actual', en: 'Current status' },
  progress: { es: 'Progreso del pedido', en: 'Order progress' },
  estimatedTime: { es: 'Tiempo estimado', en: 'Estimated time' },
  estimatedTimeFull: { es: 'Tiempo estimado: {value}', en: 'Estimated time: {value}' },
  pendingTime: { es: 'Tiempo estimado pendiente', en: 'Estimated time pending' },
  pendingTimeText: {
    es: 'El negocio confirmará tu pedido y luego aparecerá el tiempo estimado.',
    en: 'The business will confirm your order and then the estimated time will appear.',
  },
  summary: { es: 'Resumen', en: 'Summary' },
  deliveryInfo: { es: 'Entrega', en: 'Delivery' },
  deliveryReference: { es: 'Dirección / referencia', en: 'Address / reference' },
  noReference: { es: 'Sin referencia registrada', en: 'No reference saved' },
  gpsReady: { es: 'GPS registrado', en: 'GPS saved' },
  noGps: { es: 'Sin GPS exacto', en: 'No exact GPS' },
  plusActive: { es: 'Plus activo', en: 'Plus active' },
  plusFreeDelivery: { es: 'Delivery gratis por Plus', en: 'Free delivery with Plus' },
  noPlus: { es: 'Sin Plus', en: 'No Plus' },
  noOrderTitle: { es: 'Aquí verás tu rastreo', en: 'Your tracking will appear here' },
  noOrderText: {
    es: 'Cuando tengas un pedido activo, aparecerá aquí con su estado, tiempo estimado y resumen.',
    en: 'When you have an active order, it will appear here with status, estimated time and summary.',
  },
  refreshing: { es: 'Actualizando', en: 'Refreshing' },
  stepConfirm: { es: 'Por confirmar', en: 'To confirm' },
  stepConfirmed: { es: 'Confirmado', en: 'Confirmed' },
  stepPacking: { es: 'Empacando', en: 'Packing' },
  stepRoute: { es: 'En camino', en: 'On the way' },
  stepDelivered: { es: 'Entregado', en: 'Delivered' },
  statusConfirm: { es: 'Por confirmar', en: 'To confirm' },
  statusConfirmed: { es: 'Confirmado', en: 'Confirmed' },
  statusPacking: { es: 'Empacando', en: 'Packing' },
  statusRoute: { es: 'En camino', en: 'On the way' },
  statusDelivered: { es: 'Entregado', en: 'Delivered' },
  statusCancelled: { es: 'Cancelado', en: 'Cancelled' },
  msgConfirm: {
    es: 'Recibimos tu pedido. El negocio está revisando disponibilidad, ubicación y pago.',
    en: 'We received your order. The business is checking availability, location and payment.',
  },
  msgConfirmed: {
    es: 'Tu pedido fue confirmado. Ahora el negocio prepara todo para avanzar.',
    en: 'Your order was confirmed. The business is preparing everything now.',
  },
  msgPacking: {
    es: 'Estamos empacando tus productos con cuidado.',
    en: 'We are carefully packing your items.',
  },
  msgRoute: {
    es: 'Tu pedido ya salió y va en camino.',
    en: 'Your order is already on the way.',
  },
  msgDelivered: {
    es: 'Pedido entregado. Gracias por comprar en La Casa del Pollazo.',
    en: 'Order delivered. Thank you for shopping at La Casa del Pollazo.',
  },
  msgCancelled: {
    es: 'Este pedido fue cancelado. Si fue un error, comunícate con el negocio.',
    en: 'This order was cancelled. If this was a mistake, contact the business.',
  },
};

const t = (
  language: LanguageCode,
  key: TextKey,
  params?: Record<string, string | number>
) => {
  const raw = TEXTS[key][language as 'es' | 'en'] || TEXTS[key].en || TEXTS[key].es;

  if (!params) return raw;

  return Object.entries(params).reduce(
    (text, [param, value]) => text.replace(`{${param}}`, String(value)),
    raw
  );
};

const cleanPhoneTail = (phone?: string | null) => {
  return (phone || '').replace(/\D/g, '').slice(-9);
};

const parseMoney = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const parsed = Number.parseFloat(
    String(value || '0')
      .replace(',', '.')
      .replace(/[^0-9.-]/g, '')
  );

  return Number.isFinite(parsed) ? parsed : 0;
};

const moneyText = (value: unknown) => `$${parseMoney(value).toFixed(2)}`;

const parseCoordinate = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
};

const toRadians = (value: number) => (value * Math.PI) / 180;

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

const getOrderLocation = (order?: OrderLike | null) => {
  if (!order) return null;

  const lat = parseCoordinate(order.lat);
  const lng = parseCoordinate(order.lng);

  if (lat === null || lng === null) return null;

  return { lat, lng };
};

const isRecentOrder = (order: OrderLike) => {
  const date = order.updated_at || order.created_at;
  const time = date ? new Date(date).getTime() : 0;

  if (!time || Number.isNaN(time)) return false;

  return time > Date.now() - 24 * 60 * 60 * 1000;
};

const getOrderDate = (order: OrderLike, language: LanguageCode) => {
  const date = order.created_at ? new Date(order.created_at) : null;

  if (!date || Number.isNaN(date.getTime())) return t(language, 'today');

  return date.toLocaleDateString(language === 'en' ? 'en-US' : 'es-EC', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getOrderUnitCount = (order: OrderLike) => {
  return (order.items || []).reduce((sum, item) => sum + Number(item?.quantity || 1), 0);
};

const hasFreshItems = (order: OrderLike) => {
  return (order.items || []).some(item => {
    const name = String(item?.name || item?.product?.name || '').toLowerCase();
    const category = String(item?.category || item?.product?.category || '').toLowerCase();

    return (
      item?.custom_price ||
      item?.product?.custom_price ||
      category.includes('pollo') ||
      name.includes('pollo') ||
      name.includes('alas') ||
      name.includes('pechuga') ||
      name.includes('cuartos')
    );
  });
};

const getManualEtaText = (order: OrderLike) => {
  const textKeys: Array<keyof OrderLike> = [
    'estimated_time',
    'estimatedTime',
    'eta',
    'eta_text',
    'eta_label',
    'delivery_eta',
  ];

  for (const key of textKeys) {
    const value = order[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return `${Math.round(value)} min`;
    }
  }

  const etaMinutes = parseMoney(order.estimated_minutes ?? order.eta_minutes);

  if (etaMinutes > 0) {
    return `${Math.round(etaMinutes)} min`;
  }

  const etaMin = parseMoney(order.eta_min);
  const etaMax = parseMoney(order.eta_max);

  if (etaMin > 0 && etaMax > 0) {
    return `${Math.round(etaMin)}-${Math.round(etaMax)} min`;
  }

  return null;
};

const getCalculatedEta = (order: OrderLike) => {
  const itemCount = getOrderUnitCount(order);
  const location = getOrderLocation(order);
  const distanceKm = location ? distanceKmBetween(STORE_LOCATION, location) : null;

  let prepMin = 5;
  let prepMax = 10;

  if (itemCount >= 4 && itemCount <= 8) {
    prepMin += 3;
    prepMax += 5;
  }

  if (itemCount > 8) {
    prepMin += 6;
    prepMax += 10;
  }

  if (hasFreshItems(order)) {
    prepMin += 4;
    prepMax += 8;
  }

  const deliveryMin = distanceKm === null ? 8 : Math.max(5, Math.ceil(distanceKm * 4) + 4);
  const deliveryMax = distanceKm === null ? 18 : Math.max(10, Math.ceil(distanceKm * 6) + 8);

  if (order.status === 'Enviado') {
    return `${deliveryMin}-${deliveryMax} min`;
  }

  if (order.status === 'Preparando') {
    return `${Math.max(6, deliveryMin + 3)}-${Math.max(12, deliveryMax + 8)} min`;
  }

  return `${prepMin + deliveryMin}-${prepMax + deliveryMax} min`;
};

const getEta = (order: OrderLike, language: LanguageCode) => {
  if (order.status === 'Por Confirmar') {
    return {
      value: t(language, 'pendingTime'),
      detail: t(language, 'pendingTimeText'),
      pending: true,
    };
  }

  if (order.status === 'Entregado') {
    return {
      value: t(language, 'statusDelivered'),
      detail: t(language, 'msgDelivered'),
      pending: false,
    };
  }

  if (order.status === 'Cancelado') {
    return {
      value: t(language, 'statusCancelled'),
      detail: t(language, 'msgCancelled'),
      pending: false,
    };
  }

  const manual = getManualEtaText(order);
  const value = manual || getCalculatedEta(order);

  return {
    value: t(language, 'estimatedTimeFull', { value }),
    detail: manual
      ? t(language, 'trackingSubtitle')
      : t(language, 'trackingSubtitle'),
    pending: false,
  };
};

const getStatusLabel = (status: PollazoOrderStatus | undefined, language: LanguageCode) => {
  if (status === 'Por Confirmar') return t(language, 'statusConfirm');
  if (status === 'Recibido') return t(language, 'statusConfirmed');
  if (status === 'Preparando') return t(language, 'statusPacking');
  if (status === 'Enviado') return t(language, 'statusRoute');
  if (status === 'Entregado') return t(language, 'statusDelivered');
  if (status === 'Cancelado') return t(language, 'statusCancelled');

  return t(language, 'trackingTitle');
};

const getStatusMessage = (status: PollazoOrderStatus | undefined, language: LanguageCode) => {
  if (status === 'Por Confirmar') return t(language, 'msgConfirm');
  if (status === 'Recibido') return t(language, 'msgConfirmed');
  if (status === 'Preparando') return t(language, 'msgPacking');
  if (status === 'Enviado') return t(language, 'msgRoute');
  if (status === 'Entregado') return t(language, 'msgDelivered');
  if (status === 'Cancelado') return t(language, 'msgCancelled');

  return t(language, 'trackingSubtitle');
};

const getStatusIcon = (status: PollazoOrderStatus | undefined) => {
  if (status === 'Entregado') return CheckCircle2;
  if (status === 'Cancelado') return XCircle;
  if (status === 'Enviado') return Truck;
  if (status === 'Por Confirmar') return Clock3;

  return PackageSearch;
};

const getDeliveryFee = (order: OrderLike) => {
  const finalFee = order.delivery_fee_final ?? order.delivery_fee ?? 0;
  return parseMoney(finalFee);
};

const getDeliveryText = (order: OrderLike, language: LanguageCode) => {
  if (order.membership_applied) return t(language, 'plusFreeDelivery');

  const deliveryFee = getDeliveryFee(order);
  return deliveryFee <= 0 ? t(language, 'free') : moneyText(deliveryFee);
};

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

export default function OrderTracking({ isOpen = false, onClose = () => {} }: Props) {
  const { orders, refreshData } = useAdmin();
  const { customerPhone } = useUser();
  const { language } = useLanguage();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const activeOrder = useMemo(() => {
    const cleanUserPhone = cleanPhoneTail(customerPhone);

    if (!cleanUserPhone) return null;

    const matches = (orders as OrderLike[])
      ?.filter(order => {
        const sameCustomer = cleanPhoneTail(order.customer_phone) === cleanUserPhone;
        const validStatus = order.status ? ACTIVE_OR_VISIBLE_STATUSES.includes(order.status) : false;
        return sameCustomer && validStatus && isRecentOrder(order);
      })
      .sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at || '').getTime();
        const dateB = new Date(b.updated_at || b.created_at || '').getTime();
        return dateB - dateA;
      });

    return matches?.[0] || null;
  }, [customerPhone, orders]);

  const refreshTracking = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await refreshData();
    } catch (error) {
      console.error('No se pudo actualizar el rastreo:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshData]);

  useEffect(() => {
    if (!isOpen) return undefined;

    void refreshTracking();

    const interval = window.setInterval(() => {
      void refreshTracking();
    }, 8000);

    return () => window.clearInterval(interval);
  }, [isOpen, refreshTracking]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleFocus = () => {
      void refreshTracking();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [isOpen, refreshTracking]);

  if (!isOpen) return null;

  const status = activeOrder?.status;
  const StatusIcon = getStatusIcon(status);
  const currentStepIndex = status ? STEP_STATUS.findIndex(step => step.status === status) : -1;
  const progressPercent = currentStepIndex >= 0 ? Math.round((currentStepIndex / (STEP_STATUS.length - 1)) * 100) : 0;
  const eta = activeOrder ? getEta(activeOrder, language) : null;
  const orderLocation = getOrderLocation(activeOrder);
  const plusActive = Boolean(activeOrder?.membership_applied);
  const unitCount = activeOrder ? getOrderUnitCount(activeOrder) : 0;

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-slate-950/20 px-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label={t(language, 'close')}
      />

      <section className="relative z-10 flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-[34px] border border-orange-100 bg-white shadow-2xl sm:max-w-md sm:rounded-[34px]">
        <header className="flex-shrink-0 border-b border-orange-100 bg-white px-5 pb-4 pt-[calc(env(safe-area-inset-top)+16px)] sm:pt-5">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-[calc(env(safe-area-inset-top)+14px)] flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform active:scale-90 sm:top-4"
            aria-label={t(language, 'close')}
          >
            <X size={19} />
          </button>

          <div className="pr-12">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-500">
              {t(language, 'trackingTitle')}
            </p>
            <h2 className="mt-1 text-2xl font-black uppercase italic leading-none text-slate-950">
              {activeOrder ? getStatusLabel(status, language) : t(language, 'noOrderTitle')}
            </h2>
            <p className="mt-2 text-xs font-bold leading-relaxed text-slate-500">
              {activeOrder
                ? `${activeOrder.order_code || t(language, 'order')} · ${getOrderDate(activeOrder, language)}`
                : t(language, 'noOrderText')}
            </p>
          </div>

          {activeOrder && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-orange-50 px-3 py-2 text-center">
                <p className="text-[8px] font-black uppercase text-orange-500">{t(language, 'total')}</p>
                <p className="mt-1 text-sm font-black text-slate-950">{moneyText(activeOrder.total)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-3 py-2 text-center">
                <p className="text-[8px] font-black uppercase text-slate-400">{t(language, 'products')}</p>
                <p className="mt-1 text-sm font-black text-slate-950">{unitCount}</p>
              </div>
              <div className="rounded-2xl bg-yellow-50 px-3 py-2 text-center">
                <p className="text-[8px] font-black uppercase text-yellow-700">{t(language, 'delivery')}</p>
                <p className="mt-1 truncate text-xs font-black text-slate-950">{getDeliveryText(activeOrder, language)}</p>
              </div>
            </div>
          )}
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-orange-50/60 via-white to-white px-4 py-4">
          {!activeOrder ? (
            <section className="rounded-[30px] border border-orange-100 bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[28px] bg-orange-50 text-orange-500">
                <PackageSearch size={36} />
              </div>
              <p className="text-lg font-black uppercase italic leading-tight text-slate-950">
                {t(language, 'noOrderTitle')}
              </p>
              <p className="mt-3 text-sm font-bold leading-relaxed text-slate-500">
                {t(language, 'noOrderText')}
              </p>
            </section>
          ) : (
            <>
              <section className="rounded-[30px] border border-orange-100 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-100">
                    <StatusIcon size={24} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">
                        {t(language, 'currentState')}
                      </p>
                      {isRefreshing && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-[8px] font-black uppercase text-slate-400">
                          <RefreshCw size={10} className="animate-spin" />
                          {t(language, 'refreshing')}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-base font-black uppercase italic leading-tight text-slate-950">
                      {getStatusLabel(status, language)}
                    </p>
                    <p className="mt-1.5 text-[12px] font-bold leading-relaxed text-slate-500">
                      {getStatusMessage(status, language)}
                    </p>
                  </div>
                </div>
              </section>

              {status !== 'Cancelado' && (
                <section className="rounded-[30px] border border-orange-100 bg-white p-4 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">
                      {t(language, 'progress')}
                    </p>
                    <span className="rounded-full bg-orange-50 px-3 py-1 text-[8px] font-black uppercase text-orange-600">
                      {progressPercent}%
                    </span>
                  </div>

                  <div className="relative px-1 pb-1 pt-2">
                    <div className="absolute left-5 right-5 top-[22px] h-1.5 rounded-full bg-orange-100" />
                    <div
                      className="absolute left-5 top-[22px] h-1.5 rounded-full bg-orange-500 transition-all duration-700"
                      style={{ width: `calc((100% - 40px) * ${progressPercent / 100})` }}
                    />

                    <div className="relative flex justify-between">
                      {STEP_STATUS.map((step, index) => {
                        const completed = currentStepIndex >= index;
                        const current = status === step.status;

                        return (
                          <div key={step.status} className="z-10 flex flex-col items-center gap-2">
                            <div
                              className={cx(
                                'flex h-10 w-10 items-center justify-center rounded-2xl border-2 text-xs font-black transition-all',
                                completed
                                  ? 'border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-100'
                                  : 'border-orange-100 bg-white text-orange-200',
                                current && 'scale-110 ring-4 ring-orange-100'
                              )}
                            >
                              {index + 1}
                            </div>
                            <span
                              className={cx(
                                'max-w-[58px] text-center text-[7px] font-black uppercase leading-tight',
                                completed ? 'text-slate-900' : 'text-slate-300'
                              )}
                            >
                              {t(language, step.labelKey)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}

              {eta && (
                <section className="rounded-[30px] border border-orange-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div
                      className={cx(
                        'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl shadow-sm',
                        eta.pending ? 'bg-yellow-50 text-yellow-600' : 'bg-orange-50 text-orange-500'
                      )}
                    >
                      <TimerReset size={22} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">
                        {t(language, 'estimatedTime')}
                      </p>
                      <p className="mt-1 text-sm font-black uppercase leading-tight text-slate-950">
                        {eta.value}
                      </p>
                      <p className="mt-1.5 text-[11px] font-bold leading-relaxed text-slate-500">
                        {eta.detail}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              <section className="rounded-[30px] border border-orange-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <ReceiptText size={17} className="text-orange-500" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">
                    {t(language, 'summary')}
                  </p>
                </div>

                <div className="space-y-2 rounded-2xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3 text-[12px] font-bold text-slate-500">
                    <span>{t(language, 'products')}</span>
                    <span className="font-black text-slate-900">
                      {unitCount} {t(language, 'units')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-[12px] font-bold text-slate-500">
                    <span>{t(language, 'delivery')}</span>
                    <span className="font-black text-slate-900">{getDeliveryText(activeOrder, language)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-2 text-[12px] font-bold text-slate-500">
                    <span>{plusActive ? t(language, 'plusActive') : t(language, 'noPlus')}</span>
                    <span className="font-black text-slate-900">
                      {plusActive ? t(language, 'plusFreeDelivery') : `${t(language, 'delivery')}: ${getDeliveryText(activeOrder, language)}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                    <span className="text-xs font-black uppercase text-slate-900">{t(language, 'total')}</span>
                    <span className="text-2xl font-black text-orange-600">{moneyText(activeOrder.total)}</span>
                  </div>
                </div>

                {plusActive && (
                  <div className="mt-3 flex items-center gap-2 rounded-2xl border border-yellow-100 bg-yellow-50 px-3 py-2 text-yellow-800">
                    <Crown size={16} />
                    <p className="text-[10px] font-black uppercase leading-relaxed">
                      {t(language, 'plusActive')} · {t(language, 'plusFreeDelivery')}
                    </p>
                  </div>
                )}
              </section>

              <section className="rounded-[30px] border border-blue-100 bg-blue-50 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-blue-500 shadow-sm">
                    <MapPin size={22} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">
                      {t(language, 'deliveryInfo')}
                    </p>
                    <p className="mt-1 text-[11px] font-black uppercase text-blue-900">
                      {t(language, 'deliveryReference')}
                    </p>
                    <p className="mt-1 text-[12px] font-bold leading-relaxed text-blue-700/80">
                      {activeOrder.reference?.trim() || t(language, 'noReference')}
                    </p>
                    <p className="mt-2 text-[9px] font-black uppercase text-blue-600/70">
                      {orderLocation ? t(language, 'gpsReady') : t(language, 'noGps')}
                    </p>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>

        <footer className="flex-shrink-0 border-t border-orange-100 bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
          <button
            type="button"
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-[24px] bg-gradient-to-r from-orange-500 to-yellow-400 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-orange-100 transition-transform active:scale-95"
          >
            <CheckCircle2 size={18} />
            {t(language, 'understood')}
          </button>
        </footer>
      </section>
    </div>
  );
}
