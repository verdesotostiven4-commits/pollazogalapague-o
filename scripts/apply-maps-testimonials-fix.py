from pathlib import Path
import re


def read(path: str) -> str:
    return Path(path).read_text(encoding='utf-8')


def write(path: str, value: str) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(value, encoding='utf-8')


def replace_once(path: str, old: str, new: str) -> None:
    source = read(path)
    if old not in source:
        raise RuntimeError(f'No se encontró bloque en {path}: {old[:180]!r}')
    write(path, source.replace(old, new, 1))


# -----------------------------------------------------------------------------
# API de mosaicos: misma procedencia para Android/PWA y rastreo.
# -----------------------------------------------------------------------------
replace_once(
    'api/router.ts',
    "  'logout-panel-session': () => import('../server/api-handlers/logout-panel-session.js'),\n  metrics:",
    "  'logout-panel-session': () => import('../server/api-handlers/logout-panel-session.js'),\n  'map-tile': () => import('../server/api-handlers/map-tile.js'),\n  metrics:",
)


# -----------------------------------------------------------------------------
# Mapa del registro: MapLibre fluido, pero con mosaicos del mismo dominio.
# -----------------------------------------------------------------------------
login = read('src/components/LoginModal.tsx')
login = login.replace(
    "const MAP_STYLE_URL = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';",
    """const MAP_STYLE = {
  version: 8,
  sources: {
    'pollazo-streets': {
      type: 'raster',
      tiles: ['/api/map-tile?z={z}&x={x}&y={y}'],
      tileSize: 256,
      minzoom: 4,
      maxzoom: 20,
      attribution: '© CARTO · Esri · OpenStreetMap',
    },
  },
  layers: [
    {
      id: 'pollazo-map-background',
      type: 'background',
      paint: { 'background-color': '#e7eef5' },
    },
    {
      id: 'pollazo-streets',
      type: 'raster',
      source: 'pollazo-streets',
      minzoom: 4,
      maxzoom: 20,
      paint: {
        'raster-fade-duration': 90,
        'raster-opacity': 1,
      },
    },
  ],
} as any;""",
    1,
)
login = login.replace('      style: MAP_STYLE_URL,', '      style: MAP_STYLE,', 1)
login = login.replace('      minZoom: 5,', '      minZoom: 13,', 1)
login = login.replace(
    "      renderWorldCopies: false,\n      fadeDuration: 120,",
    """      renderWorldCopies: false,
      maxBounds: [
        [PUERTO_AYORA_BOUNDS.lngMin, PUERTO_AYORA_BOUNDS.latMin],
        [PUERTO_AYORA_BOUNDS.lngMax, PUERTO_AYORA_BOUNDS.latMax],
      ],
      fadeDuration: 90,""",
    1,
)

old_load = """    map.on('load', () => {
      if (disposed) return;

      loaded = true;
      window.clearTimeout(loadingTimeout);

      window.requestAnimationFrame(() => {
        if (disposed) return;

        map.resize();
        map.flyTo({
          center: [startPosition.lng, startPosition.lat],
          zoom: MAP_DEFAULT_ZOOM,
          offset: [0, MAP_PIN_OFFSET_Y],
          duration: 0,
        });
        syncSelectedPointFromMap();

        if (userActualLocation && isPointInsidePuertoAyora(userActualLocation)) {
          syncUserMarker(userActualLocation);
        }

        setMapReady(true);
      });
    });"""
new_load = """    const markMapReady = () => {
      if (disposed || loaded) return;
      loaded = true;
      window.clearTimeout(loadingTimeout);
      setMapFailed(false);
      setMapReady(true);
    };

    map.on('load', () => {
      if (disposed) return;

      window.requestAnimationFrame(() => {
        if (disposed) return;

        map.resize();
        map.flyTo({
          center: [startPosition.lng, startPosition.lat],
          zoom: MAP_DEFAULT_ZOOM,
          offset: [0, MAP_PIN_OFFSET_Y],
          duration: 0,
        });
        syncSelectedPointFromMap();

        if (userActualLocation && isPointInsidePuertoAyora(userActualLocation)) {
          syncUserMarker(userActualLocation);
        }
      });
    });

    map.on('idle', markMapReady);"""
