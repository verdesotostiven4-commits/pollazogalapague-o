import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bike,
  CheckCircle2,
  Crosshair,
  Gauge,
  LocateFixed,
  Lock,
  MapPin,
  Navigation,
  PackageCheck,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Route,
  Satellite,
  ShieldCheck,
  Signal,
  SignalZero,
  Smartphone,
  Store,
  Truck,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import {
  buildDemoRoute,
  confirmOrder,
  createTrackingState,
  DEFAULT_TRACKING_CONFIG,
  flushPendingUpdates,
  haversineDistanceM,
  markDelivered,
  pointAtDistance,
  processGpsSample,
  statusLabel,
  type GeoPoint,
  type TrackingAnchors,
  type TrackingState,
  type TrackingStatus,
} from '../utils/gpsTracking';

type LabMode = 'demo' | 'live';
type PermissionState = 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported';

type WakeLockLike = {
  release: () => Promise<void>;
  addEventListener?: (event: string, listener: () => void) => void;
};

const DEMO_STORE = {
  latitude: -0.7422,
  longitude: -90.3134,
};

const DEMO_ANCHORS: TrackingAnchors = {
  store: DEMO_STORE,
  customer: pointAtDistance(DEMO_STORE, 1_050, 82),
};

const statusTone: Record<TrackingStatus, string> = {
  waiting_confirmation: 'border-white/10 bg-white/5 text-white/55',
  packing: 'border-orange-400/25 bg-orange-400/10 text-orange-200',
  en_route: 'border-blue-400/25 bg-blue-400/10 text-blue-200',
  nearby: 'border-violet-400/25 bg-violet-400/10 text-violet-200',
  arrived: 'border-amber-400/25 bg-amber-400/10 text-amber-200',
  delivered: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
};

const permissionLabel: Record<PermissionState, string> = {
  idle: 'Sin solicitar',
  requesting: 'Solicitando permiso',
  granted: 'Ubicación permitida',
  denied: 'Ubicación rechazada',
  unsupported: 'No compatible',
};

const formatMeters = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) return '--';
  if (value < 1_000) return `${Math.round(value)} m`;
  return `${(value / 1_000).toFixed(2)} km`;
};

const formatCoordinate = (value: number) => value.toFixed(6);

