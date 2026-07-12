import { Bike, Clock3, MapPinned, RefreshCw, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  readPublicTracking,
  trackingStatusLabel,
  type PublicTracking,
} from '../utils/deliveryTrackingApi';
import { getOrderCredential } from '../utils/orderCredentials';
import { STORE_LOCATION } from '../utils/commerce';
import InteractiveRasterMap, {
  type RasterLatLng,
  type RasterMarker,
} from './InteractiveRasterMap';

interface Props {
  orderCode: string;
  orderStatus?: string | null;
  customerLat?: number | null;
  customerLng?: number | null;
}

const validPoint = (lat: unknown, lng: unknown): RasterLatLng | null => {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { lat: latitude, lng: longitude };
};

const fitView = (points: RasterLatLng[]) => {
  if (points.length === 0) return { center: STORE_LOCATION, zoom: 15 };
  const lats = points.map(point => point.lat);
  const lngs = points.map(point => point.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const span = Math.max(maxLat - minLat, (maxLng - minLng) * 0.95);

  let zoom = 18;
  if (span > 0.08) zoom = 12;
  else if (span > 0.04) zoom = 13;
  else if (span > 0.02) zoom = 14;
  else if (span > 0.01) zoom = 15;
  else if (span > 0.005) zoom = 16;
  else if (span > 0.0025) zoom = 17;

  return {
    center: { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 },
    zoom,
  };
};

const relativeTime = (value?: string | null) => {
  if (!value) return 'Esperando ubicación';
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'Actualizando';
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 10) return 'Ahora mismo';
  if (seconds < 60) return `Hace ${seconds} s`;
  return `Hace ${Math.floor(seconds / 60)} min`;
};

export default function OrderTrackingLiveMap({
  orderCode,
  orderStatus,
  customerLat,
  customerLng,
}: Props) {
  const credential = useMemo(() => getOrderCredential(orderCode), [orderCode]);
  const [tracking, setTracking] = useState<PublicTracking | null>(null);
  const [loading, setLoading] = useState(Boolean(credential));
  const [error, setError] = useState('');
  const [viewCenter, setViewCenter] = useState<RasterLatLng>(STORE_LOCATION);
  const [viewZoom, setViewZoom] = useState(15);
  const manualViewRef = useRef(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!credential) {
        setLoading(false);
        return;
      }

      try {
        const result = await readPublicTracking(orderCode, credential.trackingToken, signal);
        setTracking(result);
        setError('');
      } catch (cause) {
        if ((cause as Error)?.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el GPS del pedido.');
      } finally {
        setLoading(false);
      }
    },
    [credential, orderCode]
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const timer = window.setInterval(() => void load(), 5000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [load]);

  const trackingData = tracking?.tracking;
  const store = trackingData
    ? validPoint(trackingData.store.latitude, trackingData.store.longitude)
    : STORE_LOCATION;
  const customer = trackingData
    ? validPoint(trackingData.customer.latitude, trackingData.customer.longitude)
    : validPoint(customerLat, customerLng);
  const rider = trackingData?.current
    ? validPoint(trackingData.current.latitude, trackingData.current.longitude)
    : null;

  const path = useMemo(() => {
    const values = (trackingData?.path || [])
      .map(point => validPoint(point.latitude, point.longitude))
      .filter((point): point is RasterLatLng => Boolean(point));

    if (values.length === 0 && store) values.push(store);
    if (rider && !values.some(point => point.lat === rider.lat && point.lng === rider.lng)) values.push(rider);
    if (!rider && customer && !values.some(point => point.lat === customer.lat && point.lng === customer.lng)) values.push(customer);
    return values.slice(-120);
  }, [customer, rider, store, trackingData?.path]);

  const markers = useMemo<RasterMarker[]>(() => {
    const result: RasterMarker[] = [];
    if (store) result.push({ id: 'store', position: store, kind: 'store', label: 'El Mirador' });
    if (customer) result.push({ id: 'customer', position: customer, kind: 'customer', label: 'Tu entrega' });
    if (rider) result.push({ id: 'rider', position: rider, kind: 'rider', label: 'Repartidor' });
    return result;
  }, [customer, rider, store]);

  useEffect(() => {
    if (manualViewRef.current) return;
    const points = [store, customer, rider].filter((point): point is RasterLatLng => Boolean(point));
    const fitted = fitView(points);
    setViewCenter(fitted.center);
    setViewZoom(fitted.zoom);
  }, [customer, rider, store]);

  if (!customer) {
    return (
      <div className="mt-3 rounded-[18px] border border-slate-100 bg-slate-50 px-3 py-3">
        <div className="flex items-center gap-2.5">
          <MapPinned size={16} className="text-slate-400" />
          <p className="text-[9px] font-bold text-slate-500">Falta una ubicación válida para dibujar la ruta.</p>
        </div>
      </div>
    );
  }

  const active = Boolean(tracking?.active && trackingData);
  const capturedAt = active
    ? trackingData?.current?.capturedAt || trackingData?.updatedAt || tracking?.order.updatedAt
    : null;
  const statusText = active && trackingData
    ? `${trackingStatusLabel(trackingData.status)} · ${trackingData.riderName}`
    : orderStatus === 'Enviado'
      ? 'Esperando la primera ubicación del repartidor'
      : 'Ruta estimada · preparando tu pedido';

  return (
    <div className="mt-3 overflow-hidden rounded-[19px] border border-blue-100 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-blue-50 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <div className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-xl text-white shadow-md ${active ? 'bg-blue-600 shadow-blue-100' : 'bg-orange-500 shadow-orange-100'}`}>
            {active ? <Bike size={15} /> : <MapPinned size={15} />}
          </div>
          <div className="min-w-0">
            <p className={`text-[8px] font-black uppercase tracking-[0.14em] ${active ? 'text-blue-600' : 'text-orange-600'}`}>
              {active ? 'Mapa en vivo' : 'Mapa del pedido'}
            </p>
            <p className="truncate text-[10px] font-black text-slate-900">{statusText}</p>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1 text-[7px] font-black uppercase text-slate-400">
          {loading ? <RefreshCw size={11} className="animate-spin" /> : <Clock3 size={11} />}
          {active ? relativeTime(capturedAt) : 'Desde ahora'}
        </div>
      </div>

      <div className="relative h-[190px] bg-slate-100">
        <InteractiveRasterMap
          center={viewCenter}
          zoom={viewZoom}
          minZoom={12}
          maxZoom={19}
          markers={markers}
          path={path}
          showControls
          interactive
          onViewChange={(nextCenter, nextZoom, final) => {
            setViewCenter(nextCenter);
            setViewZoom(nextZoom);
            if (final) manualViewRef.current = true;
          }}
        />
      </div>

      {!active && (
        <div className="bg-orange-50 px-3 py-2 text-[8px] font-bold text-orange-700">
          La línea muestra la ruta estimada entre El Mirador y tu punto. La moto aparecerá cuando un repartidor sea asignado.
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-50 px-3 py-2 text-[8px] font-bold text-red-600">
          <WifiOff size={13} /> {error}
        </div>
      )}
    </div>
  );
}
