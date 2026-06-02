import { useEffect } from 'react';

const normalizeText = (value: string | null | undefined) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const isAdminPath = () => {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.toLowerCase() === '/admin';
};

const findCatalogMasterButton = () => {
  const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
  return buttons.find(button => normalizeText(button.textContent) === 'catalogo maestro') || null;
};

const isAdminMenuButton = (button: HTMLButtonElement) => {
  const label = normalizeText(button.textContent);
  if (label !== 'menu' && label !== 'catalogo') return false;

  const containerText = normalizeText(button.parentElement?.textContent || '');
  return containerText.includes('inicio') && containerText.includes('pedidos') && containerText.includes('caja');
};

export default function AdminCatalogMenuBridge() {
  useEffect(() => {
    if (!isAdminPath()) return;

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest('button') as HTMLButtonElement | null;

      if (!button || !isAdminMenuButton(button)) return;

      window.setTimeout(() => {
        const catalogButton = findCatalogMasterButton();
        if (catalogButton) catalogButton.click();
      }, 50);
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return null;
}
