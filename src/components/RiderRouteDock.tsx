import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Navigation,
  RefreshCw,
  Route,
  Store,
} from 'lucide-react';
import type { Order, OrderItem } from '../types';
import { trackingPost, type TrackingDevice } from '../utils/deliveryTrackingApi';

const DEVICE_TOKEN_KEY = 'pollazo_delivery_device_token_v1';
const CASCADA_LOCATION_KEY = 'pollazo_delivery_cascada_location_v1';

type MapPoint = {
  latitude: number;
  longitude: number;
  accuracyM?: number;
  savedAt?: string;
};

type Props = {
  orders: Order[];
};

type DeviceResult = {
  ok: true;
  device: TrackingDevice;
};

type DevicesResult = {
  ok: true;
  devices: TrackingDevice[];
};

const readToken = () => {
  try {
    return String(localStorage.getItem(DEVICE_TOKEN_KEY) || '').trim();
  } catch {
    return '';
  }
};

const readCascadaPoint = (): MapPoint | null => {
  try {
    const raw = localStorage.getItem(CASCADA_LOCATION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const latitude = Number(parsed?.latitude);
    const longitude = Number(parsed?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return {
      latitude,
      longitude,
      accuracyM: Number(parsed?.accuracyM || 0),
      savedAt: String(parsed?.savedAt || ''),
    };
  } catch {
    return null;
  }
};

const coordinateOf = (order: Order) => {
  const latitude = Number(order.lat);
  const longitude = Number(order.lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
};

const itemProductId = (item: OrderItem) =>
  String(item.product_id || item.product?.id || item.id || '').trim().toLowerCase();

const cascadaItems = (order: Order) =>
  (order.items || []).filter(item => itemProductId(item).startsWith('cascada-'));

const mapsRouteUrl = (
  routeOrders: Order[],
  cascadaPoint: MapPoint | null,
  includeCascada: boolean
) => {
  const points = routeOrders
    .map(order => ({ order, point: coordinateOf(order) }))
    .filter(
      (entry): entry is {
        order: Order;
        point: { latitude: number; longitude: number };
      } => Boolean(entry.point)
    );

  const destination = points[points.length - 1];
  if (!destination) return '';

  const params = new URLSearchParams({
    api: '1',
    destination: `${destination.point.latitude},${destination.point.longitude}`,
    travelmode: 'driving',
    dir_action: 'navigate',
  });

  const waypointCoordinates: string[] = [];
  if (includeCascada && cascadaPoint) {
    waypointCoordinates.push(`${cascadaPoint.latitude},${cascadaPoint.longitude}`);
  }

  waypointCoordinates.push(
    ...points
      .slice(0, -1)
      .map(entry => `${entry.point.latitude},${entry.point.longitude}`)
  );

  if (waypointCoordinates.length > 0) {
    params.set('waypoints', waypointCoordinates.slice(0, 8).join('|'));
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

const openMaps = (
  orders: Order[],
  cascadaPoint: MapPoint | null,
  includeCascada: boolean
) => {
  const url = mapsRouteUrl(orders, cascadaPoint, includeCascada);
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
};

export default function RiderRouteDock({ orders }: Props) {
  const [device, setDevice] = useState<TrackingDevice | null>(null);
  const [cascadaPoint, setCascadaPoint] = useState<MapPoint | null>(readCascadaPoint);
  const [loading, setLoading] = useState(false);
  const [savingCascada, setSavingCascada] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadDevice = useCallback(async () => {
    const deviceToken = readToken();
    if (!deviceToken) return;

    setLoading(true);
    try {
      const heartbeat = await trackingPost<DeviceResult>('heartbeat', {
        deviceToken,
      });
      const listed = await trackingPost<DevicesResult>('list_devices');
      const current = (listed.devices || []).find(
        item => item.id === heartbeat.device.id
      );
      setDevice(current || heartbeat.device);
      setError('');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No se pudieron preparar las rutas.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDevice();
    const timer = window.setInterval(() => void loadDevice(), 15_000);
    return () => window.clearInterval(timer);
  }, [loadDevice]);

  const assignedOrders = useMemo(() => {
    const activeCodes = new Set(
      (device?.activeOrders || []).map(session => session.order_code)
    );

    return orders
      .filter(
        order =>
          activeCodes.has(order.order_code) &&
          order.delivery_type !== 'retiro' &&
          Boolean(coordinateOf(order))
      )
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
  }, [device?.activeOrders, orders]);

  const saveCascadaHere = () => {
    if (!window.confirm('¿Estás físicamente en La Cascada y deseas guardar este punto?')) {
      return;
    }

    if (!navigator.geolocation) {
      setError('Este celular no tiene geolocalización disponible.');
      return;
    }

    setSavingCascada(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      position => {
        if (position.coords.accuracy > 100) {
          setSavingCascada(false);
          setError('La ubicación es poco precisa. Acércate al exterior y vuelve a intentarlo.');
          return;
        }

        const point: MapPoint = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyM: position.coords.accuracy,
          savedAt: new Date().toISOString(),
        };

        try {
          localStorage.setItem(CASCADA_LOCATION_KEY, JSON.stringify(point));
        } catch {
          // El punto continúa disponible durante esta sesión.
        }

        setCascadaPoint(point);
        setSavingCascada(false);
        setMessage('La Cascada quedó guardada como primera parada de las rutas internas.');
      },
      geoError => {
        setSavingCascada(false);
        setError(
          geoError.code === geoError.PERMISSION_DENIED
            ? 'Permite la ubicación para guardar La Cascada.'
            : 'No se pudo obtener una ubicación precisa de La Cascada.'
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 1_000 }
    );
  };

  if (!readToken()) return null;

  if (assignedOrders.length === 0 && !error) {
    return null;
  }

  const totalCascadaItems = assignedOrders.reduce(
    (total, order) => total + cascadaItems(order).length,
    0
  );
  const routeNeedsCascada = totalCascadaItems > 0;

  return (
    <section className="mb-4 overflow-hidden rounded-[28px] border border-violet-100 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-violet-700 to-blue-700 p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15">
            <Route size={22} />
          </div>
          <div>
            <p className="text-xs font-black uppercase italic">Ruta del repartidor</p>
            <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-white/55">
              {assignedOrders.length} entrega{assignedOrders.length !== 1 ? 's' : ''} asignada{assignedOrders.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadDevice()}
          className="grid h-9 w-9 place-items-center rounded-xl bg-white/10"
          aria-label="Actualizar rutas"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="space-y-3 p-4">
        {error && (
          <div className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 p-3 text-red-600">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <p className="text-[10px] font-bold leading-relaxed">{error}</p>
          </div>
        )}

        {message && (
          <div className="flex items-start gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-emerald-700">
            <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
            <p className="text-[10px] font-bold leading-relaxed">{message}</p>
          </div>
        )}

        {routeNeedsCascada && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-3 text-red-700">
            <Store size={18} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[9px] font-black uppercase">Parada interna: La Cascada</p>
              <p className="mt-1 text-[9px] font-bold leading-relaxed text-red-700/70">
                Hay {totalCascadaItems} producto{totalCascadaItems !== 1 ? 's' : ''} de La Cascada. Esta parada solo la ve el equipo.
              </p>
              <button
                type="button"
                onClick={saveCascadaHere}
                disabled={savingCascada}
                className="mt-2 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[8px] font-black uppercase text-red-600 shadow-sm disabled:opacity-50"
              >
                {savingCascada ? (
                  <LoaderCircle size={13} className="animate-spin" />
                ) : (
                  <LocateFixed size={13} />
                )}
                {cascadaPoint ? 'Recalibrar La Cascada' : 'Guardar La Cascada aquí'}
              </button>
            </div>
          </div>
        )}

        {assignedOrders.length > 1 && (
          <button
            type="button"
            onClick={() =>
              openMaps(assignedOrders, cascadaPoint, routeNeedsCascada)
            }
            disabled={routeNeedsCascada && !cascadaPoint}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-[10px] font-black uppercase text-white shadow-lg shadow-violet-100 active:scale-[0.99] disabled:opacity-40"
          >
            <Navigation size={16} />
            {routeNeedsCascada && cascadaPoint
              ? 'Abrir ruta: Cascada y clientes'
              : 'Abrir ruta completa'}
          </button>
        )}

        <div className="space-y-2">
          {assignedOrders.map(order => {
            const sourceItems = cascadaItems(order);
            const needsCascada = sourceItems.length > 0;
            return (
              <article
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[10px] font-black uppercase text-gray-900">
                      {order.order_code}
                    </p>
                    {needsCascada && (
                      <span className="rounded-full bg-red-100 px-2 py-1 text-[8px] font-black uppercase text-red-600">
                        Cascada · {sourceItems.length}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-[9px] font-bold text-gray-400">
                    <MapPin size={11} />
                    {order.reference || 'Ubicación guardada por el cliente'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => openMaps([order], cascadaPoint, needsCascada)}
                  disabled={needsCascada && !cascadaPoint}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-[8px] font-black uppercase text-white disabled:opacity-40"
                >
                  <Navigation size={13} />
                  Navegar
                </button>
              </article>
            );
          })}
        </div>

        {loading && assignedOrders.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-3 text-[9px] font-black uppercase text-gray-400">
            <LoaderCircle size={15} className="animate-spin" />
            Preparando rutas
          </div>
        )}
      </div>
    </section>
  );
}
