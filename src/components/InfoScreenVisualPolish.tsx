import { useEffect } from 'react';

function installInfoModalTopCoverageFix() {
  if (typeof document === 'undefined') return;

  const styleId = 'pollazo-info-modal-top-coverage-fix';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @supports selector(:has(*)) {
      body:has(nav[aria-label="Navegación principal"] button:nth-child(5)[aria-current="page"]) div.fixed.inset-0,
      body:has(nav[aria-label="Navegación principal"] button:nth-child(5)[aria-current="page"]) section.fixed.inset-0 {
        top: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100dvh !important;
        min-height: 100dvh !important;
        max-height: 100dvh !important;
        margin-top: 0 !important;
        padding-top: 0 !important;
        z-index: 13000 !important;
      }

      body:has(nav[aria-label="Navegación principal"] button:nth-child(5)[aria-current="page"]) div.fixed.inset-x-0.bottom-0,
      body:has(nav[aria-label="Navegación principal"] button:nth-child(5)[aria-current="page"]) section.fixed.inset-x-0.bottom-0 {
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
      }

      body:has(nav[aria-label="Navegación principal"] button:nth-child(5)[aria-current="page"]) .pollazo-legal-scroll,
      body:has(nav[aria-label="Navegación principal"] button:nth-child(5)[aria-current="page"]) [data-pollazo-info-gallery="1"] {
        padding-top: 0 !important;
        margin-top: 0 !important;
      }
    }
  `;

  document.head.appendChild(style);
}

function getVisibleText(element: HTMLElement) {
  return (element.innerText || element.textContent || '').trim();
}

function replaceLanguageLabels() {
  const allTextElements = Array.from(document.querySelectorAll('h1, h2, h3, p, span')) as HTMLElement[];

  allTextElements.forEach(element => {
    const text = getVisibleText(element).toLowerCase();

    if (text === 'idioma de la app') {
      element.textContent = 'Cambiar idioma';
    }

    if (text === 'app · cambiar idioma' || text === 'app cambiar idioma') {
      element.textContent = 'Cambiar idioma';
    }
  });
}

function polishOrdersLabels() {
  const textNodes = Array.from(document.querySelectorAll('p, span')) as HTMLElement[];

  textNodes.forEach(element => {
    const text = getVisibleText(element);
    const match = text.match(/^Toca detalle para ver\s+(\d+)\s+producto(s)?\s+más$/i);

    if (match) {
      const count = Number(match[1]);
      element.textContent = `${count} producto${count === 1 ? '' : 's'} más`;
    }
  });
}

function lightPolish() {
  replaceLanguageLabels();
  polishOrdersLabels();
}

export default function InfoScreenVisualPolish() {
  useEffect(() => {
    installInfoModalTopCoverageFix();

    const run = () => lightPolish();
    const timers = [0, 250, 900].map(delay => window.setTimeout(run, delay));

    window.addEventListener('pollazo:open-plus', run as EventListener);
    window.addEventListener('click', run, true);

    return () => {
      timers.forEach(timer => window.clearTimeout(timer));
      window.removeEventListener('pollazo:open-plus', run as EventListener);
      window.removeEventListener('click', run, true);
    };
  }, []);

  return null;
}
