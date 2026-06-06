import { useEffect } from 'react';

function getText(element: HTMLElement) {
  return (element.innerText || element.textContent || '').trim();
}

function findProductsCard(): HTMLElement | null {
  const headings = Array.from(document.querySelectorAll('p')) as HTMLElement[];
  const productsHeading = headings.find(element => getText(element).toLowerCase() === 'productos');

  return (productsHeading?.closest('div.bg-white') as HTMLElement | null) || null;
}

function getProductRows(card: HTMLElement) {
  const rows = Array.from(card.querySelectorAll('img'))
    .map(image => image.closest('div.flex.items-center') as HTMLElement | null)
    .filter(Boolean) as HTMLElement[];

  return rows.filter(row => !row.dataset.pollazoShowMoreButton);
}

function ensureToggle(card: HTMLElement, rows: HTMLElement[]) {
  const existing = card.querySelector('[data-pollazo-show-more-button="1"]') as HTMLButtonElement | null;

  if (rows.length <= 3) {
    rows.forEach(row => { row.style.display = ''; });
    existing?.remove();
    return;
  }

  let expanded = card.dataset.pollazoProductsExpanded === '1';

  const apply = () => {
    rows.forEach((row, index) => {
      row.style.display = expanded || index < 3 ? '' : 'none';
    });

    const hiddenCount = rows.length - 3;
    const button = card.querySelector('[data-pollazo-show-more-button="1"]') as HTMLButtonElement | null;

    if (button) {
      button.textContent = expanded ? 'Ver menos' : `Ver todos (${hiddenCount} más)`;
    }
  };

  if (!existing) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.pollazoShowMoreButton = '1';
    button.className = 'w-full mt-3 rounded-2xl bg-orange-50 border border-orange-100 text-orange-600 py-3 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform';
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      expanded = !expanded;
      card.dataset.pollazoProductsExpanded = expanded ? '1' : '0';
      apply();
    });

    card.appendChild(button);
  }

  apply();
}

function polishOrderDetailProducts() {
  const detailTitle = Array.from(document.querySelectorAll('p, h2')).some(element =>
    getText(element as HTMLElement).toLowerCase().includes('detalle del pedido')
  );

  if (!detailTitle) return;

  const card = findProductsCard();
  if (!card) return;

  const rows = getProductRows(card);
  ensureToggle(card, rows);
}

export default function OrdersDetailShowMorePolish() {
  useEffect(() => {
    const refresh = () => polishOrderDetailProducts();

    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });

    const interval = window.setInterval(refresh, 250);
    refresh();

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
