import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, ChevronDown } from 'lucide-react';

const LEGAL_ACCEPTED_KEY = 'pollazo_legal_accepted';

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
    null
  );
}

function getOriginalAcceptButton(): HTMLButtonElement | null {
  const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];

  return (
    buttons.find(button =>
      button.innerText?.toLowerCase().includes('acept') ||
      button.innerText?.toLowerCase().includes('accept')
    ) || null
  );
}

function hideOriginalLegalControls() {
  const originalArrow = document.querySelector('.pollazo-legal-arrow');
  const originalArrowButton = originalArrow?.closest('button') as HTMLElement | null;

  if (originalArrowButton) {
    originalArrowButton.style.display = 'none';
    originalArrowButton.style.pointerEvents = 'none';
  }

  const footer = getLegalFooter(getLegalScroll());

  if (footer) {
    footer.style.display = 'none';
  }
}

function hideEndUpdateNote() {
  const scroll = getLegalScroll();
  const endNote = getEndNote(scroll);

  if (endNote) {
    endNote.style.display = 'none';
  }
}

function cancelOriginalPreviewScroll() {
  const scroll = getLegalScroll();
  if (!scroll) return;

  const now = Date.now();
  const mountedAt = Number(scroll.dataset.pollazoLegalMountedAt || now);

  if (!scroll.dataset.pollazoLegalMountedAt) {
    scroll.dataset.pollazoLegalMountedAt = String(now);
  }

  const recentlyMounted = now - mountedAt < 2600;
  const userTouched = scroll.dataset.pollazoLegalUserTouched === '1';

  if (recentlyMounted && !userTouched && scroll.scrollTop > 0 && scroll.scrollTop < 140) {
    scroll.scrollTop = 0;
  }
}

export default function LegalModalScrollFix() {
  const [mounted, setMounted] = useState(false);
  const [showArrow, setShowArrow] = useState(false);
  const [acceptReady, setAcceptReady] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const scroll = getLegalScroll();
      const footer = getLegalFooter(scroll);

      hideOriginalLegalControls();
      hideEndUpdateNote();
      cancelOriginalPreviewScroll();
      setMounted(Boolean(scroll));

      if (!scroll) {
        setShowArrow(false);
        setAcceptReady(false);
        return;
      }

      const canScroll = scroll.scrollHeight > scroll.clientHeight + 12;
      const isAtTop = scroll.scrollTop < 8;
      const originalAcceptExists = Boolean(footer || getOriginalAcceptButton());

      if (originalAcceptExists || acceptReady) {
        scroll.style.paddingBottom = '150px';
      }

      setAcceptReady(originalAcceptExists || acceptReady);
      setShowArrow(canScroll && isAtTop && !originalAcceptExists && !acceptReady);
    };

    const markTouched = () => {
      const scroll = getLegalScroll();
      if (scroll) {
        scroll.dataset.pollazoLegalUserTouched = '1';
      }
    };

    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    const interval = window.setInterval(refresh, 120);

    const bindScroll = () => {
      const scroll = getLegalScroll();
      if (!scroll) return;

      scroll.addEventListener('scroll', refresh, { passive: true });
      scroll.addEventListener('wheel', markTouched, { passive: true });
      scroll.addEventListener('touchstart', markTouched, { passive: true });
      scroll.addEventListener('pointerdown', markTouched, { passive: true });
    };

    const unbindScroll = () => {
      const scroll = getLegalScroll();
      if (!scroll) return;

      scroll.removeEventListener('scroll', refresh);
      scroll.removeEventListener('wheel', markTouched);
      scroll.removeEventListener('touchstart', markTouched);
      scroll.removeEventListener('pointerdown', markTouched);
    };

    const bindTimer = window.setInterval(bindScroll, 400);

    refresh();

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
      window.clearInterval(bindTimer);
      unbindScroll();
    };
  }, [acceptReady]);

  const handleArrowClick = () => {
    const scroll = getLegalScroll();

    if (!scroll) return;

    scroll.dataset.pollazoLegalUserTouched = '1';
    setShowArrow(false);
    setAcceptReady(true);
    scroll.style.paddingBottom = '150px';
    scroll.scrollTo({ top: scroll.scrollHeight, behavior: 'smooth' });
  };

  const handleAccept = () => {
    const originalButton = getOriginalAcceptButton();

    if (originalButton) {
      originalButton.click();
      return;
    }

    window.localStorage.setItem(LEGAL_ACCEPTED_KEY, '1');
    window.location.reload();
  };

  if (!mounted) return null;

  return createPortal(
    <>
      {showArrow && !acceptReady && (
        <button
          type="button"
          onClick={handleArrowClick}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+24px)] left-1/2 z-[13000] -translate-x-1/2 text-orange-500 drop-shadow-[0_2px_6px_rgba(124,45,18,0.35)] active:scale-90 transition-transform"
          aria-label="Ir al final de términos y condiciones"
        >
          <ChevronDown className="animate-bounce" size={30} strokeWidth={4} />
        </button>
      )}

      {acceptReady && (
        <div className="fixed inset-x-0 bottom-0 z-[13000] bg-white/95 border-t border-orange-100 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+14px)] shadow-[0_-10px_30px_rgba(251,146,60,0.16)]">
          <p className="text-[9px] font-bold text-gray-400 leading-relaxed text-center mb-3">
            Al continuar confirmas que entiendes las reglas y aceptas los términos de La Casa del Pollazo.
          </p>

          <button
            type="button"
            onClick={handleAccept}
            className="w-full max-w-lg mx-auto bg-gradient-to-r from-orange-500 to-yellow-400 text-white py-5 rounded-[26px] font-black text-xs uppercase tracking-widest active:scale-95 transition-transform shadow-xl shadow-orange-200 border-b-4 border-orange-600 flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={17} />
            Aceptar y continuar
          </button>
        </div>
      )}
    </>,
    document.body
  );
}
