import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  BellRing,
  Bike,
  CheckCircle2,
  Clock3,
  LocateFixed,
  MapPin,
  Navigation,
  PackageCheck,
  Play,
  Radio,
  RefreshCw,
  Route,
  ShieldCheck,
  Store,
  Volume2,
  VolumeX,
  Wifi,
} from 'lucide-react';
import {
  formatTrackingTime,
  trackingStatusUi,
  type PublicTrackingPayload,
  type PublicTrackingPoint,
  type PublicTrackingStatus,
} from '../utils/customerTrackingMap';

type Mode = 'demo' | 'real';

type MapPoint = {
  latitude: number;
  longitude: number;
};

const STORE: MapPoint = { latitude: -0.7422, longitude: -90.3134 };
const CUSTOMER: MapPoint = { latitude: -0.7391, longitude: -90.3047 };

const DEMO_PATH: PublicTrackingPoint[] = Array.from({ length: 28 }, (_, index) => {
  const progress = index / 27;
  const curve = Math.sin(progress * Math.PI) * 0.0012;
  return {
    latitude: STORE.latitude + (CUSTOMER.latitude - STORE.latitude) * progress + curve,
    longitude: STORE.longitude + (CUSTOMER.longitude - STORE.longitude) * progress,
    accuracy_m: 12,
    captured_at: new Date(Date.now() - (27 - index) * 4500).toISOString(),
  };
});

const asCoordinates = (point: MapPoint): [number, number] => [
  point.longitude,
  point.latitude,
];

const markerElement = (emoji: string, label: string, tone: string) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'tracking-map-marker';
  wrapper.style.display = 'grid';
  wrapper.style.placeItems = 'center';
  wrapper.style.width = '42px';
  wrapper.style.height = '42px';
  wrapper.style.borderRadius = '50%';
  wrapper.style.border = '3px solid white';
  wrapper.style.background = tone;
  wrapper.style.boxShadow = '0 10px 28px rgba(15,23,42,.28)';
  wrapper.style.fontSize = '21px';
  wrapper.style.userSelect = 'none';
  wrapper.setAttribute('aria-label', label);
  wrapper.textContent = emoji;
  return wrapper;
};

const emptyRoute = {
  type: 'Feature' as const,
  properties: {},
  geometry: {
    type: 'LineString' as const,
    coordinates: [] as [number, number][],
  },
};

