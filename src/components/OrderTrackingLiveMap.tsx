import { Bike, Clock3, MapPinned, RefreshCw, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  readPublicTracking,
  trackingStatusLabel,
  type PublicTracking,
} from '../utils/deliveryTrackingApi';
import { getOrderCredential } from '../utils/orderCredentials';
import InteractiveRasterMap, {
  type RasterLatLng,
  type RasterMarker,
} from './InteractiveRasterMap';

interface Props {
  orderCode: string;
  orderStatus?: string | null;
}

const validPoint = (lat: unknown, lng: unknown): RasterLatLng | null => {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { lat: latitude, lng: longitude };
};

const fitView = (points: RasterLatLng[]) => {
  if (points.length === 0) {
    return { center: { lat: -0.7439, lng: -90.3131 }, zoom: 15 };
  }

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
    center: {
      lat: (minLat + maxLat) / 2,
      lng: (minLng + maxLng) / 2,
    },
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

export default function OrderTrackingLiveMap({ orderCode, orderStatus }: Props) {
  const credential = useMemo(() => getOrderCredential(orderCode), [orderCode]);
  const [tracking, setTracking] = useState<PublicTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewCenter, setViewCenter] = useState<RasterLatLng>({
    lat: -0.7439,
    lng: -90.3131,
  });
  const [viewZoom, setViewZoom] = useState(15);
  const manualViewRef = useRef(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!credential) {
        setLoading(false);
        return;
      }

      try {
        const result = await readPublicTracking(
          orderCode,
          credential.trackingToken,
          signal
        );
        setTracking(result);
        setError('');
      } catch (cause) {
        if ((cause as Error)?.name === 'AbortError') return;
        setError(
          cause instanceof Error
            ? cause.message
            : 'No se pudo actualizar el GPS del pedido.'
        );
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
    : null;
  const customer = trackingData
    ? validPoint(trackingData.customer.latitude, trackingData.customer.longitude)
    : null;
  const rider = trackingData?.current
    ? validPoint(trackingData.current.latitude, trackingData.current.longitude)
    : null;

  const path = useMemo(() => {
    const values = (trackingData?.path || [])
      .map(point => validPoint(point.latitude, point.longitude))
      .filter((point): point is RasterLatLng => Boolean(point));

    if (values.length === 0 && store) values.push(store);
    if (rider && !values.some(point => point.lat === rider.lat && point.lng === rider.lng)) {
      values.push(rider);
    }
    return values.slice(-120);
  }, [rider, store, trackingData?.path]);

  const markers = useMemo<RasterMarker[]>(() => {
    const result: RasterMarker[] = [];
    if (store) result.push({ id: 'store', position: store, kind: 'store', label: 'El Mirador' });
    if (customer) result.push({ id: 'customer', position: customer, kind: 'customer', label: 'Tu entrega' });
    if (rider) result.push({ id: 'rider', position: rider, kind: 'rider', label: 'Repartidor' });
    return result;
  }, [customer, rider, store]);

  useEffect(() => {
    if (manualViewRef.current) return;
    const points = [store, customer, rider].filter(
      (point): point is RasterLatLng => Boolean(point)
    );
    const fitted = fitView(points);
    setViewCenter(fitted.center);
    setViewZoom(fitted.zoom);
  }, [customer, rider, store]);

  if (!credential) {
    return (
      <div className="mt-3 rounded-[18px] border border-slate-100 bg-slate-50 px-3 py-3">
        <div className="flex items-center gap-2.5">
          <MapPinned size={16} className="text-slate-400" />
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-600">
              Rastreo GPS
            </p>
            <p className="mt-0.5 text-[9px] font-bold leading-snug text-slate-400">
              El mapa seguro está disponible en el dispositivo donde se realizó el pedido.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !tracking) {
    return (
      <div className="mt-3 flex items-center justify-center gap-2 rounded-[18px] border border-orange-100 bg-orange-50/60 px-3 py-3 text-orange-600">
        <RefreshCw size={14} className="animate-spin" />
        <p className="text-[8px] font-black uppercase tracking-widest">Conectando con el GPS…</p>
      </div>
    );
  }

  if (!tracking?.active || !trackingData) {
    return (
      <div className="mt-3 overflow-hidden rounded-[18px] border border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-2xl bg-white text-orange-500 shadow-sm">
            <MapPinned size={17} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-orange-600">
              Mapa integrado
            </p>
            <p className="mt-0.5 text-[10px] font-black leading-snug text-slate-800">
              {orderStatus === 'Enviado'
                ? 'Esperando la primera ubicación del repartidor.'
                : 'Se activará cuando el repartidor inicie la ruta.'}
            </p>
          </div>
        </div>
        {error && (
          <p className="mt-2 text-[8px] font-bold text-red-500">{error}</p>
        )}
      </div>
    );
  }

  const capturedAt =
    trackingData.current?.capturedAt || trackingData.updatedAt || tracking.order.updatedAt;

  return (
    <div className="mt-3 overflow-hidden rounded-[19px] border border-blue-100 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-blue-50 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-100">
            <Bike size={15} />
          </div>
          <div className="min-w-0">
            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-blue-600">
              Mapa en vivo
            </p>
            <p className="truncate text-[10px] font-black text-slate-900">
              {trackingStatusLabel(trackingData.status)} · {trackingData.riderName}
            </p>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1 text-[7px] font-black uppercase text-slate-400">
          <Clock3 size={11} /> {relativeTime(capturedAt)}
        </div>
      </div>

      <div className="relative h-[172px] bg-slate-100">
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

      {error && (
        <div className="flex items-center gap-2 bg-red-50 px-3 py-2 text-[8px] font-bold text-red-600">
          <WifiOff size={13} /> {error}
        </div>
      )}
    </div>
  );
}
