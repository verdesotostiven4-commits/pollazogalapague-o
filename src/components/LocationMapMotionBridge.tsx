import { useEffect } from 'react';

const STYLE_ID = 'pollazo-location-map-smooth-pointer-style';
const PATCH_FLAG = '__pollazoMovePatchInstalledV5';
const TILE_PATCH_FLAG = '__pollazoTilePatchInstalledV2';

type LeafletMapLike = {
  getContainer?: () => HTMLElement | null;
};

type LeafletLike = {
  Map?: {
    prototype?: {
      on?: (...args: any[]) => any;
    };
  };
  tileLayer?: (...args: any[]) => any;
};

declare global {
  interface Window {
    L?: LeafletLike;
    [PATCH_FLAG]?: boolean;
    [TILE_PATCH_FLAG]?: boolean;
  }
}

const normalize = (value: unknown) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const installStyles = () => {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .pollazo-location-map-modal .leaflet-container,
    .pollazo-location-map-modal .leaflet-pane,
    .pollazo-location-map-modal .leaflet-map-pane,
    .pollazo-location-map-modal .leaflet-tile-container {
      backface-visibility: hidden !important;
      -webkit-backface-visibility: hidden !important;
      transform-style: preserve-3d !important;
      will-change: transform !important;
    }

    .pollazo-location-map-modal .leaflet-container {
      touch-action: none !important;
      contain: layout paint style !important;
    }

    .pollazo-location-map-modal .leaflet-tile {
      image-rendering: auto !important;
    }

    .pollazo-location-map-modal [data-pollazo-location-pin='true'] {
      top: calc(50% + 50px) !important;
      will-change: transform, opacity !important;
      transform: translate3d(-50%, -100%, 0) !important;
    }

    .pollazo-location-map-modal [data-pollazo-location-dot='true'] {
      top: calc(50% + 50px) !important;
      will-change: transform, opacity !important;
      transform: translate3d(-50%, -50%, 0) !important;
    }
  `;

  document.head.appendChild(style);
};

const findLocationModal = () => {
  return (
    Array.from(document.querySelectorAll<HTMLElement>('div.fixed')).find(element => {
      const text = normalize(element.textContent);
      return text.includes('confirmar direccion') && text.includes('puerto ayora');
    }) || null
  );
};

const markLocationModal = () => {
  const modal = findLocationModal();
  if (!modal) return;

  modal.classList.add('pollazo-location-map-modal');
  modal.dataset.pollazoLocationModal = 'true';

  Array.from(modal.querySelectorAll<HTMLElement>('div')).forEach(element => {
    const className = String(element.className || '');
    const isCenterLayer =
      className.includes('top-1/2') &&
      className.includes('left-1/2') &&
      className.includes('z-[650]');

    if (!isCenterLayer) return;

    const looksLikePin = className.includes('flex-col') || Boolean(element.querySelector('svg'));
    element.dataset[looksLikePin ? 'pollazoLocationPin' : 'pollazoLocationDot'] = 'true';
  });
};

const isLocationMap = (map: unknown) => {
  if (typeof map !== 'object' || map === null) return false;

  try {
    const container = (map as LeafletMapLike)?.getContainer?.();
    return Boolean(container?.closest?.('.pollazo-location-map-modal'));
  } catch {
    return false;
  }
};

const makeMoveHandlerSmooth = (handler: (...args: any[]) => void) => {
  let timeout = 0;
  let frame = 0;
  let lastRun = 0;
  let lastArgs: any[] = [];
  let lastThis: unknown = null;

  const run = () => {
    timeout = 0;
    frame = 0;
    lastRun = performance.now();
    handler.apply(lastThis, lastArgs);
  };

  return function smoothMoveHandler(this: unknown, ...args: any[]) {
    if (!isLocationMap(this)) {
      handler.apply(this, args);
      return;
    }

    lastThis = this;
    lastArgs = args;

    if (frame || timeout) return;

    const elapsed = performance.now() - lastRun;

    if (elapsed >= 140) {
      frame = window.requestAnimationFrame(run);
      return;
    }

    timeout = window.setTimeout(() => {
      frame = window.requestAnimationFrame(run);
    }, 140 - elapsed);
  };
};

const makeMoveEndHandlerSmooth = (handler: (...args: any[]) => void) => {
  return function smoothMoveEndHandler(this: unknown, ...args: any[]) {
    handler.apply(this, args);
  };
};

const makeMoveStartHandlerSmooth = (handler: (...args: any[]) => void) => {
  let lastRun = 0;

  return function smoothMoveStartHandler(this: unknown, ...args: any[]) {
    if (!isLocationMap(this)) {
      handler.apply(this, args);
      return;
    }

    const now = performance.now();

    if (now - lastRun < 120) return;

    lastRun = now;
    handler.apply(this, args);
  };
};

const installLeafletEventPatch = () => {
  if (window[PATCH_FLAG]) return true;

  const leaflet = window.L;
  const mapPrototype = leaflet?.Map?.prototype;

  if (!mapPrototype?.on) return false;

  const originalOn = mapPrototype.on;

  mapPrototype.on = function patchedLeafletOn(this: unknown, types: unknown, fn?: unknown, context?: unknown) {
    if (typeof fn === 'function') {
      if (types === 'move') {
        return originalOn.call(this, types, makeMoveHandlerSmooth(fn as (...args: any[]) => void), context);
      }

      if (types === 'moveend') {
        return originalOn.call(this, types, makeMoveEndHandlerSmooth(fn as (...args: any[]) => void), context);
      }

      if (types === 'movestart') {
        return originalOn.call(this, types, makeMoveStartHandlerSmooth(fn as (...args: any[]) => void), context);
      }
    }

    return originalOn.apply(this, arguments as any);
  };

  window[PATCH_FLAG] = true;
  return true;
};

const installTilePatch = () => {
  if (window[TILE_PATCH_FLAG]) return true;

  const leaflet = window.L;

  if (!leaflet?.tileLayer) return false;

  const originalTileLayer = leaflet.tileLayer;

  leaflet.tileLayer = function patchedTileLayer(url: string, options?: Record<string, unknown>) {
    return originalTileLayer.call(this, url, {
      updateWhenIdle: true,
      updateWhenZooming: false,
      keepBuffer: 1,
      ...options,
      detectRetina: false,
    });
  };

  window[TILE_PATCH_FLAG] = true;
  return true;
};

export default function LocationMapMotionBridge() {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    installStyles();

    let patchTimer = 0;
    const tryPatch = () => {
      const eventsReady = installLeafletEventPatch();
      const tilesReady = installTilePatch();

      if (eventsReady && tilesReady) return;

      patchTimer = window.setTimeout(tryPatch, 120);
    };

    tryPatch();
    markLocationModal();

    const observer = new MutationObserver(() => {
      markLocationModal();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      if (patchTimer) window.clearTimeout(patchTimer);
      observer.disconnect();
    };
  }, []);

  return null;
}
