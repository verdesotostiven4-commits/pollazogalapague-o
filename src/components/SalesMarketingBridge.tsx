import { useEffect } from 'react';

const STYLE_ID = 'pollazo-sales-marketing-bridge-style';

const cleanupIntrusiveMarketing = () => {
  document.querySelectorAll('.pollazo-sales-badge, .pollazo-sales-nudge, .pollazo-plus-cart-nudge').forEach(node => {
    node.remove();
  });

  document.querySelectorAll('[data-pollazo-sales-card]').forEach(node => {
    node.removeAttribute('data-pollazo-sales-card');
  });

  document.querySelectorAll('[data-pollazo-plus-nudge]').forEach(node => {
    node.removeAttribute('data-pollazo-plus-nudge');
  });
};

const installStyles = () => {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .pollazo-sales-badge,
    .pollazo-sales-nudge,
    .pollazo-plus-cart-nudge {
      display: none !important;
      opacity: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }
  `;

  document.head.appendChild(style);
};

export default function SalesMarketingBridge() {
  useEffect(() => {
    installStyles();
    cleanupIntrusiveMarketing();

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(cleanupIntrusiveMarketing);
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    const timers = [80, 250, 700, 1400].map(delay => window.setTimeout(cleanupIntrusiveMarketing, delay));

    return () => {
      observer.disconnect();
      timers.forEach(timer => window.clearTimeout(timer));
    };
  }, []);

  return null;
}