if old_load not in login:
    raise RuntimeError('No se encontró el evento load de LoginModal')
login = login.replace(old_load, new_load, 1)
login = login.replace('    }, 12000);', '    }, 15000);', 1)
write('src/components/LoginModal.tsx', login)


# -----------------------------------------------------------------------------
# Mapa raster reutilizable: primero solicita el mosaico al dominio de Pollazo.
# -----------------------------------------------------------------------------
raster = read('src/components/InteractiveRasterMap.tsx')
raster = raster.replace(
    """  const sources = [
    `https://${cartoSubdomain}.basemaps.cartocdn.com/rastertiles/voyager/${tile.z}/${wrappedX}/${tile.y}.png`,
    `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${tile.z}/${tile.y}/${wrappedX}`,
    `https://tile.openstreetmap.org/${tile.z}/${wrappedX}/${tile.y}.png`,
  ];""",
    """  const sources = [
    `/api/map-tile?z=${tile.z}&x=${wrappedX}&y=${tile.y}`,
    `https://${cartoSubdomain}.basemaps.cartocdn.com/rastertiles/voyager/${tile.z}/${wrappedX}/${tile.y}.png`,
    `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${tile.z}/${tile.y}/${wrappedX}`,
    `https://tile.openstreetmap.org/${tile.z}/${wrappedX}/${tile.y}.png`,
  ];""",
    1,
)
raster = raster.replace(
    "      draggable={false}\n      className=\"absolute block select-none\"",
    "      draggable={false}\n      loading=\"eager\"\n      decoding=\"async\"\n      className=\"absolute block select-none\"",
    1,
)
write('src/components/InteractiveRasterMap.tsx', raster)


