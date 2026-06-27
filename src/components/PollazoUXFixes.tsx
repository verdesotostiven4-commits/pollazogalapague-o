import { useEffect } from 'react';

const STYLE_ID = 'pollazo-ux-fixes-style';

const canUseDOM = () => typeof window !== 'undefined' && typeof document !== 'undefined';

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const isLatinQuery = (value: string) => /[a-z0-9]/i.test(value);

const setImportant = (element: HTMLElement, property: string, value: string) => {
  element.style.setProperty(property, value, 'important');
};

const installStyles = () => {
  if (!canUseDOM() || document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @supports selector(:has(*)) {
      div:has(> .pollazo-maplibre) > div[class*="z-[500]"] {
        z-index: 760 !important;
      }

      div:has(> .pollazo-maplibre):has(div[class*="z-[500]"]) > div[class*="z-[650]"] {
        opacity: 0 !important;
        transform: translateX(-50%) translateY(-100%) scale(0.96) !important;
      }
    }

    .pollazo-search-polished {
      z-index: 145 !important;
      padding-top: 4px !important;
      padding-bottom: calc(env(safe-area-inset-bottom) + 28px) !important;
    }

    .pollazo-search-polished button[data-pollazo-search-result="1"] {
      margin: 9px 12px !important;
      width: calc(100% - 24px) !important;
      border-radius: 24px !important;
      border: 1px solid rgba(249, 115, 22, 0.10) !important;
      background: rgba(255, 255, 255, 0.98) !important;
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06) !important;
      overflow: hidden !important;
      transform: translateZ(0) !important;
    }

    .pollazo-search-polished button[data-pollazo-search-result="1"]:active {
      transform: scale(0.985) translateZ(0) !important;
      background: rgba(255, 247, 237, 0.98) !important;
    }

    .pollazo-search-polished button[data-pollazo-search-hidden="1"] {
      display: none !important;
    }

    .pollazo-search-polished img {
      border-radius: 18px !important;
      background: linear-gradient(135deg, #fff7ed, #ffffff) !important;
      border-color: rgba(249, 115, 22, 0.12) !important;
    }

    .pollazo-search-polished [data-pollazo-search-title="1"] {
      white-space: normal !important;
      display: -webkit-box !important;
      -webkit-line-clamp: 2 !important;
      -webkit-box-orient: vertical !important;
      overflow: hidden !important;
      line-height: 1.15 !important;
      font-weight: 950 !important;
    }

    main .transition-all.duration-1000 {
      transition-duration: 260ms !important;
    }

    main .opacity-0.translate-y-10.scale-95 {
      opacity: 0.98 !important;
      transform: translateY(6px) scale(0.995) !important;
    }

    span[data-pollazo-soldout="1"] {
      background: linear-gradient(135deg, #fff7ed, #fed7aa) !important;
      color: #9a3412 !important;
      border: 1px solid rgba(249, 115, 22, 0.35) !important;
      box-shadow: 0 10px 24px rgba(249, 115, 22, 0.20) !important;
      letter-spacing: 0.12em !important;
    }
  `;

  document.head.appendChild(style);
};

const findSearchOverlay = () => {
  const fixed = Array.from(document.querySelectorAll<HTMLElement>('div.fixed'));
  return fixed.find(element => normalize(element.textContent || '').includes('resultados globales')) || null;
};

const findCatalogSearchInput = () => {
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="text"]'));
  return inputs.find(input => (input.placeholder || '').includes('buscas') || input.value.trim().length > 0) || null;
};

const findFloatingCartShell = () => {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'));
  const cartButton = buttons.find(button => {
    const text = normalize(button.textContent || '');
    return text.includes('canasta') || text.includes('total del pedido') || text.includes('subtotal');
  });

  let node: HTMLElement | null = cartButton || null;
  while (node && node !== document.body) {
    if (node.classList.contains('fixed')) return node;
    node = node.parentElement;
  }

  return null;
};

const polishSearchOverlay = () => {
  const overlay = findSearchOverlay();
  const cartShell = findFloatingCartShell();

  if (cartShell) {
    const shouldHide = Boolean(overlay);
    setImportant(cartShell, 'opacity', shouldHide ? '0' : '1');
    setImportant(cartShell, 'pointer-events', shouldHide ? 'none' : 'auto');
    setImportant(cartShell, 'transform', shouldHide ? 'translateY(16px)' : 'translateY(0)');
  }

  if (!overlay) return;

  overlay.classList.add('pollazo-search-polished');
  setImportant(overlay, 'z-index', '145');
  setImportant(overlay, 'padding-bottom', 'calc(env(safe-area-inset-bottom) + 28px)');

  const query = normalize(findCatalogSearchInput()?.value || '');
  const shouldFilter = isLatinQuery(query) && query.length >= 2;
  const tokens = query.split(' ').filter(token => token.length >= 2);
  const buttons = Array.from(overlay.querySelectorAll<HTMLButtonElement>('button')).filter(button => {
    const text = normalize(button.textContent || '');
    return text && !text.includes('limpiar busqueda') && !text.includes('ordenar');
  });

  let visibleCount = 0;

  buttons.forEach(button => {
    button.setAttribute('data-pollazo-search-result', '1');

    const title = button.querySelector('p');
    if (title) title.setAttribute('data-pollazo-search-title', '1');

    const text = normalize(button.textContent || '');
    const titleText = normalize(title?.textContent || '');
    const strongMatch = tokens.every(token => titleText.includes(token) || text.includes(token));
    const hidden = shouldFilter && tokens.length > 0 && !strongMatch;

    button.setAttribute('data-pollazo-search-hidden', hidden ? '1' : '0');
    if (!hidden) visibleCount += 1;
  });

  if (shouldFilter && visibleCount === 0) {
    buttons.forEach(button => button.setAttribute('data-pollazo-search-hidden', '0'));
  }
};

const polishSoldOut = () => {
  const spans = Array.from(document.querySelectorAll<HTMLElement>('span, p'));

  spans.forEach(element => {
    const text = normalize(element.textContent || '');
    if (text === 'agotado' || text === 'sin stock' || text === 'no disponible') {
      element.setAttribute('data-pollazo-soldout', '1');
      element.textContent = 'Agotado por ahora';
    }
  });
};

const fixMapLoadingLayer = () => {
  const loading = Array.from(document.querySelectorAll<HTMLElement>('div')).find(element =>
    normalize(element.textContent || '').includes('cargando mapa')
  );

  if (!loading) return;

  setImportant(loading, 'z-index', '760');
  const mapShell = loading.parentElement;
  if (!mapShell) return;

  Array.from(mapShell.children).forEach(child => {
    if (!(child instanceof HTMLElement)) return;
    const className = String(child.className || '');
    if (className.includes('z-[650]')) {
      setImportant(child, 'opacity', '0');
      setImportant(child, 'visibility', 'hidden');
    }
  });
};

const polishRankingReveal = () => {
  const rankingRoot = Array.from(document.querySelectorAll<HTMLElement>('main, div')).find(element =>
    normalize(element.textContent || '').includes('ranking vip') && normalize(element.textContent || '').includes('temporada')
  );

  if (!rankingRoot) return;

  rankingRoot.querySelectorAll<HTMLElement>('.opacity-0.translate-y-10.scale-95').forEach(element => {
    setImportant(element, 'opacity', '1');
    setImportant(element, 'transform', 'translateY(0) scale(1)');
  });
};

const defaultPlusSavingsToTotal = () => {
  const plusModal = Array.from(document.querySelectorAll<HTMLElement>('div.fixed')).find(element => {
    const text = normalize(element.textContent || '');
    return text.includes('tu plus esta activo') && text.includes('ahorro acumulado');
  });

  if (!plusModal) return;

  const totalButton = Array.from(plusModal.querySelectorAll<HTMLButtonElement>('button')).find(button =>
    normalize(button.textContent || '').includes('ahorro acumulado')
  );

  if (totalButton && plusModal.dataset.pollazoPlusTotalDefaulted !== '1') {
    plusModal.dataset.pollazoPlusTotalDefaulted = '1';
    window.setTimeout(() => totalButton.click(), 40);
  }

  const activeMain = plusModal.querySelector<HTMLElement>('main');
  if (activeMain) {
    setImportant(activeMain, 'overflow', 'visible');
    setImportant(activeMain, 'padding-bottom', '10px');
  }

  Array.from(plusModal.querySelectorAll<HTMLElement>('div, button')).forEach(element => {
    const text = normalize(element.textContent || '');
    const isBenefitGrid = text.includes('delivery gratis') && text.includes('prioridad') && text.includes('sorpresas');
    const isConditionsButton = text.includes('condiciones de tu membresia') || text.includes('cobertura beneficios y uso correcto');

    if (isBenefitGrid || isConditionsButton) {
      setImportant(element, 'display', 'none');
    }
  });
};

export default function PollazoUXFixes() {
  useEffect(() => {
    if (!canUseDOM()) return undefined;

    installStyles();

    let frame = 0;
    const run = () => {
      frame = 0;
      polishSearchOverlay();
      polishSoldOut();
      fixMapLoadingLayer();
      polishRankingReveal();
      defaultPlusSavingsToTotal();
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(run);
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });

    schedule();
    window.addEventListener('input', schedule, true);
    window.addEventListener('click', schedule, true);
    window.addEventListener('scroll', schedule, true);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('input', schedule, true);
      window.removeEventListener('click', schedule, true);
      window.removeEventListener('scroll', schedule, true);
    };
  }, []);

  return null;
}
