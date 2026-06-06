import { useEffect } from 'react';

const VISIBLE_PRODUCTS = 3;

function getText(element: Element | null) {
  return ((element as HTMLElement | null)?.innerText || '').trim();
}

function findOrderDetailModal() {
  const sections = Array.from(document.querySelectorAll('section')) as HTMLElement[];

  return (
    sections.find(section => {
      const text = getText(section);
      return text.includes('Detalle del pedido') && text.includes('Productos') && text.includes('Resumen');
    }) || null
  );
}

function findProductsCard(modal: HTMLElement) {
  const titles = Array.from(modal.querySelectorAll('p')) as HTMLElement[];
  const title = titles.find(element => getText(element).toLowerCase() === 'productos');

  return (title?.closest('div') as HTMLElement | null) || null;
}

function findRows(card: HTMLElement) {
  const directChildren = Array.from(card.children) as HTMLElement[];
  const productList = directChildren.find(child => child.className.includes('space-y-2'));

  if (!productList) return [];

  return Array.from(productList.children).filter(child => {
    const element = child as HTMLElement;
    return !element.dataset.pollazoOrderToggle && getText(element).length > 0;
  }) as HTMLElement[];
}

function updateRows(card: HTMLElement) {
  const rows = findRows(card);
  const existingButton = card.querySelector('[data-pollazo-order-toggle="1"]') as HTMLButtonElement | null;

  if (rows.length <= VISIBLE_PRODUCTS) {
    rows.forEach(row => {
      row.style.display = '';
    });
    existingButton?.remove();
    card.dataset.pollazoExpanded = '1';
    return;
  }

  const expanded = card.dataset.pollazoExpanded === '1';

  rows.forEach((row, index) => {
    row.style.display = expanded || index < VISIBLE_PRODUCTS ? '' : 'none';
  });

  const hiddenCount = Math.max(0, rows.length - VISIBLE_PRODUCTS);
  const button = existingButton || document.createElement('button');

  button.type = 'button';
  button.dataset.pollazoOrderToggle = '1';
  button.className = 'mt-3 w-full rounded-[20px] bg-orange-50 border border-orange-100 text-orange-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform';
  button.textContent = expanded ? 'Ver menos' : `Ver todos (${hiddenCount} más)`;
  button.onclick = () => {
    card.dataset.pollazoExpanded = expanded ? '0' : '1';
    window.requestAnimationFrame(() => updateRows(card));
  };

  if (!existingButton) {
    card.appendChild(button);
  }
}

function applyProductToggle() {
  const modal = findOrderDetailModal();
  if (!modal) return;

  const card = findProductsCard(modal);
  if (!card) return;

  if (!card.dataset.pollazoExpanded) {
    card.dataset.pollazoExpanded = '0';
  }

  updateRows(card);
}

export default function OrdersDetailProductToggle() {
  useEffect(() => {
    let frame = 0;

    const schedule = () => {
      if (frame) return;

      frame = window.requestAnimationFrame(() => {
        frame = 0;
        applyProductToggle();
      });
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });

    schedule();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return null;
}
