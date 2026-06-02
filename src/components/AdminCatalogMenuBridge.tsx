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

const openCatalogMaster = () => {
  const catalogButton = findCatalogMasterButton();

  if (catalogButton) {
    catalogButton.click();
    return;
  }

  window.alert('El catálogo está cargando. Refresca la página e intenta nuevamente.');
};

const renameMenuButton = () => {
  const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];

  buttons.forEach(button => {
    if (!isAdminMenuButton(button)) return;

    button.setAttribute('aria-label', 'Abrir catálogo');
    button.title = 'Abrir catálogo';

    const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();

    while (node) {
      if (normalizeText(node.textContent) === 'menu') {
        node.textContent = 'CATÁLOGO';
      }
      node = walker.nextNode();
    }
  });
};

export default function AdminCatalogMenuBridge() {
  useEffect(() => {
    if (!isAdminPath()) return;

    const onClickCapture = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest('button') as HTMLButtonElement | null;

      if (!button || !isAdminMenuButton(button)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      openCatalogMaster();
    };

    renameMenuButton();
    document.addEventListener('click', onClickCapture, true);
    const interval = window.setInterval(renameMenuButton, 500);

    return () => {
      document.removeEventListener('click', onClickCapture, true);
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
