import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  ClipboardList,
  PackageSearch,
  RefreshCw,
  ShoppingBag,
  Truck,
  X,
  XCircle,
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type OrderStatus = 'Por Confirmar' | 'Recibido' | 'Preparando' | 'Enviado' | 'Entregado' | 'Cancelado';

type TrackingOrder = {
  id?: string | number | null;
  order_code?: string | null;
  customer_phone?: string | null;
  status?: OrderStatus | string | null;
  payment_status?: string | null;
  payment_method?: string | null;
  subtotal?: number | string | null;
  delivery_fee?: number | string | null;
  total?: number | string | null;
  items?: any[] | null;
  reference?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ServiceWorkerTrackingMessage = {
  type?: string;
  orderCode?: string | null;
  status?: string | null;
  paymentStatus?: string | null;
};

const PHONE_KEY = 'pollazo_customer_phone';
const ACTIVE_STATUSES: OrderStatus[] = ['Por Confirmar', 'Recibido', 'Preparando', 'Enviado'];
const FINAL_STATUSES: OrderStatus[] = ['Entregado', 'Cancelado'];
const TRACKING_INTENT_KEY = 'pollazo_tracking_intent';
const TRACKING_SEEN_KEY = 'pollazo_tracking_seen_orders';

function cleanPhoneTail(value?: string | null) {
  return String(value || '').replace(/\D/g, '').slice(-9);
}

function money(value: unknown) {
  const parsed = Number.parseFloat(String(value ?? '0').replace(',', '.').replace(/[^0-9.-]/g, ''));
  return `$${(Number.isFinite(parsed) ? parsed : 0).toFixed(2)}`;
}

function safeDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
}

function normalizeStatus(value?: string | null): OrderStatus {
  if (value === 'Recibido') return 'Recibido';
  if (value === 'Preparando') return 'Preparando';
  if (value === 'Enviado') return 'Enviado';
  if (value === 'Entregado') return 'Entregado';
  if (value === 'Cancelado') return 'Cancelado';
  return 'Por Confirmar';
}

function statusTitle(status: OrderStatus) {
  if (status === 'Por Confirmar') return 'Pedido por confirmar';
  if (status === 'Recibido') return 'Pedido confirmado';
  if (status === 'Preparando') return 'Empacando tu pedido';
  if (status === 'Enviado') return 'Tu pedido va en camino';
  if (status === 'Entregado') return 'Pedido entregado';
  return 'Pedido cancelado';
}

function statusMessage(status: OrderStatus) {
  if (status === 'Por Confirmar') return 'El local está revisando disponibilidad, ubicación y forma de pago.';
  if (status === 'Recibido') return 'Tu compra ya fue aceptada y está en cola para preparar.';
  if (status === 'Preparando') return 'Estamos empacando tus productos con cuidado.';
  if (status === 'Enviado') return 'Prepárate para recibirlo. Revisa tu referencia y mantente atento.';
  if (status === 'Entregado') return 'Gracias por comprar en La Casa del Pollazo.';
  return 'Si crees que hubo un error, comunícate con el local.';
}

function statusIcon(status: OrderStatus) {
  if (status === 'Por Confirmar') return Clock3;
  if (status === 'Recibido') return ClipboardList;
  if (status === 'Preparando') return ShoppingBag;
  if (status === 'Enviado') return Truck;
  if (status === 'Entregado') return CheckCircle2;
  return XCircle;
}

function statusTone(status: OrderStatus) {
  if (status === 'Entregado') return 'from-green-500 via-emerald-400 to-yellow-400';
  if (status === 'Cancelado') return 'from-red-500 via-red-400 to-orange-400';
  return 'from-orange-500 via-orange-400 to-yellow-400';
}

function activeStepIndex(status: OrderStatus) {
  if (status === 'Por Confirmar') return 0;
  if (status === 'Recibido') return 1;
  if (status === 'Preparando') return 2;
  if (status === 'Enviado') return 3;
  if (status === 'Entregado') return 4;
  return 0;
}

