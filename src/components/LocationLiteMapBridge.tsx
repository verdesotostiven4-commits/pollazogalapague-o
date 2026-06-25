import { useEffect } from 'react';

const STYLE_ID = 'pollazo-lite-location-map-style';
const TILE = 256;
const PIN_OFFSET_Y = 64;
const MOVE_MS = 90;
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const SUBS = ['a', 'b', 'c'];

type LatLng = { lat: number; lng: number };
type Point = { x: number; y: number };
type Listener = { handler: (...args: unknown[]) => void; context?: unknown };

declare global {
  interface Window {
    __pollazoLiteLocationMapInstalled?: boolean;
  }
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const latLng = (value: unknown): LatLng => {
  if (Array.isArray(value)) return { lat: Number(value[0]) || 0, lng: Number(value[1]) || 0 };
  const safe = value as Partial<LatLng> | null | undefined;
  return { lat: Number(safe?.lat) || 0, lng: Number(safe?.lng) || 0 };
};

const project = (lat: number, lng: number, zoom: number): Point => {
  const scale = TILE * 2 ** zoom;
  const safeLat = clamp(lat, -85.05112878, 85.05112878);
  const sin = Math.sin((safeLat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
};

const unproject = (x: number, y: number, zoom: number): LatLng => {
  const scale = TILE * 2 ** zoom;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
};

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

const tileUrl = (template: string, z: number, x: number, y: number) =>
  template
    .replace('{s}', SUBS[Math.abs(x + y) % SUBS.length])
    .replace('{z}', String(z))
    .replace('{x}', String(x))
    .replace('{y}', String(y));

const installStyles = () => {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .pollazo-lite-map {
      position:absolute; inset:0; overflow:hidden; contain:strict; touch-action:none!important;
      background:#f8fafc; cursor:grab; user-select:none; -webkit-user-select:none;
      -webkit-tap-highlight-color:transparent;
    }
    .pollazo-lite-map.is-dragging { cursor:grabbing; }
    .pollazo-lite-tiles,.pollazo-lite-markers { position:absolute; inset:0; transform:translate3d(0,0,0); will-change:transform; backface-visibility:hidden; }
    .pollazo-lite-tile { position:absolute; width:${TILE}px; height:${TILE}px; pointer-events:none; user-select:none; -webkit-user-drag:none; }
    .pollazo-lite-user { position:absolute; width:22px; height:22px; margin:-11px 0 0 -11px; border-radius:9999px; pointer-events:none; }
    .pollazo-lite-user:before { content:''; position:absolute; inset:0; border-radius:inherit; background:rgba(59,130,246,.18); border:1px solid rgba(59,130,246,.35); }
    .pollazo-lite-user:after { content:''; position:absolute; left:5px; top:5px; width:12px; height:12px; border-radius:9999px; background:#2563eb; border:2px solid #fff; box-shadow:0 4px 12px rgba(37,99,235,.4); }
    body div[class*="fixed"][class*="inset-0"][class*="z-[10000]"][class*="bg-slate-100"] div[class*="top-1/2"][class*="left-1/2"][class*="z-[650]"] { top:calc(50% + ${PIN_OFFSET_Y}px)!important; will-change:opacity,transform!important; }
  `;
  document.head.appendChild(style);
};

class LiteMarker {
  point: LatLng;
  el: HTMLDivElement;
  map: LiteMap | null = null;

  constructor(value: unknown) {
    this.point = latLng(value);
    this.el = document.createElement('div');
    this.el.className = 'pollazo-lite-user';
  }

  addTo(map: LiteMap) {
    this.map = map;
    map.addMarker(this);
    return this;
  }

  setLatLng(value: unknown) {
    this.point = latLng(value);
    this.map?.positionMarkers();
    return this;
  }

  remove() {
    this.el.remove();
    this.map?.markers.delete(this);
    this.map = null;
  }
}

class LiteMap {
  container: HTMLElement;
  tiles: HTMLDivElement;
  marks: HTMLDivElement;
  center: LatLng;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  url = TILE_URL;
  listeners: Record<string, Listener[]> = {};
  markers = new Set<LiteMarker>();
  pointers = new Map<number, Point>();
  startPointer: Point | null = null;
  startCenterPx: Point | null = null;
  pinchDistance = 0;
  pinchZoom = 0;
  frame = 0;
  moveTimer = 0;
  dragging = false;

  constructor(container: HTMLElement, options?: Record<string, unknown>) {
    this.container = container;
    this.center = latLng(options?.center || { lat: -0.7439, lng: -90.3131 });
    this.minZoom = Math.round(Number(options?.minZoom) || 5);
    this.maxZoom = Math.round(Number(options?.maxZoom) || 18);
    this.zoom = clamp(Math.round(Number(options?.zoom) || 17), this.minZoom, this.maxZoom);

    container.innerHTML = '';
    container.className = `${container.className} leaflet-container pollazo-lite-map`;
    this.tiles = document.createElement('div');
    this.tiles.className = 'pollazo-lite-tiles';
    this.marks = document.createElement('div');
    this.marks.className = 'pollazo-lite-markers';
    container.append(this.tiles, this.marks);

    container.addEventListener('pointerdown', this.down, { passive: false });
    container.addEventListener('pointermove', this.move, { passive: false });
    container.addEventListener('pointerup', this.up, { passive: false });
    container.addEventListener('pointercancel', this.up, { passive: false });
    container.addEventListener('wheel', this.wheel, { passive: false });
    this.render();
  }

  screenPoint() {
    const box = this.container.getBoundingClientRect();
    return { x: box.width / 2, y: box.height / 2 + PIN_OFFSET_Y };
  }

  topLeft() {
    const selected = project(this.center.lat, this.center.lng, this.zoom);
    const screen = this.screenPoint();
    return { x: selected.x - screen.x, y: selected.y - screen.y };
  }

  on(type: unknown, handler?: unknown, context?: unknown) {
    if (typeof type === 'string' && typeof handler === 'function') {
      this.listeners[type] = this.listeners[type] || [];
      this.listeners[type].push({ handler: handler as (...args: unknown[]) => void, context });
    } else if (type && typeof type === 'object') {
      Object.entries(type as Record<string, unknown>).forEach(([key, value]) => {
        if (typeof value === 'function') {
          this.listeners[key] = this.listeners[key] || [];
          this.listeners[key].push({ handler: value as (...args: unknown[]) => void, context: handler });
        }
      });
    }
    return this;
  }

  emit(type: string) {
    (this.listeners[type] || []).forEach(item => item.handler.call(item.context || this));
  }

  emitMoveSoon() {
    if (this.moveTimer) return;
    this.moveTimer = window.setTimeout(() => {
      this.moveTimer = 0;
      this.emit('move');
    }, MOVE_MS);
  }

  getCenter() { return { ...this.center }; }
  getZoom() { return this.zoom; }

  setZoom(zoom: number) {
    const next = clamp(Math.round(zoom), this.minZoom, this.maxZoom);
    if (next !== this.zoom) {
      this.zoom = next;
      this.render();
      this.emit('zoomend');
      this.emit('move');
      this.emit('moveend');
    }
    return this;
  }

  setView(value: unknown, zoom?: number) {
    this.center = latLng(value);
    if (finite(zoom)) this.zoom = clamp(Math.round(zoom), this.minZoom, this.maxZoom);
    this.render();
    this.emit('move');
    this.emit('moveend');
    this.emit('zoomend');
    return this;
  }

  flyTo(value: unknown, zoom?: number) { return this.setView(value, zoom); }
  invalidateSize() { this.render(); return this; }
  removeLayer(layer: { remove?: () => void }) { layer?.remove?.(); return this; }

  remove() {
    if (this.frame) window.cancelAnimationFrame(this.frame);
    if (this.moveTimer) window.clearTimeout(this.moveTimer);
    this.container.removeEventListener('pointerdown', this.down);
    this.container.removeEventListener('pointermove', this.move);
    this.container.removeEventListener('pointerup', this.up);
    this.container.removeEventListener('pointercancel', this.up);
    this.container.removeEventListener('wheel', this.wheel);
    this.container.classList.remove('pollazo-lite-map', 'is-dragging');
    this.container.innerHTML = '';
    this.listeners = {};
    this.markers.clear();
  }

  setTiles(url: string) {
    this.url = url || TILE_URL;
    this.render();
  }

  addMarker(marker: LiteMarker) {
    this.markers.add(marker);
    if (!marker.el.parentElement) this.marks.appendChild(marker.el);
    this.positionMarkers();
  }

  positionMarkers() {
    const topLeft = this.topLeft();
    this.markers.forEach(marker => {
      const px = project(marker.point.lat, marker.point.lng, this.zoom);
      marker.el.style.transform = `translate3d(${px.x - topLeft.x}px,${px.y - topLeft.y}px,0)`;
    });
  }

  resetTransform() {
    this.tiles.style.transform = 'translate3d(0,0,0)';
    this.marks.style.transform = 'translate3d(0,0,0)';
  }

  render() {
    const box = this.container.getBoundingClientRect();
    const width = Math.max(box.width, 1);
    const height = Math.max(box.height, 1);
    const topLeft = this.topLeft();
    const maxTile = 2 ** this.zoom;
    const startX = Math.floor(topLeft.x / TILE) - 1;
    const endX = Math.floor((topLeft.x + width) / TILE) + 1;
    const startY = Math.floor(topLeft.y / TILE) - 1;
    const endY = Math.floor((topLeft.y + height) / TILE) + 1;
    const fragment = document.createDocumentFragment();

    this.resetTransform();
    this.tiles.textContent = '';

    for (let x = startX; x <= endX; x += 1) {
      for (let y = startY; y <= endY; y += 1) {
        if (y < 0 || y >= maxTile) continue;
        const wrappedX = ((x % maxTile) + maxTile) % maxTile;
        const img = document.createElement('img');
        img.className = 'pollazo-lite-tile';
        img.alt = '';
        img.draggable = false;
        img.decoding = 'async';
        img.loading = 'eager';
        img.src = tileUrl(this.url, this.zoom, wrappedX, y);
        img.style.transform = `translate3d(${x * TILE - topLeft.x}px,${y * TILE - topLeft.y}px,0)`;
        fragment.appendChild(img);
      }
    }

    this.tiles.appendChild(fragment);
    this.positionMarkers();
  }

  down = (event: PointerEvent) => {
    event.preventDefault();
    this.container.setPointerCapture?.(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.container.classList.add('is-dragging');
    if (!this.dragging) { this.dragging = true; this.emit('movestart'); }
    if (this.pointers.size === 1) {
      this.startPointer = { x: event.clientX, y: event.clientY };
      this.startCenterPx = project(this.center.lat, this.center.lng, this.zoom);
    }
    if (this.pointers.size === 2) {
      const points = Array.from(this.pointers.values());
      this.pinchDistance = dist(points[0], points[1]);
      this.pinchZoom = this.zoom;
    }
  };

  move = (event: PointerEvent) => {
    if (!this.pointers.has(event.pointerId)) return;
    event.preventDefault();
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.pointers.size >= 2) {
      const points = Array.from(this.pointers.values());
      const current = dist(points[0], points[1]);
      if (this.pinchDistance > 0 && current > 0) {
        const next = clamp(Math.round(this.pinchZoom + Math.log2(current / this.pinchDistance)), this.minZoom, this.maxZoom);
        if (next !== this.zoom) { this.zoom = next; this.render(); this.emit('zoomend'); this.emit('move'); }
      }
      return;
    }

    if (!this.startPointer || !this.startCenterPx) return;
    const dx = event.clientX - this.startPointer.x;
    const dy = event.clientY - this.startPointer.y;
    this.center = unproject(this.startCenterPx.x - dx, this.startCenterPx.y - dy, this.zoom);

    if (!this.frame) {
      this.frame = window.requestAnimationFrame(() => {
        this.frame = 0;
        this.tiles.style.transform = `translate3d(${dx}px,${dy}px,0)`;
        this.marks.style.transform = `translate3d(${dx}px,${dy}px,0)`;
      });
    }
    this.emitMoveSoon();
  };

  up = (event: PointerEvent) => {
    if (!this.pointers.has(event.pointerId)) return;
    event.preventDefault();
    this.container.releasePointerCapture?.(event.pointerId);
    this.pointers.delete(event.pointerId);

    if (this.pointers.size === 1) {
      const [point] = Array.from(this.pointers.values());
      this.startPointer = point;
      this.startCenterPx = project(this.center.lat, this.center.lng, this.zoom);
      return;
    }

    if (this.pointers.size === 0) {
      this.dragging = false;
      this.startPointer = null;
      this.startCenterPx = null;
      this.pinchDistance = 0;
      this.container.classList.remove('is-dragging');
      this.render();
      this.emit('move');
      this.emit('moveend');
    }
  };

  wheel = (event: WheelEvent) => {
    event.preventDefault();
    this.setZoom(this.zoom + (event.deltaY > 0 ? -1 : 1));
  };
}

const install = () => {
  if (window.__pollazoLiteLocationMapInstalled) return;
  window.__pollazoLiteLocationMapInstalled = true;
  const previous = (window as any).L || {};
  (window as any).L = {
    ...previous,
    map: (container: HTMLElement, options?: Record<string, unknown>) => new LiteMap(container, options),
    tileLayer: (url: string) => ({ addTo: (map: LiteMap) => { map.setTiles(url); return map; }, on: () => undefined }),
    marker: (value: unknown) => new LiteMarker(value),
    divIcon: (options?: Record<string, unknown>) => options || {},
  };
};

export default function LocationLiteMapBridge() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;
    installStyles();
    install();
    return undefined;
  }, []);

  return null;
}
