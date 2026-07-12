import {
  Bike,
  Home,
  Minus,
  Plus,
  Store,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';

export interface RasterLatLng {
  lat: number;
  lng: number;
}

export type RasterMarkerKind = 'store' | 'customer' | 'rider';

export interface RasterMarker {
  id: string;
  position: RasterLatLng;
  kind: RasterMarkerKind;
  label?: string;
}

interface Props {
  center: RasterLatLng;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  pinOffsetY?: number;
  interactive?: boolean;
  showControls?: boolean;
  markers?: RasterMarker[];
  path?: RasterLatLng[];
  className?: string;
  onReady?: () => void;
  onViewChange?: (center: RasterLatLng, zoom: number, final: boolean) => void;
}

interface TileDescriptor {
  key: string;
  x: number;
  y: number;
  z: number;
  left: number;
  top: number;
  size: number;
}

interface ScreenPoint {
  x: number;
  y: number;
}

const TILE_SIZE = 256;
const MIN_LAT = -85.05112878;
const MAX_LAT = 85.05112878;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const normalizeLongitude = (value: number) => {
  const normalized = ((value + 180) % 360 + 360) % 360 - 180;
  return Number.isFinite(normalized) ? normalized : 0;
};

const project = (position: RasterLatLng, zoom: number): ScreenPoint => {
  const scale = TILE_SIZE * 2 ** zoom;
  const lat = clamp(position.lat, MIN_LAT, MAX_LAT);
  const sin = Math.sin((lat * Math.PI) / 180);

  return {
    x: ((normalizeLongitude(position.lng) + 180) / 360) * scale,
    y:
      (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) *
      scale,
  };
};

const unproject = (point: ScreenPoint, zoom: number): RasterLatLng => {
  const scale = TILE_SIZE * 2 ** zoom;
  const lng = (point.x / scale) * 360 - 180;
  const mercatorY = 0.5 - point.y / scale;
  const lat =
    (90 - (360 * Math.atan(Math.exp(-mercatorY * 2 * Math.PI))) / Math.PI);

  return {
    lat: clamp(lat, MIN_LAT, MAX_LAT),
    lng: normalizeLongitude(lng),
  };
};

function RasterTile({ tile, onReady }: { tile: TileDescriptor; onReady: () => void }) {
  const [providerIndex, setProviderIndex] = useState(0);
  const totalTiles = 2 ** tile.z;
  const wrappedX = ((tile.x % totalTiles) + totalTiles) % totalTiles;
  const cartoSubdomain = ['a', 'b', 'c', 'd'][Math.abs(tile.x + tile.y) % 4];

  const sources = [
    `https://${cartoSubdomain}.basemaps.cartocdn.com/rastertiles/voyager/${tile.z}/${wrappedX}/${tile.y}.png`,
    `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${tile.z}/${tile.y}/${wrappedX}`,
    `https://tile.openstreetmap.org/${tile.z}/${wrappedX}/${tile.y}.png`,
  ];

  if (providerIndex >= sources.length) {
    return (
      <div
        className="absolute bg-slate-100"
        style={{
          left: tile.left,
          top: tile.top,
          width: tile.size + 1,
          height: tile.size + 1,
        }}
      />
    );
  }

  return (
    <img
      src={sources[providerIndex]}
      alt=""
      aria-hidden="true"
      draggable={false}
      className="absolute block select-none"
      style={{
        left: tile.left,
        top: tile.top,
        width: tile.size + 1,
        height: tile.size + 1,
        maxWidth: 'none',
        userSelect: 'none',
        pointerEvents: 'none',
      }}
      onLoad={onReady}
      onError={() => setProviderIndex(index => index + 1)}
    />
  );
}

const markerClasses: Record<RasterMarkerKind, string> = {
  store: 'bg-orange-500 text-white border-white',
  customer: 'bg-slate-950 text-white border-white',
  rider: 'bg-blue-600 text-white border-white animate-rider-map-pulse',
};

const MarkerIcon = ({ kind }: { kind: RasterMarkerKind }) => {
  if (kind === 'store') return <Store size={15} />;
  if (kind === 'rider') return <Bike size={16} />;
  return <Home size={15} />;
};

export default function InteractiveRasterMap({
  center,
  zoom = 16,
  minZoom = 12,
  maxZoom = 19,
  pinOffsetY = 0,
  interactive = true,
  showControls = true,
  markers = [],
  path = [],
  className = '',
  onReady,
  onViewChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointersRef = useRef(new Map<number, ScreenPoint>());
  const dragStartRef = useRef<{
    pointer: ScreenPoint;
    center: RasterLatLng;
    zoom: number;
  } | null>(null);
  const pinchStartRef = useRef<{
    distance: number;
    center: RasterLatLng;
    zoom: number;
  } | null>(null);
  const readySentRef = useRef(false);
  const [size, setSize] = useState({ width: 390, height: 360 });
  const [viewCenter, setViewCenter] = useState(center);
  const [viewZoom, setViewZoom] = useState(clamp(zoom, minZoom, maxZoom));

  useEffect(() => {
    if (pointersRef.current.size > 0) return;
    setViewCenter(center);
  }, [center.lat, center.lng]);

  useEffect(() => {
    if (pointersRef.current.size > 0) return;
    setViewZoom(clamp(zoom, minZoom, maxZoom));
  }, [maxZoom, minZoom, zoom]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setSize({
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height),
      });
    };

    updateSize();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const anchor = useMemo(
    () => ({ x: size.width / 2, y: size.height / 2 + pinOffsetY }),
    [pinOffsetY, size.height, size.width]
  );

  const baseZoom = clamp(Math.floor(viewZoom), minZoom, maxZoom);
  const fractionalScale = 2 ** (viewZoom - baseZoom);
  const centerWorld = useMemo(
    () => project(viewCenter, baseZoom),
    [baseZoom, viewCenter]
  );

  const toScreen = useCallback(
    (position: RasterLatLng): ScreenPoint => {
      const point = project(position, baseZoom);
      return {
        x: (point.x - centerWorld.x) * fractionalScale + anchor.x,
        y: (point.y - centerWorld.y) * fractionalScale + anchor.y,
      };
    },
    [anchor.x, anchor.y, baseZoom, centerWorld.x, centerWorld.y, fractionalScale]
  );

  const tiles = useMemo(() => {
    const visibleWorldWidth = size.width / fractionalScale;
    const visibleWorldHeight = size.height / fractionalScale;
    const minTileX =
      Math.floor((centerWorld.x - visibleWorldWidth / 2) / TILE_SIZE) - 1;
    const maxTileX =
      Math.floor((centerWorld.x + visibleWorldWidth / 2) / TILE_SIZE) + 1;
    const minTileY = Math.max(
      0,
      Math.floor((centerWorld.y - visibleWorldHeight / 2 - pinOffsetY / fractionalScale) / TILE_SIZE) - 1
    );
    const maxTileY = Math.min(
      2 ** baseZoom - 1,
      Math.floor((centerWorld.y + visibleWorldHeight / 2 - pinOffsetY / fractionalScale) / TILE_SIZE) + 1
    );
    const result: TileDescriptor[] = [];
    const scaledTileSize = TILE_SIZE * fractionalScale;

    for (let y = minTileY; y <= maxTileY; y += 1) {
      for (let x = minTileX; x <= maxTileX; x += 1) {
        result.push({
          key: `${baseZoom}-${x}-${y}`,
          x,
          y,
          z: baseZoom,
          left: (x * TILE_SIZE - centerWorld.x) * fractionalScale + anchor.x,
          top: (y * TILE_SIZE - centerWorld.y) * fractionalScale + anchor.y,
          size: scaledTileSize,
        });
      }
    }

    return result;
  }, [
    anchor.x,
    anchor.y,
    baseZoom,
    centerWorld.x,
    centerWorld.y,
    fractionalScale,
    pinOffsetY,
    size.height,
    size.width,
  ]);

  const pathPoints = useMemo(
    () => path.map(toScreen).map(point => `${point.x},${point.y}`).join(' '),
    [path, toScreen]
  );

  const emitView = useCallback(
    (nextCenter: RasterLatLng, nextZoom: number, final: boolean) => {
      setViewCenter(nextCenter);
      setViewZoom(nextZoom);
      onViewChange?.(nextCenter, nextZoom, final);
    },
    [onViewChange]
  );

  const panFromDelta = useCallback(
    (origin: RasterLatLng, originZoom: number, deltaX: number, deltaY: number) => {
      const zoomFloor = Math.floor(originZoom);
      const scale = 2 ** (originZoom - zoomFloor);
      const world = project(origin, zoomFloor);
      return unproject(
        {
          x: world.x - deltaX / scale,
          y: world.y - deltaY / scale,
        },
        zoomFloor
      );
    },
    []
  );

  const pointerPoint = (event: ReactPointerEvent<HTMLDivElement>): ScreenPoint => ({
    x: event.clientX,
    y: event.clientY,
  });

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, pointerPoint(event));

    if (pointersRef.current.size === 1) {
      dragStartRef.current = {
        pointer: pointerPoint(event),
        center: viewCenter,
        zoom: viewZoom,
      };
      pinchStartRef.current = null;
      return;
    }

    if (pointersRef.current.size === 2) {
      const [first, second] = Array.from(pointersRef.current.values());
      pinchStartRef.current = {
        distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
        center: viewCenter,
        zoom: viewZoom,
      };
      dragStartRef.current = null;
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!interactive || !pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, pointerPoint(event));

    if (pointersRef.current.size === 1 && dragStartRef.current) {
      const current = pointerPoint(event);
      const start = dragStartRef.current;
      const nextCenter = panFromDelta(
        start.center,
        start.zoom,
        current.x - start.pointer.x,
        current.y - start.pointer.y
      );
      emitView(nextCenter, start.zoom, false);
      return;
    }

    if (pointersRef.current.size === 2 && pinchStartRef.current) {
      const [first, second] = Array.from(pointersRef.current.values());
      const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
      const nextZoom = clamp(
        pinchStartRef.current.zoom + Math.log2(distance / pinchStartRef.current.distance),
        minZoom,
        maxZoom
      );
      emitView(pinchStartRef.current.center, nextZoom, false);
    }
  };

  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    pointersRef.current.delete(event.pointerId);

    if (pointersRef.current.size === 1) {
      const remaining = Array.from(pointersRef.current.values())[0];
      dragStartRef.current = {
        pointer: remaining,
        center: viewCenter,
        zoom: viewZoom,
      };
      pinchStartRef.current = null;
      return;
    }

    if (pointersRef.current.size === 0) {
      dragStartRef.current = null;
      pinchStartRef.current = null;
      onViewChange?.(viewCenter, viewZoom, true);
    }
  };

  const zoomBy = (delta: number) => {
    if (!interactive) return;
    const nextZoom = clamp(viewZoom + delta, minZoom, maxZoom);
    emitView(viewCenter, nextZoom, true);
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (!interactive) return;
    event.preventDefault();
    zoomBy(event.deltaY > 0 ? -0.5 : 0.5);
  };

  const notifyReady = useCallback(() => {
    if (readySentRef.current) return;
    readySentRef.current = true;
    onReady?.();
  }, [onReady]);

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden bg-slate-100 ${
        interactive ? 'cursor-grab active:cursor-grabbing' : ''
      } ${className}`}
      style={{ touchAction: interactive ? 'none' : 'auto' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      onWheel={handleWheel}
      onDoubleClick={() => zoomBy(1)}
      role={interactive ? 'application' : 'img'}
      aria-label={interactive ? 'Mapa interactivo: arrastra y pellizca para acercar' : 'Mapa del pedido'}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#f8fafc,_#dbe4ee)]" />

      {tiles.map(tile => (
        <RasterTile key={tile.key} tile={tile} onReady={notifyReady} />
      ))}

      {pathPoints && (
        <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible">
          <polyline
            points={pathPoints}
            fill="none"
            stroke="rgba(255,255,255,0.95)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={pathPoints}
            fill="none"
            stroke="#f97316"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {markers.map(marker => {
        const point = toScreen(marker.position);
        return (
          <div
            key={marker.id}
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
            style={{ left: point.x, top: point.y }}
          >
            <div
              className={`grid h-9 w-9 place-items-center rounded-2xl border-[3px] shadow-xl ${markerClasses[marker.kind]}`}
            >
              <MarkerIcon kind={marker.kind} />
            </div>
            {marker.label && (
              <p className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/95 px-2 py-0.5 text-[7px] font-black uppercase text-slate-700 shadow-md">
                {marker.label}
              </p>
            )}
          </div>
        );
      })}

      {showControls && interactive && (
        <div className="absolute bottom-3 right-3 z-30 flex flex-col overflow-hidden rounded-2xl border border-white/80 bg-white/95 shadow-xl backdrop-blur">
          <button
            type="button"
            onPointerDown={event => event.stopPropagation()}
            onClick={event => {
              event.stopPropagation();
              zoomBy(1);
            }}
            className="grid h-10 w-10 place-items-center text-slate-700 active:bg-orange-50 active:text-orange-600"
            aria-label="Acercar mapa"
          >
            <Plus size={18} />
          </button>
          <div className="h-px bg-slate-100" />
          <button
            type="button"
            onPointerDown={event => event.stopPropagation()}
            onClick={event => {
              event.stopPropagation();
              zoomBy(-1);
            }}
            className="grid h-10 w-10 place-items-center text-slate-700 active:bg-orange-50 active:text-orange-600"
            aria-label="Alejar mapa"
          >
            <Minus size={18} />
          </button>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-1 left-1 z-20 rounded-md bg-white/80 px-1.5 py-0.5 text-[6px] font-bold text-slate-500 backdrop-blur">
        © CARTO · Esri · OpenStreetMap
      </div>

      <style>{`
        @keyframes rider-map-pulse {
          0%, 100% { box-shadow: 0 8px 22px rgba(37, 99, 235, 0.3); transform: scale(1); }
          50% { box-shadow: 0 8px 30px rgba(37, 99, 235, 0.55); transform: scale(1.07); }
        }
        .animate-rider-map-pulse { animation: rider-map-pulse 1.8s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
