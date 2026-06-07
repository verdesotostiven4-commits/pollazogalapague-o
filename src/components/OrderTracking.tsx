import { useEffect, useMemo } from 'react';
import { CheckCircle2, Clock3, ClipboardList, Crown, MapPin, PackageSearch, ReceiptText, ShoppingBag, TimerReset, Truck, X } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext';

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
  delivery_fee?: number | string | null;
  delivery_fee_final?: number | string | null;
  reference?: string | null;
  membership_applied?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  estimated_time?: string | number | null;
  eta?: string | number | null;
};

const steps = [
  { key: 'Por Confirmar', label: 'Por confirmar', icon: Clock3 },
  { key: 'Recibido', label: 'Confirmado', icon: ClipboardList },
  { key: 'Preparando', label: 'Empacando', icon: ShoppingBag },
  { key: 'Enviado', label: 'En camino', icon: Truck },
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
  const parsed = typeof value === 'number' ? value : Number(String(value || '0').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value: unknown) => `$${toNumber(value).toFixed(2)}`;
const countItems = (order: OrderLike) => (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 1), 0);

const isRecent = (order: OrderLike) => {
  const time = new Date(order.updated_at || order.created_at || '').getTime();
  return time > Date.now() - 24 * 60 * 60 * 1000;
};

const dateText = (order: OrderLike) => {
  const date = new Date(order.created_at || '');
  if (Number.isNaN(date.getTime())) return 'Hoy';
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
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
  if (status === 'Recibido') return 'Tu pedido fue confirmado. Ahora el negocio prepara todo para avanzar.';
  if (status === 'Preparando') return 'Estamos empacando tus productos con cuidado.';
  if (status === 'Enviado') return 'Tu pedido ya salió y va en camino.';
  if (status === 'Entregado') return 'Pedido entregado. Gracias por comprar en La Casa del Pollazo.';
  if (status === 'Cancelado') return 'Este pedido fue cancelado. Si tienes dudas, escríbenos por WhatsApp.';
  return 'El local está revisando disponibilidad, ubicación y forma de pago.';
};

