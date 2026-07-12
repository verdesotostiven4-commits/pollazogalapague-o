import { useEffect, useMemo, useRef, useState } from 'react';
import { LoaderCircle, Pause, Play, Zap } from 'lucide-react';
import type { Order } from '../types';
import {
  trackingPost,
  type TrackingDevice,
  type TrackingSession,
} from '../utils/deliveryTrackingApi';

const DEVICE_TOKEN_KEY = 'pollazo_delivery_device_token_v1';
const STORE_LOCATION_KEY = 'pollazo_delivery_store_location_v1';
const AUTO_DISPATCH_KEY = 'pollazo_delivery_auto_dispatch_v1';

type StoredPoint = {
  latitude: number;
  longitude: number;
};

type Props = {
  orders: Order[];
  onOrdersChanged: () => Promise<void> | void;
};

type DeviceResult = {
  ok: true;
  device: TrackingDevice;
};

type DevicesResult = {
  ok: true;
  devices: TrackingDevice[];
};

type StartResult = {
  ok: true;
  session: TrackingSession;
};

const readToken = () => {
  try {
    return String(localStorage.getItem(DEVICE_TOKEN_KEY) || '').trim();
  } catch {
    return '';
  }
};

const readStorePoint = (): StoredPoint | null => {
  try {
    const raw = localStorage.getItem(STORE_LOCATION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const latitude = Number(parsed?.latitude);
    const longitude = Number(parsed?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
  } catch {
    return null;
  }
};

const readEnabled = () => {
  try {
    return localStorage.getItem(AUTO_DISPATCH_KEY) !== '0';
  } catch {
    return true;
  }
};

const validCoordinates = (order: Order) =>
  Number.isFinite(Number(order.lat)) && Number.isFinite(Number(order.lng));

export default function RiderAutoDispatcher({ orders, onOrdersChanged }: Props) {
  const [enabled, setEnabled] = useState(readEnabled);
  const [working, setWorking] = useState(false);
  const [lastAssigned, setLastAssigned] = useState(0);
  const runningRef = useRef(false);

  const candidates = useMemo(
    () =>
      orders
        .filter(
          order =>
            order.status === 'Preparando' &&
            order.delivery_type !== 'retiro' &&
            Boolean(order.order_code) &&
            validCoordinates(order)
        )
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
    [orders]
  );

  useEffect(() => {
    try {
      localStorage.setItem(AUTO_DISPATCH_KEY, enabled ? '1' : '0');
    } catch {
      // La preferencia puede continuar solo durante esta sesión.
    }
  }, [enabled]);

  useEffect(() => {
    if (
      !enabled ||
      runningRef.current ||
      candidates.length === 0 ||
      !navigator.onLine ||
      window.location.pathname !== '/repartidor'
    ) {
      return;
    }

    const deviceToken = readToken();
    const storePoint = readStorePoint();
    if (!deviceToken || !storePoint) return;

    const run = async () => {
      runningRef.current = true;
      setWorking(true);
      let assigned = 0;

      try {
        const heartbeat = await trackingPost<DeviceResult>('heartbeat', {
          deviceToken,
        });
        const listed = await trackingPost<DevicesResult>('list_devices');
        const current = (listed.devices || []).find(
          device => device.id === heartbeat.device.id
        );

        if (!current?.enabled) return;

        const capacity = Math.max(
          0,
          Number(current.max_orders || 1) - Number(current.load || 0)
        );

        for (const order of candidates.slice(0, capacity)) {
          try {
            await trackingPost<StartResult>('start_session', {
              deviceToken,
              orderCode: order.order_code,
              storeLat: storePoint.latitude,
              storeLng: storePoint.longitude,
            });
            assigned += 1;
          } catch {
            // Otro celular pudo tomarlo primero; el servidor evita duplicados.
          }
        }

        if (assigned > 0) {
          setLastAssigned(assigned);
          navigator.vibrate?.([70, 40, 100]);
          await onOrdersChanged();
        }
      } finally {
        runningRef.current = false;
        setWorking(false);
      }
    };

    const delay = window.setTimeout(() => {
      void run();
    }, 350 + Math.floor(Math.random() * 650));

    return () => window.clearTimeout(delay);
  }, [candidates, enabled, onOrdersChanged]);

  if (window.location.pathname !== '/repartidor' || !readToken()) return null;

  return (
    <button
      type="button"
      onClick={() => setEnabled(value => !value)}
      className={`fixed bottom-[76px] right-5 z-[11990] flex items-center gap-2 rounded-full px-4 py-2.5 text-[9px] font-black uppercase tracking-wider shadow-xl transition active:scale-95 ${
        enabled
          ? 'bg-emerald-600 text-white shadow-emerald-200'
          : 'bg-white text-slate-500 shadow-slate-200'
      }`}
      aria-label={enabled ? 'Pausar asignación automática' : 'Activar asignación automática'}
    >
      {working ? (
        <LoaderCircle size={15} className="animate-spin" />
      ) : enabled ? (
        <Zap size={15} />
      ) : (
        <Pause size={15} />
      )}
      {enabled ? 'Auto reparto activo' : 'Auto reparto pausado'}
      {lastAssigned > 0 && enabled && !working && (
        <span className="rounded-full bg-white/20 px-1.5 py-0.5">+{lastAssigned}</span>
      )}
      {!enabled && <Play size={13} />}
    </button>
  );
}
