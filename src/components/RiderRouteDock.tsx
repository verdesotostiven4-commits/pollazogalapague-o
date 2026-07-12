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

type SourceEvent = {
  id: string;
  order_code: string;
  product_id?: string | null;
  item_name: string;
  actual_source: 'mirador' | 'cascada';
  created_at: string;
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

const coordinateOf = (order: Order): MapPoint | null => {
  if (order.lat === null || order.lat === undefined || order.lat === '') return null;
  if (order.lng === null || order.lng === undefined || order.lng === '') return null;
  const latitude = Number(order.lat);
  const longitude = Number(order.lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
};

const distanceMeters = (a: MapPoint, b: MapPoint) => {
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

const optimizeOrders = (source: Order[], start: MapPoint | null) => {
  if (!start || source.length <= 1) return [...source];

  const remaining = [...source];
  const optimized: Order[] = [];
  let cursor = start;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    remaining.forEach((order, index) => {
      const point = coordinateOf(order);
      if (!point) return;
      const distance = distanceMeters(cursor, point);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    const [next] = remaining.splice(nearestIndex, 1);
    optimized.push(next);
    cursor = coordinateOf(next) || cursor;
  }

  return optimized;
};

const itemProductId = (item: OrderItem) =>
  String(item.product_id || item.product?.id || item.cart_item_id || item.id || '')
    .trim()
    .toLowerCase();

const itemName = (item: OrderItem) =>
  String(item.name || item.product?.name || 'Producto').trim();

const itemKey = (orderCode: string, item: OrderItem) =>
  `${orderCode.toUpperCase()}::${itemProductId(item) || itemName(item).toLowerCase()}`;

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
        point: MapPoint;
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
  const [sourceEvents, setSourceEvents] = useState<SourceEvent[]>([]);
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

  const assignedCodes = useMemo(
    () => assignedOrders.map(order => order.order_code).filter(Boolean).join(','),
    [assignedOrders]
  );

  useEffect(() => {
    if (!assignedCodes) {
      setSourceEvents([]);
      return;
    }

    let cancelled = false;
    const loadSources = async () => {
      try {
        const response = await fetch(
          `/api/order-sources?orderCodes=${encodeURIComponent(assignedCodes)}`,
          { credentials: 'same-origin', cache: 'no-store' }
        );
        const payload = await response.json().catch(() => ({})) as {
          ok?: boolean;
          events?: SourceEvent[];
          setupRequired?: boolean;
        };
        if (!cancelled && response.ok && payload.ok) {
          setSourceEvents(Array.isArray(payload.events) ? payload.events : []);
        }
      } catch {
        // Si la auditoría aún no está activa, se usa el origen original del producto.
      }
    };

    void loadSources();
    const timer = window.setInterval(() => void loadSources(), 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [assignedCodes]);

  const latestSourceByItem = useMemo(() => {
    const map = new Map<string, SourceEvent>();
    sourceEvents.forEach(event => {
      const key = `${event.order_code.toUpperCase()}::${String(event.product_id || '').toLowerCase() || event.item_name.toLowerCase()}`;
      if (!map.has(key)) map.set(key, event);
    });
    return map;
  }, [sourceEvents]);

  const cascadaItemsFor = useCallback(
    (order: Order) =>
      (order.items || []).filter(item => {
        const plannedCascada = itemProductId(item).startsWith('cascada-');
        const event = latestSourceByItem.get(itemKey(order.order_code, item));
        return event ? event.actual_source === 'cascada' : plannedCascada;
      }),
    [latestSourceByItem]
  );

  const totalCascadaItems = assignedOrders.reduce(
    (total, order) => total + cascadaItemsFor(order).length,
    0
  );
  const routeNeedsCascada = totalCascadaItems > 0;

  const routeOrders = useMemo(() => {
    const devicePoint =
      typeof device?.current_lat === 'number' &&
      typeof device?.current_lng === 'number'
        ? {
            latitude: device.current_lat,
            longitude: device.current_lng,
          }
        : null;

    const start = routeNeedsCascada && cascadaPoint ? cascadaPoint : devicePoint;
    return optimizeOrders(assignedOrders, start);
  }, [
    assignedOrders,
    cascadaPoint,
    device?.current_lat,
    device?.current_lng,
    routeNeedsCascada,
  ]);

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

  if (routeOrders.length === 0 && !error) {
    return null;
  }

  return (
    <section className="mb-4 overflow-hidden rounded-[28px] border border-violet-100 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-violet-700 to-blue-700 p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15">
            <Route size={22} />
          </div>
          <div>
            <p className="text-xs font-black uppercase italic">Ruta optimizada</p>
            <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-white/55">
              {routeOrders.length} entrega{routeOrders.length !== 1 ? 's' : ''} ordenada{routeOrders.length !== 1 ? 's' : ''} por cercanía
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
              <p className="text-[9px] font-black uppercase">Primera parada interna: La Cascada</p>
              <p className="mt-1 text-[9px] font-bold leading-relaxed text-red-700/70">
                Hay {totalCascadaItems} producto{totalCascadaItems !== 1 ? 's' : ''} que deben recogerse allí. Esta parada solo la ve el equipo.
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

        {routeOrders.length > 1 && (
          <button
            type="button"
            onClick={() =>
              openMaps(routeOrders, cascadaPoint, routeNeedsCascada)
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
          {routeOrders.map((order, index) => {
            const sourceItems = cascadaItemsFor(order);
            const needsCascada = sourceItems.length > 0;
            return (
              <article
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-violet-100 text-[9px] font-black text-violet-700">
                      {index + 1}
                    </span>
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

        {loading && routeOrders.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-3 text-[9px] font-black uppercase text-gray-400">
            <LoaderCircle size={15} className="animate-spin" />
            Preparando rutas
          </div>
        )}
      </div>
    </section>
  );
}
