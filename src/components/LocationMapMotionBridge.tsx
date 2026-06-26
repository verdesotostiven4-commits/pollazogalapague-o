import { useEffect } from 'react';

const STYLE_ID = 'pollazo-location-map-position-style';

const installStyles = () => {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    div[class*="fixed"][class*="inset-0"][class*="z-[10000]"][class*="bg-slate-100"] div[class*="top-1/2"][class*="left-1/2"][class*="z-[650]"] {
      top: calc(50% + 56px) !important;
      will-change: opacity, transform !important;
    }
  `;

  document.head.appendChild(style);
};

export default function LocationMapMotionBridge() {
  useEffect(() => {
    installStyles();
  }, []);

  return null;
}
