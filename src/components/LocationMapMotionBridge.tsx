import { useEffect } from 'react';

const STYLE_ID = 'pollazo-location-map-smooth-pointer-style';
const PATCH_FLAG = '__pollazoMovePatchInstalledV3';

type LeafletMapLike = {
  getContainer?: () => HTMLElement | null;
};

type LeafletLike = {
  Map?: {
    prototype?: {
      on?: (...args: any[]) => any;
    };
  };
};

declare global {
  interface Window {
    L?: LeafletLike;
    [PATCH_FLAG]?: boolean;
  }
}

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
      top: calc(50% + 46px) !important;
      will-change: transform, opacity !important;
      transform: translate3d(-50%, -100%, 0) !important;
    }

    .pollazo-location-map-modal [data-pollazo-location-dot='true'] {
      top: calc(50% + 46px) !important;
      will-change: transform, opacity !important;
      transform: translate3d(-50%, -50%, 0) !important;
    }
  `;

  document.head.appendChild(style);
};

const makeMoveHandlerLight = (handler: (...args: any[]) => void) => {
  const locationMapCache = new WeakMap<object, boolean>();

  return function lightMoveHandler(this: unknown, ...args: any[]) {
    if (typeof this === 'object' && this !== null) {
      let isLocationMap = locationMapCache.get(this);

      if (typeof isLocationMap === 'undefined') {
        const container = (this as LeafletMapLike)?.getContainer?.();
        isLocationMap = Boolean(container?.closest?.('.pollazo-location-map-modal'));
        locationMapCache.set(this, isLocationMap);
      }

      if (isLocationMap) return;
    }

    handler.apply(this, args);
  };
};

const installLeafletMovePatch = () => {
  if (window[PATCH_FLAG]) return true;

  const leaflet = window.L;
  const mapPrototype = leaflet?.Map?.prototype;

  if (!mapPrototype?.on) return false;

  const originalOn = mapPrototype.on;

  mapPrototype.on = function patchedLeafletOn(this: unknown, types: unknown, fn?: unknown, context?: unknown) {
    if (types === 'move' && typeof fn === 'function') {
      return originalOn.call(this, types, makeMoveHandlerLight(fn as (...args: any[]) => void), context);
    }

    return originalOn.apply(this, arguments as any);
  };

  window[PATCH_FLAG] = true;
  return true;
};

export default function LocationMapMotionBridge() {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    installStyles();

    let patchTimer = 0;
    const tryPatch = () => {
      if (installLeafletMovePatch()) return;
      patchTimer = window.setTimeout(tryPatch, 120);
    };

    tryPatch();

    return () => {
      if (patchTimer) window.clearTimeout(patchTimer);
    };
  }, []);

  return null;
}
