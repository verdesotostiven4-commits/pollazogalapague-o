import { useEffect } from 'react';

function textOf(node: HTMLElement) {
  return (node.innerText || node.textContent || '').trim();
}

function polishCartText() {
  const nodes = Array.from(document.querySelectorAll('p, span, div')) as HTMLElement[];

  nodes.forEach(node => {
    const text = textOf(node);
    const match = text.match(/^(\d+)\s+unidad(?:s|es)?\s+en\s+el\s+carrito$/i);

    if (!match) return;

    const count = Number(match[1]);
    node.textContent = count === 1 ? '1 producto en el carrito' : `${count} productos en el carrito`;
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

  if (subtotalRow) {
    subtotalRow.style.display = 'none';
  }
}

export default function CartTextPolish() {
  useEffect(() => {
    const refresh = () => polishCartText();

    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });

    const interval = window.setInterval(refresh, 120);
    refresh();

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