function itemCount(order?: TrackingOrder | null) {
  return Array.isArray(order?.items)
    ? order.items.reduce((sum, item) => sum + Math.max(1, Number(item?.quantity || 1)), 0)
    : 0;
}

function orderKey(order?: TrackingOrder | null) {
  if (!order) return '';
  return String(order.order_code || order.id || '').trim();
}

function readSeenOrders() {
  try {
    const raw = localStorage.getItem(TRACKING_SEEN_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function writeSeenOrders(keys: string[]) {
  try {
    localStorage.setItem(TRACKING_SEEN_KEY, JSON.stringify(Array.from(new Set(keys)).slice(-80)));
  } catch {
    // localStorage opcional.
  }
}

function hasTrackingQuery() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('tracking') === '1';
  } catch {
    return false;
  }
}

function markTrackingIntent(orderCode?: string | null) {
  try {
    sessionStorage.setItem(TRACKING_INTENT_KEY, JSON.stringify({ orderCode: orderCode || null, at: Date.now() }));
  } catch {
    // sessionStorage opcional.
  }
}

function readTrackingIntent() {
  try {
    const raw = sessionStorage.getItem(TRACKING_INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { orderCode?: string | null; at?: number };
    if (!parsed.at || Date.now() - parsed.at > 60_000) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isHomeScreenActive() {
  if (typeof document === 'undefined') return false;

  const activeNav = document.querySelector('nav[aria-label="Navegación principal"] button[aria-current="page"]') as HTMLElement | null;
  const text = `${activeNav?.innerText || ''} ${activeNav?.getAttribute('aria-label') || ''}`.toLowerCase();

  return text.includes('inicio') || text.includes('home');
}

export default function PersistentTrackingCenter() {
  const [open, setOpen] = useState(() => hasTrackingQuery());
  const [orders, setOrders] = useState<TrackingOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastNotificationCode, setLastNotificationCode] = useState<string | null>(null);
  const [isHomeScreen, setIsHomeScreen] = useState(() => isHomeScreenActive());
  const [seenOrderKeys, setSeenOrderKeys] = useState<string[]>(() => readSeenOrders());

  const customerPhone = useMemo(() => {
    try {
      return localStorage.getItem(PHONE_KEY) || '';
    } catch {
      return '';
    }
  }, []);

  const cleanCustomerPhone = cleanPhoneTail(customerPhone);

  const refreshOrders = useCallback(async () => {
    if (!isSupabaseConfigured || !cleanCustomerPhone) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false, nullsFirst: false })
        .limit(60);

      if (error) throw error;

      const mine = (Array.isArray(data) ? data : [])
        .filter(order => cleanPhoneTail(order?.customer_phone) === cleanCustomerPhone)
        .map(order => order as TrackingOrder);

      setOrders(mine);
    } catch (error) {
      console.error('No se pudo cargar el rastreo persistente:', error);
    } finally {
      setLoading(false);
    }
  }, [cleanCustomerPhone]);

  const trackedOrder = useMemo(() => {
    const intent = readTrackingIntent();
    const targetCode = lastNotificationCode || intent?.orderCode || null;

    if (targetCode) {
      const byCode = orders.find(order => String(order.order_code || '').toLowerCase() === targetCode.toLowerCase());
      if (byCode) return byCode;
    }

    const active = orders.find(order => ACTIVE_STATUSES.includes(normalizeStatus(order.status)));
    if (active) return active;

    const freshFinal = orders.find(order => {
      const status = normalizeStatus(order.status);
      if (!FINAL_STATUSES.includes(status)) return false;
      const reference = order.updated_at || order.created_at;
      const time = reference ? new Date(reference).getTime() : 0;
      return Boolean(time && !Number.isNaN(time) && Date.now() - time < 5 * 60 * 1000);
    });

    return freshFinal || null;
  }, [lastNotificationCode, orders]);

  const status = normalizeStatus(trackedOrder?.status);
  const Icon = statusIcon(status);
  const isActive = Boolean(trackedOrder && ACTIVE_STATUSES.includes(status));
  const currentOrderKey = orderKey(trackedOrder);
  const hasSeenCurrentOrder = currentOrderKey ? seenOrderKeys.includes(currentOrderKey) : false;
  const shouldShowFloating = Boolean(trackedOrder && isActive && isHomeScreen && !hasSeenCurrentOrder);

  const markCurrentOrderSeen = useCallback(() => {
    if (!currentOrderKey) return;

    setSeenOrderKeys(previous => {
      const next = Array.from(new Set([...previous, currentOrderKey]));
      writeSeenOrders(next);
      return next;
    });
  }, [currentOrderKey]);

  useEffect(() => {
    if (open && trackedOrder && isActive) {
      markCurrentOrderSeen();
    }
  }, [isActive, markCurrentOrderSeen, open, trackedOrder]);

  useEffect(() => {
    const updateScreen = () => setIsHomeScreen(isHomeScreenActive());

    updateScreen();
    const observer = new MutationObserver(updateScreen);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-current', 'class'] });

    window.addEventListener('click', updateScreen, true);
    const interval = window.setInterval(updateScreen, 700);

    return () => {
      observer.disconnect();
      window.removeEventListener('click', updateScreen, true);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (hasTrackingQuery()) {
      const params = new URLSearchParams(window.location.search);
      const orderCode = params.get('orderCode');
      markTrackingIntent(orderCode);
      if (orderCode) setLastNotificationCode(orderCode);
      setOpen(true);
    }

    refreshOrders();
    const interval = window.setInterval(refreshOrders, 8000);

    const onFocus = () => refreshOrders();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshOrders();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshOrders]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;

    const onMessage = (event: MessageEvent<ServiceWorkerTrackingMessage>) => {
      if (event.data?.type !== 'POLLAZO_OPEN_TRACKING') return;

      const orderCode = event.data.orderCode || null;
      markTrackingIntent(orderCode);
      setLastNotificationCode(orderCode);
      setOpen(true);
      refreshOrders();
    };

    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [refreshOrders]);

  useEffect(() => {
    const hideNativeTrackingButton = () => {
      const buttons = Array.from(document.querySelectorAll('button[aria-label="Abrir rastreo de pedido"]')) as HTMLButtonElement[];
      buttons.forEach(button => {
        if (button.dataset.pollazoPersistentTracking === '1') return;
        button.style.display = 'none';
      });
    };

    const observer = new MutationObserver(hideNativeTrackingButton);
    observer.observe(document.body, { childList: true, subtree: true });
    hideNativeTrackingButton();

    return () => observer.disconnect();
  }, []);

  if (!cleanCustomerPhone) return null;

  const steps = [
    { label: 'Por confirmar', icon: Clock3 },
    { label: 'Confirmado', icon: ClipboardList },
    { label: 'Empacando', icon: ShoppingBag },
    { label: 'En camino', icon: Truck },
    { label: 'Entregado', icon: CheckCircle2 },
  ];

  const activeIndex = activeStepIndex(status);

  return (
    <>
      {shouldShowFloating && !open && (
        <button
          type="button"
          data-pollazo-persistent-tracking="1"
          onClick={() => {
            markCurrentOrderSeen();
            setOpen(true);
            refreshOrders();
          }}
          className="fixed right-4 bottom-[96px] z-[12050] h-11 w-11 rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center border-2 border-white animate-in zoom-in-95 duration-200"
          aria-label="Abrir rastreo del pedido activo"
        >
          <PackageSearch size={20} />
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-yellow-300 border-2 border-white animate-pulse" />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[13000] flex items-end justify-center">
          <button
            type="button"
            aria-label="Cerrar rastreo"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-orange-950/25 backdrop-blur-[2px]"
          />

          <section className="relative w-full max-w-md max-h-[88dvh] bg-white rounded-t-[38px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 duration-300 flex flex-col">
            <header className={`flex-shrink-0 bg-gradient-to-br ${statusTone(status)} text-white px-5 pt-5 pb-4 relative overflow-hidden`}>
              <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-white/15 blur-2xl" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-13 h-13 rounded-[22px] bg-white/20 border border-white/25 flex items-center justify-center flex-shrink-0 shadow-inner">
                    <Icon size={27} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/75">Rastreo Pollazo</p>
                    <h2 className="text-xl font-black uppercase italic leading-none mt-1 break-words">
                      {trackedOrder?.order_code || 'Pedido activo'}
                    </h2>
                    <p className="text-[11px] font-bold text-white/80 mt-2">
                      {safeDate(trackedOrder?.created_at || trackedOrder?.updated_at)} · Se actualiza solo
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center active:scale-90 transition-transform flex-shrink-0"
                  aria-label="Cerrar"
                >
                  <X size={19} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-orange-50/35">
              {loading && !trackedOrder ? (
                <div className="rounded-[30px] bg-white border border-orange-100 p-8 text-center shadow-sm">
                  <RefreshCw size={36} className="mx-auto text-orange-500 animate-spin mb-4" />
                  <h3 className="text-lg font-black text-gray-950 uppercase italic">Buscando tu pedido</h3>
                  <p className="text-[12px] font-bold text-gray-400 mt-2 leading-relaxed">
                    Estamos cargando el rastreo actualizado.
                  </p>
                </div>
              ) : trackedOrder ? (
                <>
                  <section className="rounded-[30px] bg-white border border-orange-100 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Estado actual</p>
                        <h3 className="text-xl font-black text-gray-950 uppercase italic leading-tight mt-1">
                          {statusTitle(status)}
                        </h3>
                        <p className="text-[12px] font-bold text-gray-500 leading-relaxed mt-2">
                          {statusMessage(status)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-2xl font-black text-orange-600 leading-none">{money(trackedOrder.total)}</p>
                        <p className="text-[9px] font-black text-gray-400 uppercase mt-2">
                          {itemCount(trackedOrder)} productos
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[30px] bg-white border border-orange-100 p-4 shadow-sm">
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-4">Progreso del pedido</p>
                    <div className="space-y-3">
                      {steps.map((step, index) => {
                        const StepIcon = step.icon;
                        const complete = status !== 'Cancelado' && index <= activeIndex;
                        const current = status !== 'Cancelado' && index === activeIndex;

                        return (
                          <div key={step.label} className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border flex-shrink-0 ${complete ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-100' : 'bg-gray-50 text-gray-300 border-gray-100'}`}>
                              <StepIcon size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-[12px] font-black uppercase ${complete ? 'text-gray-950' : 'text-gray-400'}`}>{step.label}</p>
                              {current && <p className="text-[10px] font-bold text-orange-500 uppercase mt-0.5">Ahora</p>}
                            </div>
                            {complete && <CheckCircle2 size={16} className="text-green-500" />}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </>
              ) : (
                <div className="rounded-[30px] bg-white border border-orange-100 p-8 text-center shadow-sm">
                  <PackageSearch size={40} className="mx-auto text-orange-500 mb-4" />
                  <h3 className="text-xl font-black text-gray-950 uppercase italic">Sin pedido activo</h3>
                  <p className="text-sm font-bold text-gray-400 mt-3 leading-relaxed">
                    Cuando tengas un pedido confirmado, empacando o en camino, aparecerá aquí automáticamente.
                  </p>
                </div>
              )}
            </div>

            {trackedOrder && (
              <div className="flex-shrink-0 border-t border-orange-50 bg-white px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full rounded-[24px] bg-gradient-to-r from-orange-500 to-yellow-400 text-white py-4 text-[11px] font-black uppercase tracking-widest active:scale-95 transition-transform shadow-lg shadow-orange-100"
                >
                  Entendido
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
