import { useEffect } from 'react';

const findFloatingCartButton = () => {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'));

  return buttons.find(button => {
    const text = (button.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    return text.includes('ver canasta') || text.includes('total del pedido') || text.includes('subtotal elegido') || text.includes('canasta');
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
    setImportant(fixedShell, 'bottom', '84px');
    setImportant(fixedShell, 'padding-left', '24px');
    setImportant(fixedShell, 'padding-right', '24px');
    setImportant(fixedShell, 'z-index', '210');
  }

  if (directShell) {
    setImportant(directShell, 'max-width', '410px');
  }

  setImportant(button, 'min-height', '50px');
  setImportant(button, 'padding', '6px 7px');
  setImportant(button, 'border-radius', '22px');
  setImportant(button, 'background', 'rgba(255, 255, 255, 0.96)');
  setImportant(button, 'border', '1px solid rgba(249, 115, 22, 0.12)');
  setImportant(button, 'box-shadow', '0 10px 24px rgba(249, 115, 22, 0.12), 0 2px 8px rgba(15, 23, 42, 0.05)');
  setImportant(button, '-webkit-backdrop-filter', 'blur(14px) saturate(1.12)');
  setImportant(button, 'backdrop-filter', 'blur(14px) saturate(1.12)');
  setImportant(button, 'align-items', 'center');
  button.setAttribute('data-pollazo-polished-cart-bar', '1');

  if (leftSide) {
    setImportant(leftSide, 'gap', '7px');
    setImportant(leftSide, 'padding-left', '0');
    setImportant(leftSide, 'color', '#111827');
    setImportant(leftSide, 'min-width', '0');
  }

  if (iconWrap) {
    setImportant(iconWrap, 'width', '34px');
    setImportant(iconWrap, 'height', '34px');
    setImportant(iconWrap, 'padding', '0');
    setImportant(iconWrap, 'display', 'flex');
    setImportant(iconWrap, 'align-items', 'center');
    setImportant(iconWrap, 'justify-content', 'center');
    setImportant(iconWrap, 'border-radius', '14px');
    setImportant(iconWrap, 'background', 'linear-gradient(135deg, #ff6b18 0%, #ffb703 100%)');
    setImportant(iconWrap, 'color', '#ffffff');
    setImportant(iconWrap, 'box-shadow', '0 7px 15px rgba(249, 115, 22, 0.21)');
  }

  if (badge) {
    setImportant(badge, 'top', '-7px');
    setImportant(badge, 'right', '-7px');
    setImportant(badge, 'min-width', '20px');
    setImportant(badge, 'width', 'auto');
    setImportant(badge, 'height', '20px');
    setImportant(badge, 'padding', '0 5px');
    setImportant(badge, 'font-size', '8.5px');
    setImportant(badge, 'background', '#ef4444');
    setImportant(badge, 'color', '#ffffff');
    setImportant(badge, 'border', '2px solid #ffffff');
    setImportant(badge, 'box-shadow', '0 6px 14px rgba(239, 68, 68, 0.22)');
    setImportant(badge, 'animation', 'none');
  }

  if (labelWrap) {
    setImportant(labelWrap, 'gap', '1px');
    setImportant(labelWrap, 'min-width', '0');
  }

  if (label) {
    label.textContent = 'Pedido';
    setImportant(label, 'font-size', '7.5px');
    setImportant(label, 'letter-spacing', '0.13em');
    setImportant(label, 'color', '#9ca3af');
    setImportant(label, 'line-height', '1');
  }

  if (amount) {
    setImportant(amount, 'font-size', '17px');
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

    setImportant(rightPill, 'height', '38px');
    setImportant(rightPill, 'min-width', '102px');
    setImportant(rightPill, 'padding', '0 12px');
    setImportant(rightPill, 'border-radius', '17px');
    setImportant(rightPill, 'background', 'linear-gradient(135deg, #ff6b18 0%, #ffc400 100%)');
    setImportant(rightPill, 'color', '#ffffff');
    setImportant(rightPill, 'box-shadow', '0 7px 15px rgba(249, 115, 22, 0.20)');
    setImportant(rightPill, 'font-size', '9.5px');
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
