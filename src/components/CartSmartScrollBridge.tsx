import { useEffect, useState } from 'react';
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

export default function CartSmartScrollBridge() {
  const [visible, setVisible] = useState(false);

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

    const update = () => {
      const scroller = isCartActive() ? findCartScroller() : null;
      activeScroller = scroller;

      if (!scroller) {
        setVisible(false);
        return;
      }

      const remaining = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
      setVisible(remaining > 52);
    };

    const attachScroll = () => {
      const scroller = isCartActive() ? findCartScroller() : null;
      if (scroller && scroller !== activeScroller) {
        activeScroller?.removeEventListener('scroll', update);
        activeScroller = scroller;
        activeScroller.addEventListener('scroll', update, { passive: true });
      }
      update();
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
    window.addEventListener('click', () => window.setTimeout(update, 80), true);

    const timers = [0, 180, 500, 900].map(delay => window.setTimeout(attachScroll, delay));

    return () => {
      timers.forEach(timer => window.clearTimeout(timer));
      observer.disconnect();
      activeScroller?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  const handleClick = () => {
    const scroller = findCartScroller();
    if (!scroller) return;

    const paymentSection = findSection(scroller, [/paso\s*3/, /forma de pago/, /payment method/]);
    const confirmSection = findSection(scroller, [/paso\s*4/, /confirmar/, /confirm/]);
    const pendingPayment = isPaymentPending();

    if (pendingPayment && paymentSection) {
      const containerTop = scroller.getBoundingClientRect().top;
      const paymentTop = paymentSection.getBoundingClientRect().top;

      if (paymentTop > containerTop + 72) {
        scrollToElement(scroller, paymentSection, 12);
        window.setTimeout(() => {
          const remaining = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
          setVisible(remaining > 52);
        }, 420);
        return;
      }
    }

    if (confirmSection) {
      scrollToDynamicBottom(scroller);
    } else {
      scroller.scrollBy({ top: Math.round(scroller.clientHeight * 0.72), behavior: 'smooth' });
    }

    window.setTimeout(() => {
      const remaining = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
      setVisible(remaining > 52);
    }, 420);
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Bajar en el carrito"
      className="fixed right-3 bottom-[calc(env(safe-area-inset-bottom)+132px)] z-[9999] h-12 w-9 flex items-center justify-center active:scale-95 transition-transform animate-bounce"
    >
      <span className="absolute right-0 top-1/2 h-10 w-7 -translate-y-1/2 rounded-l-full bg-orange-400/10 blur-md" />
      <ChevronDown
        size={26}
        strokeWidth={3.2}
        className="relative text-orange-500 drop-shadow-[0_2px_5px_rgba(249,115,22,0.45)]"
      />
    </button>
  );
}
