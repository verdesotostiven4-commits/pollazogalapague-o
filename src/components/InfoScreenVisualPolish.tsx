import { useEffect } from 'react';

function getVisibleText(element: HTMLElement) {
  return (element.innerText || element.textContent || '').trim();
}

function findInfoRoot(): HTMLElement | null {
  const main = document.querySelector('main') as HTMLElement | null;
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

function replaceLanguageTitle() {
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, p')) as HTMLElement[];

  headings.forEach(element => {
    const text = getVisibleText(element).toLowerCase();

    if (text === 'idioma de la app') {
      element.textContent = 'Cambiar idioma';
    }
  });
}

function tightenInfoFooter(root: HTMLElement) {
  root.style.paddingBottom = '4.25rem';

  const footerText = Array.from(root.querySelectorAll('p'))
    .find(element => getVisibleText(element).includes('Hecho para comprar fácil en Puerto Ayora')) as HTMLElement | undefined;

  const footerWrapper = footerText?.closest('div') as HTMLElement | null;
  const footerOuter = footerWrapper?.parentElement as HTMLElement | null;

  if (footerOuter) {
    footerOuter.style.paddingTop = '0.1rem';
    footerOuter.style.paddingBottom = '0.05rem';
    footerOuter.style.marginBottom = '0';
  }

  if (footerWrapper) {
    footerWrapper.style.marginBottom = '0';
  }
}

function polishInfoScreen() {
  replaceLanguageTitle();

  const root = findInfoRoot();
  if (!root) return;

  tightenInfoFooter(root);
}

export default function InfoScreenVisualPolish() {
  useEffect(() => {
    const refresh = () => polishInfoScreen();

    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    const interval = window.setInterval(refresh, 250);
    refresh();

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
