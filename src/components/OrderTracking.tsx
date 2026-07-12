import { useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  Clock3,
  ClipboardList,
  MapPin,
  PackageSearch,
  ReceiptText,
  ShoppingBag,
  TimerReset,
  Truck,
  X,
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext';
import OrderTrackingLiveMap from './OrderTrackingLiveMap';

interface Props {
  isOpen?: boolean;
  onClose?: () => void;
}

type OrderLike = {
  order_code?: string | null;
  customer_phone?: string | null;
  status?: string | null;
  items?: Array<{ quantity?: number }> | null;
  total?: number | string | null;
  subtotal?: number | string | null;
  delivery_fee?: number | string | null;
  delivery_fee_final?: number | string | null;
  reference?: string | null;
  payment_method?: string | null;
  membership_applied?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  estimated_time?: string | number | null;
  eta?: string | number | null;
};

const steps = [
  { key: 'Por Confirmar', label: 'Confirmar', icon: Clock3 },
  { key: 'Recibido', label: 'Confirmado', icon: ClipboardList },
  { key: 'Preparando', label: 'Empacando', icon: ShoppingBag },
  { key: 'Enviado', label: 'Camino', icon: Truck },
  { key: 'Entregado', label: 'Entregado', icon: CheckCircle2 },
];

const TRACKING_ORDER_CODE_KEY = 'pollazo_tracking_order_code';

const digits = (value?: string | null) =>
  (value || '')
    .split('')
    .filter(char => char >= '0' && char <= '9')
    .join('')
    .slice(-9);

const normalizeCode = (value?: string | null) =>
  String(value || '')
    .trim()
    .toUpperCase();

const initialTrackingOrderCode = (() => {
  try {
    const code = normalizeCode(new URLSearchParams(window.location.search).get('orderCode'));

    if (code) {
      sessionStorage.setItem(TRACKING_ORDER_CODE_KEY, code);
      return code;
    }
  } catch {
    // URL/sessionStorage opcional.
  }

  return '';
})();

const getRequestedOrderCode = () => {
  try {
    const fromUrl = normalizeCode(new URLSearchParams(window.location.search).get('orderCode'));

    if (fromUrl) {
      sessionStorage.setItem(TRACKING_ORDER_CODE_KEY, fromUrl);
      return fromUrl;
    }

    return normalizeCode(sessionStorage.getItem(TRACKING_ORDER_CODE_KEY)) || initialTrackingOrderCode;
  } catch {
    return initialTrackingOrderCode;
  }
};

const clearRequestedOrderCode = () => {
  try {
    sessionStorage.removeItem(TRACKING_ORDER_CODE_KEY);
  } catch {
    // sessionStorage opcional.
  }
};

const toNumber = (value: unknown) => {
  const parsed =
    typeof value === 'number'
      ? value
      : Number(String(value || '0').replace(',', '.').replace(/[^0-9.-]/g, ''));

  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value: unknown) => `$${toNumber(value).toFixed(2)}`;
const countItems = (order: OrderLike) =>
  (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 1), 0);

const isRecent = (order: OrderLike) => {
  const time = new Date(order.updated_at || order.created_at || '').getTime();

  return time > Date.now() - 24 * 60 * 60 * 1000;
};

