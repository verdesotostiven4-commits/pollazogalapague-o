import { useEffect } from 'react';

function findInfoRoot(): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll('main > div')) as HTMLElement[];

  return (
    candidates.find(element => {
      const text = element.innerText || '';
      return text.includes('La Casa del Pollazo') && (text.includes('Puerto Ayora') || text.includes('Info') || text.includes('Información'));
    }) || null
  );
}

function polishInfoScreen() {
  const root = findInfoRoot();
  if (!root) return;

  root.style.paddingBottom = '4.35rem';

  const blocks = Array.from(root.querySelectorAll('div, section')) as HTMLElement[];

  const footerBlock = blocks.find(element => {
    const text = element.innerText || '';
    return text.includes('Hecho para comprar fácil en Puerto Ayora');
  });

  if (footerBlock) {
    footerBlock.style.paddingTop = '0.25rem';
    footerBlock.style.paddingBottom = '0.15rem';
    footerBlock.style.marginBottom = '0';
  }

  const headings = Array.from(root.querySelectorAll('h3')) as HTMLElement[];
  const languageHeading = headings.find(heading => {
    const text = heading.innerText.trim().toLowerCase();
    return text === 'idioma de la app' || text === 'app language';
  });

  if (languageHeading) {
    languageHeading.textContent = 'Cambiar idioma';
  }
}

export default function InfoScreenVisualPolish() {
  useEffect(() => {
    const refresh = () => polishInfoScreen();

    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    const interval = window.setInterval(refresh, 600);
    refresh();

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
