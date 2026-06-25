import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2 } from 'lucide-react';

const LEGAL_ACCEPTED_KEY = 'pollazo_legal_accepted';
const PROXY_ACCEPT_ATTR = 'data-pollazo-legal-proxy-accept';

function hasAcceptedLegal() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(LEGAL_ACCEPTED_KEY) === '1';
}

function getLegalScroll(): HTMLElement | null {
  return document.querySelector('.pollazo-legal-scroll') as HTMLElement | null;
}

function getLegalFooter(): HTMLElement | null {
  const scroll = getLegalScroll();
  return (scroll?.parentElement?.querySelector('footer') as HTMLElement | null) || null;
}

function getOriginalAcceptButton(): HTMLButtonElement | null {
  const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];

  return (
    buttons.find(button => {
      if (button.getAttribute(PROXY_ACCEPT_ATTR) === '1') return false;

      const text = button.innerText?.toLowerCase() || '';
      const isAccept = text.includes('acept') || text.includes('accept');
      const isCloseReading = text.includes('cerrar') || text.includes('close');

      return isAccept && !isCloseReading;
    }) || null
  );
}

function getOriginalCloseButton(): HTMLButtonElement | null {
  const scroll = getLegalScroll();
  const modal = scroll?.closest('section') || scroll?.parentElement;
  const buttons = Array.from((modal || document).querySelectorAll('button')) as HTMLButtonElement[];

  return (
    buttons.find(button => {
      if (button.getAttribute(PROXY_ACCEPT_ATTR) === '1') return false;

      const aria = (button.getAttribute('aria-label') || '').toLowerCase();
      const text = (button.innerText || '').toLowerCase();

      return aria.includes('cerrar') || aria.includes('close') || text.includes('cerrar lectura') || text.includes('close');
    }) || null
  );
}

function getOriginalArrowButton(): HTMLElement | null {
  const arrow = document.querySelector('.pollazo-legal-arrow');
  return (arrow?.closest('button') as HTMLElement | null) || null;
}

export default function LegalModalNoAutoScroll() {
  const [acceptUnlocked, setAcceptUnlocked] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [accepted, setAccepted] = useState(() => hasAcceptedLegal());

  useEffect(() => {
    let lockUntil = 0;
    let unlockedByUser = false;
    let acceptWasUnlocked = false;
    let lastScroll: HTMLElement | null = null;
    let frame = 0;

    const startLock = (scroll: HTMLElement) => {
      if (lastScroll === scroll) return;

      lastScroll = scroll;
      unlockedByUser = false;
      acceptWasUnlocked = false;
      setAcceptUnlocked(false);
      lockUntil = Date.now() + 2600;
      scroll.scrollTop = 0;
    };

    const markUserScroll = () => {
      unlockedByUser = true;
      lockUntil = 0;
    };

    const markArrowIntent = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const arrowButton = target?.closest('button')?.querySelector('.pollazo-legal-arrow');

      if (arrowButton) {
        unlockedByUser = true;
        lockUntil = 0;
      }
    };

    const keepAcceptAboveArrow = () => {
      if (hasAcceptedLegal()) {
        setAccepted(true);
        setMounted(false);
        setAcceptUnlocked(false);
        return;
      }

      const footer = getLegalFooter();
      const originalAccept = getOriginalAcceptButton();
      const originalClose = getOriginalCloseButton();
      const originalArrow = getOriginalArrowButton();
      const hasRequiredAccept = Boolean(footer && originalAccept && !originalClose);

      if (hasRequiredAccept) {
        acceptWasUnlocked = true;
        setAcceptUnlocked(true);
      }

      if ((hasRequiredAccept || acceptWasUnlocked) && originalArrow) {
        originalArrow.style.display = 'none';
        originalArrow.style.pointerEvents = 'none';
      }
    };

    const loop = () => {
      const scroll = getLegalScroll();
      const legalAccepted = hasAcceptedLegal();
      setAccepted(legalAccepted);

      if (legalAccepted) {
        setMounted(false);
        setAcceptUnlocked(false);
        lastScroll = null;
        unlockedByUser = false;
        acceptWasUnlocked = false;
        lockUntil = 0;
        frame = window.requestAnimationFrame(loop);
        return;
      }

      const hasReadOnlyClose = Boolean(scroll && getOriginalCloseButton());
      setMounted(Boolean(scroll && !hasReadOnlyClose));

      if (scroll && !hasReadOnlyClose) {
        startLock(scroll);
        keepAcceptAboveArrow();

        if (!unlockedByUser && Date.now() < lockUntil && scroll.scrollTop > 0) {
          scroll.scrollTop = 0;
        }
      } else {
        lastScroll = null;
        unlockedByUser = false;
        acceptWasUnlocked = false;
        lockUntil = 0;
        setAcceptUnlocked(false);
      }

      frame = window.requestAnimationFrame(loop);
    };

    const bindUserEvents = () => {
      const scroll = getLegalScroll();
      if (!scroll) return;

      scroll.addEventListener('wheel', markUserScroll, { passive: true });
      scroll.addEventListener('touchstart', markUserScroll, { passive: true });
      scroll.addEventListener('pointerdown', markUserScroll, { passive: true });
    };

    const unbindUserEvents = () => {
      const scroll = getLegalScroll();
      if (!scroll) return;

      scroll.removeEventListener('wheel', markUserScroll);
      scroll.removeEventListener('touchstart', markUserScroll);
      scroll.removeEventListener('pointerdown', markUserScroll);
    };

    document.addEventListener('pointerdown', markArrowIntent, true);
    document.addEventListener('click', markArrowIntent, true);

    const bindTimer = window.setInterval(bindUserEvents, 300);
    frame = window.requestAnimationFrame(loop);

    return () => {
      window.clearInterval(bindTimer);
      window.cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', markArrowIntent, true);
      document.removeEventListener('click', markArrowIntent, true);
      unbindUserEvents();
    };
  }, []);

  const handleAccept = () => {
    const originalButton = getOriginalAcceptButton();

    window.localStorage.setItem(LEGAL_ACCEPTED_KEY, '1');
    setAccepted(true);
    setMounted(false);
    setAcceptUnlocked(false);

    if (originalButton) {
      originalButton.click();
      return;
    }

    getOriginalCloseButton()?.click();
  };

  if (accepted || !mounted || !acceptUnlocked) return null;

  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-[13050] bg-white/95 border-t border-orange-100 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+14px)] shadow-[0_-10px_30px_rgba(251,146,60,0.16)]">
      <p className="text-[9px] font-bold text-gray-400 leading-relaxed text-center mb-3">
        Al continuar confirmas que entiendes las reglas y aceptas los términos de La Casa del Pollazo.
      </p>

      <button
        type="button"
        data-pollazo-legal-proxy-accept="1"
        onClick={handleAccept}
        className="w-full max-w-lg mx-auto bg-gradient-to-r from-orange-500 to-yellow-400 text-white py-5 rounded-[26px] font-black text-xs uppercase tracking-widest active:scale-95 transition-transform shadow-xl shadow-orange-200 border-b-4 border-orange-600 flex items-center justify-center gap-2"
      >
        <CheckCircle2 size={17} />
        Aceptar y continuar
      </button>
    </div>,
    document.body
  );
}
