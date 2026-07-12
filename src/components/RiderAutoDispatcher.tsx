import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Pause, Play, Store, Zap } from 'lucide-react';
import type { Order } from '../types';
import {
  trackingPost,
  type TrackingDevice,
  type TrackingSession,
} from '../utils/deliveryTrackingApi';

const DEVICE_TOKEN_KEY = 'pollazo_delivery_device_token_v1';
const STORE_LOCATION_KEY = 'pollazo_delivery_store_location_v1';
const AUTO_DISPATCH_KEY = 'pollazo_delivery_auto_dispatch_v1';
const AUTO_ASSIGN_RADIUS_M = 250;

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

const validCoordinates = (order: Order) => {
  if (order.lat === null || order.lat === undefined || order.lat === '') return false;
  if (order.lng === null || order.lng === undefined || order.lng === '') return false;
  const latitude = Number(order.lat);
  const longitude = Number(order.lng);
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
};

const currentPosition = () =>
  new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GPS no disponible'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12_000,
      maximumAge: 5_000,
    });
  });

const distanceMeters = (a: StoredPoint, b: StoredPoint) => {
  const radius = 6_371_000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLng = toRadians(b.longitude - a.longitude);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * radius * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

export default function RiderAutoDispatcher({ orders, onOrdersChanged }: Props) {
  const [enabled, setEnabled] = useState(readEnabled);
  const [working, setWorking] = useState(false);
  const [lastAssigned, setLastAssigned] = useState(0);
  const [nearStore, setNearStore] = useState<boolean | null>(null);
  const runningRef = useRef(false);

  const candidates = useMemo(
    () =>
      orders
        .filter(
          order =>
            (order.status === 'Recibido' || order.status === 'Preparando') &&
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
        let position: GeolocationPosition;
        try {
          position = await currentPosition();
        } catch {
          setNearStore(null);
          return;
        }

        if (position.coords.accuracy > 100) {
          setNearStore(null);
          return;
        }

        const riderPoint = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        const distanceFromStore = distanceMeters(riderPoint, storePoint);
        const isNearStore = distanceFromStore <= AUTO_ASSIGN_RADIUS_M;
        setNearStore(isNearStore);

        const heartbeat = await trackingPost<DeviceResult>('heartbeat', {
          deviceToken,
          latitude: riderPoint.latitude,
          longitude: riderPoint.longitude,
          accuracyM: position.coords.accuracy,
        });

        if (!isNearStore) return;

        const listed = await trackingPost<DevicesResult>('list_devices');
        const current = (listed.devices || []).find(
          device => device.id === heartbeat.device.id
        );

        if (!current?.enabled || !current.online) return;

        const capacity = Math.max(
          0,
          Number(current.max_orders || 1) - Number(current.load || 0)
        );

        for (const order of candidates) {
          if (assigned >= capacity) break;

          try {
            await trackingPost<StartResult>('start_session', {
              deviceToken,
              orderCode: order.order_code,
              storeLat: storePoint.latitude,
              storeLng: storePoint.longitude,
            });
            assigned += 1;
          } catch {
            // Si otro celular lo tomó, este continúa con el siguiente pedido de la cola.
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

  const label = !enabled
    ? 'Auto reparto pausado'
    : nearStore === false
      ? 'Auto reparto: fuera del local'
      : 'Auto reparto activo';

  return (
    <button
      type="button"
      onClick={() => setEnabled(value => !value)}
      className={`fixed bottom-[76px] right-5 z-[11990] flex items-center gap-2 rounded-full px-4 py-2.5 text-[9px] font-black uppercase tracking-wider shadow-xl transition active:scale-95 ${
        enabled && nearStore !== false
          ? 'bg-emerald-600 text-white shadow-emerald-200'
          : enabled
            ? 'bg-amber-500 text-white shadow-amber-200'
            : 'bg-white text-slate-500 shadow-slate-200'
      }`}
      aria-label={enabled ? 'Pausar asignación automática' : 'Activar asignación automática'}
    >
      {working ? (
        <Loader2 size={15} className="animate-spin" />
      ) : !enabled ? (
        <Pause size={15} />
      ) : nearStore === false ? (
        <Store size={15} />
      ) : (
        <Zap size={15} />
      )}
      {label}
      {lastAssigned > 0 && enabled && !working && (
        <span className="rounded-full bg-white/20 px-1.5 py-0.5">+{lastAssigned}</span>
      )}
      {!enabled && <Play size={13} />}
    </button>
  );
}
