import { useEffect } from 'react';

const STYLE_ID = 'pollazo-location-map-performance-style';
const PATCH_CHECK_MS = 250;
const MOVE_COMMIT_MS = 80;

type LeafletLike = {
  map?: (...args: any[]) => any;
  tileLayer?: (...args: any[]) => any;
  Map?: {
    prototype?: {
      on?: (...args: any[]) => any;
    };
  };
};

declare global {
  interface Window {
    L?: LeafletLike;
    __pollazoLeafletPerfPatched?: boolean;
  }
}

const installStyles = () => {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    div[class*="fixed"][class*="inset-0"][class*="z-[10000]"][class*="bg-slate-100"] .leaflet-container {
      touch-action: none !important;
      background: #f8fafc !important;
      -webkit-tap-highlight-color: transparent !important;
    }

    div[class*="fixed"][class*="inset-0"][class*="z-[10000]"][class*="bg-slate-100"] .leaflet-pane,
    div[class*="fixed"][class*="inset-0"][class*="z-[10000]"][class*="bg-slate-100"] .leaflet-map-pane,
    div[class*="fixed"][class*="inset-0"][class*="z-[10000]"][class*="bg-slate-100"] .leaflet-tile-container {
      backface-visibility: hidden !important;
      -webkit-backface-visibility: hidden !important;
      transform-style: flat !important;
    }

    div[class*="fixed"][class*="inset-0"][class*="z-[10000]"][class*="bg-slate-100"] div[class*="top-1/2"][class*="left-1/2"][class*="z-[650]"] {
      top: calc(50% + 56px) !important;
      will-change: opacity, transform !important;
    }
  `;

  document.head.appendChild(style);
};

const wrapMoveHandler = (handler: (...args: any[]) => any, forcedContext?: unknown) => {
  let frame = 0;
  let trailingTimer = 0;
  let lastCommit = 0;
  let latestArgs: any[] = [];
  let latestThis: unknown = null;

  const flush = () => {
    frame = 0;
    lastCommit = performance.now();
    handler.apply(forcedContext || latestThis, latestArgs);
  };

  return function pollazoMoveHandler(this: unknown, ...args: any[]) {
    latestArgs = args;
    latestThis = this;

    const now = performance.now();
    const elapsed = now - lastCommit;

    if (elapsed >= MOVE_COMMIT_MS) {
      if (!frame) {
        frame = window.requestAnimationFrame(flush);
      }
      return;
    }

    if (!trailingTimer) {
      trailingTimer = window.setTimeout(() => {
        trailingTimer = 0;
        if (!frame) {
          frame = window.requestAnimationFrame(flush);
        }
      }, Math.max(16, MOVE_COMMIT_MS - elapsed));
    }
  };
};

const patchLeafletPerformance = () => {
  const leaflet = window.L as any;

  if (!leaflet?.map || !leaflet?.tileLayer || !leaflet?.Map?.prototype?.on) {
    return false;
  }

  if (window.__pollazoLeafletPerfPatched) {
    return true;
  }

  window.__pollazoLeafletPerfPatched = true;

  const originalMap = leaflet.map;
  const originalTileLayer = leaflet.tileLayer;
  const originalOn = leaflet.Map.prototype.on;

  leaflet.map = function pollazoMapFactory(element: unknown, options?: Record<string, unknown>) {
    return originalMap.call(this, element, {
      ...(options || {}),
      preferCanvas: true,
      fadeAnimation: false,
      markerZoomAnimation: false,
    });
  };

  leaflet.tileLayer = function pollazoTileLayerFactory(url: string, options?: Record<string, unknown>) {
    return originalTileLayer.call(this, url, {
      ...(options || {}),
      updateWhenIdle: true,
      updateWhenZooming: false,
      keepBuffer: 1,
      detectRetina: false,
    });
  };

  leaflet.Map.prototype.on = function pollazoMapOn(type: unknown, handler?: unknown, context?: unknown) {
    if (type === 'move' && typeof handler === 'function') {
      return originalOn.call(this, type, wrapMoveHandler(handler as (...args: any[]) => any, context), context);
    }

    if (type && typeof type === 'object' && typeof (type as Record<string, unknown>).move === 'function') {
      return originalOn.call(
        this,
        {
          ...(type as Record<string, unknown>),
          move: wrapMoveHandler((type as Record<string, (...args: any[]) => any>).move, handler),
        },
        handler
      );
    }

    return originalOn.apply(this, arguments as any);
  };

  return true;
};

export default function LocationMapMotionBridge() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    installStyles();

    if (patchLeafletPerformance()) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      if (patchLeafletPerformance()) {
        window.clearInterval(interval);
      }
    }, PATCH_CHECK_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
