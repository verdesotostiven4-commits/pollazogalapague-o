import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  LoaderCircle,
  MapPin,
  Navigation,
  RefreshCw,
  Route,
  Store,
} from 'lucide-react';
import type { Order, OrderItem } from '../types';
import { trackingPost, type TrackingDevice } from '../utils/deliveryTrackingApi';

const DEVICE_TOKEN_KEY = 'pollazo_delivery_device_token_v1';

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

const mapsRouteUrl = (routeOrders: Order[]) => {
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

  const waypoints = points.slice(0, -1).slice(0, 8);
  if (waypoints.length > 0) {
    params.set(
      'waypoints',
      waypoints
        .map(entry => `${entry.point.latitude},${entry.point.longitude}`)
        .join('|')
    );
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

const openMaps = (orders: Order[]) => {
  const url = mapsRouteUrl(orders);
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
};

export default function RiderRouteDock({ orders }: Props) {
  const [device, setDevice] = useState<TrackingDevice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  if (!readToken()) return null;

  if (assignedOrders.length === 0 && !error) {
    return null;
  }

  const totalCascadaItems = assignedOrders.reduce(
    (total, order) => total + cascadaItems(order).length,
    0
  );

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

        {totalCascadaItems > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-3 text-red-700">
            <Store size={18} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[9px] font-black uppercase">Parada interna: La Cascada</p>
              <p className="mt-1 text-[9px] font-bold leading-relaxed text-red-700/70">
                Hay {totalCascadaItems} producto{totalCascadaItems !== 1 ? 's' : ''} de La Cascada. Recógelos antes de continuar hacia los clientes. Este aviso solo aparece para el equipo.
              </p>
            </div>
          </div>
        )}

        {assignedOrders.length > 1 && (
          <button
            type="button"
            onClick={() => openMaps(assignedOrders)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-[10px] font-black uppercase text-white shadow-lg shadow-violet-100 active:scale-[0.99]"
          >
            <Navigation size={16} />
            Abrir ruta completa
          </button>
        )}

        <div className="space-y-2">
          {assignedOrders.map(order => {
            const sourceItems = cascadaItems(order);
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
                    {sourceItems.length > 0 && (
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
                  onClick={() => openMaps([order])}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-[8px] font-black uppercase text-white"
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