export default function CustomerTrackingMapLab() {
  const [mode, setMode] = useState<Mode>('demo');
  const [status, setStatus] = useState<PublicTrackingStatus>('packing');
  const [path, setPath] = useState<PublicTrackingPoint[]>(DEMO_PATH.slice(0, 1));
  const [store, setStore] = useState<MapPoint>(STORE);
  const [customer, setCustomer] = useState<MapPoint>(CUSTOMER);
  const [current, setCurrent] = useState<MapPoint>(STORE);
  const [riderName, setRiderName] = useState('Repartidor Pollazo');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(new Date().toISOString());
  const [orderCode, setOrderCode] = useState('');
  const [trackingToken, setTrackingToken] = useState('');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoIndex, setDemoIndex] = useState(0);

  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const storeMarkerRef = useRef<maplibregl.Marker | null>(null);
  const customerMarkerRef = useRef<maplibregl.Marker | null>(null);
  const riderMarkerRef = useRef<maplibregl.Marker | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const previousStatusRef = useRef<PublicTrackingStatus>('packing');

  const ui = trackingStatusUi[status];

  const beep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audio = audioRef.current || new AudioContext();
      audioRef.current = audio;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.frequency.value = 720;
      gain.gain.setValueAtTime(0.0001, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, audio.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.22);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.24);
      navigator.vibrate?.(80);
    } catch {
      // El sonido es opcional.
    }
  }, [soundEnabled]);

  useEffect(() => {
    if (previousStatusRef.current !== status) {
      beep();
      previousStatusRef.current = status;
    }
  }, [beep, status]);

  useEffect(() => {
    if (!mapNodeRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapNodeRef.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: asCoordinates(STORE),
      zoom: 14.2,
      attributionControl: false,
      pitch: 38,
      bearing: -12,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    map.on('load', () => {
      map.addSource('pollazo-route', {
        type: 'geojson',
        data: emptyRoute,
      });
      map.addLayer({
        id: 'pollazo-route-glow',
        type: 'line',
        source: 'pollazo-route',
        paint: {
          'line-color': '#f97316',
          'line-width': 12,
          'line-opacity': 0.16,
          'line-blur': 5,
        },
      });
      map.addLayer({
        id: 'pollazo-route-line',
        type: 'line',
        source: 'pollazo-route',
        paint: {
          'line-color': '#f97316',
          'line-width': 5,
          'line-opacity': 0.95,
        },
      });
    });

    storeMarkerRef.current = new maplibregl.Marker({
      element: markerElement('🍗', 'El Mirador', '#f97316'),
      anchor: 'center',
    })
      .setLngLat(asCoordinates(STORE))
      .addTo(map);

    customerMarkerRef.current = new maplibregl.Marker({
      element: markerElement('🏠', 'Cliente', '#7c3aed'),
      anchor: 'center',
    })
      .setLngLat(asCoordinates(CUSTOMER))
      .addTo(map);

    riderMarkerRef.current = new maplibregl.Marker({
      element: markerElement('🛵', 'Repartidor', '#0f172a'),
      anchor: 'center',
    })
      .setLngLat(asCoordinates(STORE))
      .addTo(map);

    mapRef.current = map;

    return () => {
      storeMarkerRef.current?.remove();
      customerMarkerRef.current?.remove();
      riderMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    storeMarkerRef.current?.setLngLat(asCoordinates(store));
    customerMarkerRef.current?.setLngLat(asCoordinates(customer));
    riderMarkerRef.current?.setLngLat(asCoordinates(current));

    const updateRoute = () => {
      const source = map.getSource('pollazo-route') as GeoJSONSource | undefined;
      source?.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: path.map(point => [point.longitude, point.latitude]),
        },
      });
    };

    if (map.isStyleLoaded()) updateRoute();
    else map.once('load', updateRoute);
  }, [current, customer, path, store]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const bounds = new maplibregl.LngLatBounds();
    bounds.extend(asCoordinates(store));
    bounds.extend(asCoordinates(customer));
    path.forEach(point => bounds.extend([point.longitude, point.latitude]));
    map.fitBounds(bounds, {
      padding: { top: 90, right: 55, bottom: 120, left: 55 },
      duration: 700,
      maxZoom: 16,
    });
  }, [customer, store]);

  const resetDemo = useCallback(() => {
    setMode('demo');
    setConnected(false);
    setError('');
    setStatus('packing');
    setPath(DEMO_PATH.slice(0, 1));
    setCurrent(STORE);
    setStore(STORE);
    setCustomer(CUSTOMER);
    setRiderName('Repartidor Pollazo');
    setDemoIndex(0);
    setDemoRunning(false);
    setLastUpdatedAt(new Date().toISOString());
  }, []);

  useEffect(() => {
    if (!demoRunning || mode !== 'demo') return;

    const timer = window.setInterval(() => {
      setDemoIndex(index => {
        const next = Math.min(DEMO_PATH.length - 1, index + 1);
        const point = DEMO_PATH[next];
        setPath(DEMO_PATH.slice(0, next + 1));
        setCurrent({ latitude: point.latitude, longitude: point.longitude });
        setLastUpdatedAt(new Date().toISOString());

        const progress = next / (DEMO_PATH.length - 1);
        if (progress >= 0.96) {
          setStatus('arrived');
          setDemoRunning(false);
        } else if (progress >= 0.78) {
          setStatus('nearby');
        } else if (progress >= 0.08) {
          setStatus('en_route');
        }

        return next;
      });
    }, 720);

    return () => window.clearInterval(timer);
  }, [demoRunning, mode]);

  const applyPayload = useCallback((payload: PublicTrackingPayload) => {
    if (!payload.ok) throw new Error(payload.error || 'No se pudo cargar el rastreo.');
    if (!payload.tracking) {
      setError('El pedido existe, pero todavía no tiene una ruta activa.');
      return;
    }

    const tracking = payload.tracking;
    const points = tracking.path || [];
    setStatus(tracking.status);
    setStore(tracking.store);
    setCustomer(tracking.customer);
    setRiderName(tracking.riderName || 'Repartidor Pollazo');
    setPath(points);

    const latest = tracking.current || points[points.length - 1];
    if (latest) {
      setCurrent({ latitude: latest.latitude, longitude: latest.longitude });
    }

    setLastUpdatedAt(tracking.updatedAt || tracking.current?.capturedAt || null);
    setError('');
    setConnected(true);
  }, []);

  const fetchRealTracking = useCallback(async () => {
    const code = orderCode.trim().toUpperCase();
    const token = trackingToken.trim();
    if (!code || !token) {
      setError('Escribe el código y el token seguro del pedido.');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        action: 'public',
        orderCode: code,
        trackingToken: token,
      });
      const response = await fetch(`/api/delivery-tracking?${params.toString()}`, {
        cache: 'no-store',
      });
      const payload = (await response.json().catch(() => ({}))) as PublicTrackingPayload;
      if (!response.ok && !payload.setupRequired) {
        throw new Error(payload.error || 'No se pudo consultar el pedido.');
      }
      if (payload.setupRequired) {
        setError('El mapa ya está listo en código; falta activar las tablas de rastreo en Supabase.');
        return;
      }
      applyPayload(payload);
      setMode('real');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo consultar el rastreo.');
    } finally {
      setLoading(false);
    }
  }, [applyPayload, orderCode, trackingToken]);

  useEffect(() => {
    if (!connected || mode !== 'real') return;
    const timer = window.setInterval(() => {
      void fetchRealTracking();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [connected, fetchRealTracking, mode]);

  const statusSteps = useMemo(
    () => [
      { key: 'packing', label: 'Empacando', icon: PackageCheck },
      { key: 'en_route', label: 'En camino', icon: Bike },
      { key: 'nearby', label: 'Cerca', icon: Navigation },
      { key: 'arrived', label: 'Llegó', icon: MapPin },
      { key: 'delivered', label: 'Entregado', icon: CheckCircle2 },
    ],
    []
  );

  const rank = statusSteps.findIndex(step => step.key === status);

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/90 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-950/40">
              <Route size={22} />
            </div>
            <div>
              <p className="text-sm font-black uppercase italic">Mapa del cliente</p>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/40">Fase 6 · Experiencia en vivo</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSoundEnabled(value => !value)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/70"
            aria-label="Activar o desactivar sonidos"
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 p-4 pb-12">
        <section className="rounded-[28px] border border-emerald-400/15 bg-emerald-400/5 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 flex-shrink-0 text-emerald-300" size={22} />
            <div>
              <h1 className="text-lg font-black uppercase italic">Vista limpia para el cliente</h1>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-white/55">
                El cliente ve únicamente su pedido, el repartidor y el destino. Las recogidas internas en La Cascada permanecen ocultas.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="relative min-h-[560px] overflow-hidden rounded-[32px] border border-white/10 bg-slate-900 shadow-2xl shadow-black/30">
            <div ref={mapNodeRef} className="absolute inset-0" />

            <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-3">
              <div className="rounded-2xl border border-white/30 bg-slate-950/80 px-3 py-2 backdrop-blur-xl">
                <p className="text-[8px] font-black uppercase tracking-widest text-white/45">Estado actual</p>
                <p className="mt-1 text-sm font-black uppercase italic text-orange-300">{ui.label}</p>
              </div>
              <div className="rounded-2xl border border-white/30 bg-slate-950/80 px-3 py-2 text-right backdrop-blur-xl">
                <p className="text-[8px] font-black uppercase tracking-widest text-white/45">Actualización</p>
                <p className="mt-1 text-[10px] font-black text-emerald-300">{formatTrackingTime(lastUpdatedAt)}</p>
              </div>
            </div>

            <div className="absolute inset-x-3 bottom-3 z-10 rounded-[24px] border border-white/20 bg-slate-950/88 p-4 shadow-xl backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-orange-300">{riderName}</p>
                  <p className="mt-1 text-base font-black uppercase italic">{ui.message}</p>
                </div>
                <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-950/40">
                  <Bike size={23} />
                </div>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-yellow-300 transition-all duration-700"
                  style={{ width: `${ui.progress}%` }}
                />
              </div>

              <div className="mt-3 grid grid-cols-5 gap-1.5">
                {statusSteps.map((step, index) => {
                  const Icon = step.icon;
                  const done = rank >= index;
                  return (
                    <div key={step.key} className="text-center">
                      <div className={`mx-auto grid h-8 w-8 place-items-center rounded-full border transition ${done ? 'border-orange-400 bg-orange-500 text-white' : 'border-white/10 bg-white/5 text-white/25'}`}>
                        <Icon size={14} />
                      </div>
                      <p className={`mt-1 text-[7px] font-black uppercase ${done ? 'text-white/75' : 'text-white/25'}`}>{step.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <section className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2">
                <Play className="text-orange-300" size={19} />
                <h2 className="text-sm font-black uppercase italic">Demostración</h2>
              </div>
              <p className="mt-2 text-[11px] font-semibold leading-relaxed text-white/45">
                Simula el recorrido completo sin tocar pedidos ni ubicaciones reales.
              </p>
              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (demoIndex >= DEMO_PATH.length - 1) resetDemo();
                    setDemoRunning(true);
                  }}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-[10px] font-black uppercase shadow-lg shadow-orange-950/30"
                >
                  <Navigation size={15} />
                  Iniciar recorrido
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatus('delivered');
                    setDemoRunning(false);
                  }}
                  disabled={status !== 'arrived'}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/15 px-4 py-3 text-[10px] font-black uppercase text-emerald-200 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <CheckCircle2 size={15} />
                  Confirmar entrega manual
                </button>
                <button
                  type="button"
                  onClick={resetDemo}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-[10px] font-black uppercase text-white/65"
                >
                  <RefreshCw size={15} />
                  Reiniciar
                </button>
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2">
                <Radio className="text-blue-300" size={19} />
                <h2 className="text-sm font-black uppercase italic">Conectar pedido</h2>
              </div>
              <div className="mt-4 space-y-3">
                <input
                  value={orderCode}
                  onChange={event => setOrderCode(event.target.value)}
                  placeholder="Código PZ-..."
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-bold uppercase outline-none ring-blue-400 focus:ring-2"
                />
                <input
                  type="password"
                  value={trackingToken}
                  onChange={event => setTrackingToken(event.target.value)}
                  placeholder="Token seguro del pedido"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-bold outline-none ring-blue-400 focus:ring-2"
                />
                <button
                  type="button"
                  onClick={() => void fetchRealTracking()}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 py-3 text-[10px] font-black uppercase disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="animate-spin" size={15} /> : <Wifi size={15} />}
                  {loading ? 'Conectando' : 'Ver rastreo real'}
                </button>
              </div>

              {error && (
                <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-[10px] font-bold leading-relaxed text-amber-200">
                  {error}
                </div>
              )}
            </section>

            <section className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white/5 p-3">
                  <Store className="text-orange-300" size={18} />
                  <p className="mt-2 text-[8px] font-black uppercase tracking-widest text-white/35">Origen</p>
                  <p className="mt-1 text-xs font-black">El Mirador</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-3">
                  <LocateFixed className="text-violet-300" size={18} />
                  <p className="mt-2 text-[8px] font-black uppercase tracking-widest text-white/35">Destino</p>
                  <p className="mt-1 text-xs font-black">Cliente</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2 rounded-2xl bg-white/5 p-3 text-[10px] font-semibold text-white/45">
                <Clock3 size={15} className="text-blue-300" />
                Actualización automática cada 4 segundos.
              </div>
              <div className="mt-2 flex items-center gap-2 rounded-2xl bg-white/5 p-3 text-[10px] font-semibold text-white/45">
                <BellRing size={15} className="text-amber-300" />
                Sonido y vibración solo en cambios importantes.
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
