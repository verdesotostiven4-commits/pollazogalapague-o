from pathlib import Path
from textwrap import dedent

PATH = Path('src/components/LoginModal.tsx')
source = PATH.read_text(encoding='utf-8')


def replace_once(old: str, new: str) -> None:
    global source
    if old not in source:
        raise RuntimeError(f'No se encontró el bloque esperado: {old[:140]!r}')
    source = source.replace(old, new, 1)


replace_once(
    "import 'maplibre-gl/dist/maplibre-gl.css';\n",
    "import 'maplibre-gl/dist/maplibre-gl.css';\nimport RasterMapFallback from './RasterMapFallback';\n",
)

old_style = dedent("""
const MAP_STYLE = {
  version: 8,
  sources: {
    'carto-voyager': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 20,
      attribution: '© OpenStreetMap contributors © CARTO',
    },
  },
  layers: [
    {
      id: 'map-background',
      type: 'background',
      paint: { 'background-color': '#eef2f7' },
    },
    {
      id: 'carto-voyager',
      type: 'raster',
      source: 'carto-voyager',
      minzoom: 0,
      maxzoom: 20,
    },
  ],
} as any;
""").strip()

new_style = dedent("""
const MAP_STYLE = {
  version: 8,
  sources: {
    'osm-standard': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-standard',
      type: 'raster',
      source: 'osm-standard',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
} as any;
""").strip()
replace_once(old_style, new_style)

replace_once(
    "  const liveCoordinateFrameRef = useRef<number | null>(null);\n",
    "  const liveCoordinateFrameRef = useRef<number | null>(null);\n  const fallbackMapFrameRef = useRef<number | null>(null);\n",
)

replace_once(
    "  const [mapReady, setMapReady] = useState(false);\n  const [mapFailed, setMapFailed] = useState(false);\n",
    "  const [mapReady, setMapReady] = useState(false);\n  const [mapFailed, setMapFailed] = useState(false);\n  const [fallbackMapCenter, setFallbackMapCenter] = useState<LatLng>(DEFAULT_CENTER);\n  const [fallbackMapZoom, setFallbackMapZoom] = useState(MAP_DEFAULT_ZOOM);\n",
)

replace_once(
    "    setMapReady(false);\n    setMapFailed(false);\n\n    const map = new maplibregl.Map({",
    "    setMapReady(false);\n    setMapFailed(false);\n    setFallbackMapCenter(startPosition);\n    setFallbackMapZoom(MAP_DEFAULT_ZOOM);\n\n    const map = new maplibregl.Map({",
)

replace_once(
    "    mapInstance.current = map;\n\n    const loadingTimeout = window.setTimeout(() => {",
    dedent("""
    mapInstance.current = map;

    const scheduleFallbackMapSync = () => {
      if (fallbackMapFrameRef.current !== null) return;

      fallbackMapFrameRef.current = window.requestAnimationFrame(() => {
        fallbackMapFrameRef.current = null;
        const center = map.getCenter();
        setFallbackMapCenter({ lat: center.lat, lng: center.lng });
        setFallbackMapZoom(map.getZoom());
      });
    };

    const loadingTimeout = window.setTimeout(() => {
""").rstrip(),
)

replace_once(
    "        map.resize();\n        map.flyTo({",
    "        map.resize();\n        scheduleFallbackMapSync();\n        map.flyTo({",
)

replace_once(
    "    map.on('move', () => {\n      scheduleLiveSelectedPointPaint();\n    });",
    "    map.on('move', () => {\n      scheduleLiveSelectedPointPaint();\n      scheduleFallbackMapSync();\n    });",
)

replace_once(
    "      if (liveCoordinateFrameRef.current !== null) {\n        window.cancelAnimationFrame(liveCoordinateFrameRef.current);\n        liveCoordinateFrameRef.current = null;\n      }\n\n      if (userMarkerRef.current) {",
    "      if (liveCoordinateFrameRef.current !== null) {\n        window.cancelAnimationFrame(liveCoordinateFrameRef.current);\n        liveCoordinateFrameRef.current = null;\n      }\n\n      if (fallbackMapFrameRef.current !== null) {\n        window.cancelAnimationFrame(fallbackMapFrameRef.current);\n        fallbackMapFrameRef.current = null;\n      }\n\n      if (userMarkerRef.current) {",
)

replace_once(
    "        <div className=\"absolute top-0 left-0 right-0 h-[54dvh] min-h-[350px] max-h-[460px] z-0 overflow-hidden bg-slate-100\">\n          <div ref={mapContainerRef} className=\"pollazo-maplibre absolute inset-0 z-0\" />",
    "        <div className=\"absolute top-0 left-0 right-0 h-[54dvh] min-h-[350px] max-h-[460px] z-0 overflow-hidden bg-slate-100\">\n          <RasterMapFallback center={fallbackMapCenter} zoom={fallbackMapZoom} />\n          <div ref={mapContainerRef} className=\"pollazo-maplibre absolute inset-0 z-[1]\" />",
)

replace_once(
    "          .pollazo-maplibre {\n            font-family: inherit;\n            background: #e2e8f0;\n            cursor: grab;\n            contain: strict;\n          }",
    "          .pollazo-maplibre {\n            font-family: inherit;\n            background: transparent;\n            cursor: grab;\n            contain: layout size;\n          }",
)

replace_once(
    "          .pollazo-maplibre .maplibregl-canvas {\n            outline: none;\n            background: #e2e8f0;\n          }",
    "          .pollazo-maplibre .maplibregl-canvas {\n            outline: none;\n            background: transparent !important;\n          }",
)

PATH.write_text(source, encoding='utf-8')

sw = Path('public/sw.js')
sw_source = sw.read_text(encoding='utf-8')
sw_source = sw_source.replace(
    "const CACHE_VERSION = 'pollazo-cache-clean-v42';",
    "const CACHE_VERSION = 'pollazo-cache-clean-v43';",
    1,
)
sw.write_text(sw_source, encoding='utf-8')

print('Mapa con respaldo raster aplicado correctamente.')
