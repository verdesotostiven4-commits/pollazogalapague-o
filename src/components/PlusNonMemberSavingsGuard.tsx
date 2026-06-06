import { useEffect } from 'react';

function visibleText(element: Element | null) {
  return ((element as HTMLElement | null)?.innerText || '').toLowerCase();
}

function hideNonMemberPlusSavings() {
  const modals = Array.from(document.querySelectorAll('.fixed')) as HTMLElement[];

  modals.forEach(modal => {
    const modalText = visibleText(modal);
    const isPlusModal = modalText.includes('pollazo plus') || modalText.includes('plus');
    if (!isPlusModal) return;

    const isActiveMember =
      modalText.includes('tu plus está activo') ||
      modalText.includes('tus beneficios plus') ||
      modalText.includes('ya eres pollazo plus') ||
      modalText.includes('activo');

    if (isActiveMember) return;

    const blocks = Array.from(modal.querySelectorAll('div, section')) as HTMLElement[];

    blocks.forEach(block => {
      const text = visibleText(block);
      const shouldHide =
        text.includes('ahorro plus') ||
        text.includes('ahorro del mes') ||
        text.includes('ahorro acumulado') ||
        text.includes('gestion') ||
        text.includes('gestionar suscripción') ||
        text.includes('gestionar suscripcion') ||
        text.includes('visa ****') ||
        text.includes('cambiar método de pago') ||
        text.includes('cancelar suscripción');

      if (shouldHide) {
        block.style.display = 'none';
      }
    });
  });
}

export default function PlusNonMemberSavingsGuard() {
  useEffect(() => {
    const refresh = () => hideNonMemberPlusSavings();

    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    const interval = window.setInterval(refresh, 500);
    refresh();

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
