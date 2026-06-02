import { useEffect } from 'react';
import { onAdminPosToolOpen, type AdminPosToolKey } from '../utils/adminPosToolsEvents';

const isAdminPath = () => {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.toLowerCase() === '/admin';
};

const normalizeText = (value: string | null | undefined) =>
  String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();

const toolButtonLabel: Record<AdminPosToolKey, string> = {
  pos: 'caja pos',
  inventory: 'inventario',
  reports: 'reportes pos',
  corrections: 'correcciones pos',
  catalog: 'catálogo maestro',
};

const hiddenToolButtonLabels = Object.values(toolButtonLabel);

const getStandaloneToolButtons = () => {
  const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];

  return buttons.filter(button => {
    const text = normalizeText(button.textContent);
    const position = window.getComputedStyle(button).position;
    return position === 'fixed' && hiddenToolButtonLabels.includes(text);
  });
};

export default function AdminPosToolEventBridge() {
  useEffect(() => {
    if (!isAdminPath()) return;

    const hideStandaloneButtons = () => {
      getStandaloneToolButtons().forEach(button => {
        button.style.display = 'none';
      });
    };

    const openToolByEvent = (tool: AdminPosToolKey) => {
      hideStandaloneButtons();

      const expectedLabel = toolButtonLabel[tool];
      const target = getStandaloneToolButtons().find(button => normalizeText(button.textContent) === expectedLabel);

      if (target) {
        target.click();
        return;
      }

      window.setTimeout(() => {
        const retryTarget = getStandaloneToolButtons().find(button => normalizeText(button.textContent) === expectedLabel);
        if (retryTarget) retryTarget.click();
      }, 250);
    };

    hideStandaloneButtons();
    const interval = window.setInterval(hideStandaloneButtons, 500);
    const unsubscribe = onAdminPosToolOpen(openToolByEvent);

    return () => {
      window.clearInterval(interval);
      unsubscribe();
    };
  }, []);

  return null;
}
