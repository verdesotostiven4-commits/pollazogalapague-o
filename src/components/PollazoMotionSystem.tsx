import { useEffect } from 'react';

const STYLE_ID = 'pollazo-motion-system-style';
const PRESSABLE_SELECTOR = 'button:not([disabled]), a[href], [role="button"]:not([aria-disabled="true"])';
const EXCLUDED_SELECTOR = [
  'input',
  'textarea',
  'select',
  '[contenteditable="true"]',
  '[data-no-motion="true"]',
  '.maplibregl-map',
  '.pollazo-maplibre',
  '.pollazo-maplibre *',
  '.maplibregl-canvas',
  '.maplibregl-canvas *',
].join(',');

const canUseDOM = () => typeof window !== 'undefined' && typeof document !== 'undefined';

const prefersReducedMotion = () => {
  if (!canUseDOM()) return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const installStyles = () => {
  if (!canUseDOM() || document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media (prefers-reduced-motion: no-preference) {
      .pollazo-motion-pressable {
        transform-origin: center;
        backface-visibility: hidden;
        -webkit-tap-highlight-color: transparent;
      }

      .pollazo-motion-soft-focus:focus-visible {
        outline: 3px solid rgba(249, 115, 22, 0.34) !important;
        outline-offset: 3px !important;
      }

      .pollazo-motion-new {
        will-change: transform, opacity;
      }
    }
  `;

  document.head.appendChild(style);
};

const isExcluded = (element: Element | null) => {
  if (!element) return true;
  return Boolean(element.closest(EXCLUDED_SELECTOR));
};

const getPressable = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return null;
  const pressable = target.closest<HTMLElement>(PRESSABLE_SELECTOR);

  if (!pressable || isExcluded(pressable)) return null;
  return pressable;
};

const enhancePressables = (root: ParentNode) => {
  root.querySelectorAll<HTMLElement>(PRESSABLE_SELECTOR).forEach(element => {
    if (isExcluded(element)) return;

    element.classList.add('pollazo-motion-pressable', 'pollazo-motion-soft-focus');
  });
};

const shouldSoftEnter = (element: HTMLElement) => {
  if (isExcluded(element)) return false;
  if (element.dataset.pollazoMotionEntered === '1') return false;

  const className = String(element.className || '');
  const looksLikeOverlay = className.includes('fixed') && className.includes('inset-0');
  const looksLikeModal = className.includes('rounded-') && className.includes('shadow');
  const looksLikeCard = element.matches('[data-pollazo-card="true"]');

  return looksLikeOverlay || looksLikeModal || looksLikeCard;
};

const softEnter = (element: HTMLElement) => {
  if (prefersReducedMotion() || !shouldSoftEnter(element)) return;

  element.dataset.pollazoMotionEntered = '1';
  element.classList.add('pollazo-motion-new');

  try {
    element.animate(
      [
        { opacity: 0, transform: 'translateY(10px) scale(0.985)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' },
      ],
      {
        duration: 320,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'both',
      }
    );
  } catch {
    // Animación opcional.
  }
};

export default function PollazoMotionSystem() {
  useEffect(() => {
    if (!canUseDOM()) return undefined;

    installStyles();
    enhancePressables(document);

    const handlePointerDown = (event: PointerEvent) => {
      if (prefersReducedMotion()) return;

      const pressable = getPressable(event.target);
      if (!pressable) return;

      try {
        pressable.animate(
          [
            { transform: 'scale(1)' },
            { transform: 'scale(0.965)' },
            { transform: 'scale(1)' },
          ],
          {
            duration: 180,
            easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
            fill: 'both',
          }
        );
      } catch {
        // Feedback opcional.
      }
    };

    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (!(node instanceof HTMLElement)) return;

          if (node.matches(PRESSABLE_SELECTOR)) {
            enhancePressables(node.parentElement || document);
          } else {
            enhancePressables(node);
          }

          softEnter(node);
          node.querySelectorAll<HTMLElement>('[class*="rounded-"][class*="shadow"], [data-pollazo-card="true"]').forEach(softEnter);
        });
      });
    });

    document.addEventListener('pointerdown', handlePointerDown, { passive: true, capture: true });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      observer.disconnect();
    };
  }, []);

  return null;
}
