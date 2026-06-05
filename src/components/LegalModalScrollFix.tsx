import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

function getLegalScroll(): HTMLElement | null {
  return document.querySelector('.pollazo-legal-scroll') as HTMLElement | null;
}

function getLegalFooter(scroll: HTMLElement | null): HTMLElement | null {
  return (scroll?.parentElement?.querySelector('footer') as HTMLElement | null) || null;
}

function getEndNote(scroll: HTMLElement | null): HTMLElement | null {
  if (!scroll) return null;

  const candidates = Array.from(scroll.querySelectorAll('div')) as HTMLElement[];

  return (
    candidates.find(element =>
      element.innerText?.toLowerCase().includes('estos términos pueden actualizarse')
    ) ||
    candidates.find(element =>
      element.innerText?.toLowerCase().includes('terms may be updated')
    ) ||
    candidates[candidates.length - 1] ||
    null
  );
}

export default function LegalModalScrollFix() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let previewWindow = false;
    let previewTimer: number | null = null;

    const hideOriginalArrow = () => {
      const originalArrow = document.querySelector('.pollazo-legal-arrow');
      const originalButton = originalArrow?.closest('button') as HTMLElement | null;

      if (originalButton) {
        originalButton.style.display = 'none';
        originalButton.style.pointerEvents = 'none';
      }
    };

    const refresh = () => {
      const scroll = getLegalScroll();
      const footer = getLegalFooter(scroll);

      hideOriginalArrow();
      setMounted(Boolean(scroll));

      if (!scroll || footer) {
        setVisible(false);
        return;
      }

      const canScroll = scroll.scrollHeight > scroll.clientHeight + 12;
      const isAtTop = scroll.scrollTop < 8;

      setVisible(canScroll && (previewWindow || isAtTop));
    };

    const handleManualStart = () => {
      const scroll = getLegalScroll();
      if (!scroll) return;

      previewWindow = false;

      if (scroll.scrollTop >= 8) {
        setVisible(false);
      }
    };

    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true });

    const interval = window.setInterval(refresh, 250);

    const bindScroll = () => {
      const scroll = getLegalScroll();
      if (!scroll) return;

      scroll.addEventListener('scroll', refresh, { passive: true });
      scroll.addEventListener('wheel', handleManualStart, { passive: true });
      scroll.addEventListener('touchstart', handleManualStart, { passive: true });
      scroll.addEventListener('pointerdown', handleManualStart, { passive: true });
    };

    const unbindScroll = () => {
      const scroll = getLegalScroll();
      if (!scroll) return;

      scroll.removeEventListener('scroll', refresh);
      scroll.removeEventListener('wheel', handleManualStart);
      scroll.removeEventListener('touchstart', handleManualStart);
      scroll.removeEventListener('pointerdown', handleManualStart);
    };

    const bindTimer = window.setInterval(bindScroll, 400);

    const previewStarter = window.setInterval(() => {
      const scroll = getLegalScroll();
      const footer = getLegalFooter(scroll);

      if (!scroll || footer || scroll.scrollTop > 8) return;

      previewWindow = true;
      setVisible(true);

      if (previewTimer) window.clearTimeout(previewTimer);
      previewTimer = window.setTimeout(() => {
        previewWindow = false;
        refresh();
      }, 1700);
    }, 1200);

    refresh();

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
      window.clearInterval(bindTimer);
      window.clearInterval(previewStarter);
      if (previewTimer) window.clearTimeout(previewTimer);
      unbindScroll();
    };
  }, []);

  const handleClick = () => {
    const scroll = getLegalScroll();
    const endNote = getEndNote(scroll);

    if (!scroll) return;

    setVisible(false);
    scroll.scrollTo({ top: scroll.scrollHeight, behavior: 'smooth' });

    window.setTimeout(() => {
      endNote?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 260);

    window.setTimeout(() => {
      endNote?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 620);
  };

  if (!mounted || !visible) return null;

  return createPortal(
    <button
      type="button"
      onClick={handleClick}
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+24px)] left-1/2 z-[13000] -translate-x-1/2 text-orange-500 drop-shadow-[0_2px_6px_rgba(124,45,18,0.35)] active:scale-90 transition-transform"
      aria-label="Ir al final de términos y condiciones"
    >
      <ChevronDown className="animate-bounce" size={30} strokeWidth={4} />
    </button>,
    document.body
  );
}
