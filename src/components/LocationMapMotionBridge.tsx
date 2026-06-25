import { useEffect } from 'react';

const STYLE_ID = 'pollazo-location-map-pointer-position-style';

type LeafletLike = {
  tileLayer?: (...args: any[]) => any;
};

declare global {
  interface Window {
    L?: LeafletLike;
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
      background: #f8fafc !important;
    }

    .pollazo-location-map-modal [data-pollazo-location-pin='true'] {
      top: calc(50% + 54px) !important;
      will-change: transform, opacity !important;
    }

    .pollazo-location-map-modal [data-pollazo-location-dot='true'] {
      top: calc(50% + 54px) !important;
      will-change: transform, opacity !important;
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

export default function LocationMapMotionBridge() {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    installStyles();
    markLocationModal();

    const observer = new MutationObserver(markLocationModal);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return null;
}
