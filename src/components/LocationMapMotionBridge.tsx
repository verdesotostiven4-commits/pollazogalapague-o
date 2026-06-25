import { useEffect } from 'react';

const STYLE_ID = 'pollazo-location-map-pointer-position-style';
const CHECK_INTERVAL_MS = 700;

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
    .pollazo-location-map-modal .leaflet-container {
      touch-action: none !important;
      background: #f8fafc !important;
    }

    .pollazo-location-map-modal [data-pollazo-location-pin='true'] {
      top: calc(50% + 60px) !important;
      transform: translate3d(-50%, -100%, 0) !important;
      will-change: transform !important;
    }

    .pollazo-location-map-modal [data-pollazo-location-dot='true'] {
      top: calc(50% + 60px) !important;
      transform: translate3d(-50%, -50%, 0) !important;
      will-change: transform !important;
    }
  `;

  document.head.appendChild(style);
};

const findLocationModal = () => {
  return (
    Array.from(document.querySelectorAll<HTMLElement>('div.fixed')).find(element => {
      if (element.dataset.pollazoLocationModal === 'true') return true;

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

  const centerLayers = Array.from(
    modal.querySelectorAll<HTMLElement>('div[class*="top-1/2"][class*="left-1/2"][class*="z-[650]"]')
  );

  centerLayers.forEach(element => {
    const className = String(element.className || '');
    const looksLikePin = className.includes('flex-col') || Boolean(element.querySelector('svg'));
    element.dataset[looksLikePin ? 'pollazoLocationPin' : 'pollazoLocationDot'] = 'true';
  });
};

export default function LocationMapMotionBridge() {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    installStyles();
    markLocationModal();

    const interval = window.setInterval(markLocationModal, CHECK_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
