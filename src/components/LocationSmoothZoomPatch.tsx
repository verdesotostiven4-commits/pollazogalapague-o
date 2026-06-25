import { useEffect } from 'react';

const ZOOM_MS = 180;
const MOVE_MS = 80;

type AnyMap = any;
type Point = { x: number; y: number };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function patchMap(map: AnyMap) {
  if (!map || map.__pollazoSmoothZoomPatched || !map.container || !map.tiles || !map.marks) return map;

  map.__pollazoSmoothZoomPatched = true;

  const originalSetZoom = map.setZoom?.bind(map);
  const originalMove = map.move;
  const originalUp = map.up;
  const originalWheel = map.wheel;
  let zoomTimer = 0;
  let pendingZoom: number | null = null;
  let pinchStart = 0;
  let pinchZoom = 0;
  let pinchScale = 1;
  let frame = 0;

  const origin = () => {
    const box = map.container.getBoundingClientRect();
    return { x: box.width / 2, y: box.height / 2 + 72 };
  };

  const clearTransform = () => {
    map.tiles.style.transition = '';
    map.marks.style.transition = '';
    map.tiles.style.transformOrigin = '';
    map.marks.style.transformOrigin = '';
    map.tiles.style.transform = 'translate3d(0,0,0)';
    map.marks.style.transform = 'translate3d(0,0,0)';
  };

  const finishZoom = () => {
    if (zoomTimer) window.clearTimeout(zoomTimer);
    zoomTimer = 0;
    if (pendingZoom !== null) {
      map.zoom = pendingZoom;
      pendingZoom = null;
      clearTransform();
      map.render?.();
      map.emit?.('zoomend');
      map.emit?.('move');
      map.emit?.('moveend');
    }
  };

  const animatedZoom = (rawZoom: number) => {
    const next = clamp(Math.round(rawZoom), map.minZoom, map.maxZoom);
    if (next === map.zoom && pendingZoom === null) return map;
    finishZoom();

    const scale = 2 ** (next - map.zoom);
    const p = origin();
    pendingZoom = next;
    map.tiles.style.transformOrigin = `${p.x}px ${p.y}px`;
    map.marks.style.transformOrigin = `${p.x}px ${p.y}px`;
    map.tiles.style.transition = `transform ${ZOOM_MS}ms cubic-bezier(.2,.8,.2,1)`;
    map.marks.style.transition = `transform ${ZOOM_MS}ms cubic-bezier(.2,.8,.2,1)`;

    window.requestAnimationFrame(() => {
      map.tiles.style.transform = `scale(${scale})`;
      map.marks.style.transform = `scale(${scale})`;
    });

    zoomTimer = window.setTimeout(finishZoom, ZOOM_MS + 30);
    return map;
  };

  map.setZoom = animatedZoom;
  map.wheel = (event: WheelEvent) => {
    event.preventDefault();
    animatedZoom(map.zoom + (event.deltaY > 0 ? -1 : 1));
  };

  map.move = (event: PointerEvent) => {
    if (!map.points?.has(event.pointerId)) return;
    event.preventDefault();
    map.points.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (map.points.size >= 2) {
      const points = Array.from(map.points.values()) as Point[];
      const current = distance(points[0], points[1]);

      if (!pinchStart) {
        pinchStart = current;
        pinchZoom = map.zoom;
        pinchScale = 1;
      }

      if (pinchStart > 0 && current > 0) {
        const scale = clamp(current / pinchStart, 0.55, 1.9);
        const p = origin();
        pinchScale = scale;
        map.tiles.style.transition = '';
        map.marks.style.transition = '';
        map.tiles.style.transformOrigin = `${p.x}px ${p.y}px`;
        map.marks.style.transformOrigin = `${p.x}px ${p.y}px`;
        map.tiles.style.transform = `scale(${scale})`;
        map.marks.style.transform = `scale(${scale})`;

        if (!map.moveTimer) {
          map.moveTimer = window.setTimeout(() => {
            map.moveTimer = 0;
            map.emit?.('move');
          }, MOVE_MS);
        }
      }

      return;
    }

    if (!map.startPointer || !map.startCenterPx) return originalMove?.(event);

    const dx = event.clientX - map.startPointer.x;
    const dy = event.clientY - map.startPointer.y;

    originalMove?.(event);

    if (!frame) {
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        if (map.points?.size === 1) {
          map.tiles.style.transform = `translate3d(${dx}px,${dy}px,0)`;
          map.marks.style.transform = `translate3d(${dx}px,${dy}px,0)`;
        }
      });
    }
  };

  map.up = (event: PointerEvent) => {
    const wasPinching = map.points?.size >= 2 || pinchStart > 0;
    originalUp?.(event);

    if (wasPinching && (!map.points || map.points.size === 0)) {
      if (Math.abs(pinchScale - 1) > 0.08) {
        map.zoom = clamp(Math.round(pinchZoom + Math.log2(pinchScale)), map.minZoom, map.maxZoom);
      }

      pinchStart = 0;
      pinchZoom = 0;
      pinchScale = 1;
      clearTransform();
      map.render?.();
      map.emit?.('zoomend');
      map.emit?.('move');
      map.emit?.('moveend');
    }
  };

  map.container.removeEventListener('pointermove', originalMove);
  map.container.removeEventListener('pointerup', originalUp);
  map.container.removeEventListener('pointercancel', originalUp);
  map.container.removeEventListener('wheel', originalWheel);
  map.container.addEventListener('pointermove', map.move, { passive: false });
  map.container.addEventListener('pointerup', map.up, { passive: false });
  map.container.addEventListener('pointercancel', map.up, { passive: false });
  map.container.addEventListener('wheel', map.wheel, { passive: false });

  map.__pollazoOriginalSetZoom = originalSetZoom;
  return map;
}

function installPatch() {
  const leaflet = (window as any).L;
  if (!leaflet?.map || leaflet.__pollazoSmoothZoomFactoryPatched) return false;

  leaflet.__pollazoSmoothZoomFactoryPatched = true;
  const originalFactory = leaflet.map.bind(leaflet);
  leaflet.map = (...args: unknown[]) => patchMap(originalFactory(...args));
  return true;
}

export default function LocationSmoothZoomPatch() {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    if (installPatch()) return undefined;

    const timer = window.setInterval(() => {
      if (installPatch()) window.clearInterval(timer);
    }, 100);

    return () => window.clearInterval(timer);
  }, []);

  return null;
}
