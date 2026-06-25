import { useEffect } from 'react';

const STYLE_ID = 'pollazo-location-map-smooth-pointer-style';
const PATCH_FLAG = '__pollazoMovePatchInstalled';

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
    .pollazo-location-map-modal .leaflet-tile-container {
      backface-visibility: hidden !important;
      -webkit-backface-visibility: hidden !important;
      transform-style: preserve-3d !important;
      will-change: transform !important;
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

    element.style.setProperty('top', 'calc(50% + 22px)', 'important');
    element.style.setProperty('will-change', 'transform, opacity', 'important');
  });
};

const throttleMoveHandler = (handler: (...args: any[]) => void) => {
  let raf = 0;
  let lastArgs: any[] | null = null;
  let lastRun = 0;

  return function throttledMove(this: unknown, ...args: any[]) {
    lastArgs = args;
    const now = performance.now();

    if (now - lastRun < 140) {
      if (!raf) {
        raf = window.requestAnimationFrame(() => {
          raf = 0;
        });
      }
      return;
    }

    lastRun = now;

    if (raf) {
      window.cancelAnimationFrame(raf);
      raf = 0;
    }

    handler.apply(this, lastArgs);
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
      return originalOn.call(this, types, throttleMoveHandler(fn as (...args: any[]) => void), context);
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
    lowerPointer();

    let raf = 0;
    const schedulePointerPolish = () => {
      if (raf) return;

      raf = window.requestAnimationFrame(() => {
        raf = 0;
        lowerPointer();
      });
    };

    const observer = new MutationObserver(schedulePointerPolish);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    const timers = [150, 450, 900, 1500].map(delay => window.setTimeout(schedulePointerPolish, delay));

    return () => {
      if (patchTimer) window.clearTimeout(patchTimer);
      if (raf) window.cancelAnimationFrame(raf);
      timers.forEach(timer => window.clearTimeout(timer));
      observer.disconnect();
    };
  }, []);

  return null;
}
