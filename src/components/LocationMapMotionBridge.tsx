import { useEffect } from 'react';

const STYLE_ID = 'pollazo-location-map-smooth-pointer-style';
const PATCH_FLAG = '__pollazoMovePatchInstalledV2';

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

const isLocationMap = (map: unknown) => {
  try {
    const container = (map as LeafletMapLike)?.getContainer?.();
    const modal = container?.closest<HTMLElement>('.pollazo-location-map-modal') || container?.closest<HTMLElement>('div.fixed');
    const text = normalize(modal?.textContent);

    return Boolean(text.includes('confirmar direccion') && text.includes('puerto ayora'));
  } catch {
    return false;
  }
};

const lowerPointer = () => {
  const modal = findLocationModal();
  if (!modal) return;

  modal.classList.add('pollazo-location-map-modal');

  Array.from(modal.querySelectorAll<HTMLElement>('div')).forEach(element => {
    const className = String(element.className || '');
    const isCenterLayer =
      className.includes('top-1/2') &&
      className.includes('left-1/2') &&
      className.includes('z-[650]');

    if (!isCenterLayer) return;

    element.style.setProperty('top', 'calc(50% + 38px)', 'important');
    element.style.setProperty('will-change', 'transform, opacity', 'important');
  });
};

const makeMoveHandlerLight = (handler: (...args: any[]) => void) => {
  return function lightMoveHandler(this: unknown, ...args: any[]) {
    if (isLocationMap(this)) {
      return;
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

    let attempts = 0;
    const pointerTimer = window.setInterval(() => {
      lowerPointer();
      attempts += 1;

      if (attempts >= 24) {
        window.clearInterval(pointerTimer);
      }
    }, 250);

    window.addEventListener('pollazo:location-map-open', lowerPointer as EventListener);

    return () => {
      if (patchTimer) window.clearTimeout(patchTimer);
      window.clearInterval(pointerTimer);
      window.removeEventListener('pollazo:location-map-open', lowerPointer as EventListener);
    };
  }, []);

  return null;
}