export default function GpsTrackingLab() {
  const [mode, setMode] = useState<LabMode>('demo');
  const [anchors, setAnchors] = useState<TrackingAnchors>(DEMO_ANCHORS);
  const [tracker, setTracker] = useState<TrackingState>(() => createTrackingState());
  const trackerRef = useRef(tracker);
  const [events, setEvents] = useState<string[]>([
    'Laboratorio GPS listo. No modifica pedidos reales ni escribe ubicaciones en Supabase.',
  ]);
  const [permission, setPermission] = useState<PermissionState>('idle');
  const [watching, setWatching] = useState(false);
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const [simulateOffline, setSimulateOffline] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [demoIndex, setDemoIndex] = useState(0);
  const [lastRawPoint, setLastRawPoint] = useState<GeoPoint | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockLike | null>(null);
  const demoRouteRef = useRef<GeoPoint[]>(buildDemoRoute(DEMO_ANCHORS));

  const effectiveOnline = online && !simulateOffline;

  useEffect(() => {
    trackerRef.current = tracker;
  }, [tracker]);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setTracker(previous => {
        const next = flushPendingUpdates(previous);
        trackerRef.current = next;
        return next;
      });
      setEvents(previous => [
        'Internet recuperado: la cola pendiente fue sincronizada.',
        ...previous,
      ].slice(0, 14));
    };

    const handleOffline = () => {
      setOnline(false);
      setEvents(previous => [
        'Internet perdido: el GPS continúa y guarda puntos temporalmente.',
        ...previous,
      ].slice(0, 14));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleVisibility = async () => {
      if (
        document.visibilityState === 'visible' &&
        watching &&
        wakeLockActive &&
        !wakeLockRef.current
      ) {
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [watching, wakeLockActive]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      void wakeLockRef.current?.release();
    };
  }, []);

  const totalRouteM = useMemo(
    () => haversineDistanceM(anchors.store, anchors.customer),
    [anchors]
  );

  const routeProgress = useMemo(() => {
    if (tracker.distanceToCustomerM === null || totalRouteM <= 0) return 0;
    return Math.max(0, Math.min(100, 100 - (tracker.distanceToCustomerM / totalRouteM) * 100));
  }, [totalRouteM, tracker.distanceToCustomerM]);

  const addEvent = (message: string) => {
    setEvents(previous => [message, ...previous].slice(0, 14));
  };

  const commitTracker = (next: TrackingState) => {
    trackerRef.current = next;
    setTracker(next);
  };

  const applySample = (point: GeoPoint) => {
    setLastRawPoint(point);
    const result = processGpsSample(
      trackerRef.current,
      point,
      anchors,
      effectiveOnline
    );
    commitTracker(result.state);

    if (!result.accepted) {
      addEvent(result.state.lastDecision);
      return;
    }

    if (result.transitioned) {
      addEvent(`Cambio automático: ${statusLabel(result.state.status)}.`);
    } else if (result.state.acceptedSamples % 3 === 0) {
      addEvent(result.state.lastDecision);
    }

    if (result.shouldNotifyCustomer) {
      addEvent('Evento listo para avisar al cliente sin recargar su pantalla.');
    }
  };

  const confirmOrderManually = () => {
    const next = confirmOrder(trackerRef.current);
    commitTracker(next);
    addEvent('Administrador confirmó el pedido. Estado: Empacando.');
  };

  const deliverManually = () => {
    if (trackerRef.current.status !== 'arrived') {
      addEvent('Entrega bloqueada: primero debe detectarse la llegada al destino.');
      return;
    }

    const next = markDelivered(trackerRef.current);
    commitTracker(next);
    addEvent('Repartidor confirmó manualmente la entrega.');
    stopLiveTracking();
  };

  const resetTracking = (nextAnchors = anchors) => {
    stopLiveTracking();
    const next = createTrackingState();
    commitTracker(next);
    setLastRawPoint(null);
    setDemoIndex(0);
    demoRouteRef.current = buildDemoRoute(nextAnchors, Date.now());
    addEvent('Sesión reiniciada. Ningún pedido real fue afectado.');
  };

  const changeMode = (nextMode: LabMode) => {
    stopLiveTracking();
    setMode(nextMode);
    setPermission('idle');

    if (nextMode === 'demo') {
      setAnchors(DEMO_ANCHORS);
      resetTracking(DEMO_ANCHORS);
      addEvent('Modo demostración cargado con una ruta sintética.');
    } else {
      const next = createTrackingState();
      commitTracker(next);
      setDemoIndex(0);
      addEvent('Modo GPS real: primero registra el local y un destino de prueba.');
    }
  };

  const simulateNextPoint = () => {
    const route = demoRouteRef.current;
    if (demoIndex >= route.length) {
      addEvent('La ruta demostrativa terminó. La entrega continúa siendo manual.');
      return;
    }

    applySample(route[demoIndex]);
    setDemoIndex(index => index + 1);
  };

  const runDemoAutomatically = async () => {
    if (trackerRef.current.status === 'waiting_confirmation') {
      confirmOrderManually();
    }

    const route = demoRouteRef.current.slice(demoIndex);
    for (let index = 0; index < route.length; index += 1) {
      applySample(route[index]);
      setDemoIndex(previous => previous + 1);
      await new Promise(resolve => window.setTimeout(resolve, 280));
    }
  };

  const captureStoreLocation = () => {
    if (!navigator.geolocation) {
      setPermission('unsupported');
      addEvent('Este navegador no ofrece geolocalización.');
      return;
    }

    setPermission('requesting');
    navigator.geolocation.getCurrentPosition(
      position => {
        const store = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        const customer = pointAtDistance(store, 900, 82);
        const nextAnchors = { store, customer };
        setAnchors(nextAnchors);
        setPermission('granted');
        resetTracking(nextAnchors);
        addEvent('Ubicación actual guardada como El Mirador. Se creó un cliente de prueba a 900 m.');
      },
      error => {
        setPermission(error.code === error.PERMISSION_DENIED ? 'denied' : 'idle');
        addEvent(`No se pudo obtener la ubicación: ${error.message || 'error desconocido'}.`);
      },
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 2_000,
      }
    );
  };

  const moveDemoCustomer = (distanceM: number, bearingDeg: number) => {
    const customer = pointAtDistance(anchors.store, distanceM, bearingDeg);
    const nextAnchors = { ...anchors, customer };
    setAnchors(nextAnchors);
    resetTracking(nextAnchors);
    addEvent(`Destino de prueba colocado a ${distanceM} m del local.`);
  };

  const startLiveTracking = () => {
    if (!navigator.geolocation) {
      setPermission('unsupported');
      addEvent('Este navegador no admite rastreo GPS.');
      return;
    }

    if (watchIdRef.current !== null) return;
    setPermission('requesting');

    watchIdRef.current = navigator.geolocation.watchPosition(
      position => {
        setPermission('granted');
        setWatching(true);
        applySample({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyM: Math.max(1, position.coords.accuracy),
          timestamp: position.timestamp || Date.now(),
          speedMps: position.coords.speed,
          headingDeg: position.coords.heading,
        });
      },
      error => {
        if (error.code === error.PERMISSION_DENIED) {
          setPermission('denied');
          stopLiveTracking();
        } else {
          setPermission('idle');
        }
        addEvent(`GPS detenido: ${error.message || 'no fue posible obtener ubicación'}.`);
      },
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 3_000,
      }
    );

    setWatching(true);
    addEvent('Rastreo iniciado. Las lecturas débiles o imposibles serán ignoradas.');
    void requestWakeLock();
  };

  function stopLiveTracking() {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setWatching(false);
    void releaseWakeLock();
  }

  async function requestWakeLock() {
    const wakeLockApi = (navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<WakeLockLike> };
    }).wakeLock;

    if (!wakeLockApi || document.visibilityState !== 'visible') {
      return;
    }

    try {
      const sentinel = await wakeLockApi.request('screen');
      wakeLockRef.current = sentinel;
      setWakeLockActive(true);
      sentinel.addEventListener?.('release', () => {
        wakeLockRef.current = null;
      });
    } catch {
      addEvent('El teléfono no permitió mantener la pantalla activa.');
    }
  }

  async function releaseWakeLock() {
    try {
      await wakeLockRef.current?.release();
    } catch {
      // El bloqueo pudo liberarse automáticamente.
    }
    wakeLockRef.current = null;
    setWakeLockActive(false);
  }

  const toggleOfflineSimulation = () => {
    setSimulateOffline(previous => {
      const next = !previous;
      if (!next) {
        setTracker(current => {
          const flushed = flushPendingUpdates(current);
          trackerRef.current = flushed;
          return flushed;
        });
        addEvent('Internet simulado recuperado: se vació la cola local.');
      } else {
        addEvent('Modo sin internet activado: las ubicaciones quedan en cola.');
      }
      return next;
    });
  };

  const gpsReliable =
    lastRawPoint !== null && lastRawPoint.accuracyM <= DEFAULT_TRACKING_CONFIG.maxAccuracyM;

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-950/40">
              <Satellite size={23} />
            </div>
            <div>
              <p className="text-sm font-black uppercase italic">Laboratorio GPS</p>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/40">
                Fase 5 · Rastreo seguro
              </p>
            </div>
          </div>

          <span className={`flex items-center gap-2 rounded-full border px-3 py-2 text-[9px] font-black uppercase ${effectiveOnline ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-red-400/20 bg-red-400/10 text-red-300'}`}>
            {effectiveOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
            {effectiveOnline ? 'En línea' : 'Sin internet'}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 p-4 pb-12">
        <section className="rounded-[28px] border border-emerald-400/15 bg-emerald-400/5 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 flex-shrink-0 text-emerald-300" size={22} />
            <div>
              <h1 className="text-lg font-black uppercase italic">GPS real sin arriesgar pedidos</h1>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-white/55">
                Prueba permisos, mala precisión, pérdida de internet, salida del local, llegada al cliente y bloqueo de entregas automáticas. Nada se guarda en la base real.
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2 rounded-[24px] border border-white/10 bg-white/5 p-2">
          <button
            type="button"
            onClick={() => changeMode('demo')}
            className={`rounded-2xl px-4 py-3 text-[10px] font-black uppercase transition ${mode === 'demo' ? 'bg-orange-500 text-white shadow-lg shadow-orange-950/30' : 'text-white/45 hover:bg-white/5'}`}
          >
            Demostración automática
          </button>
          <button
            type="button"
            onClick={() => changeMode('live')}
            className={`rounded-2xl px-4 py-3 text-[10px] font-black uppercase transition ${mode === 'live' ? 'bg-blue-500 text-white shadow-lg shadow-blue-950/30' : 'text-white/45 hover:bg-white/5'}`}
          >
            GPS real del teléfono
          </button>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/35">Estado visible para el cliente</p>
                  <h2 className="mt-2 text-2xl font-black uppercase italic">{statusLabel(tracker.status)}</h2>
                </div>
                <span className={`rounded-full border px-3 py-2 text-[9px] font-black uppercase ${statusTone[tracker.status]}`}>
                  {tracker.status === 'delivered' ? 'Finalizado manualmente' : 'Automatización protegida'}
                </span>
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 via-blue-500 to-emerald-400 transition-all duration-700"
                  style={{ width: `${routeProgress}%` }}
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  <Store className="text-orange-300" size={17} />
                  <p className="mt-2 text-base font-black">{formatMeters(tracker.distanceFromStoreM)}</p>
                  <p className="text-[8px] font-black uppercase text-white/30">Del local</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  <MapPin className="text-violet-300" size={17} />
                  <p className="mt-2 text-base font-black">{formatMeters(tracker.distanceToCustomerM)}</p>
                  <p className="text-[8px] font-black uppercase text-white/30">Al cliente</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  <Signal className="text-emerald-300" size={17} />
                  <p className="mt-2 text-base font-black">{tracker.acceptedSamples}</p>
                  <p className="text-[8px] font-black uppercase text-white/30">Válidas</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  <SignalZero className="text-red-300" size={17} />
                  <p className="mt-2 text-base font-black">{tracker.rejectedSamples}</p>
                  <p className="text-[8px] font-black uppercase text-white/30">Ignoradas</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex items-start gap-3">
                  <Radio className="mt-0.5 flex-shrink-0 text-blue-300" size={18} />
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Última decisión del motor</p>
                    <p className="mt-2 text-xs font-semibold leading-relaxed text-white/60">{tracker.lastDecision}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase italic">Control de la sesión</p>
                  <p className="mt-1 text-[10px] font-semibold text-white/40">Confirmar y entregar siempre son manuales</p>
                </div>
                <Lock className="text-emerald-300" size={20} />
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={confirmOrderManually}
                  disabled={tracker.status !== 'waiting_confirmation'}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-[10px] font-black uppercase transition disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <PackageCheck size={16} />
                  Confirmar pedido
                </button>
                <button
                  type="button"
                  onClick={deliverManually}
                  disabled={tracker.status !== 'arrived'}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-[10px] font-black uppercase transition disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <CheckCircle2 size={16} />
                  Confirmar entregado
                </button>
              </div>

              {mode === 'demo' ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={simulateNextPoint}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-blue-500/15 px-4 py-3 text-[10px] font-black uppercase text-blue-200"
                  >
                    <Navigation size={16} />
                    Siguiente lectura
                  </button>
                  <button
                    type="button"
                    onClick={() => void runDemoAutomatically()}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-violet-500/15 px-4 py-3 text-[10px] font-black uppercase text-violet-200"
                  >
                    <Zap size={16} />
                    Recorrer ruta completa
                  </button>
                </div>
              ) : (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={watching ? stopLiveTracking : startLiveTracking}
                    className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[10px] font-black uppercase ${watching ? 'bg-red-500/15 text-red-200' : 'bg-blue-500 text-white'}`}
                  >
                    {watching ? <Pause size={16} /> : <Play size={16} />}
                    {watching ? 'Pausar GPS' : 'Iniciar GPS'}
                  </button>
                  <button
                    type="button"
                    onClick={captureStoreLocation}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-orange-500/15 px-4 py-3 text-[10px] font-black uppercase text-orange-200"
                  >
                    <LocateFixed size={16} />
                    Guardar local aquí
                  </button>
                </div>
              )}

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={toggleOfflineSimulation}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-[10px] font-black uppercase text-white/65"
                >
                  {simulateOffline ? <Wifi size={16} /> : <WifiOff size={16} />}
                  {simulateOffline ? 'Recuperar internet' : 'Simular sin internet'}
                </button>
                <button
                  type="button"
                  onClick={() => resetTracking()}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-[10px] font-black uppercase text-white/65"
                >
                  <RefreshCw size={16} />
                  Reiniciar sesión
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2">
                <Crosshair className="text-blue-300" size={20} />
                <h2 className="text-sm font-black uppercase italic">Salud del GPS</h2>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  <p className="text-[8px] font-black uppercase text-white/30">Permiso</p>
                  <p className={`mt-2 text-[10px] font-black uppercase ${permission === 'granted' ? 'text-emerald-300' : permission === 'denied' ? 'text-red-300' : 'text-amber-300'}`}>
                    {permissionLabel[permission]}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  <p className="text-[8px] font-black uppercase text-white/30">Precisión</p>
                  <p className={`mt-2 text-sm font-black ${gpsReliable ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {lastRawPoint ? `${Math.round(lastRawPoint.accuracyM)} m` : '--'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  <p className="text-[8px] font-black uppercase text-white/30">Enviadas</p>
                  <p className="mt-2 text-sm font-black text-blue-300">{tracker.sentUpdates}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  <p className="text-[8px] font-black uppercase text-white/30">En cola</p>
                  <p className={`mt-2 text-sm font-black ${tracker.pendingUploads > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                    {tracker.pendingUploads}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`flex items-center gap-2 rounded-full border px-3 py-2 text-[9px] font-black uppercase ${watching ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-white/10 bg-white/5 text-white/40'}`}>
                  <Smartphone size={13} />
                  {watching ? 'GPS activo' : 'GPS detenido'}
                </span>
                <span className={`flex items-center gap-2 rounded-full border px-3 py-2 text-[9px] font-black uppercase ${wakeLockActive ? 'border-blue-400/20 bg-blue-400/10 text-blue-300' : 'border-white/10 bg-white/5 text-white/40'}`}>
                  <Gauge size={13} />
                  {wakeLockActive ? 'Pantalla activa' : 'Sin bloqueo'}
                </span>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase italic">Puntos de prueba</p>
                  <p className="mt-1 text-[10px] font-semibold text-white/40">No son direcciones públicas</p>
                </div>
                <Route className="text-violet-300" size={20} />
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase text-orange-300">
                    <Store size={14} /> El Mirador de prueba
                  </div>
                  <p className="mt-2 text-[10px] font-semibold text-white/50">
                    {formatCoordinate(anchors.store.latitude)}, {formatCoordinate(anchors.store.longitude)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase text-violet-300">
                    <MapPin size={14} /> Cliente de prueba
                  </div>
                  <p className="mt-2 text-[10px] font-semibold text-white/50">
                    {formatCoordinate(anchors.customer.latitude)}, {formatCoordinate(anchors.customer.longitude)}
                  </p>
                </div>
              </div>

              {mode === 'live' && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => moveDemoCustomer(600, 55)}
                    className="rounded-2xl bg-white/10 px-3 py-3 text-[9px] font-black uppercase text-white/60"
                  >
                    Cliente a 600 m
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDemoCustomer(1_200, 110)}
                    className="rounded-2xl bg-white/10 px-3 py-3 text-[9px] font-black uppercase text-white/60"
                  >
                    Cliente a 1.2 km
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2">
                <Truck className="text-orange-300" size={20} />
                <h2 className="text-sm font-black uppercase italic">Reglas verificadas</h2>
              </div>

              <div className="mt-4 space-y-2 text-[10px] font-semibold text-white/55">
                <p className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">✓ Precisión peor a 60 m no cambia estados.</p>
                <p className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">✓ La salida exige 3 lecturas confiables fuera de 130 m.</p>
                <p className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">✓ “Ya casi llega” exige 2 lecturas dentro de 180 m.</p>
                <p className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">✓ Llegar no marca Entregado automáticamente.</p>
                <p className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">✓ Sin internet, las lecturas se guardan en cola.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black uppercase italic">Registro de seguridad</h2>
              <p className="mt-1 text-[10px] font-semibold text-white/40">Decisiones y lecturas rechazadas</p>
            </div>
            <Bike className="text-blue-300" size={20} />
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {events.map((event, index) => {
              const warning =
                event.includes('ignorada') ||
                event.includes('débil') ||
                event.includes('perdido') ||
                event.includes('bloqueada') ||
                event.includes('No se pudo');

              return (
                <div key={`${event}-${index}`} className="flex gap-2 rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  {warning ? (
                    <AlertTriangle className="mt-0.5 flex-shrink-0 text-amber-300" size={15} />
                  ) : (
                    <CheckCircle2 className="mt-0.5 flex-shrink-0 text-emerald-300" size={15} />
                  )}
                  <p className="text-[10px] font-semibold leading-relaxed text-white/55">{event}</p>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
