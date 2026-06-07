import { useCallback, useEffect, useMemo, useState } from 'react';
import { PackageSearch } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type OrderStatus = 'Por Confirmar' | 'Recibido' | 'Preparando' | 'Enviado' | 'Entregado' | 'Cancelado';

type TrackingOrder = {
  id?: string | number | null;
  order_code?: string | null;
  customer_phone?: string | null;
  status?: OrderStatus | string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

const PHONE_KEY = 'pollazo_customer_phone';
const TRACKING_SEEN_KEY = 'pollazo_tracking_seen_orders';
const TRACKING_INTENT_KEY = 'pollazo_tracking_intent';
const ACTIVE_STATUSES: OrderStatus[] = ['Por Confirmar', 'Recibido', 'Preparando', 'Enviado'];

function cleanPhoneTail(value?: string | null) {
  return String(value || '').replace(/\D/g, '').slice(-9);
}

function normalizeStatus(value?: string | null): OrderStatus {
  if (value === 'Recibido') return 'Recibido';
  if (value === 'Preparando') return 'Preparando';
  if (value === 'Enviado') return 'Enviado';
  if (value === 'Entregado') return 'Entregado';
  if (value === 'Cancelado') return 'Cancelado';
  return 'Por Confirmar';
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

function markTrackingIntent(orderCode?: string | null) {
  try {
    sessionStorage.setItem(TRACKING_INTENT_KEY, JSON.stringify({ orderCode: orderCode || null, at: Date.now() }));
  } catch {
    // sessionStorage opcional.
  }
}

function isHomeScreenActive() {
  const activeNav = document.querySelector('nav[aria-label="Navegación principal"] button[aria-current="page"]') as HTMLElement | null;
  const text = `${activeNav?.innerText || ''} ${activeNav?.getAttribute('aria-label') || ''}`.toLowerCase();
  return text.includes('inicio') || text.includes('home');
}

function installOldGreenButtonGuard() {
  const styleId = 'pollazo-hide-old-green-tracking-button';
  let style = document.getElementById(styleId) as HTMLStyleElement | null;

  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      button[data-pollazo-persistent-tracking="1"] {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  return () => {
    style?.remove();
  };
}

function hideWrongGreenTrackingButton() {
  const buttons = Array.from(document.querySelectorAll('button[data-pollazo-persistent-tracking="1"]')) as HTMLButtonElement[];
  buttons.forEach(button => {
    button.style.setProperty('display', 'none', 'important');
    button.style.setProperty('visibility', 'hidden', 'important');
    button.setAttribute('aria-hidden', 'true');
    button.tabIndex = -1;
  });
}

function openPersistentTracking(orderCode?: string | null) {
  markTrackingIntent(orderCode);

  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'POLLAZO_OPEN_TRACKING',
            orderCode: orderCode || null,
          },
        })
      );
    }
  } catch {
    // Fallback abajo.
  }

  window.dispatchEvent(new CustomEvent('pollazo:open-tracking', { detail: { orderCode } }));
}

export default function TrackingFloatingNoticeButton() {
  const [activeOrder, setActiveOrder] = useState<TrackingOrder | null>(null);
  const [isHome, setIsHome] = useState(() => isHomeScreenActive());
  const [seenKeys, setSeenKeys] = useState<string[]>(() => readSeenOrders());

  const customerPhone = useMemo(() => {
    try {
      return localStorage.getItem(PHONE_KEY) || '';
    } catch {
      return '';
    }
  }, []);

  const cleanCustomerPhone = cleanPhoneTail(customerPhone);
  const currentKey = orderKey(activeOrder);
  const hasSeen = currentKey ? seenKeys.includes(currentKey) : false;

  const refreshOrder = useCallback(async () => {
    if (!isSupabaseConfigured || !cleanCustomerPhone) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_code, customer_phone, status, updated_at, created_at')
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false, nullsFirst: false })
        .limit(40);

      if (error) throw error;

      const mine = (Array.isArray(data) ? data : [])
        .filter(order => cleanPhoneTail(order?.customer_phone) === cleanCustomerPhone)
        .map(order => order as TrackingOrder);

      const active = mine.find(order => ACTIVE_STATUSES.includes(normalizeStatus(order.status))) || null;
      setActiveOrder(active);
    } catch (error) {
      console.error('No se pudo cargar botón de rastreo:', error);
    }
  }, [cleanCustomerPhone]);

  useEffect(() => {
    const removeStyle = installOldGreenButtonGuard();
    hideWrongGreenTrackingButton();

    const observer = new MutationObserver(hideWrongGreenTrackingButton);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      removeStyle();
    };
  }, []);

  useEffect(() => {
    const updateScreen = () => setIsHome(isHomeScreenActive());
    updateScreen();

    const observer = new MutationObserver(updateScreen);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-current', 'class'] });
    window.addEventListener('click', updateScreen, true);

    return () => {
      observer.disconnect();
      window.removeEventListener('click', updateScreen, true);
    };
  }, []);

  useEffect(() => {
    refreshOrder();
    const interval = window.setInterval(refreshOrder, 8000);
    const onFocus = () => refreshOrder();
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshOrder]);

  if (!cleanCustomerPhone || !activeOrder || !isHome) return null;

  return (
    <button
      type="button"
      data-pollazo-tracking-notice="1"
      onClick={() => {
        if (currentKey) {
          setSeenKeys(previous => {
            const next = Array.from(new Set([...previous, currentKey]));
            writeSeenOrders(next);
            return next;
          });
        }

        openPersistentTracking(activeOrder.order_code || null);
      }}
      className="fixed right-4 bottom-[96px] z-[12060] h-11 rounded-full bg-gradient-to-r from-orange-500 to-yellow-400 text-white shadow-xl shadow-orange-200 active:scale-95 transition-all flex items-center gap-2 border-2 border-white px-4 animate-in zoom-in-95 duration-200"
      aria-label="Abrir rastreo del pedido activo"
    >
      <PackageSearch size={17} />
      <span className="text-[10px] font-black uppercase tracking-widest">Rastrear</span>
      {!hasSeen && (
        <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-white shadow-sm shadow-emerald-200 animate-pulse" />
      )}
    </button>
  );
}
