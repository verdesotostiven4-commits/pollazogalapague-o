import { useEffect } from 'react';

function protectErrorRetry() {
  const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];

  buttons.forEach(button => {
    const text = (button.innerText || '').trim().toLowerCase();
    const parentText = (button.parentElement?.innerText || '').toLowerCase();

    const looksLikeErrorRetry =
      parentText.includes('reinicio necesario') ||
      text.includes('limpiar y reintentar') ||
      text.includes('reintentar');

    if (!looksLikeErrorRetry || button.dataset.pollazoSafeRetry === '1') return;

    button.dataset.pollazoSafeRetry = '1';
    button.textContent = 'REINTENTAR SIN BORRAR DATOS';

    button.addEventListener(
      'click',
      event => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        window.location.href = '/';
      },
      true
    );
  });
}

export default function ErrorRetryGuard() {
  useEffect(() => {
    const refresh = () => protectErrorRetry();

    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    const interval = window.setInterval(refresh, 200);
    refresh();

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
