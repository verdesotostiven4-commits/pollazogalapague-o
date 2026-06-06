import { useCallback, useEffect, useMemo, useState } from 'react';
import { PackageSearch } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext';
import OrderTracking from './OrderTracking';
import type { OrderStatus } from '../types';

const ACTIVE_TRACKING_STATUSES: OrderStatus[] = [
  'Por Confirmar',
  'Recibido',
  'Preparando',
  'Enviado',
];

const FINAL_TRACKING_STATUSES: OrderStatus[] = ['Entregado', 'Cancelado'];
const FINAL_TRACKING_MINUTES = 3;

type PollazoServiceWorkerMessage = {
  type?: string;
  orderCode?: string | null;
  status?: string | null;
};

function cleanPhoneTail(phone?: string | null) {
  return String(phone || '').replace(/\D/g, '').slice(-9);
}

function recentFinal(updatedAt?: string | null, createdAt?: string | null) {
  const value = updatedAt || createdAt;
  const time = value ? new Date(value).getTime() : 0;
  if (!time || Number.isNaN(time)) return false;
  return time > Date.now() - FINAL_TRACKING_MINUTES * 60 * 1000;
}

function isOrdersEstadoButton(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  const button = element?.closest('button') as HTMLButtonElement | null;
  if (!button) return false;

  const text = (button.innerText || '').trim().toLowerCase();
  const pageText = (document.body.innerText || '').toLowerCase();
  const isOrdersPage = pageText.includes('mis pedidos') || pageText.includes('mi historial pollazo');

  return isOrdersPage && text === 'estado';
}

export default function GlobalOrderTrackingBridge() {
  const { orders, refreshData } = useAdmin();
  const { customerPhone } = useUser();
  const [open, setOpen] = useState(false);

  const activeOrder = useMemo(() => {
    const phone = cleanPhoneTail(customerPhone);
    if (!phone) return null;

    const matches = [...(orders || [])]
      .filter(order => cleanPhoneTail(order.customer_phone) === phone)
      .filter(order => {
        const status = order.status;
        const active = ACTIVE_TRACKING_STATUSES.includes(status);
        const freshFinal = FINAL_TRACKING_STATUSES.includes(status)
          ? recentFinal(order.updated_at, order.created_at)
          : false;

        // Importante: los pedidos activos NO se limitan a 24h.
        // Si el negocio todavía lo tiene activo, el cliente debe poder rastrearlo.
        return active || freshFinal;
      })
      .sort((a, b) => {
        const aTime = new Date(a.updated_at || a.created_at || '').getTime() || 0;
        const bTime = new Date(b.updated_at || b.created_at || '').getTime() || 0;
        return bTime - aTime;
      });

    return matches[0] || null;
  }, [customerPhone, orders]);

  const hasActiveTracking = Boolean(
    activeOrder && ACTIVE_TRACKING_STATUSES.includes(activeOrder.status)
  );

  const openTracking = useCallback(() => {
    setOpen(true);
    void refreshData().catch(() => undefined);
  }, [refreshData]);

  const closeTracking = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    const openFromEvent = () => openTracking();

    window.addEventListener('pollazo:open-main-tracking', openFromEvent);

    return () => {
      window.removeEventListener('pollazo:open-main-tracking', openFromEvent);
    };
  }, [openTracking]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shouldOpenTracking = params.get('tracking') === '1';

    if (!shouldOpenTracking) return;

    openTracking();
    params.delete('tracking');
    params.delete('orderCode');
    params.delete('status');

    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}`;
    window.history.replaceState({}, '', nextUrl);
  }, [openTracking]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;

    const handleMessage = (event: MessageEvent<PollazoServiceWorkerMessage>) => {
      if (event.data?.type === 'POLLAZO_OPEN_TRACKING') {
        openTracking();
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [openTracking]);

  useEffect(() => {
    const handleEstadoClick = (event: MouseEvent) => {
      if (!isOrdersEstadoButton(event.target)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openTracking();
    };

    document.addEventListener('click', handleEstadoClick, true);

    return () => {
      document.removeEventListener('click', handleEstadoClick, true);
    };
  }, [openTracking]);

  useEffect(() => {
    if (!activeOrder && open) {
      setOpen(false);
    }
  }, [activeOrder, open]);

  return (
    <>
      <OrderTracking isOpen={open} onClose={closeTracking} />

      {hasActiveTracking && !open && (
        <button
          type="button"
          onClick={openTracking}
          className="fixed right-4 bottom-[88px] z-[14020] flex items-center gap-2 rounded-full bg-white/95 backdrop-blur-md border border-orange-100 px-4 py-3 shadow-xl shadow-orange-100 text-orange-600 active:scale-95 transition-all"
          aria-label="Abrir rastreo de pedido"
        >
          <PackageSearch size={18} />
          <span className="text-[10px] font-black uppercase tracking-widest">Rastrear</span>
        </button>
      )}
    </>
  );
}
