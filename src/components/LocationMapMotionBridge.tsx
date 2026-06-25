import { useEffect } from 'react';

const STYLE_ID = 'pollazo-location-map-motion-bridge-style';
const PATCH_FLAG = '__pollazoMoveThrottleInstalled';

const normalize = (value: unknown) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const setImportant = (element: HTMLElement, property: string, value: string) => {
  element.style.setProperty(property, value, 'important');
};

const installStyles = () => {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .leaflet-container {
      transform: translateZ(0) !important;
      backface-visibility: hidden !important;
      -webkit-font-smoothing: antialiased !important;
      touch-action: pan-x pan-y !important;
    }

    .leaflet-pane,
    .leaflet-tile-container,
    .leaflet-marker-pane {
      will-change: transform !important;
      transform: translateZ(0) !important;
    }

    .pollazo-map-road-hint {
      margin-top: 6px !important;
      color: #f97316 !important;
      font-weight: 900 !important;
      letter-spacing: 0.08em !important;
    }
  `;
  document.head.appendChild(style);
};

const patchLeafletMoveHandlers = () => {
  const leaflet = (window as typeof window & { L?: any }).L;
  const mapPrototype = leaflet?.Map?.prototype;

  if (!mapPrototype || mapPrototype[PATCH_FLAG]) return Boolean(mapPrototype?.[PATCH_FLAG]);

  const originalOn = mapPrototype.on;
  if (typeof originalOn !== 'function') return false;

  mapPrototype.on = function patchedOn(this: unknown, types: unknown, fn: unknown, context?: unknown) {
    const typeText = typeof types === 'string' ? types : '';
    const onlyMove = typeText.split(/\s+/).includes('move') && typeof fn === 'function';

    if (!onlyMove) {
      return originalOn.apply(this, arguments as any);
    }

    let raf = 0;
    let lastArgs: unknown[] = [];
    const mapThis = this;

    const throttled = function throttledLeafletMove(...args: unknown[]) {
      lastArgs = args;
      if (raf) return;

      raf = window.requestAnimationFrame(() => {
        raf = 0;
        (fn as (...moveArgs: unknown[]) => void).apply(context || mapThis, lastArgs);
      });
    };

    return originalOn.call(this, types, throttled, context);
  };

  mapPrototype[PATCH_FLAG] = true;
  return true;
};

const findLocationModal = () => {
  return Array.from(document.querySelectorAll<HTMLElement>('div.fixed')).find(element => {
    const text = normalize(element.textContent);
    return text.includes('confirmar direccion') && (text.includes('marca tu punto exacto') || text.includes('marca sobre una calle'));
  }) || null;
};

const polishLocationModal = () => {
  const modal = findLocationModal();
  if (!modal) return;

  Array.from(modal.querySelectorAll<HTMLElement>('p')).forEach(paragraph => {
    const text = normalize(paragraph.textContent);
    if (text === 'marca tu punto exacto') {
      paragraph.textContent = 'Marca sobre una calle cercana';
      paragraph.classList.add('pollazo-map-road-hint');
    }
  });

  Array.from(modal.querySelectorAll<HTMLElement>('div')).forEach(element => {
    const className = String(element.className || '');
    const isCenterMarkerLayer =
      className.includes('top-1/2') &&
      className.includes('left-1/2') &&
      className.includes('z-[650]');

    if (!isCenterMarkerLayer) return;

    setImportant(element, 'top', '54%');
    setImportant(element, 'will-change', 'transform, opacity');
    setImportant(element, 'transform-style', 'preserve-3d');
  });
};

export default function LocationMapMotionBridge() {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    installStyles();

    let patchTimer = 0;
    const ensureLeafletPatch = () => {
      if (patchLeafletMoveHandlers()) return;
      patchTimer = window.setTimeout(ensureLeafletPatch, 180);
    };

    ensureLeafletPatch();
    polishLocationModal();

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(polishLocationModal);
      window.requestAnimationFrame(patchLeafletMoveHandlers);
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    const timers = [80, 220, 520, 1000].map(delay => window.setTimeout(polishLocationModal, delay));

    return () => {
      window.clearTimeout(patchTimer);
      timers.forEach(timer => window.clearTimeout(timer));
      observer.disconnect();
    };
  }, []);

  return null;
}
