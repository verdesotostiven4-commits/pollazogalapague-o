import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const CART_SCROLL_STYLE_ID = 'pollazo-cart-smart-scroll-bridge-style';

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const isCartActive = () => {
  const nav = document.querySelector('nav[aria-label="Navegación principal"]');
  const activeButton = nav?.querySelector<HTMLButtonElement>('button[aria-current="page"]');
  const activeText = normalize(activeButton?.textContent || '');

  if (activeText.includes('carrito') || activeText.includes('cart')) return true;

  const pageTitleText = normalize(
    Array.from(document.querySelectorAll('header, h1, h2, [role="heading"]'))
      .map(element => element.textContent || '')
      .join(' ')
  );

  return pageTitleText.includes('carrito') || pageTitleText.includes('cart');
};

const findCartScroller = (): HTMLDivElement | null => {
  const candidates = Array.from(document.querySelectorAll<HTMLDivElement>('div'));

  return candidates.find(element => {
    const style = window.getComputedStyle(element);
    const canScroll = element.scrollHeight > element.clientHeight + 40;
    const isScrollable = style.overflowY === 'auto' || style.overflowY === 'scroll';
    const text = normalize(element.textContent || '');

    return canScroll && isScrollable && text.includes('paso 1') && (text.includes('forma de pago') || text.includes('pago'));
  }) || null;
};

const findSection = (scroller: HTMLElement, patterns: RegExp[]) => {
  const sections = Array.from(scroller.querySelectorAll<HTMLElement>('section'));

  return sections.find(section => {
    const text = normalize(section.textContent || '');
    return patterns.some(pattern => pattern.test(text));
  }) || null;
};

const findBankOptionsBlock = (scroller: HTMLElement) => {
  const candidates = Array.from(scroller.querySelectorAll<HTMLElement>('div, section'))
    .filter(element => {
      const text = normalize(element.textContent || '');
      const hasBankTitle = text.includes('selecciona tu banco') || text.includes('select your bank') || text.includes('elige banco');
      const hasBankOptions =
        text.includes('banco pichincha') ||
        text.includes('banco guayaquil') ||
        text.includes('banco del pacifico') ||
        text.includes('produbanco');

      return hasBankTitle && hasBankOptions;
    })
    .sort((a, b) => (a.textContent || '').length - (b.textContent || '').length);

  return candidates[0] || null;
};

const isPaymentPending = () => {
  const text = normalize(document.body.textContent || '');
  return text.includes('pago pendiente') || text.includes('elige tu forma de pago') || text.includes('payment pending');
};

const scrollToElement = (scroller: HTMLElement, target: HTMLElement, offset = 12) => {
  const top = Math.max(0, target.offsetTop - offset);
  scroller.scrollTo({ top, behavior: 'smooth' });
};

const scrollToDynamicBottom = (scroller: HTMLElement) => {
  const bottom = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
  scroller.scrollTo({ top: bottom, behavior: 'smooth' });
};

const scrollToBankOptions = () => {
  const scroller = findCartScroller();
  if (!scroller) return false;

  const bankBlock = findBankOptionsBlock(scroller);
  if (!bankBlock) return false;

  scrollToElement(scroller, bankBlock, 92);
  return true;
};

