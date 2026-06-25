import { useEffect } from 'react';

const STYLE_ID = 'pollazo-location-map-smooth-pointer-style';
const PATCH_FLAG = '__pollazoMovePatchInstalledV4';
const TILE_PATCH_FLAG = '__pollazoTilePatchInstalledV1';

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

    const looksLikePin = className.includes('flex-col') || element.querySelector('svg');
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

const makeMoveHandlerLight = (handler: (...args: any[]) => void) => {
  return function lightMoveHandler(this: unknown, ...args: any[]) {
    if (isLocationMap(this)) return;
    handler.apply(this, args);
  };
};

const makeMoveEndHandlerLight = (handler: (...args: any[]) => void) => {
  let timer = 0;
  let lastArgs: any[] = [];

  return function lightMoveEndHandler(this: unknown, ...args: any[]) {
    if (!isLocationMap(this)) {
      handler.apply(this, args);
      return;
    }

    lastArgs = args;

    if (timer) {
      window.clearTimeout(timer);
    }

    timer = window.setTimeout(() => {
      timer = 0;
      handler.apply(this, lastArgs);
    }, 90);
  };
};

const makeMoveStartHandlerLight = (handler: (...args: any[]) => void) => {
  let lastRun = 0;

  return function lightMoveStartHandler(this: unknown, ...args: any[]) {
    if (!isLocationMap(this)) {
      handler.apply(this, args);
      return;
    }

    const now = performance.now();

    if (now - lastRun < 180) return;

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
        return originalOn.call(this, types, makeMoveHandlerLight(fn as (...args: any[]) => void), context);
      }

      if (types === 'moveend') {
        return originalOn.call(this, types, makeMoveEndHandlerLight(fn as (...args: any[]) => void), context);
      }

      if (types === 'movestart') {
        return originalOn.call(this, types, makeMoveStartHandlerLight(fn as (...args: any[]) => void), context);
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

    let attempts = 0;
    const modalTimer = window.setInterval(() => {
      markLocationModal();
      attempts += 1;

      if (attempts >= 40) {
        window.clearInterval(modalTimer);
      }
    }, 150);

    return () => {
      if (patchTimer) window.clearTimeout(patchTimer);
      window.clearInterval(modalTimer);
    };
  }, []);

  return null;
}
