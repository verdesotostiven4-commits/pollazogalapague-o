import { useEffect } from 'react';

const STYLE_ID = 'pollazo-location-vector-map-style';
const PIN_OFFSET_Y = 56;
const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const FALLBACK_STYLE_URL = 'https://demotiles.maplibre.org/style.json';

type LatLng = { lat: number; lng: number };
type ListenerHandler = (...args: unknown[]) => void;

type MapLibreLike = {
  Map?: new (options: Record<string, unknown>) => any;
  Marker?: new (options?: Record<string, unknown>) => any;
};

declare global {
  interface Window {
    maplibregl?: MapLibreLike;
    L?: any;
    __pollazoVectorMapBridgeInstalled?: boolean;
  }
}

const readLatLng = (value: unknown): LatLng => {
  if (Array.isArray(value)) {
    return { lat: Number(value[0]) || 0, lng: Number(value[1]) || 0 };
  }

  const safe = value as Partial<LatLng> | null | undefined;
  return { lat: Number(safe?.lat) || 0, lng: Number(safe?.lng) || 0 };
};

const installStyles = () => {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    div[class*="fixed"][class*="inset-0"][class*="z-[10000]"][class*="bg-slate-100"] .maplibregl-map,
    div[class*="fixed"][class*="inset-0"][class*="z-[10000]"][class*="bg-slate-100"] .pollazo-vector-map {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background: #edf5ec !important;
      touch-action: none !important;
      -webkit-tap-highlight-color: transparent !important;
      user-select: none !important;
      overflow: hidden !important;
    }

    div[class*="fixed"][class*="inset-0"][class*="z-[10000]"][class*="bg-slate-100"] .maplibregl-canvas {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      outline: none !important;
      will-change: transform !important;
      transform: translate3d(0, 0, 0) !important;
    }

    div[class*="fixed"][class*="inset-0"][class*="z-[10000]"][class*="bg-slate-100"] .maplibregl-control-container,
    div[class*="fixed"][class*="inset-0"][class*="z-[10000]"][class*="bg-slate-100"] .maplibregl-ctrl-attrib {
      display: none !important;
    }

    div[class*="fixed"][class*="inset-0"][class*="z-[10000]"][class*="bg-slate-100"] div[class*="top-1/2"][class*="left-1/2"][class*="z-[650]"] {
      top: calc(50% + ${PIN_OFFSET_Y}px) !important;
      will-change: opacity, transform !important;
    }

    .pollazo-vector-user-dot {
      position: relative;
      width: 22px;
      height: 22px;
      border-radius: 9999px;
      pointer-events: none;
    }

    .pollazo-vector-user-dot::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: rgba(59, 130, 246, 0.2);
      border: 1px solid rgba(59, 130, 246, 0.35);
    }

    .pollazo-vector-user-dot::after {
      content: '';
      position: absolute;
      left: 5px;
      top: 5px;
      width: 12px;
      height: 12px;
      border-radius: 9999px;
      background: #2563eb;
      border: 2px solid #fff;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
    }
  `;

  document.head.appendChild(style);
};

class VectorMarker {
  private marker: any = null;
  private position: LatLng;

  constructor(value: unknown) {
    this.position = readLatLng(value);
  }

  private element() {
    const wrapper = document.createElement('div');
    wrapper.className = 'pollazo-vector-user-dot';
    return wrapper;
  }

  addTo(map: VectorMap) {
    const Marker = window.maplibregl?.Marker;
    if (!Marker) return this;

    this.marker = new Marker({ element: this.element(), anchor: 'center' })
      .setLngLat([this.position.lng, this.position.lat])
      .addTo(map.raw());

    return this;
  }

  setLatLng(value: unknown) {
    this.position = readLatLng(value);
    this.marker?.setLngLat([this.position.lng, this.position.lat]);
    return this;
  }

  remove() {
    this.marker?.remove();
    this.marker = null;
  }
}

class VectorMap {
  private map: any;
  private fallbackApplied = false;

  constructor(container: HTMLElement, options?: Record<string, unknown>) {
    const MapLibreMap = window.maplibregl?.Map;
    if (!MapLibreMap) throw new Error('MapLibre no está disponible');

    const center = readLatLng(options?.center || { lat: -0.7439, lng: -90.3131 });
    const zoom = Number(options?.zoom || 17);

    container.innerHTML = '';
    container.classList.add('pollazo-vector-map');

    this.map = new MapLibreMap({
      container,
      style: MAP_STYLE_URL,
      center: [center.lng, center.lat],
      zoom,
      minZoom: Number(options?.minZoom || 5),
      maxZoom: Number(options?.maxZoom || 18),
      attributionControl: false,
      pitchWithRotate: false,
      dragRotate: false,
      touchPitch: false,
      cooperativeGestures: false,
      fadeDuration: 0,
      preserveDrawingBuffer: false,
      refreshExpiredTiles: false,
    });

    this.map.on('load', () => {
      this.map.resize();
    });

    this.map.on('error', () => {
      if (this.fallbackApplied) return;
      this.fallbackApplied = true;
      try {
        this.map.setStyle(FALLBACK_STYLE_URL);
      } catch {
        // Fallback opcional.
      }
    });
  }

  raw() {
    return this.map;
  }

  on(type: unknown, handler?: unknown, context?: unknown) {
    if (typeof type === 'string' && typeof handler === 'function') {
      this.map.on(type, (...args: unknown[]) => {
        (handler as ListenerHandler).apply(context || this, args);
      });
    }

    if (type && typeof type === 'object') {
      Object.entries(type as Record<string, unknown>).forEach(([eventName, eventHandler]) => {
        if (typeof eventHandler === 'function') {
          this.map.on(eventName, (...args: unknown[]) => {
            (eventHandler as ListenerHandler).apply(handler || this, args);
          });
        }
      });
    }

    return this;
  }

  getCenter() {
    const center = this.map.getCenter();
    return { lat: center.lat, lng: center.lng };
  }

  getZoom() {
    return this.map.getZoom();
  }

  setZoom(zoom: number, options?: Record<string, unknown>) {
    const duration = options?.animate === false ? 0 : 160;
    this.map.easeTo({ zoom, duration, easing: (t: number) => t, essential: true });
    return this;
  }

  setView(value: unknown, zoom?: number, options?: Record<string, unknown>) {
    const center = readLatLng(value);
    const animate = options?.animate === true;
    this.map.easeTo({
      center: [center.lng, center.lat],
      zoom: typeof zoom === 'number' ? zoom : this.map.getZoom(),
      duration: animate ? 180 : 0,
      easing: (t: number) => t,
      essential: true,
    });
    return this;
  }

  flyTo(value: unknown, zoom?: number, options?: Record<string, unknown>) {
    const center = readLatLng(value);
    const rawDuration = Number(options?.duration || 0.45);
    const duration = rawDuration <= 10 ? rawDuration * 1000 : rawDuration;
    this.map.easeTo({
      center: [center.lng, center.lat],
      zoom: typeof zoom === 'number' ? zoom : this.map.getZoom(),
      duration: Math.min(duration, 600),
      easing: (t: number) => 1 - (1 - t) * (1 - t),
      essential: true,
    });
    return this;
  }

  invalidateSize() {
    window.requestAnimationFrame(() => this.map?.resize?.());
    return this;
  }

  removeLayer(layer: { remove?: () => void }) {
    layer?.remove?.();
    return this;
  }

  remove() {
    try {
      this.map?.remove?.();
    } catch {
      // Mapa ya desmontado.
    }
  }
}

const noopTileLayer = {
  addTo: (map: VectorMap) => map,
  on: () => noopTileLayer,
  remove: () => undefined,
};

const installBridge = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (!window.maplibregl?.Map || !window.maplibregl?.Marker) return false;

  installStyles();

  window.L = {
    map: (container: HTMLElement, options?: Record<string, unknown>) => new VectorMap(container, options),
    tileLayer: () => noopTileLayer,
    marker: (value: unknown) => new VectorMarker(value),
    divIcon: (options?: Record<string, unknown>) => options || {},
  };

  window.__pollazoVectorMapBridgeInstalled = true;
  return true;
};

export default function LocationVectorMapBridge() {
  if (typeof window !== 'undefined' && window.maplibregl?.Map && !window.__pollazoVectorMapBridgeInstalled) {
    installBridge();
  }

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;
    installStyles();

    if (installBridge()) return undefined;

    const interval = window.setInterval(() => {
      if (installBridge()) window.clearInterval(interval);
    }, 120);

    return () => window.clearInterval(interval);
  }, []);

  return null;
}
