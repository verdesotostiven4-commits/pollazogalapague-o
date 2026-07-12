import { useEffect, useMemo, useRef, useState } from 'react';

interface LatLng {
  lat: number;
  lng: number;
}

interface Props {
  center: LatLng;
  zoom: number;
}

interface TileDescriptor {
  key: string;
  left: number;
  top: number;
  z: number;
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

const project = (position: LatLng, zoom: number) => {
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

function RasterTile({ tile }: { tile: TileDescriptor }) {
  const [providerIndex, setProviderIndex] = useState(0);
  const totalTiles = 2 ** tile.z;
  const wrappedX = ((tile.x % totalTiles) + totalTiles) % totalTiles;

  const sources = [
    `https://tile.openstreetmap.org/${tile.z}/${wrappedX}/${tile.y}.png`,
    `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${tile.z}/${tile.y}/${wrappedX}`,
    `https://a.basemaps.cartocdn.com/rastertiles/voyager/${tile.z}/${wrappedX}/${tile.y}.png`,
  ];

  if (providerIndex >= sources.length) {
    return (
      <div
        className="absolute bg-slate-100"
        style={{
          left: tile.left,
          top: tile.top,
          width: TILE_SIZE,
          height: TILE_SIZE,
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
      className="pollazo-raster-tile absolute block h-64 w-64 select-none"
      style={{ left: tile.left, top: tile.top }}
      onError={() => setProviderIndex(index => index + 1)}
    />
  );
}

export default function RasterMapFallback({ center, zoom }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 390, height: 430 });

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

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const tiles = useMemo(() => {
    const integerZoom = clamp(Math.round(zoom), 5, 18);
    const world = project(center, integerZoom);
    const minTileX = Math.floor((world.x - size.width / 2) / TILE_SIZE) - 1;
    const maxTileX = Math.floor((world.x + size.width / 2) / TILE_SIZE) + 1;
    const minTileY = Math.max(
      0,
      Math.floor((world.y - size.height / 2) / TILE_SIZE) - 1
    );
    const maxTileY = Math.min(
      2 ** integerZoom - 1,
      Math.floor((world.y + size.height / 2) / TILE_SIZE) + 1
    );

    const result: TileDescriptor[] = [];

    for (let y = minTileY; y <= maxTileY; y += 1) {
      for (let x = minTileX; x <= maxTileX; x += 1) {
        result.push({
          key: `${integerZoom}-${x}-${y}`,
          left: x * TILE_SIZE - world.x + size.width / 2,
          top: y * TILE_SIZE - world.y + size.height / 2,
          z: integerZoom,
          x,
          y,
        });
      }
    }

    return result;
  }, [center, size.height, size.width, zoom]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-slate-100"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#f8fafc,_#e2e8f0)]" />

      {tiles.map(tile => (
        <RasterTile key={tile.key} tile={tile} />
      ))}

      <div className="absolute bottom-1 right-1 rounded bg-white/85 px-1.5 py-0.5 text-[7px] font-bold text-slate-500 shadow-sm">
        © OpenStreetMap · Esri · CARTO
      </div>

      <style>{`
        .pollazo-raster-tile {
          pointer-events: none !important;
          transform: none !important;
          filter: none !important;
          transition: none !important;
          image-rendering: auto;
        }
      `}</style>
    </div>
  );
}
