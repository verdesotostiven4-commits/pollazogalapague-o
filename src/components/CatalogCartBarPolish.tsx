import { useEffect } from 'react';

const findFloatingCartButton = () => {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'));

  return buttons.find(button => {
    const text = (button.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    return text.includes('ver canasta') || text.includes('total del pedido') || text.includes('subtotal elegido');
  }) || null;
};

const findFixedShell = (button: HTMLElement) => {
  let node: HTMLElement | null = button;

  while (node && node !== document.body) {
    if (node.classList.contains('fixed')) return node;
    node = node.parentElement;
  }

  return null;
};

const setImportant = (element: HTMLElement, property: string, value: string) => {
  element.style.setProperty(property, value, 'important');
};

const textNodesOf = (element: HTMLElement) => {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let node = walker.nextNode();

  while (node) {
    nodes.push(node as Text);
    node = walker.nextNode();
  }

  return nodes;
};

const polishButton = (button: HTMLButtonElement) => {
  const fixedShell = findFixedShell(button);
  const directShell = button.parentElement as HTMLElement | null;
  const leftSide = button.children[0] as HTMLElement | undefined;
  const rightPill = button.children[1] as HTMLElement | undefined;
  const iconWrap = leftSide?.children[0] as HTMLElement | undefined;
  const labelWrap = leftSide?.children[1] as HTMLElement | undefined;
  const label = labelWrap?.children[0] as HTMLElement | undefined;
  const amount = labelWrap?.children[1] as HTMLElement | undefined;
  const badge = iconWrap?.querySelector('span') as HTMLElement | null;

  if (fixedShell) {
    setImportant(fixedShell, 'bottom', '88px');
    setImportant(fixedShell, 'padding-left', '22px');
    setImportant(fixedShell, 'padding-right', '22px');
    setImportant(fixedShell, 'z-index', '210');
  }

  if (directShell) {
    setImportant(directShell, 'max-width', '430px');
  }

  setImportant(button, 'min-height', '54px');
  setImportant(button, 'padding', '7px 8px');
  setImportant(button, 'border-radius', '23px');
  setImportant(button, 'background', 'rgba(255, 255, 255, 0.95)');
  setImportant(button, 'border', '1px solid rgba(249, 115, 22, 0.14)');
  setImportant(button, 'box-shadow', '0 12px 30px rgba(249, 115, 22, 0.14), 0 3px 10px rgba(15, 23, 42, 0.06)');
  setImportant(button, '-webkit-backdrop-filter', 'blur(16px) saturate(1.18)');
  setImportant(button, 'backdrop-filter', 'blur(16px) saturate(1.18)');
  setImportant(button, 'align-items', 'center');
  button.setAttribute('data-pollazo-polished-cart-bar', '1');

  if (leftSide) {
    setImportant(leftSide, 'gap', '8px');
    setImportant(leftSide, 'padding-left', '1px');
    setImportant(leftSide, 'color', '#111827');
    setImportant(leftSide, 'min-width', '0');
  }

  if (iconWrap) {
    setImportant(iconWrap, 'width', '38px');
    setImportant(iconWrap, 'height', '38px');
    setImportant(iconWrap, 'padding', '0');
    setImportant(iconWrap, 'display', 'flex');
    setImportant(iconWrap, 'align-items', 'center');
    setImportant(iconWrap, 'justify-content', 'center');
    setImportant(iconWrap, 'border-radius', '15px');
    setImportant(iconWrap, 'background', 'linear-gradient(135deg, #ff6b18 0%, #ffb703 100%)');
    setImportant(iconWrap, 'color', '#ffffff');
    setImportant(iconWrap, 'box-shadow', '0 8px 18px rgba(249, 115, 22, 0.24)');
  }

  if (badge) {
    setImportant(badge, 'top', '-8px');
    setImportant(badge, 'right', '-8px');
    setImportant(badge, 'width', '21px');
    setImportant(badge, 'height', '21px');
    setImportant(badge, 'font-size', '9px');
    setImportant(badge, 'background', '#ef4444');
    setImportant(badge, 'color', '#ffffff');
    setImportant(badge, 'border', '2px solid #ffffff');
    setImportant(badge, 'box-shadow', '0 7px 16px rgba(239, 68, 68, 0.24)');
    setImportant(badge, 'animation', 'none');
  }

  if (labelWrap) {
    setImportant(labelWrap, 'gap', '1px');
    setImportant(labelWrap, 'min-width', '0');
  }

  if (label) {
    label.textContent = 'Pedido';
    setImportant(label, 'font-size', '8px');
    setImportant(label, 'letter-spacing', '0.14em');
    setImportant(label, 'color', '#9ca3af');
    setImportant(label, 'line-height', '1');
  }

  if (amount) {
    setImportant(amount, 'font-size', '18px');
    setImportant(amount, 'line-height', '1');
    setImportant(amount, 'color', '#ea580c');
    setImportant(amount, 'font-weight', '950');
    setImportant(amount, 'white-space', 'nowrap');
  }

  if (rightPill) {
    const nodes = textNodesOf(rightPill);
    const firstText = nodes.find(node => (node.nodeValue || '').trim().length > 0);

    if (firstText) {
      firstText.nodeValue = 'Canasta ';
    }

    setImportant(rightPill, 'height', '42px');
    setImportant(rightPill, 'min-width', '112px');
    setImportant(rightPill, 'padding', '0 14px');
    setImportant(rightPill, 'border-radius', '18px');
    setImportant(rightPill, 'background', 'linear-gradient(135deg, #ff6b18 0%, #ffc400 100%)');
    setImportant(rightPill, 'color', '#ffffff');
    setImportant(rightPill, 'box-shadow', '0 8px 18px rgba(249, 115, 22, 0.22)');
    setImportant(rightPill, 'font-size', '10px');
    setImportant(rightPill, 'letter-spacing', '0.08em');
    setImportant(rightPill, 'display', 'flex');
    setImportant(rightPill, 'align-items', 'center');
    setImportant(rightPill, 'justify-content', 'center');
    setImportant(rightPill, 'gap', '5px');
    setImportant(rightPill, 'white-space', 'nowrap');
  }
};

const polishCatalogCartBar = () => {
  const button = findFloatingCartButton();
  if (!button) return;
  polishButton(button);
};

export default function CatalogCartBarPolish() {
  useEffect(() => {
    polishCatalogCartBar();

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(polishCatalogCartBar);
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    window.addEventListener('resize', polishCatalogCartBar);
    window.addEventListener('click', polishCatalogCartBar, true);

    const timers = [100, 350, 900].map(delay => window.setTimeout(polishCatalogCartBar, delay));

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', polishCatalogCartBar);
      window.removeEventListener('click', polishCatalogCartBar, true);
      timers.forEach(timer => window.clearTimeout(timer));
    };
  }, []);

  return null;
}
