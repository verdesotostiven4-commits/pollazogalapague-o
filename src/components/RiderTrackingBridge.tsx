import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BatteryCharging,
  Bike,
  CheckCircle2,
  Crosshair,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Navigation,
  PackageCheck,
  Radio,
  RefreshCw,
  Route,
  ShieldCheck,
  Smartphone,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { Order } from '../types';
import {
  trackingPost,
  trackingStatusLabel,
  type TrackingDevice,
  type TrackingSession,
  type TrackingStatus,
} from '../utils/deliveryTrackingApi';

const DEVICE_TOKEN_KEY = 'pollazo_delivery_device_token_v1';
const STORE_LOCATION_KEY = 'pollazo_delivery_store_location_v1';

type StoredPoint = {
  latitude: number;
  longitude: number;
  accuracyM: number;
  savedAt: string;
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

type UpdateResult = {
  ok: true;
  accepted: boolean;
  transitioned?: boolean;
  status?: TrackingStatus;
  session?: TrackingSession;
  reason?: string;
};

type CompleteResult = {
  ok: true;
  session: TrackingSession;
};

const readDeviceToken = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = String(params.get('device') || '').trim();
    if (fromUrl) {
      localStorage.setItem(DEVICE_TOKEN_KEY, fromUrl);
      return fromUrl;
    }
    return String(localStorage.getItem(DEVICE_TOKEN_KEY) || '').trim();
  } catch {
    return '';
  }
};

