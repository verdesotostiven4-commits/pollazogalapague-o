import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bike, MapPinned, Smartphone, X } from 'lucide-react';
import type { Order } from '../types';
import { getOrderCredential } from '../utils/orderCredentials';
import AdminDeliveryDevices from './AdminDeliveryDevices';
import RiderAutoDispatcher from './RiderAutoDispatcher';
import RiderRouteDock from './RiderRouteDock';
import RiderTrackingBridge, { hasStoredDeliveryDevice } from './RiderTrackingBridge';

const DEVICE_TOKEN_KEY = 'pollazo_delivery_device_token_v1';

const normalizeCode = (value?: string | null) =>
  String(value || '').trim().toUpperCase().slice(0, 120);

const captureDeliveryDeviceToken = () => {
  if (window.location.pathname !== '/repartidor') return;

  try {
    const params = new URLSearchParams(window.location.search);
    const token = String(params.get('device') || '').trim();
    if (!token) return;

    localStorage.setItem(DEVICE_TOKEN_KEY, token);
    params.delete('device');
    const query = params.toString();
    window.history.replaceState(
      {},
      document.title,
      `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
    );
  } catch {
    // Si el navegador no permite guardar, el panel mostrará que falta habilitar el celular.
  }
};

function AdminDeliveryLauncher() {
  const [open, setOpen] = useState(false);

  if (window.location.pathname !== '/admin') return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[12000] flex items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white shadow-2xl shadow-slate-400 active:scale-95"
        aria-label="Abrir gestión de repartidores"
      >
        <Smartphone size={18} className="text-orange-400" />
        Reparto GPS
      </button>

      {open && (
        <div className="fixed inset-0 z-[14000] bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute inset-0"
            aria-label="Cerrar gestión de repartidores"
          />
          <section className="relative z-10 mx-auto h-full w-full max-w-3xl overflow-y-auto rounded-[32px] bg-gray-50 p-4 shadow-2xl sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-500">Administrador</p>
                <h2 className="mt-1 text-xl font-black uppercase italic text-slate-950">Repartidores y celulares</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-slate-500 shadow-sm"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            <AdminDeliveryDevices />
          </section>
        </div>
      )}
    </>
  );
}

function DeliveryTrackingLauncher() {
  const deviceReady = useMemo(() => {
    captureDeliveryDeviceToken();
    return hasStoredDeliveryDevice();
  }, []);
  const [open, setOpen] = useState(deviceReady);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadOrders = useCallback(async () => {
    if (window.location.pathname !== '/repartidor') return;
    setLoading(true);
    try {
      const response = await fetch('/api/panel-data?panel=delivery', {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        orders?: Order[];
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'No se pudieron cargar los pedidos.');
      }
      setOrders(Array.isArray(payload.orders) ? payload.orders : []);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los pedidos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (window.location.pathname !== '/repartidor') return undefined;
    void loadOrders();
    const timer = window.setInterval(() => void loadOrders(), 10_000);
    return () => window.clearInterval(timer);
  }, [loadOrders]);

  if (window.location.pathname !== '/repartidor') return null;

  return (
    <>
      <RiderAutoDispatcher orders={orders} onOrdersChanged={loadOrders} />

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[12000] flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white shadow-2xl shadow-blue-200 active:scale-95"
        aria-label="Abrir GPS de reparto"
      >
        <Bike size={18} />
        GPS {deviceReady ? 'activo' : 'configurar'}
      </button>

      <div
        className={`fixed inset-0 z-[14000] bg-slate-950/60 p-3 backdrop-blur-sm transition-opacity sm:p-6 ${
          open ? 'visible opacity-100' : 'invisible pointer-events-none opacity-0'
        }`}
        aria-hidden={!open}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute inset-0"
          aria-label="Cerrar GPS de reparto"
          tabIndex={open ? 0 : -1}
        />
        <section className="relative z-10 mx-auto h-full w-full max-w-3xl overflow-y-auto rounded-[32px] bg-gray-50 p-4 shadow-2xl sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500">Repartidor</p>
              <h2 className="mt-1 text-xl font-black uppercase italic text-slate-950">Control automático GPS</h2>
              <p className="mt-1 text-[10px] font-bold text-slate-400">
                {loading ? 'Actualizando pedidos…' : `${orders.length} pedidos cargados`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-slate-500 shadow-sm"
              aria-label="Cerrar"
              tabIndex={open ? 0 : -1}
            >
              <X size={20} />
            </button>
          </div>

          {error && (
            <div className="mb-3 rounded-2xl border border-red-100 bg-red-50 p-3 text-[10px] font-bold text-red-600">
              {error}
            </div>
          )}

          <RiderRouteDock orders={orders} />
          <RiderTrackingBridge orders={orders} onOrdersChanged={loadOrders} />
        </section>
      </div>
    </>
  );
}

function CustomerTrackingMapLauncher() {
  const [orderCode, setOrderCode] = useState('');
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  useEffect(() => {
    if (window.location.pathname === '/admin' || window.location.pathname === '/repartidor') {
      return undefined;
    }

    const inspect = () => {
      const closeButton = document.querySelector<HTMLButtonElement>('button[aria-label="Cerrar rastreo"]');
      const modal = closeButton?.closest('section') || closeButton?.parentElement?.parentElement || null;
      let code = '';

      if (modal) {
        const heading = modal.querySelector('h2');
        code = normalizeCode(heading?.textContent);
      }

      if (!code) {
        try {
          code = normalizeCode(sessionStorage.getItem('pollazo_tracking_order_code'));
        } catch {
          code = '';
        }
      }

      const credential = getOrderCredential(code);
      setOrderCode(credential ? code : '');
      setTrackingOpen(Boolean(closeButton && credential));

      if (!closeButton) setMapOpen(false);
    };

    const observer = new MutationObserver(inspect);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('pollazo:open-tracking', inspect as EventListener);
    inspect();

    return () => {
      observer.disconnect();
      window.removeEventListener('pollazo:open-tracking', inspect as EventListener);
    };
  }, []);

  if (!trackingOpen || !orderCode) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setMapOpen(true)}
        className="fixed bottom-[88px] left-4 z-[14500] flex items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-[9px] font-black uppercase tracking-wider text-white shadow-2xl active:scale-95"
        aria-label="Abrir mapa GPS del pedido"
      >
        <MapPinned size={17} className="text-orange-400" />
        Mapa en vivo
      </button>

      {mapOpen && (
        <div className="fixed inset-0 z-[16000] bg-slate-950">
          <iframe
            title={`Mapa en vivo ${orderCode}`}
            src={`/mapa-pedido?compact=1&orderCode=${encodeURIComponent(orderCode)}`}
            className="h-full w-full border-0"
          />
          <button
            type="button"
            onClick={() => setMapOpen(false)}
            className="fixed right-4 top-[calc(env(safe-area-inset-top)+14px)] z-[16010] grid h-11 w-11 place-items-center rounded-2xl bg-white/90 text-slate-700 shadow-2xl backdrop-blur"
            aria-label="Cerrar mapa GPS"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </>
  );
}

export default function LiveDeliverySystems() {
  return (
    <>
      <AdminDeliveryLauncher />
      <DeliveryTrackingLauncher />
      <CustomerTrackingMapLauncher />
    </>
  );
}
