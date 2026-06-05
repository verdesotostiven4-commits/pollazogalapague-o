import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import InfoHelpCenter from './InfoHelpCenter';

function findInfoScreenRoot(): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll('main > div')) as HTMLElement[];

  return (
    candidates.find(element => {
      const text = element.innerText || '';
      return (
        text.includes('La Casa del Pollazo') &&
        (text.includes('WhatsApp') || text.includes('Horario') || text.includes('Ubicación'))
      );
    }) || null
  );
}

function ensureHelpMount(root: HTMLElement): HTMLElement {
  const existing = root.querySelector('[data-pollazo-info-help-center="1"]') as HTMLElement | null;

  if (existing) return existing;

  const mount = document.createElement('div');
  mount.dataset.pollazoInfoHelpCenter = '1';
  mount.className = 'pollazo-info-help-center-mount';

  const children = Array.from(root.children);
  const contactBlock = children.find(child => {
    const text = (child as HTMLElement).innerText || '';
    return text.includes('WhatsApp') || text.includes('Teléfono') || text.includes('Phone');
  });

  if (contactBlock) {
    root.insertBefore(mount, contactBlock);
  } else {
    root.appendChild(mount);
  }

  return mount;
}

export default function InfoHelpCenterMount() {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const refresh = () => {
      const root = findInfoScreenRoot();

      if (!root) {
        setTarget(null);
        return;
      }

      setTarget(ensureHelpMount(root));
    };

    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true });

    const interval = window.setInterval(refresh, 450);
    refresh();

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  if (!target) return null;

  return createPortal(<InfoHelpCenter />, target);
}