const readStorePoint = (): StoredPoint | null => {
  try {
    const raw = localStorage.getItem(STORE_LOCATION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (
      !parsed ||
      !Number.isFinite(Number(parsed.latitude)) ||
      !Number.isFinite(Number(parsed.longitude))
    ) {
      return null;
    }
    return {
      latitude: Number(parsed.latitude),
      longitude: Number(parsed.longitude),
      accuracyM: Number(parsed.accuracyM || 0),
      savedAt: String(parsed.savedAt || new Date().toISOString()),
    };
  } catch {
    return null;
  }
};

const activeStatus = (status?: TrackingStatus | null) =>
  status === 'packing' ||
  status === 'en_route' ||
  status === 'nearby' ||
  status === 'arrived';

const statusTone = (status: TrackingStatus) => {
  if (status === 'packing') return 'border-orange-100 bg-orange-50 text-orange-600';
  if (status === 'en_route') return 'border-blue-100 bg-blue-50 text-blue-600';
  if (status === 'nearby') return 'border-violet-100 bg-violet-50 text-violet-600';
  if (status === 'arrived') return 'border-emerald-100 bg-emerald-50 text-emerald-600';
  return 'border-gray-100 bg-gray-50 text-gray-500';
};

const getBatteryPercent = async () => {
  try {
    const batteryApi = (navigator as Navigator & {
      getBattery?: () => Promise<{ level: number }>;
    }).getBattery;
    if (!batteryApi) return null;
    const battery = await batteryApi.call(navigator);
    return Math.round(Math.max(0, Math.min(1, battery.level)) * 100);
  } catch {
    return null;
  }
};

export const hasStoredDeliveryDevice = () => Boolean(readDeviceToken());

export default function RiderTrackingBridge({ orders, onOrdersChanged }: Props) {
  const [deviceToken] = useState(readDeviceToken);
  const [storePoint, setStorePoint] = useState<StoredPoint | null>(readStorePoint);
  const [device, setDevice] = useState<TrackingDevice | null>(null);
  const [sessions, setSessions] = useState<TrackingSession[]>([]);
  const sessionsRef = useRef<TrackingSession[]>([]);
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [loading, setLoading] = useState(Boolean(deviceToken));
  const [savingStore, setSavingStore] = useState(false);
  const [startingCode, setStartingCode] = useState('');
  const [completingId, setCompletingId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const watchIdRef = useRef<number | null>(null);
  const lastSentAtRef = useRef(0);
  const lastPointRef = useRef<GeolocationPosition | null>(null);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  const readyOrders = useMemo(
    () => orders.filter(order => order.status === 'Preparando'),
    [orders]
  );

  const activeSessions = useMemo(
    () => sessions.filter(session => activeStatus(session.status)),
    [sessions]
  );

  const refreshDevice = useCallback(async () => {
    if (!deviceToken) return;
    try {
      const batteryPercent = await getBatteryPercent();
      const heartbeat = await trackingPost<DeviceResult>('heartbeat', {
        deviceToken,
        latitude: lastPointRef.current?.coords.latitude,
        longitude: lastPointRef.current?.coords.longitude,
        accuracyM: lastPointRef.current?.coords.accuracy,
        batteryPercent,
      });
      setDevice(heartbeat.device);

      const listed = await trackingPost<DevicesResult>('list_devices');
      const current = (listed.devices || []).find(item => item.id === heartbeat.device.id);
      if (current) {
        setDevice(current);
        const nextSessions = (current.activeOrders || []).map(item => ({
          id: item.id,
          device_id: item.device_id,
          order_code: item.order_code,
          status: item.status,
          store_lat: storePoint?.latitude || 0,
          store_lng: storePoint?.longitude || 0,
          customer_lat: 0,
          customer_lng: 0,
          updated_at: item.updated_at,
        }));
        setSessions(previous => {
          const detailed = new Map(previous.map(item => [item.id, item]));
          return nextSessions.map(item => ({ ...detailed.get(item.id), ...item }));
        });
      }
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo validar este celular.');
    } finally {
      setLoading(false);
    }
  }, [deviceToken, storePoint?.latitude, storePoint?.longitude]);

  useEffect(() => {
    void refreshDevice();
    if (!deviceToken) return undefined;
    const timer = window.setInterval(() => void refreshDevice(), 20_000);
    return () => window.clearInterval(timer);
  }, [deviceToken, refreshDevice]);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setMessage('Internet recuperado. El rastreo continúa.');
    };
    const handleOffline = () => {
      setOnline(false);
      setMessage('Sin internet. Mantén esta pantalla abierta hasta recuperar señal.');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const requestWakeLock = useCallback(async () => {
    try {
      const wakeLockApi = (navigator as Navigator & {
        wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
      }).wakeLock;
      if (!wakeLockApi || document.visibilityState !== 'visible') return;
      wakeLockRef.current = await wakeLockApi.request('screen');
    } catch {
      // El teléfono puede rechazarlo por batería baja.
    }
  }, []);

  const sendPosition = useCallback(
    async (position: GeolocationPosition) => {
      if (!deviceToken || sessionsRef.current.length === 0) return;
      const now = Date.now();
      if (now - lastSentAtRef.current < 4_000) return;
      lastSentAtRef.current = now;
      lastPointRef.current = position;
      setGpsAccuracy(Math.round(position.coords.accuracy));
      const batteryPercent = await getBatteryPercent();

      const active = sessionsRef.current.filter(session => activeStatus(session.status));
      const results = await Promise.allSettled(
        active.map(session =>
          trackingPost<UpdateResult>('update_location', {
            deviceToken,
            sessionId: session.id,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyM: position.coords.accuracy,
            speedMps: position.coords.speed,
            headingDeg: position.coords.heading,
            capturedAt: position.timestamp || Date.now(),
            batteryPercent,
          })
        )
      );

      let transitioned = false;
      setSessions(previous =>
        previous.map(session => {
          const index = active.findIndex(item => item.id === session.id);
          const result = index >= 0 ? results[index] : null;
          if (!result || result.status !== 'fulfilled') return session;
          if (result.value.transitioned) transitioned = true;
          return result.value.session ||
            (result.value.status ? { ...session, status: result.value.status } : session);
        })
      );

      if (transitioned) {
        navigator.vibrate?.([80, 50, 120]);
        setMessage('Estado actualizado automáticamente según el GPS.');
        await onOrdersChanged();
      }
    },
    [deviceToken, onOrdersChanged]
  );

  useEffect(() => {
    if (!deviceToken || !storePoint || activeSessions.length === 0 || !navigator.geolocation) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setGpsActive(false);
      void wakeLockRef.current?.release();
      wakeLockRef.current = null;
      return undefined;
    }

    if (watchIdRef.current === null) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        position => {
          setGpsActive(true);
          void sendPosition(position).catch(cause => {
            setError(cause instanceof Error ? cause.message : 'No se pudo enviar la ubicación.');
          });
        },
        geoError => {
          setGpsActive(false);
          setError(
            geoError.code === geoError.PERMISSION_DENIED
              ? 'Permite la ubicación del navegador para continuar.'
              : 'El GPS no está respondiendo. Revisa ubicación y ahorro de batería.'
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 15_000,
          maximumAge: 2_000,
        }
      );
      void requestWakeLock();
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setGpsActive(false);
      void wakeLockRef.current?.release();
      wakeLockRef.current = null;
    };
  }, [activeSessions.length, deviceToken, requestWakeLock, sendPosition, storePoint]);

  const saveStoreHere = () => {
    if (!navigator.geolocation) {
      setError('Este navegador no tiene geolocalización.');
      return;
    }
    setSavingStore(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      position => {
        const point: StoredPoint = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyM: position.coords.accuracy,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(STORE_LOCATION_KEY, JSON.stringify(point));
        setStorePoint(point);
        setSavingStore(false);
        setMessage('El Mirador quedó guardado como punto de salida de este celular.');
      },
      geoError => {
        setSavingStore(false);
        setError(
          geoError.code === geoError.PERMISSION_DENIED
            ? 'Permite la ubicación para guardar El Mirador.'
            : 'No se pudo obtener una ubicación precisa del local.'
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 1_000 }
    );
  };

  const startSession = async (order: Order) => {
    if (!deviceToken || !storePoint || !order.order_code) return;
    setStartingCode(order.order_code);
    setError('');
    try {
      const result = await trackingPost<StartResult>('start_session', {
        deviceToken,
        orderCode: order.order_code,
        storeLat: storePoint.latitude,
        storeLng: storePoint.longitude,
      });
      setSessions(previous => [
        result.session,
        ...previous.filter(item => item.id !== result.session.id),
      ]);
      setMessage(`${order.order_code}: GPS iniciado. El estado cambiará al salir del local.`);
      navigator.vibrate?.(80);
      await onOrdersChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar esta ruta.');
      await refreshDevice();
    } finally {
      setStartingCode('');
    }
  };

  const completeSession = async (session: TrackingSession) => {
    if (!deviceToken) return;
    const ok = window.confirm(`¿Confirmar que ${session.order_code} fue entregado?`);
    if (!ok) return;
    setCompletingId(session.id);
    setError('');
    try {
      const result = await trackingPost<CompleteResult>('complete_session', {
        deviceToken,
        sessionId: session.id,
      });
      setSessions(previous =>
        previous.map(item => (item.id === session.id ? result.session : item))
      );
      setMessage(`${session.order_code}: entrega confirmada y rastreo finalizado.`);
      navigator.vibrate?.([100, 60, 160]);
      await onOrdersChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cerrar la entrega.');
    } finally {
      setCompletingId('');
    }
  };

  if (!deviceToken) {
    return (
      <section className="rounded-[28px] border border-amber-100 bg-amber-50 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <Smartphone className="mt-0.5 flex-shrink-0 text-amber-600" size={22} />
          <div>
            <p className="text-xs font-black uppercase text-amber-700">Celular sin habilitar</p>
            <p className="mt-1 text-[10px] font-bold leading-relaxed text-amber-700/75">
              Abre en este teléfono el enlace creado desde Admin → Reparto. El panel normal sigue disponible, pero el GPS automático está apagado.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[30px] border border-blue-100 bg-white shadow-sm">
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500 text-white shadow-lg shadow-blue-950/30">
              <Bike size={24} />
            </div>
            <div>
              <p className="text-xs font-black uppercase italic">{device?.name || 'Validando celular'}</p>
              <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-white/45">
                {activeSessions.length} ruta{activeSessions.length !== 1 ? 's' : ''} activa{activeSessions.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[8px] font-black uppercase ${online ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
              {online ? <Wifi size={12} /> : <WifiOff size={12} />}
              {online ? 'En línea' : 'Sin red'}
            </span>
            <button
              type="button"
              onClick={() => void refreshDevice()}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white/70"
              aria-label="Actualizar GPS"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-white/10 p-3">
            <Radio size={14} className={gpsActive ? 'text-emerald-300' : 'text-white/35'} />
            <p className="mt-2 text-[8px] font-black uppercase text-white/40">GPS</p>
            <p className="mt-1 text-[10px] font-black">{gpsActive ? 'Activo' : 'En espera'}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <Crosshair size={14} className="text-blue-300" />
            <p className="mt-2 text-[8px] font-black uppercase text-white/40">Precisión</p>
            <p className="mt-1 text-[10px] font-black">{gpsAccuracy ? `${gpsAccuracy} m` : '--'}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <BatteryCharging size={14} className="text-amber-300" />
            <p className="mt-2 text-[8px] font-black uppercase text-white/40">Batería</p>
            <p className="mt-1 text-[10px] font-black">
              {typeof device?.battery_percent === 'number' ? `${device.battery_percent}%` : '--'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {!storePoint ? (
          <div className="rounded-[24px] border border-orange-100 bg-orange-50 p-4">
            <div className="flex items-start gap-3">
              <MapPin size={20} className="mt-0.5 flex-shrink-0 text-orange-600" />
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase text-orange-700">Configuración inicial</p>
                <p className="mt-1 text-[10px] font-bold leading-relaxed text-orange-700/70">
                  Estando físicamente en El Mirador, guarda aquí el punto de salida. Solo se hace una vez por celular.
                </p>
                <button
                  type="button"
                  onClick={saveStoreHere}
                  disabled={savingStore}
                  className="mt-3 flex items-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-[9px] font-black uppercase text-white disabled:opacity-50"
                >
                  {savingStore ? <LoaderCircle size={14} className="animate-spin" /> : <LocateFixed size={14} />}
                  Guardar El Mirador aquí
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={17} className="text-emerald-600" />
              <div>
                <p className="text-[9px] font-black uppercase text-emerald-700">El Mirador guardado</p>
                <p className="mt-0.5 text-[8px] font-bold text-emerald-700/60">
                  Precisión inicial {Math.round(storePoint.accuracyM)} m
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={saveStoreHere}
              className="rounded-xl bg-white px-3 py-2 text-[8px] font-black uppercase text-emerald-600 shadow-sm"
            >
              Recalibrar
            </button>
          </div>
        )}

        {message && (
          <div className="flex items-start gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-blue-700">
            <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
            <p className="text-[10px] font-bold leading-relaxed">{message}</p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 p-3 text-red-600">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <p className="text-[10px] font-bold leading-relaxed">{error}</p>
          </div>
        )}

        {activeSessions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Route size={16} className="text-blue-500" />
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Rutas activas</p>
            </div>
            {activeSessions.map(session => (
              <div key={session.id} className={`rounded-2xl border p-3 ${statusTone(session.status)}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase">{session.order_code}</p>
                    <p className="mt-1 text-[9px] font-bold uppercase opacity-75">
                      {trackingStatusLabel(session.status)}
                    </p>
                  </div>
                  {session.status === 'arrived' ? (
                    <button
                      type="button"
                      onClick={() => void completeSession(session)}
                      disabled={completingId === session.id}
                      className="flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-[8px] font-black uppercase text-white disabled:opacity-50"
                    >
                      {completingId === session.id ? <LoaderCircle size={13} className="animate-spin" /> : <PackageCheck size={13} />}
                      Entregado
                    </button>
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/70">
                      {session.status === 'packing' ? <Smartphone size={15} /> : <Navigation size={15} />}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {readyOrders.filter(order => !activeSessions.some(session => session.order_code === order.order_code)).length > 0 && (
          <div className="space-y-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Pedidos listos para tomar</p>
            {readyOrders
              .filter(order => !activeSessions.some(session => session.order_code === order.order_code))
              .map(order => (
                <div key={order.id} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3">
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-800">{order.order_code}</p>
                    <p className="mt-1 text-[8px] font-bold uppercase text-gray-400">Listo para reparto</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void startSession(order)}
                    disabled={!storePoint || startingCode === order.order_code}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-[8px] font-black uppercase text-white disabled:opacity-40"
                  >
                    {startingCode === order.order_code ? <LoaderCircle size={13} className="animate-spin" /> : <Navigation size={13} />}
                    Iniciar GPS
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </section>
  );
}