# -----------------------------------------------------------------------------
# Rastreo: nunca encuadrar Riobamba u otra ciudad en un pedido de Puerto Ayora.
# -----------------------------------------------------------------------------
tracking = read('src/components/OrderTrackingLiveMap.tsx')
tracking = tracking.replace(
    "import { STORE_LOCATION } from '../utils/commerce';",
    "import { isInsidePuertoAyora, STORE_LOCATION } from '../utils/commerce';",
    1,
)
tracking = tracking.replace(
    """  const trackingData = tracking?.tracking;
  const store = trackingData
    ? validPoint(trackingData.store.latitude, trackingData.store.longitude)
    : STORE_LOCATION;
  const customer = trackingData
    ? validPoint(trackingData.customer.latitude, trackingData.customer.longitude)
    : validPoint(customerLat, customerLng);
  const rider = trackingData?.current
    ? validPoint(trackingData.current.latitude, trackingData.current.longitude)
    : null;""",
    """  const trackingData = tracking?.tracking;
  const storedCustomer = validPoint(customerLat, customerLng);
  const trackedStore = trackingData
    ? validPoint(trackingData.store.latitude, trackingData.store.longitude)
    : null;
  const trackedCustomer = trackingData
    ? validPoint(trackingData.customer.latitude, trackingData.customer.longitude)
    : null;
  const riderRaw = trackingData?.current
    ? validPoint(trackingData.current.latitude, trackingData.current.longitude)
    : null;

  const store = trackedStore && isInsidePuertoAyora(trackedStore.lat, trackedStore.lng)
    ? trackedStore
    : STORE_LOCATION;
  const customer = trackedCustomer && isInsidePuertoAyora(trackedCustomer.lat, trackedCustomer.lng)
    ? trackedCustomer
    : storedCustomer && isInsidePuertoAyora(storedCustomer.lat, storedCustomer.lng)
      ? storedCustomer
      : null;
  const rider = riderRaw && isInsidePuertoAyora(riderRaw.lat, riderRaw.lng)
    ? riderRaw
    : null;
  const riderOutsideCoverage = Boolean(riderRaw && !rider);""",
    1,
)
tracking = tracking.replace(
    """  const path = useMemo(() => {
    const values = (trackingData?.path || [])
      .map(point => validPoint(point.latitude, point.longitude))
      .filter((point): point is RasterLatLng => Boolean(point));

    if (values.length === 0 && store) values.push(store);
    if (rider && !values.some(point => point.lat === rider.lat && point.lng === rider.lng)) values.push(rider);
    if (!rider && customer && !values.some(point => point.lat === customer.lat && point.lng === customer.lng)) values.push(customer);
    return values.slice(-120);
  }, [customer, rider, store, trackingData?.path]);""",
    """  const path = useMemo(() => {
    const values = (trackingData?.path || [])
      .map(point => validPoint(point.latitude, point.longitude))
      .filter(
        (point): point is RasterLatLng =>
          Boolean(point && isInsidePuertoAyora(point.lat, point.lng))
      );

    const addUnique = (point: RasterLatLng | null) => {
      if (!point) return;
      if (!values.some(item => item.lat === point.lat && item.lng === point.lng)) {
        values.push(point);
      }
    };

    if (values.length === 0) {
      addUnique(rider || store);
      if (rider) addUnique(store);
    }

    addUnique(customer);
    return values.slice(-120);
  }, [customer, rider, store, trackingData?.path]);""",
    1,
)
tracking = tracking.replace(
    """  const statusText = active && trackingData
    ? `${trackingStatusLabel(trackingData.status)} · ${trackingData.riderName}`
    : orderStatus === 'Enviado'
      ? 'Esperando la primera ubicación del repartidor'
      : 'Ruta estimada · preparando tu pedido';""",
    """  const statusText = riderOutsideCoverage
    ? 'GPS de prueba fuera de Puerto Ayora'
    : active && trackingData
      ? `${trackingStatusLabel(trackingData.status)} · ${trackingData.riderName}`
      : orderStatus === 'Enviado'
        ? 'Esperando la primera ubicación del repartidor'
        : 'Ruta estimada · preparando tu pedido';""",
    1,
)
tracking = tracking.replace('      <div className="relative h-[190px] bg-slate-100">', '      <div className="relative h-[220px] bg-slate-100">', 1)
tracking = tracking.replace(
    """      {!active && (
        <div className="bg-orange-50 px-3 py-2 text-[8px] font-bold text-orange-700">
          La línea muestra la ruta estimada entre El Mirador y tu punto. La moto aparecerá cuando un repartidor sea asignado.
        </div>
      )}""",
    """      {riderOutsideCoverage ? (
        <div className="bg-amber-50 px-3 py-2 text-[8px] font-bold text-amber-700">
          El GPS del repartidor está fuera de Puerto Ayora. Para no deformar el mapa, aquí se mantiene la ruta local entre El Mirador y tu entrega.
        </div>
      ) : !active ? (
        <div className="bg-orange-50 px-3 py-2 text-[8px] font-bold text-orange-700">
          La línea muestra la ruta estimada entre El Mirador y tu punto. La moto aparecerá cuando un repartidor sea asignado.
        </div>
      ) : null}""",
    1,
)
write('src/components/OrderTrackingLiveMap.tsx', tracking)


# -----------------------------------------------------------------------------
# Opiniones: ubicación correcta y carga con respaldo directo de Supabase.
# -----------------------------------------------------------------------------
info = read('src/components/InfoScreen.tsx')
info = info.replace('\n      <Testimonials />\n\n      <LanguageSelectorCard />', '\n      <LanguageSelectorCard />', 1)
legal_anchor = '      <div className="bg-white rounded-[32px] border border-orange-50 shadow-sm overflow-hidden">\n        <button\n          type="button"\n          onClick={() => setShowLegalModal(true)}'
if legal_anchor not in info:
    raise RuntimeError('No se encontró la tarjeta legal de InfoScreen')
info = info.replace(
    legal_anchor,
    '      <Testimonials />\n\n' + legal_anchor,
    1,
)
write('src/components/InfoScreen.tsx', info)

