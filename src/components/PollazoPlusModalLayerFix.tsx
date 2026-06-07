import { useEffect } from 'react';

const PLUS_BACKDROP_SELECTOR = 'button[aria-label="Cerrar Pollazo Plus"]';

function isPlusBackdrop(element: Element | null): element is HTMLButtonElement {
  return element instanceof HTMLButtonElement && element.getAttribute('aria-label') === 'Cerrar Pollazo Plus';
}

function getPlusModalRoot() {
  const backdrops = Array.from(document.querySelectorAll(PLUS_BACKDROP_SELECTOR));

  for (const backdrop of backdrops) {
    if (!isPlusBackdrop(backdrop)) continue;

    const root = backdrop.parentElement;
    const sheet = root?.querySelector(':scope > section') as HTMLElement | null;

    if (root instanceof HTMLElement && sheet) {
      return { root, backdrop, sheet };
    }
  }

  return null;
}

function applyPlusModalFix() {
  const modal = getPlusModalRoot();

  if (!modal) {
    document.documentElement.classList.remove('pollazo-plus-modal-open');
    document.body.classList.remove('pollazo-plus-modal-open');
    return;
  }

  const { root, backdrop, sheet } = modal;

  document.documentElement.classList.add('pollazo-plus-modal-open');
  document.body.classList.add('pollazo-plus-modal-open');

  root.dataset.pollazoPlusLayerFixed = '1';
  root.style.position = 'fixed';
  root.style.inset = '0';
  root.style.width = '100vw';
  root.style.height = '100dvh';
  root.style.zIndex = '2147483000';
  root.style.display = 'flex';
  root.style.alignItems = 'flex-end';
  root.style.justifyContent = 'center';
  root.style.overflow = 'visible';
  root.style.pointerEvents = 'auto';
  root.style.opacity = '1';
  root.style.visibility = 'visible';
  root.style.transform = 'none';
  root.style.contain = 'none';

  backdrop.style.position = 'absolute';
  backdrop.style.inset = '0';
  backdrop.style.zIndex = '0';
  backdrop.style.opacity = '1';
  backdrop.style.visibility = 'visible';
  backdrop.style.pointerEvents = 'auto';
  backdrop.style.background = 'rgba(67, 20, 7, 0.34)';

  sheet.style.position = 'relative';
  sheet.style.zIndex = '1';
  sheet.style.display = 'flex';
  sheet.style.opacity = '1';
  sheet.style.visibility = 'visible';
  sheet.style.pointerEvents = 'auto';
  sheet.style.transform = 'translateY(0)';
  sheet.style.marginLeft = 'auto';
  sheet.style.marginRight = 'auto';
  sheet.style.maxHeight = 'calc(100dvh - 10px)';

  let parent = root.parentElement;

  while (parent && parent !== document.body) {
    parent.style.overflow = 'visible';
    parent.style.contain = 'none';
    parent = parent.parentElement;
  }
}

export default function PollazoPlusModalLayerFix() {
  useEffect(() => {
    const refresh = () => window.requestAnimationFrame(applyPlusModalFix);

    const observer = new MutationObserver(refresh);

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'aria-hidden'],
    });

    window.addEventListener('pollazo:open-plus', refresh);
    refresh();

    return () => {
      observer.disconnect();
      window.removeEventListener('pollazo:open-plus', refresh);
      document.documentElement.classList.remove('pollazo-plus-modal-open');
      document.body.classList.remove('pollazo-plus-modal-open');
    };
  }, []);

  return null;
}
