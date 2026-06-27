import { useEffect } from 'react';

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const findCatalogGrid = () => {
  const grids = Array.from(document.querySelectorAll<HTMLElement>('div.grid'));

  return grids.find(grid => {
    const children = Array.from(grid.children) as HTMLElement[];
    return children.length >= 2 && children.some(child => child.querySelector('h3'));
  }) || null;
};

const cardName = (card: HTMLElement) => {
  const heading = card.querySelector('h3');
  return normalize(heading?.textContent || card.textContent || '');
};

const applyStableProductOrder = () => {
  const grid = findCatalogGrid();
  if (!grid) return;

  const cards = Array.from(grid.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
  if (cards.length < 2) return;

  const hasSoldOut = cards.some(card => normalize(card.textContent || '').includes('agotado'));
  if (!hasSoldOut) {
    cards.forEach(card => card.style.removeProperty('order'));
    return;
  }

  const sortedNames = [...cards]
    .map((card, index) => ({ card, index, name: cardName(card) }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.index - b.index);

  sortedNames.forEach((item, index) => {
    item.card.style.order = String(index + 1);
  });
};

export default function CatalogSoldOutOrderGuard() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        applyStableProductOrder();
      });
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    schedule();
    window.addEventListener('click', schedule, true);
    window.addEventListener('input', schedule, true);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('click', schedule, true);
      window.removeEventListener('input', schedule, true);
    };
  }, []);

  return null;
}