const dateText = (order: OrderLike) => {
  const date = new Date(order.created_at || '');

  if (Number.isNaN(date.getTime())) return 'Hoy';

  return date.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const titleFor = (status?: string | null) => {
  if (status === 'Recibido') return 'Pedido confirmado';
  if (status === 'Preparando') return 'Empacando tu pedido';
  if (status === 'Enviado') return 'Tu pedido va en camino';
  if (status === 'Entregado') return 'Pedido entregado';
  if (status === 'Cancelado') return 'Pedido cancelado';

  return 'Pedido por confirmar';
};

const messageFor = (status?: string | null) => {
  if (status === 'Recibido') return 'Tu pedido fue confirmado. Ahora entra a preparación.';
  if (status === 'Preparando') return 'Estamos empacando tus productos con cuidado.';
  if (status === 'Enviado') return 'Tu pedido ya salió y va en camino.';
  if (status === 'Entregado') return 'Pedido entregado. Gracias por comprar en La Casa del Pollazo.';
  if (status === 'Cancelado') return 'Este pedido fue cancelado. Si tienes dudas, escríbenos por WhatsApp.';

  return 'El local está revisando disponibilidad, ubicación y forma de pago.';
};

const etaFor = (order: OrderLike) => {
  if (order.status === 'Por Confirmar') return 'Pendiente';
  if (order.status === 'Cancelado') return 'Cancelado';

  const manual = order.estimated_time || order.eta;

  if (manual) return `${manual}`;
  if (order.status === 'Enviado') return '10-18 min';
  if (order.status === 'Preparando') return '18-30 min';

  return '25-35 min';
};

const paymentLabel = (method?: string | null) => {
  if (method === 'efectivo') return 'Efectivo';
  if (method === 'deuna') return 'Deuna';
  if (method === 'transferencia') return 'Transferencia';
  if (method === 'tarjeta') return 'Tarjeta';

  return 'No definido';
};

export default function OrderTracking({ isOpen = false, onClose = () => {} }: Props) {
  const { orders, refreshData } = useAdmin();
  const { customerPhone } = useUser();

  const activeOrder = useMemo(() => {
    const phone = digits(customerPhone);
    const requestedOrderCode = getRequestedOrderCode();
    const recentOrders = (((orders as OrderLike[]) || []).filter(isRecent));

    if (requestedOrderCode) {
      const byCode = recentOrders
        .filter(order => normalizeCode(order.order_code) === requestedOrderCode)
        .filter(order => !phone || digits(order.customer_phone) === phone)
        .sort(
          (a, b) =>
            new Date(b.updated_at || b.created_at || '').getTime() -
            new Date(a.updated_at || a.created_at || '').getTime()
        )[0];

      if (byCode) return byCode;
    }

    if (!phone) return null;

    return (
      recentOrders
        .filter(order => digits(order.customer_phone) === phone)
        .sort(
          (a, b) =>
            new Date(b.updated_at || b.created_at || '').getTime() -
            new Date(a.updated_at || a.created_at || '').getTime()
        )[0] || null
    );
  }, [customerPhone, orders]);

  useEffect(() => {
    if (!isOpen) return undefined;

    void refreshData().catch(() => undefined);

    const timer = window.setInterval(() => void refreshData().catch(() => undefined), 8000);

    return () => window.clearInterval(timer);
  }, [isOpen, refreshData]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentIndex = activeOrder ? steps.findIndex(step => step.key === activeOrder.status) : -1;
  const safeCurrentIndex = Math.max(0, currentIndex);
  const itemCount = activeOrder ? countItems(activeOrder) : 0;
  const deliveryAmount = toNumber(activeOrder?.delivery_fee_final ?? activeOrder?.delivery_fee);
  const delivery = activeOrder?.membership_applied
    ? 'Gratis Plus'
    : deliveryAmount > 0
      ? money(deliveryAmount)
      : 'Gratis';
  const deliveryText = activeOrder?.membership_applied
    ? `Plus · ahorro ${money(activeOrder.delivery_fee || deliveryAmount || 0)}`
    : deliveryAmount > 0
      ? `Delivery ${money(deliveryAmount)}`
      : 'Delivery gratis';

  const handleClose = () => {
    clearRequestedOrderCode();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[14000] flex items-end justify-center overflow-hidden bg-orange-950/10 sm:items-center sm:p-4">
      <button
        type="button"
        onClick={handleClose}
        className="absolute -inset-8 bg-gradient-to-b from-orange-950/35 via-orange-950/20 to-orange-950/35 backdrop-blur-[5px]"
        aria-label="Cerrar rastreo"
      />

      <section className="relative z-10 flex w-full flex-col overflow-hidden rounded-t-[26px] bg-white shadow-2xl ring-1 ring-white/30 sm:max-w-md sm:rounded-[28px]">
        <header className="relative flex-shrink-0 bg-gradient-to-br from-orange-500 via-orange-400 to-yellow-400 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+9px)] text-white">
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-3 top-[calc(env(safe-area-inset-top)+8px)] flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white active:scale-90 transition-transform"
            aria-label="Cerrar"
          >
            <X size={17} />
          </button>

          <div className="pr-10">
            <p className="text-[8px] font-black uppercase tracking-[0.22em] text-white/85">Rastreo Pollazo</p>
            <h2 className="mt-1 text-[26px] font-black uppercase italic leading-none">
              {activeOrder?.order_code || getRequestedOrderCode() || 'Rastreo en vivo'}
            </h2>
            <p className="mt-1.5 text-[10px] font-black text-white/90">
              {activeOrder ? `${dateText(activeOrder)} · Se actualiza solo` : 'Sigue tu compra paso a paso.'}
            </p>
          </div>
        </header>

        <div className="flex-1 space-y-2.5 overflow-y-auto overscroll-contain bg-gradient-to-b from-orange-50/45 via-white to-white px-3 py-3">
          {!activeOrder ? (
            <section className="rounded-[20px] border border-orange-100 bg-white p-4 text-center shadow-sm">
              <PackageSearch size={28} className="mx-auto text-orange-500" />
              <p className="mt-2 text-sm font-black uppercase italic text-slate-950">Aquí verás tu rastreo</p>
              <p className="mt-1 text-[11px] font-bold text-slate-500">Cuando tengas un pedido activo, aparecerá aquí.</p>
            </section>
          ) : (
            <>
              <section className="rounded-[21px] border border-orange-100 bg-white p-3.5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[8px] font-black uppercase tracking-[0.15em] text-orange-500">Estado actual</p>
                    <p className="mt-1 text-[18px] font-black uppercase italic leading-tight text-slate-950">
                      {titleFor(activeOrder.status)}
                    </p>
                    <p className="mt-1.5 text-[11px] font-bold leading-snug text-slate-500">
                      {messageFor(activeOrder.status)}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-[29px] font-black leading-none text-orange-600">{money(activeOrder.total)}</p>
                    <p className="mt-1 text-[8px] font-black uppercase text-slate-400">{itemCount} productos</p>
                  </div>
                </div>
              </section>

              <section className="rounded-[21px] border border-orange-100 bg-white p-3.5 shadow-sm">
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <p className="text-[8px] font-black uppercase tracking-[0.15em] text-orange-500">Progreso</p>
                  <p className="rounded-full bg-orange-50 px-2.5 py-0.5 text-[8px] font-black uppercase text-orange-600">
                    Paso {safeCurrentIndex + 1} de 5
                  </p>
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {steps.map((step, index) => {
                    const StepIcon = step.icon;
                    const done = safeCurrentIndex >= index;
                    const active = activeOrder.status === step.key;

                    return (
                      <div key={step.key} className="min-w-0 text-center">
                        <div
                          className={`mx-auto flex h-9 w-9 items-center justify-center rounded-[14px] border ${
                            done
                              ? 'border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-100'
                              : 'border-slate-100 bg-slate-50 text-slate-300'
                          }`}
                        >
                          <StepIcon size={14} />
                        </div>
                        <p
                          className={`mt-1.5 truncate text-[7px] font-black uppercase leading-none ${
                            done ? 'text-slate-950' : 'text-slate-400'
                          }`}
                        >
                          {step.label}
                        </p>
                        <p className="mt-0.5 h-2 text-[7px] font-black uppercase leading-none text-orange-500">
                          {active ? 'Ahora' : ''}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <OrderTrackingLiveMap
                  orderCode={normalizeCode(activeOrder.order_code)}
                  orderStatus={activeOrder.status}
                />
              </section>

              <section className="grid grid-cols-2 gap-2.5">
                <div className="rounded-[19px] border border-orange-100 bg-white p-3 shadow-sm">
                  <div className="mb-1 flex items-center gap-1.5">
                    <TimerReset size={14} className="text-orange-500" />
                    <p className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-500">Tiempo</p>
                  </div>
                  <p className="text-[14px] font-black uppercase leading-tight text-slate-950">{etaFor(activeOrder)}</p>
                  <p className="mt-0.5 text-[9px] font-bold leading-tight text-slate-400">
                    {activeOrder.status === 'Por Confirmar' ? 'Al confirmar.' : 'Estimado.'}
                  </p>
                </div>

                <div className="rounded-[19px] border border-orange-100 bg-white p-3 shadow-sm">
                  <div className="mb-1 flex items-center gap-1.5">
                    <ReceiptText size={14} className="text-orange-500" />
                    <p className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-500">Pago</p>
                  </div>
                  <p className="text-[14px] font-black uppercase leading-tight text-slate-950">{paymentLabel(activeOrder.payment_method)}</p>
                  <p className="mt-0.5 truncate text-[9px] font-bold leading-tight text-slate-400">{deliveryText}</p>
                </div>
              </section>

              <section className="rounded-[19px] border border-blue-100 bg-blue-50 px-3 py-2.5 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <MapPin size={16} className="flex-shrink-0 text-blue-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[7px] font-black uppercase tracking-[0.14em] text-blue-700">Delivery</p>
                    <p className="truncate text-[11px] font-black text-blue-900">
                      {activeOrder.reference?.trim() || 'Sin referencia registrada'}
                    </p>
                  </div>
                  <span className="flex-shrink-0 rounded-full bg-white/80 px-2.5 py-0.5 text-[8px] font-black uppercase text-blue-600">
                    {delivery}
                  </span>
                </div>
              </section>
            </>
          )}
        </div>

        <footer className="flex-shrink-0 border-t border-orange-100 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2.5 backdrop-blur-md">
          <button
            type="button"
            onClick={handleClose}
            className="flex w-full items-center justify-center gap-2 rounded-[19px] bg-gradient-to-r from-orange-500 to-yellow-400 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-orange-100 active:scale-95 transition-transform"
          >
            <CheckCircle2 size={15} /> Entendido
          </button>
        </footer>
      </section>
    </div>
  );
}
