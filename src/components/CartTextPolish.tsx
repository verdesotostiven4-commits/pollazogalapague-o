import { useEffect } from 'react';

function polishCartText() {
  const nodes = Array.from(document.querySelectorAll('p, span, div')) as HTMLElement[];

  nodes.forEach(node => {
    const text = (node.innerText || '').trim();
    const match = text.match(/^(\d+)\s+unidad(?:s|es)?\s+en\s+el\s+carrito$/i);

    if (!match) return;

    const count = Number(match[1]);
    node.textContent = count === 1 ? '1 producto en el carrito' : `${count} productos en el carrito`;
  });
}

export default function CartTextPolish() {
  useEffect(() => {
    const refresh = () => polishCartText();

    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    const interval = window.setInterval(refresh, 120);
    refresh();

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
