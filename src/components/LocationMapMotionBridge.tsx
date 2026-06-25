import { useEffect } from 'react';

const STYLE_ID = 'pollazo-location-map-motion-bridge-style';

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
      touch-action: none !important;
      overscroll-behavior: contain !important;
      transform: translateZ(0) !important;
      backface-visibility: hidden !important;
      background: #f8fafc !important;
    }

    .leaflet-pane,
    .leaflet-tile-container,
    .leaflet-marker-pane {
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

    setImportant(element, 'top', '58%');
    setImportant(element, 'will-change', 'transform, opacity');
  });
};

export default function LocationMapMotionBridge() {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    installStyles();
    polishLocationModal();

    let raf = 0;
    const schedulePolish = () => {
      if (raf) return;

      raf = window.requestAnimationFrame(() => {
        raf = 0;
        polishLocationModal();
      });
    };

    const observer = new MutationObserver(schedulePolish);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    const timers = [120, 350, 900, 1600].map(delay => window.setTimeout(schedulePolish, delay));

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      timers.forEach(timer => window.clearTimeout(timer));
      observer.disconnect();
    };
  }, []);

  return null;
}
