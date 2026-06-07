import { useEffect } from 'react';

const cleanupCatalogCards = () => {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-pollazo-compact-card="1"]'));

  cards.forEach(card => {
    card.removeAttribute('data-pollazo-compact-card');
    ['min-height', 'height', 'max-height', 'align-self'].forEach(property => {
      card.style.removeProperty(property);
    });

    const imageWrap = Array.from(card.children).find(child => child.querySelector('img')) as HTMLElement | undefined;
    if (imageWrap) {
      ['height', 'min-height', 'max-height', 'aspect-ratio'].forEach(property => {
        imageWrap.style.removeProperty(property);
      });
    }

    const contentWrap = Array.from(card.children).find(child => child !== imageWrap && child.querySelector('h3')) as HTMLElement | undefined;
    if (contentWrap) {
      ['height', 'min-height', 'max-height'].forEach(property => {
        contentWrap.style.removeProperty(property);
      });
    }
  });
};

export default function CatalogCompactVisualBridge() {
  useEffect(() => {
    cleanupCatalogCards();

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(cleanupCatalogCards);
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'data-pollazo-compact-card'],
    });

    const timers = [80, 250, 650, 1200].map(delay => window.setTimeout(cleanupCatalogCards, delay));

    return () => {
      observer.disconnect();
      timers.forEach(timer => window.clearTimeout(timer));
    };
  }, []);

  return null;
}
