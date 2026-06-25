import { useEffect } from 'react';

function getVisibleText(element: HTMLElement) {
  return (element.innerText || element.textContent || '').trim();
}

function getMain(): HTMLElement | null {
  return document.querySelector('main') as HTMLElement | null;
}

function findInfoRoot(): HTMLElement | null {
  const main = getMain();
  if (!main) return null;

  const candidates = Array.from(main.querySelectorAll(':scope > div, :scope > section')) as HTMLElement[];

  return (
    candidates.find(element => {
      const text = getVisibleText(element);
      return text.includes('La Casa del Pollazo') || text.includes('Hecho para comprar fácil en Puerto Ayora');
    }) ||
    (getVisibleText(main).includes('Hecho para comprar fácil en Puerto Ayora') ? main : null)
  );
}

function installInfoModalTopCoverageFix() {
  if (typeof document === 'undefined') return;

  const styleId = 'pollazo-info-modal-top-coverage-fix';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @supports selector(:has(*)) {
      body:has(nav[aria-label="Navegación principal"] button:nth-child(5)[aria-current="page"]) div.fixed.inset-0,
      body:has(nav[aria-label="Navegación principal"] button:nth-child(5)[aria-current="page"]) section.fixed.inset-0 {
        top: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100dvh !important;
        min-height: 100dvh !important;
        max-height: 100dvh !important;
        margin-top: 0 !important;
        padding-top: 0 !important;
        z-index: 13000 !important;
      }

      body:has(nav[aria-label="Navegación principal"] button:nth-child(5)[aria-current="page"]) div.fixed.inset-x-0.bottom-0,
      body:has(nav[aria-label="Navegación principal"] button:nth-child(5)[aria-current="page"]) section.fixed.inset-x-0.bottom-0 {
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
      }

      body:has(nav[aria-label="Navegación principal"] button:nth-child(5)[aria-current="page"]) .pollazo-legal-scroll,
      body:has(nav[aria-label="Navegación principal"] button:nth-child(5)[aria-current="page"]) [data-pollazo-info-gallery="1"] {
        padding-top: 0 !important;
        margin-top: 0 !important;
      }
    }
  `;

  document.head.appendChild(style);
}

function replaceLanguageLabels() {
  const allTextElements = Array.from(document.querySelectorAll('h1, h2, h3, p, span')) as HTMLElement[];

  allTextElements.forEach(element => {
    const text = getVisibleText(element).toLowerCase();

    if (text === 'idioma de la app') {
      element.textContent = 'Cambiar idioma';
    }

    if (text === 'app · cambiar idioma' || text === 'app cambiar idioma') {
      element.textContent = 'Cambiar idioma';
    }

    if (text.includes('app') && text.includes('cambiar idio')) {
      element.textContent = 'Cambiar idioma';
    }
  });
}

function polishOrdersLabels() {
  const textNodes = Array.from(document.querySelectorAll('p, span')) as HTMLElement[];

  textNodes.forEach(element => {
    const text = getVisibleText(element);
    const match = text.match(/^Toca detalle para ver\s+(\d+)\s+producto(s)?\s+más$/i);

    if (match) {
      const count = Number(match[1]);
      element.textContent = `${count} producto${count === 1 ? '' : 's'} más`;
    }
  });
}

function createSmallText(text: string, className: string) {
  const element = document.createElement('p');
  element.className = className;
  element.textContent = text;
  return element;
}

function createPlusMetric(title: string, value: string, detail: string) {
  const box = document.createElement('div');
  box.className = 'rounded-[22px] bg-white border border-orange-100 p-3 shadow-sm';
  box.appendChild(createSmallText(title, 'text-[8px] font-black text-gray-400 uppercase tracking-widest'));
  box.appendChild(createSmallText(value, 'text-xl font-black text-orange-600 leading-none mt-2'));
  box.appendChild(createSmallText(detail, 'text-[9px] font-bold text-gray-500 leading-relaxed mt-1'));
  return box;
}

function createFutureButton(label: string) {
  const button = document.createElement('button');
  button.type = 'button';
  button.disabled = true;
  button.className = 'w-full rounded-[20px] bg-gray-50 border border-gray-100 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400';
  button.textContent = label;
  return button;
}

function monthLabel() {
  return new Date().toLocaleDateString('es-EC', { month: 'long', year: '2-digit' });
}

function polishPlusModal() {
  const headings = Array.from(document.querySelectorAll('h2')) as HTMLElement[];
  const plusHeading = headings.find(heading => {
    const text = getVisibleText(heading).toLowerCase();
    return text.includes('beneficios plus') || text.includes('pollazo plus');
  });

  if (!plusHeading) return;

  const sheet = plusHeading.closest('section') as HTMLElement | null;
  if (!sheet || sheet.querySelector('[data-pollazo-plus-manager="1"]')) return;

  const scrollArea = Array.from(sheet.querySelectorAll('div'))
    .find(element => {
      const className = element.getAttribute('class') || '';
      return className.includes('overflow-y-auto') && className.includes('flex-1');
    }) as HTMLElement | undefined;

  if (!scrollArea) return;

  const wrapper = document.createElement('div');
  wrapper.dataset.pollazoPlusManager = '1';
  wrapper.className = 'space-y-3';

  const savings = document.createElement('section');
  savings.className = 'rounded-[30px] bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-100 p-4 shadow-sm';
  savings.appendChild(createSmallText('Ahorro Plus', 'text-[9px] font-black text-orange-500 uppercase tracking-widest'));
  savings.appendChild(createSmallText(`Ahorro de ${monthLabel()}`, 'text-sm font-black text-gray-950 uppercase italic mt-1'));

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-2 gap-2 mt-3';
  grid.appendChild(createPlusMetric('Este mes', '$0.00', 'Se actualizará con pedidos Plus.'));
  grid.appendChild(createPlusMetric('Acumulado', '$0.00', 'Desde que activaste Plus.'));
  savings.appendChild(grid);

  const note = document.createElement('div');
  note.className = 'mt-3 rounded-[22px] bg-white/80 border border-orange-100 p-3';
  note.appendChild(createSmallText('Cada delivery gratis suma aprox. $1.50 de ahorro. Cuando conectemos el historial Plus, aquí se verá: “Ahorraste $1.50 en este pedido”.', 'text-[10px] font-bold text-orange-700 leading-relaxed'));
  savings.appendChild(note);

  const manage = document.createElement('section');
  manage.className = 'rounded-[30px] bg-white border border-orange-100 p-4 shadow-sm';
  manage.appendChild(createSmallText('Gestionar suscripción', 'text-[9px] font-black text-orange-500 uppercase tracking-widest'));
  manage.appendChild(createSmallText('Plan mensual $6.99', 'text-base font-black text-gray-950 uppercase italic mt-1'));
  manage.appendChild(createSmallText('Activo hasta la fecha de vencimiento de tu membresía. Próximamente se conectará el cobro automático con tarjeta.', 'text-[10px] font-bold text-gray-500 leading-relaxed mt-2'));

  const card = document.createElement('div');
  card.className = 'mt-3 rounded-[22px] bg-gray-50 border border-gray-100 p-3 flex items-center justify-between gap-3';
  card.appendChild(createSmallText('Visa ****0816', 'text-xs font-black text-gray-700 uppercase'));
  card.appendChild(createSmallText('Próximamente', 'text-[8px] font-black text-gray-400 uppercase'));
  manage.appendChild(card);

  const actions = document.createElement('div');
  actions.className = 'grid grid-cols-1 gap-2 mt-3';
  actions.appendChild(createFutureButton('Cambiar método de pago'));
  actions.appendChild(createFutureButton('Cancelar suscripción'));
  manage.appendChild(actions);

  wrapper.appendChild(savings);
  wrapper.appendChild(manage);
  scrollArea.insertBefore(wrapper, scrollArea.firstChild?.nextSibling || scrollArea.firstChild);
}

function tightenInfoFooter(root: HTMLElement) {
  const rootClass = root.getAttribute('class') || '';

  if (rootClass.includes('pb-24')) {
    root.classList.remove('pb-24');
    root.classList.add('pb-10');
  }

  root.style.paddingBottom = '2.75rem';

  const footerText = Array.from(root.querySelectorAll('p'))
    .find(element => getVisibleText(element).includes('Hecho para comprar fácil en Puerto Ayora')) as HTMLElement | undefined;

  const footerWrapper = footerText?.closest('div') as HTMLElement | null;
  const footerOuter = footerWrapper?.parentElement as HTMLElement | null;

  if (footerOuter) {
    footerOuter.style.paddingTop = '0';
    footerOuter.style.paddingBottom = '0';
    footerOuter.style.marginTop = '-0.25rem';
    footerOuter.style.marginBottom = '-2.25rem';
  }

  if (footerWrapper) {
    footerWrapper.style.marginBottom = '0';
    footerWrapper.style.paddingBottom = '0';
  }
}

function polishInfoScreen() {
  replaceLanguageLabels();
  polishOrdersLabels();
  polishPlusModal();

  const root = findInfoRoot();
  if (!root) return;

  tightenInfoFooter(root);
}

export default function InfoScreenVisualPolish() {
  useEffect(() => {
    installInfoModalTopCoverageFix();

    const refresh = () => polishInfoScreen();

    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });

    const interval = window.setInterval(refresh, 120);
    refresh();

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
