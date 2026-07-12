from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding='utf-8')


def write(path: str, value: str) -> None:
    Path(path).write_text(value, encoding='utf-8')


def replace_once(path: str, old: str, new: str) -> None:
    source = read(path)
    if old not in source:
        raise RuntimeError(f'No se encontró bloque en {path}: {old[:140]!r}')
    write(path, source.replace(old, new, 1))


# Registro: usar el mapa raster táctil como motor principal, sin canvas WebGL superpuesto.
replace_once(
    'src/components/LoginModal.tsx',
    "import RasterMapFallback from './RasterMapFallback';",
    "import InteractiveRasterMap from './InteractiveRasterMap';",
)

replace_once(
    'src/components/LoginModal.tsx',
    "    if (!map) return null;",
    "    if (!map) return selectedPointRef.current;",
)

replace_once(
    'src/components/LoginModal.tsx',
    "  const moveMapTo = useCallback((position: LatLng, zoom = MAP_DEFAULT_ZOOM) => {\n    const map = mapInstance.current;\n\n    if (!map) return;\n\n    const safeZoom = Math.min(zoom, MAP_MAX_ZOOM);\n\n    map.flyTo({\n      center: [position.lng, position.lat],\n      zoom: safeZoom,\n      offset: [0, MAP_PIN_OFFSET_Y],\n      duration: 850,\n    });\n  }, []);",
    "  const moveMapTo = useCallback((position: LatLng, zoom = MAP_DEFAULT_ZOOM) => {\n    const safeZoom = Math.min(zoom, MAP_MAX_ZOOM);\n\n    selectedPointRef.current = position;\n    setFallbackMapCenter(position);\n    setFallbackMapZoom(safeZoom);\n    setLat(position.lat);\n    setLng(position.lng);\n    paintLiveCoordinateLabel(position);\n\n    const map = mapInstance.current;\n    if (!map) return;\n\n    map.flyTo({\n      center: [position.lng, position.lat],\n      zoom: safeZoom,\n      offset: [0, MAP_PIN_OFFSET_Y],\n      duration: 850,\n    });\n  }, [paintLiveCoordinateLabel]);",
)

replace_once(
    'src/components/LoginModal.tsx',
    "          <RasterMapFallback center={fallbackMapCenter} zoom={fallbackMapZoom} />\n          <div ref={mapContainerRef} className=\"pollazo-maplibre absolute inset-0 z-[1]\" />",
    "          <InteractiveRasterMap\n            center={fallbackMapCenter}\n            zoom={fallbackMapZoom}\n            minZoom={14}\n            maxZoom={19}\n            pinOffsetY={MAP_PIN_OFFSET_Y}\n            interactive\n            showControls\n            onReady={() => {\n              setMapReady(true);\n              setMapFailed(false);\n            }}\n            onViewChange={(position, nextZoom, final) => {\n              selectedPointRef.current = position;\n              setFallbackMapCenter(position);\n              setFallbackMapZoom(nextZoom);\n              setLat(position.lat);\n              setLng(position.lng);\n              paintLiveCoordinateLabel(position);\n              setIsDragging(!final);\n            }}\n          />",
)

# El contenido del rastreo debe poder desplazarse ahora que el mapa vive dentro del modal.
replace_once(
    'src/components/OrderTracking.tsx',
    "import { useUser } from '../context/UserContext';",
    "import { useUser } from '../context/UserContext';\nimport OrderTrackingLiveMap from './OrderTrackingLiveMap';",
)
replace_once(
    'src/components/OrderTracking.tsx',
    '        <div className="flex-1 space-y-2.5 overflow-hidden bg-gradient-to-b from-orange-50/45 via-white to-white px-3 py-3">',
    '        <div className="flex-1 space-y-2.5 overflow-y-auto overscroll-contain bg-gradient-to-b from-orange-50/45 via-white to-white px-3 py-3">',
)
replace_once(
    'src/components/OrderTracking.tsx',
    "                  })}\n                </div>\n              </section>\n\n              <section className=\"grid grid-cols-2 gap-2.5\">",
    "                  })}\n                </div>\n\n                <OrderTrackingLiveMap\n                  orderCode={normalizeCode(activeOrder.order_code)}\n                  orderStatus={activeOrder.status}\n                />\n              </section>\n\n              <section className=\"grid grid-cols-2 gap-2.5\">",
)

# Eliminar el botón flotante y el iframe roto: el mapa ahora está en OrderTracking.
live_path = 'src/components/LiveDeliverySystems.tsx'
live = read(live_path)
live = live.replace(
    "import { Bike, MapPinned, Smartphone, X } from 'lucide-react';",
    "import { Bike, Smartphone, X } from 'lucide-react';",
    1,
)
live = live.replace("import { getOrderCredential } from '../utils/orderCredentials';\n", '', 1)
start = live.find('function CustomerTrackingMapLauncher() {')
end = live.find('export default function LiveDeliverySystems()', start)
if start == -1 or end == -1:
    raise RuntimeError('No se encontró CustomerTrackingMapLauncher')
live = live[:start] + live[end:]
live = live.replace('      <CustomerTrackingMapLauncher />\n', '', 1)
write(live_path, live)

# Forzar renovación de la PWA para que no conserve el mapa anterior.
sw_path = 'public/sw.js'
sw = read(sw_path)
if "const CACHE_VERSION = 'pollazo-cache-clean-v43';" in sw:
    sw = sw.replace(
        "const CACHE_VERSION = 'pollazo-cache-clean-v43';",
        "const CACHE_VERSION = 'pollazo-cache-clean-v44';",
        1,
    )
elif "const CACHE_VERSION = 'pollazo-cache-clean-v42';" in sw:
    sw = sw.replace(
        "const CACHE_VERSION = 'pollazo-cache-clean-v42';",
        "const CACHE_VERSION = 'pollazo-cache-clean-v44';",
        1,
    )
else:
    raise RuntimeError('No se encontró la versión de caché del service worker')
write(sw_path, sw)

print('Mapa interactivo y rastreo integrado aplicados.')
