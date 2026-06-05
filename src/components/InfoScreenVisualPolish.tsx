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

  const root = findInfoRoot();
  if (!root) return;

  tightenInfoFooter(root);
}

export default function InfoScreenVisualPolish() {
  useEffect(() => {
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
