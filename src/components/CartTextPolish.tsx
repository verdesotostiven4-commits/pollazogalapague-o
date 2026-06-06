import { useEffect } from 'react';

function textOf(node: HTMLElement) {
  return (node.innerText || node.textContent || '').trim();
}

function polishCartText() {
  const nodes = Array.from(document.querySelectorAll('p, span, div')) as HTMLElement[];

  nodes.forEach(node => {
    const text = textOf(node);
    const cartMatch = text.match(/^(\d+)\s+unidad(?:s|es)?\s+en\s+el\s+carrito$/i);

    if (cartMatch) {
      const count = Number(cartMatch[1]);
      node.textContent = count === 1 ? '1 producto en el carrito' : `${count} productos en el carrito`;
      return;
    }

    const orderMoreMatch = text.match(/^toca\s+detalle\s+para\s+ver\s+(\d+)\s+producto(?:s)?\s+m[aá]s$/i);

    if (orderMoreMatch) {
      const count = Number(orderMoreMatch[1]);
      node.textContent = count === 1 ? '1 producto más' : `${count} productos más`;
    }
  });

  const sections = Array.from(document.querySelectorAll('section')) as HTMLElement[];
  const confirmSection = sections.find(section => {
    const text = textOf(section).toLowerCase();
    return text.includes('paso 4') && text.includes('confirmar');
  });

  if (!confirmSection) return;

  const rowNodes = Array.from(confirmSection.querySelectorAll('div')) as HTMLElement[];
  const subtotalRow = rowNodes.find(row => {
    const text = textOf(row).toLowerCase();
    return text.startsWith('subtotal') || text.startsWith('subtotal parcial');
  });

  const productsRow = rowNodes.find(row => {
    const text = textOf(row).toLowerCase();
    return text.startsWith('productos') && text.includes('carrito');
  });

  const subtotalValue = subtotalRow?.querySelector('span:last-child')?.textContent?.trim();
  const productsValue = productsRow?.querySelector('span:last-child') as HTMLElement | null;

  if (subtotalValue && productsValue) {
    productsValue.textContent = subtotalValue;
    productsValue.style.color = '#ea580c';
    productsValue.style.fontWeight = '900';
  }

  if (subtotalRow) {
    subtotalRow.style.display = 'none';
  }
}

export default function CartTextPolish() {
  useEffect(() => {
    const refresh = () => polishCartText();

    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });

    const interval = window.setInterval(refresh, 420);
    refresh();

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