const etaFor = (order: OrderLike) => {
  if (order.status === 'Por Confirmar') return 'Tiempo estimado pendiente';
  if (order.status === 'Cancelado') return 'Pedido cancelado';
  const manual = order.estimated_time || order.eta;
  if (manual) return `Tiempo estimado: ${manual}`;
  if (order.status === 'Enviado') return 'Tiempo estimado: 10-18 min';
  if (order.status === 'Preparando') return 'Tiempo estimado: 18-30 min';
  return 'Tiempo estimado: 25-35 min';
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
        .sort((a, b) => new Date(b.updated_at || b.created_at || '').getTime() - new Date(a.updated_at || a.created_at || '').getTime())[0];

      if (byCode) return byCode;
    }

    if (!phone) return null;

    return (recentOrders
      .filter(order => digits(order.customer_phone) === phone)
      .sort((a, b) => new Date(b.updated_at || b.created_at || '').getTime() - new Date(a.updated_at || a.created_at || '').getTime())[0] || null);
  }, [customerPhone, orders]);

  useEffect(() => {
    if (!isOpen) return undefined;
    void refreshData().catch(() => undefined);
    const timer = window.setInterval(() => void refreshData().catch(() => undefined), 8000);
    return () => window.clearInterval(timer);
  }, [isOpen, refreshData]);

  if (!isOpen) return null;

  const currentIndex = activeOrder ? steps.findIndex(step => step.key === activeOrder.status) : -1;
  const itemCount = activeOrder ? countItems(activeOrder) : 0;
  const delivery = activeOrder?.membership_applied
    ? 'Delivery gratis por Plus'
    : toNumber(activeOrder?.delivery_fee_final ?? activeOrder?.delivery_fee) > 0
      ? money(activeOrder?.delivery_fee_final ?? activeOrder?.delivery_fee)
      : 'Gratis';

  const handleClose = () => {
    clearRequestedOrderCode();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" onClick={handleClose} className="absolute inset-0 bg-orange-950/25" aria-label="Cerrar" />
      <section className="relative z-10 flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-[36px] bg-white shadow-2xl sm:max-w-md sm:rounded-[36px]">
        <header className="relative bg-gradient-to-br from-orange-500 via-orange-400 to-yellow-400 px-5 pb-5 pt-[calc(env(safe-area-inset-top)+14px)] text-white">
          <button type="button" onClick={handleClose} className="absolute right-4 top-[calc(env(safe-area-inset-top)+14px)] flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white" aria-label="Cerrar">
            <X size={24} />
          </button>
          <div className="pr-14">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/80">Rastreo Pollazo</p>
            <h2 className="mt-2 text-3xl font-black uppercase italic leading-none">{activeOrder?.order_code || getRequestedOrderCode() || 'Rastreo en vivo'}</h2>
            <p className="mt-3 text-sm font-black text-white/90">{activeOrder ? `${dateText(activeOrder)} · Se actualiza solo` : 'Sigue tu compra paso a paso.'}</p>
          </div>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-orange-50/50 via-white to-white px-4 py-4 pb-28">
          {!activeOrder ? (
            <section className="rounded-[32px] border border-orange-100 bg-white p-6 text-center shadow-sm">
              <PackageSearch size={38} className="mx-auto text-orange-500" />
              <p className="mt-3 text-lg font-black uppercase italic text-slate-950">Aquí verás tu rastreo</p>
              <p className="mt-2 text-sm font-bold text-slate-500">Cuando tengas un pedido activo, aparecerá aquí.</p>
            </section>
          ) : (
            <>
              <section className="rounded-[32px] border border-orange-100 bg-white p-5 shadow-sm">
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-500">Estado actual</p>
                    <p className="mt-2 text-2xl font-black uppercase italic leading-tight text-slate-950">{titleFor(activeOrder.status)}</p>
                    <p className="mt-3 text-sm font-bold leading-relaxed text-slate-500">{messageFor(activeOrder.status)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-black leading-none text-orange-600">{money(activeOrder.total)}</p>
                    <p className="mt-2 text-[11px] font-black uppercase text-slate-400">{itemCount} productos</p>
                  </div>
                </div>
              </section>

              <section className="rounded-[32px] border border-orange-100 bg-white p-5 shadow-sm">
                <p className="mb-5 text-[11px] font-black uppercase tracking-[0.18em] text-orange-500">Progreso del pedido</p>
                <div className="space-y-4">
                  {steps.map((step, index) => {
                    const StepIcon = step.icon;
                    const done = currentIndex >= index;
                    const active = activeOrder.status === step.key;
                    return (
                      <div key={step.key} className="flex items-center gap-4">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-[22px] border ${done ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-100 bg-slate-50 text-slate-300'}`}>
                          <StepIcon size={24} />
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-black uppercase ${done ? 'text-slate-950' : 'text-slate-400'}`}>{step.label}</p>
                          {active && <p className="mt-1 text-[11px] font-black uppercase text-orange-500">Ahora</p>}
                        </div>
                        {active && <CheckCircle2 size={22} className="text-green-500" />}
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[32px] border border-orange-100 bg-white p-5 shadow-sm">
                <div className="flex gap-4">
                  <TimerReset size={28} className="text-orange-500" />
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-900">Tiempo estimado</p>
                    <p className="mt-2 text-lg font-black uppercase text-slate-950">{etaFor(activeOrder)}</p>
                    <p className="mt-2 text-sm font-bold text-slate-500">{activeOrder.status === 'Por Confirmar' ? 'El negocio confirmará tu pedido y luego aparecerá el tiempo estimado.' : 'Tiempo aproximado según el pedido.'}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-[32px] border border-orange-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2"><ReceiptText size={18} className="text-orange-500" /><p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-900">Resumen</p></div>
                <div className="space-y-3 rounded-[24px] bg-slate-50 p-4 text-sm font-bold text-slate-500">
                  <div className="flex justify-between"><span>Productos</span><span className="font-black text-slate-950">{itemCount} unidades</span></div>
                  <div className="flex justify-between"><span>Delivery</span><span className="font-black text-slate-950">{delivery}</span></div>
                  <div className="flex justify-between"><span>{activeOrder.membership_applied ? 'Plus activo' : 'Sin Plus'}</span><span className="font-black text-slate-950">{activeOrder.membership_applied ? 'Delivery gratis por Plus' : `Delivery: ${delivery}`}</span></div>
                  <div className="flex justify-between border-t border-slate-200 pt-3"><span className="font-black uppercase text-slate-950">Total</span><span className="text-3xl font-black text-orange-600">{money(activeOrder.total)}</span></div>
                </div>
                {activeOrder.membership_applied && <div className="mt-3 flex items-center gap-2 rounded-[22px] bg-yellow-50 px-4 py-3 text-yellow-800"><Crown size={18} /><p className="text-[11px] font-black uppercase">Plus activo · Delivery gratis por Plus</p></div>}
              </section>

              <section className="rounded-[32px] border border-blue-100 bg-blue-50 p-5 shadow-sm">
                <div className="flex gap-4">
                  <MapPin size={26} className="text-blue-500" />
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">Entrega</p>
                    <p className="mt-2 text-sm font-black uppercase text-blue-900">Dirección / referencia</p>
                    <p className="mt-2 text-sm font-bold text-blue-700/80">{activeOrder.reference?.trim() || 'Sin referencia registrada'}</p>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>

        <footer className="absolute bottom-0 left-0 right-0 border-t border-orange-100 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
          <button type="button" onClick={handleClose} className="flex w-full items-center justify-center gap-2 rounded-[26px] bg-gradient-to-r from-orange-500 to-yellow-400 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl">
            <CheckCircle2 size={20} /> Entendido
          </button>
        </footer>
      </section>
    </div>
  );
}
