from pathlib import Path
import re

LOGIN = Path('src/components/LoginModal.tsx')
SW = Path('public/sw.js')

source = LOGIN.read_text(encoding='utf-8')

source = source.replace("import InteractiveRasterMap from './InteractiveRasterMap';\n", '', 1)

source, count = re.subn(
    r"const MAP_STYLE = \{.*?\n\} as any;",
    "const MAP_STYLE_URL = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';",
    source,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError('No se pudo restaurar MAP_STYLE_URL')

source = source.replace("  const fallbackMapFrameRef = useRef<number | null>(null);\n", '', 1)
source = source.replace("  const [fallbackMapCenter, setFallbackMapCenter] = useState<LatLng>(DEFAULT_CENTER);\n", '', 1)
source = source.replace("  const [fallbackMapZoom, setFallbackMapZoom] = useState(MAP_DEFAULT_ZOOM);\n", '', 1)
source = source.replace("    if (!map) return selectedPointRef.current;", "    if (!map) return null;", 1)

source, count = re.subn(
    r"  const moveMapTo = useCallback\(\(position: LatLng, zoom = MAP_DEFAULT_ZOOM\) => \{.*?\n  \}, \[paintLiveCoordinateLabel\]\);",
    """  const moveMapTo = useCallback((position: LatLng, zoom = MAP_DEFAULT_ZOOM) => {
    const map = mapInstance.current;

    if (!map) return;

    const safeZoom = Math.min(zoom, MAP_MAX_ZOOM);

    map.flyTo({
      center: [position.lng, position.lat],
      zoom: safeZoom,
      offset: [0, MAP_PIN_OFFSET_Y],
      duration: 850,
    });
  }, []);""",
    source,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError('No se pudo restaurar moveMapTo')

source = source.replace("    setFallbackMapCenter(startPosition);\n", '', 1)
source = source.replace("    setFallbackMapZoom(MAP_DEFAULT_ZOOM);\n", '', 1)
source = source.replace("      style: MAP_STYLE,", "      style: MAP_STYLE_URL,", 1)
source = source.replace("      attributionControl: { compact: true },", "      attributionControl: false,", 1)

source, count = re.subn(
    r"\nconst scheduleFallbackMapSync = \(\) => \{.*?\n\};\n",
    "\n",
    source,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError('No se pudo retirar la sincronización del mapa provisional')

source = source.replace("        scheduleFallbackMapSync();\n", '')
source = source.replace("      scheduleFallbackMapSync();\n", '')

source, count = re.subn(
    r"\n      if \(fallbackMapFrameRef\.current !== null\) \{.*?\n      \}\n",
    "\n",
    source,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError('No se pudo retirar la limpieza del mapa provisional')

source, count = re.subn(
    r"          <InteractiveRasterMap\n.*?\n          />",
    '          <div ref={mapContainerRef} className="pollazo-maplibre absolute inset-0 z-0" />',
    source,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError('No se pudo restaurar el contenedor MapLibre')

source = source.replace(
    """          .pollazo-maplibre {
            font-family: inherit;
            background: transparent;
            cursor: grab;
            contain: layout size;
          }""",
    """          .pollazo-maplibre {
            font-family: inherit;
            background: #e2e8f0;
            cursor: grab;
            contain: strict;
          }""",
    1,
)
source = source.replace(
    """          .pollazo-maplibre .maplibregl-canvas {
            outline: none;
            background: transparent !important;
          }""",
    """          .pollazo-maplibre .maplibregl-canvas {
            outline: none;
            background: #e2e8f0;
          }""",
    1,
)

LOGIN.write_text(source, encoding='utf-8')

sw = SW.read_text(encoding='utf-8')
if "pollazo-cache-clean-v44" not in sw:
    raise RuntimeError('La versión esperada del Service Worker no coincide')
sw = sw.replace('pollazo-cache-clean-v44', 'pollazo-cache-clean-v45', 1)
SW.write_text(sw, encoding='utf-8')

print('Mapa MapLibre del ZIP restaurado sin tocar pedidos, Supabase ni rastreo.')