reviews = read('src/components/Testimonials.tsx')
reviews = reviews.replace(
    "import { useAdmin } from '../context/AdminContext';",
    "import { useAdmin } from '../context/AdminContext';\nimport { supabase } from '../lib/supabase';",
    1,
)
reviews = reviews.replace(
    "  const [error, setError] = useState('');\n  const [success, setSuccess] = useState(false);",
    "  const [error, setError] = useState('');\n  const [loadError, setLoadError] = useState('');\n  const [success, setSuccess] = useState(false);",
    1,
)
old_fetch = """  const fetchTestimonials = useCallback(async () => {
    try {
      const response = await fetch('/api/testimonials', {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        testimonials?: Testimonial[];
        hasReviewed?: boolean;
      };

      if (response.ok && result.ok) {
        setTestimonials(Array.isArray(result.testimonials) ? result.testimonials : []);
        if (result.hasReviewed) {
          setHasReviewed(true);
          markLocalReviewed();
        }
      }
    } catch (error) {
      console.warn('No se pudieron cargar opiniones:', error);
      setError('No pudimos cargar las opiniones. Toca nuevamente en unos segundos.');
    } finally {
      setLoading(false);
    }
  }, [markLocalReviewed]);"""
new_fetch = """  const fetchTestimonials = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    try {
      const response = await fetch('/api/testimonials', {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        testimonials?: Testimonial[];
        hasReviewed?: boolean;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'La API de opiniones no respondió.');
      }

      setTestimonials(Array.isArray(result.testimonials) ? result.testimonials : []);
      if (result.hasReviewed) {
        setHasReviewed(true);
        markLocalReviewed();
      }
      return;
    } catch (apiError) {
      console.warn('API de opiniones no disponible; usando lectura pública:', apiError);
    }

    try {
      const direct = await supabase
        .from('testimonials')
        .select('id,author_name,stars,comment,photo_url,created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (direct.error) throw direct.error;
      setTestimonials((direct.data || []) as Testimonial[]);
    } catch (directError) {
      console.warn('No se pudieron cargar opiniones:', directError);
      setTestimonials([]);
      setLoadError('No pudimos conectar con las opiniones. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [markLocalReviewed]);"""
if old_fetch not in reviews:
    raise RuntimeError('No se encontró fetchTestimonials')
reviews = reviews.replace(old_fetch, new_fetch, 1)
reviews = reviews.replace(
    """        {!loading && testimonials.length === 0 && !showForm && (
          <div className="px-5 py-8 text-center">
            <MessageCircle className="mx-auto text-orange-300" size={34} />
            <p className="mt-3 text-sm font-black uppercase italic text-slate-800">
              Todavía no hay opiniones
            </p>
            <p className="mt-2 text-xs font-bold leading-relaxed text-slate-400">
              Sé la primera persona en contar cómo fue su experiencia.
            </p>
          </div>
        )}""",
    """        {!loading && testimonials.length === 0 && !showForm && (
          <div className="px-5 py-8 text-center">
            <MessageCircle className="mx-auto text-orange-300" size={34} />
            <p className="mt-3 text-sm font-black uppercase italic text-slate-800">
              {loadError ? 'No se pudieron cargar las opiniones' : 'Todavía no hay opiniones'}
            </p>
            <p className="mt-2 text-xs font-bold leading-relaxed text-slate-400">
              {loadError
                ? loadError
                : 'Sé la primera persona en contar cómo fue su experiencia.'}
            </p>
            {loadError && (
              <button
                type="button"
                onClick={() => void fetchTestimonials()}
                className="mt-4 rounded-2xl bg-orange-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-orange-600 active:scale-95"
              >
                Reintentar
              </button>
            )}
          </div>
        )}""",
    1,
)
write('src/components/Testimonials.tsx', reviews)


# Imports ESM consistentes en el handler de opiniones.
testimonials_api = read('server/api-handlers/testimonials.ts')
testimonials_api = testimonials_api.replace("} from '../customer-session';", "} from '../customer-session.js';", 1)
testimonials_api = testimonials_api.replace("} from '../panel-session';", "} from '../panel-session.js';", 1)
write('server/api-handlers/testimonials.ts', testimonials_api)


# Forzar que la PWA retire la versión que dejó los mapas en blanco.
sw = read('public/sw.js')
if "pollazo-cache-clean-v46" not in sw:
    raise RuntimeError('Versión inesperada de Service Worker')
sw = sw.replace('pollazo-cache-clean-v46', 'pollazo-cache-clean-v47', 1)
write('public/sw.js', sw)

print('Mapas, rastreo y opiniones corregidos.')