export default function CartSmartScrollBridge() {
  const [visible, setVisible] = useState(false);
  const manualHiddenRef = useRef(false);
  const suppressManualScrollUntilRef = useRef(0);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (!document.getElementById(CART_SCROLL_STYLE_ID)) {
      const style = document.createElement('style');
      style.id = CART_SCROLL_STYLE_ID;
      style.textContent = `
        button[aria-label="Ver más información del pedido"],
        button[aria-label="Ver mas informacion del pedido"] {
          display: none !important;
          opacity: 0 !important;
          pointer-events: none !important;
          visibility: hidden !important;
        }
      `;
      document.head.appendChild(style);
    }

    let activeScroller: HTMLDivElement | null = null;
    let lastScrollTop = 0;

    const update = () => {
      const scroller = isCartActive() ? findCartScroller() : null;

      if (!scroller) {
        setVisible(false);
        return;
      }

      const remaining = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
      const isNearTop = scroller.scrollTop <= 48;

      if (isNearTop) {
        manualHiddenRef.current = false;
      }

      setVisible((isNearTop || !manualHiddenRef.current) && remaining > 52);
    };

    const handleScrollerScroll = () => {
      const scroller = activeScroller;
      if (!scroller) return;

      const now = Date.now();
      const moved = Math.abs(scroller.scrollTop - lastScrollTop) > 6;

      if (scroller.scrollTop <= 48) {
        manualHiddenRef.current = false;
      } else if (moved && now > suppressManualScrollUntilRef.current) {
        manualHiddenRef.current = true;
      }

      lastScrollTop = scroller.scrollTop;
      update();
    };

    const attachScroll = () => {
      const scroller = isCartActive() ? findCartScroller() : null;

      if (scroller && scroller !== activeScroller) {
        activeScroller?.removeEventListener('scroll', handleScrollerScroll);
        activeScroller = scroller;
        lastScrollTop = scroller.scrollTop;
        manualHiddenRef.current = scroller.scrollTop > 48;
        activeScroller.addEventListener('scroll', handleScrollerScroll, { passive: true });
      }

      if (!scroller) {
        manualHiddenRef.current = false;
        activeScroller?.removeEventListener('scroll', handleScrollerScroll);
        activeScroller = null;
      }

      update();
    };

    const handleGlobalClick = (event: MouseEvent) => {
      if (!isCartActive()) return;

      const target = event.target as HTMLElement | null;
      const button = target?.closest('button');
      if (!button) return;

      const buttonText = normalize(button.textContent || '');
      const isTransferButton = buttonText.includes('transferencia') || buttonText.includes('bank transfer');

      if (!isTransferButton) return;

      suppressManualScrollUntilRef.current = Date.now() + 1400;
      manualHiddenRef.current = true;
      setVisible(false);

      window.setTimeout(scrollToBankOptions, 180);
      window.setTimeout(scrollToBankOptions, 420);
    };

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(attachScroll);
      window.setTimeout(update, 180);
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-current', 'class', 'style'],
    });

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.addEventListener('click', handleGlobalClick, true);
    window.addEventListener('click', () => window.setTimeout(update, 80), true);

    const timers = [0, 180, 500, 900].map(delay => window.setTimeout(attachScroll, delay));

    return () => {
      timers.forEach(timer => window.clearTimeout(timer));
      observer.disconnect();
      activeScroller?.removeEventListener('scroll', handleScrollerScroll);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.removeEventListener('click', handleGlobalClick, true);
    };
  }, []);

  const handleClick = () => {
    const scroller = findCartScroller();
    if (!scroller) return;

    suppressManualScrollUntilRef.current = Date.now() + 1400;
    manualHiddenRef.current = true;
    setVisible(false);

    const paymentSection = findSection(scroller, [/paso\s*3/, /forma de pago/, /payment method/]);
    const confirmSection = findSection(scroller, [/paso\s*4/, /confirmar/, /confirm/]);
    const pendingPayment = isPaymentPending();

    if (pendingPayment && paymentSection) {
      const containerTop = scroller.getBoundingClientRect().top;
      const paymentTop = paymentSection.getBoundingClientRect().top;

      if (paymentTop > containerTop + 72) {
        scrollToElement(scroller, paymentSection, -28);
        return;
      }
    }

    if (confirmSection) {
      scrollToDynamicBottom(scroller);
    } else {
      scroller.scrollBy({ top: Math.round(scroller.clientHeight * 0.72), behavior: 'smooth' });
    }
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Bajar en el carrito"
      className="fixed right-6 bottom-[calc(env(safe-area-inset-bottom)+244px)] z-[9999] flex h-10 w-10 items-center justify-center bg-transparent p-0 active:scale-90 transition-transform animate-bounce"
    >
      <ChevronDown
        size={30}
        strokeWidth={4.2}
        className="text-orange-500 drop-shadow-[0_4px_8px_rgba(249,115,22,0.34)]"
      />
    </button>
  );
}
