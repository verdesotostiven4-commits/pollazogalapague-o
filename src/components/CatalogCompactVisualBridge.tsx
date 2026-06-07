import { useEffect } from 'react';

const setImportant = (element: HTMLElement, property: string, value: string) => {
  element.style.setProperty(property, value, 'important');
};

const readText = (element: Element | null) =>
  String(element?.textContent || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const isCatalogScreen = () => {
  const searchInput = Array.from(document.querySelectorAll<HTMLInputElement>('input')).find(input => {
    const placeholder = String(input.getAttribute('placeholder') || '').toLowerCase();
    return placeholder.includes('buscas') || placeholder.includes('buscar');
  });

  const headerText = readText(document.body).slice(0, 1600);
  return Boolean(searchInput) || headerText.includes('catálogo') || headerText.includes('catalogo');
};

const findProductCard = (start: HTMLElement | null) => {
  let node = start;
  let depth = 0;

  while (node && node !== document.body && depth < 10) {
    const className = String(node.className || '');
    const hasImage = Boolean(node.querySelector('img'));
    const looksLikeCard =
      hasImage &&
      className.includes('flex') &&
      className.includes('flex-col') &&
      (className.includes('rounded') || node.style.borderRadius);

    if (looksLikeCard) return node;

    node = node.parentElement;
    depth += 1;
  }

  return null;
};

const getCatalogProductCards = () => {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('button, [aria-label]'));
  const cards = new Set<HTMLElement>();

  candidates.forEach(element => {
    const text = readText(element);
    const aria = String(element.getAttribute('aria-label') || '').toLowerCase();

    const isProductAction =
      text.includes('agregar') ||
      text.includes('elegir') ||
      aria.includes('agregar una unidad') ||
      aria.includes('quitar una unidad');

    if (!isProductAction) return;

    const card = findProductCard(element);
    if (card) cards.add(card);
  });

  return Array.from(cards);
};

const compactQuantityControl = (card: HTMLElement) => {
  const minusButton = card.querySelector<HTMLButtonElement>('button[aria-label="Quitar una unidad"]');
  const plusButton = card.querySelector<HTMLButtonElement>('button[aria-label="Agregar una unidad"]');
  const quantityShell = minusButton?.parentElement as HTMLElement | null;

  if (!minusButton || !plusButton || !quantityShell) return;

  setImportant(quantityShell, 'height', '44px');
  setImportant(quantityShell, 'border-radius', '18px');
  setImportant(quantityShell, 'padding', '4px');
  setImportant(quantityShell, 'box-shadow', '0 10px 22px rgba(249, 115, 22, 0.08)');

  [minusButton, plusButton].forEach((button, index) => {
    setImportant(button, 'width', '36px');
    setImportant(button, 'height', '36px');
    setImportant(button, 'border-radius', '14px');

    if (index === 0) {
      setImportant(button, 'background', '#ffffff');
      setImportant(button, 'border', '1px solid rgba(249, 115, 22, 0.14)');
      setImportant(button, 'box-shadow', '0 6px 14px rgba(15, 23, 42, 0.05)');
    } else {
      setImportant(button, 'background', 'linear-gradient(135deg, #ff6b18 0%, #ffc400 100%)');
      setImportant(button, 'box-shadow', '0 8px 18px rgba(249, 115, 22, 0.24)');
    }
  });

  const quantityText = Array.from(quantityShell.querySelectorAll<HTMLElement>('span')).find(span => /^\d+$/.test(readText(span)));
  if (quantityText) {
    setImportant(quantityText, 'font-size', '20px');
    setImportant(quantityText, 'line-height', '1');
  }
};

const compactProductCard = (card: HTMLElement) => {
  if (!isCatalogScreen()) return;

  card.setAttribute('data-pollazo-compact-card', '1');

  setImportant(card, 'min-height', '272px');
  setImportant(card, 'border-radius', '22px');
  setImportant(card, 'box-shadow', '0 8px 22px rgba(15, 23, 42, 0.045)');

  const imageWrap = Array.from(card.children).find(child => child.querySelector('img')) as HTMLElement | undefined;
  const contentWrap = Array.from(card.children).find(child => child !== imageWrap && child.querySelector('h3')) as HTMLElement | undefined;
  const image = imageWrap?.querySelector<HTMLImageElement>('img');

  if (imageWrap) {
    setImportant(imageWrap, 'height', '142px');
    setImportant(imageWrap, 'aspect-ratio', 'auto');
    setImportant(imageWrap, 'min-height', '142px');
  }

  if (image) {
    setImportant(image, 'padding', '7px');
    setImportant(image, 'object-fit', 'contain');
  }

  if (contentWrap) {
    setImportant(contentWrap, 'padding', '10px 12px 12px');
  }

  const category = Array.from(card.querySelectorAll<HTMLElement>('p')).find(p => {
    const text = String(p.textContent || '').trim();
    return text.length > 0 && text.length < 26 && text === text.toUpperCase();
  });

  if (category) {
    setImportant(category, 'font-size', '8px');
    setImportant(category, 'letter-spacing', '0.14em');
    setImportant(category, 'margin-bottom', '3px');
  }

  const title = card.querySelector<HTMLElement>('h3');
  if (title) {
    setImportant(title, 'font-size', '13px');
    setImportant(title, 'line-height', '1.16');
    setImportant(title, 'min-height', '31px');
    setImportant(title, 'max-height', '36px');
    setImportant(title, 'overflow', 'hidden');
  }

  const descriptions = Array.from(card.querySelectorAll<HTMLElement>('p')).filter(p => {
    const text = String(p.textContent || '').trim();
    return text.length > 28 && !text.toLowerCase().includes('mínimo');
  });

  descriptions.forEach(description => {
    setImportant(description, 'font-size', '10px');
    setImportant(description, 'line-height', '1.35');
    setImportant(description, 'max-height', '28px');
    setImportant(description, 'overflow', 'hidden');
    setImportant(description, 'margin-top', '3px');
  });

  const addButtons = Array.from(card.querySelectorAll<HTMLButtonElement>('button')).filter(button => {
    const text = readText(button);
    return text.includes('agregar') || text.includes('elegir');
  });

  addButtons.forEach(button => {
    setImportant(button, 'min-height', '38px');
    setImportant(button, 'padding', '8px 10px');
    setImportant(button, 'border-radius', '16px');
    setImportant(button, 'font-size', '12px');
    setImportant(button, 'box-shadow', '0 8px 18px rgba(249, 115, 22, 0.16)');
  });

  compactQuantityControl(card);
};

const compactCatalog = () => {
  if (!isCatalogScreen()) return;
  getCatalogProductCards().forEach(compactProductCard);
};

export default function CatalogCompactVisualBridge() {
  useEffect(() => {
    compactCatalog();

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(compactCatalog);
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'aria-current'],
    });

    window.addEventListener('resize', compactCatalog);
    window.addEventListener('click', () => window.setTimeout(compactCatalog, 30), true);

    const timers = [80, 250, 650, 1200].map(delay => window.setTimeout(compactCatalog, delay));

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', compactCatalog);
      timers.forEach(timer => window.clearTimeout(timer));
    };
  }, []);

  return null;
}
