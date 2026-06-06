import { useEffect, useRef } from 'react';

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

function findOrderCode(modal: HTMLElement) {
  const headings = Array.from(modal.querySelectorAll('h2')) as HTMLElement[];

  return headings.find(heading => {
    const text = getText(heading);
    return /^PZ[-\w]+/i.test(text) || text.toLowerCase() === 'pedido';
  }) || null;
}

function compactHeader(modal: HTMLElement, codeHeading: HTMLElement) {
  modal.style.maxHeight = '94dvh';

  const header = codeHeading.closest('header') as HTMLElement | null;
  if (header) {
    header.style.paddingTop = '1rem';
    header.style.paddingBottom = '0.95rem';
    header.style.paddingRight = '4rem';
  }

  codeHeading.classList.remove('truncate');
  codeHeading.style.whiteSpace = 'normal';
  codeHeading.style.overflow = 'visible';
  codeHeading.style.textOverflow = 'clip';
  codeHeading.style.fontSize = '25px';
  codeHeading.style.lineHeight = '0.95';
  codeHeading.style.wordBreak = 'break-word';
}

function removeOldInjectedToggle(modal: HTMLElement) {
  const oldButton = modal.querySelector('[data-pollazo-order-toggle="1"]');
  oldButton?.remove();
}

export default function OrdersDetailProductToggle() {
  const lastCodeRef = useRef('');
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const applyFix = () => {
      const modal = findOrderDetailModal();
      if (!modal) return;

      removeOldInjectedToggle(modal);

      const codeHeading = findOrderCode(modal);
      if (!codeHeading) return;

      compactHeader(modal, codeHeading);

      const code = getText(codeHeading);
      if (!code || code === lastCodeRef.current) return;

      const verMenosButton = Array.from(modal.querySelectorAll('button')).find(button =>
        getText(button).toLowerCase().includes('ver menos')
      ) as HTMLButtonElement | undefined;

      if (verMenosButton) {
        verMenosButton.click();
      }

      lastCodeRef.current = code;
    };

    const schedule = () => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        applyFix();
      });
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    schedule();

    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      observer.disconnect();
    };
  }, []);

  return null;
}
