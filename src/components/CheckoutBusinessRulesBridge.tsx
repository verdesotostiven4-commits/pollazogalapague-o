import { useEffect } from 'react';
import { fetchCustomerOrders } from '../utils/customerOrdersApi';

const CART_KEY = 'pollazo_cart_items';
const PHONE_KEY = 'pollazo_customer_phone';
const MEMBERSHIP_STATUS_KEY = 'pollazo_customer_membership_status';
const MEMBERSHIP_EXPIRES_KEY = 'pollazo_customer_membership_expires_at';
const FIRST_ORDER_USED_PREFIX = 'pollazo_first_order_used_';
const FIRST_DELIVERY_PROMO_KEY = 'pollazo_first_delivery_free_active';
const STYLE_ID = 'pollazo-checkout-business-rules-style';
const CARD_ID = 'pollazo-checkout-business-rules-card';
const STORE_WHATSAPP = '593989795628';

const MIN_DELIVERY_ORDER = 5;
const FIRST_DELIVERY_FREE_MIN = 10;
const PLUS_FREE_DELIVERY_MIN = 8;
const OPEN_MINUTES = 7 * 60;
const LAST_ORDER_MINUTES = 20 * 60 + 45;

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const cleanPhoneTail = (value?: string | null) => String(value || '').replace(/\D/g, '').slice(-9);

const safePrice = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Number(value.toFixed(2)));
  const parsed = Number.parseFloat(String(value || '').replace(',', '.').replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? Math.max(0, Number(parsed.toFixed(2))) : 0;
};

const money = (value: number) => `$${Math.max(0, value).toFixed(2)}`;

const isAcceptingOrdersNow = () => {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= OPEN_MINUTES && minutes <= LAST_ORDER_MINUTES;
};

const readCartSubtotal = () => {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return 0;

    const items = JSON.parse(raw);
    if (!Array.isArray(items)) return 0;

    const subtotal = items.reduce((sum, item) => {
      const product = item?.product || {};
      const unitPrice = safePrice(product.custom_price || item?.custom_price || item?.price || product.price);
      const quantity = Math.max(1, Math.floor(Number(item?.quantity || 1)));
      return sum + unitPrice * quantity;
    }, 0);

    return Number(subtotal.toFixed(2));
  } catch {
    return 0;
  }
};

const hasActivePlus = () => {
  const status = localStorage.getItem(MEMBERSHIP_STATUS_KEY);
  if (status !== 'active') return false;

  const expires = localStorage.getItem(MEMBERSHIP_EXPIRES_KEY);
  if (!expires) return true;

  const expiresAt = new Date(expires).getTime();
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
};

const installStyles = () => {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${CARD_ID} {
      border-radius: 28px;
      padding: 14px;
      border: 1px solid rgba(249, 115, 22, 0.16);
      background: linear-gradient(135deg, #fff7ed, #ffffff);
      box-shadow: 0 14px 34px rgba(249, 115, 22, 0.10);
      color: #0f172a;
    }
    #${CARD_ID}[data-tone="blocked"] {
      background: linear-gradient(135deg, #fff7ed, #fff1f2);
      border-color: rgba(244, 63, 94, 0.18);
    }
    #${CARD_ID}[data-tone="closed"] {
      background: linear-gradient(135deg, #fff7ed, #fffbeb);
      border-color: rgba(245, 158, 11, 0.24);
    }
    #${CARD_ID} .pollazo-rule-kicker {
      margin: 0 0 6px;
      color: #f97316;
      font-size: 9px;
      font-weight: 1000;
      letter-spacing: 0.22em;
      text-transform: uppercase;
    }
    #${CARD_ID} .pollazo-rule-title {
      margin: 0;
      font-size: 14px;
      line-height: 1.05;
      font-weight: 1000;
      text-transform: uppercase;
      font-style: italic;
    }
    #${CARD_ID} .pollazo-rule-text {
      margin: 7px 0 0;
      color: #64748b;
      font-size: 11px;
      line-height: 1.45;
      font-weight: 800;
    }
    #${CARD_ID} .pollazo-rule-button {
      margin-top: 10px;
      width: 100%;
      border: 0;
      border-radius: 18px;
      padding: 12px 14px;
      background: linear-gradient(135deg, #f97316, #facc15);
      color: white;
      font-size: 10px;
      font-weight: 1000;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      box-shadow: 0 12px 24px rgba(249, 115, 22, 0.22);
    }
    .pollazo-pacifico-only button:not([data-pollazo-allow-bank="1"]) {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
};

const findCartScroll = () => {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('div.overflow-y-auto'));
  return candidates.find(element => {
    const text = normalize(element.textContent || '');
    return text.includes('tus productos') || text.includes('your products') || text.includes('productos');
  }) || null;
};

const markPacificoOnly = () => {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'));
  buttons.forEach(button => {
    const text = normalize(button.textContent || '');
    if (text.includes('banco del pacifico') || text.includes('banco del pacífico')) {
      button.setAttribute('data-pollazo-allow-bank', '1');
      const parent = button.parentElement;
      if (parent) parent.classList.add('pollazo-pacifico-only');
    }
  });
};

const findExistingOrderFlag = (phoneTail: string) => {
  if (!phoneTail) return false;
  return localStorage.getItem(`${FIRST_ORDER_USED_PREFIX}${phoneTail}`) === '1';
};

const buildUrgentUrl = () => {
  const text = 'Hola, necesito hacer un pedido urgente fuera del horario normal. ¿Hay posibilidad de entrega?';
  return `https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(text)}`;
};

const state = {
  phoneTail: '',
  hasPreviousOrder: false,
  lastLookup: 0,
  blockedMessage: '',
  closed: false,
};

const refreshPreviousOrders = async () => {
  const phoneTail = cleanPhoneTail(localStorage.getItem(PHONE_KEY));
  state.phoneTail = phoneTail;

  if (!phoneTail || findExistingOrderFlag(phoneTail)) {
    state.hasPreviousOrder = Boolean(phoneTail && findExistingOrderFlag(phoneTail));
    return;
  }

  if (Date.now() - state.lastLookup < 12000) return;
  state.lastLookup = Date.now();

  try {
    const orders = await fetchCustomerOrders();
    const hasOrder = orders.some(order => {
      const status = String(order.status || '').toLowerCase();
      return status !== 'cancelado' && status !== 'cancelled';
    });

    state.hasPreviousOrder = hasOrder;
    if (hasOrder) localStorage.setItem(`${FIRST_ORDER_USED_PREFIX}${phoneTail}`, '1');
  } catch {
    // Si falla la consulta protegida, el servidor validará la promoción al confirmar.
  }
};

const evaluateRules = () => {
  const subtotal = readCartSubtotal();
  const plus = hasActivePlus();
  const isFirstOrder = Boolean(state.phoneTail && !state.hasPreviousOrder);
  const open = isAcceptingOrdersNow();
  const firstFree = open && isFirstOrder && subtotal >= FIRST_DELIVERY_FREE_MIN;

  if (firstFree) {
    localStorage.setItem(FIRST_DELIVERY_PROMO_KEY, '1');
  } else {
    localStorage.removeItem(FIRST_DELIVERY_PROMO_KEY);
  }

  let tone: 'ok' | 'blocked' | 'closed' = 'ok';
  let kicker = 'Pollazo delivery';
  let title = 'Pedido listo para continuar';
  let text = 'Revisa tu dirección y forma de pago antes de confirmar.';
  let block = false;

  if (subtotal <= 0) {
    state.blockedMessage = '';
    state.closed = false;
    return { show: false, block: false, tone, kicker, title, text, urgent: false };
  }

  if (!open) {
    tone = 'closed';
    kicker = 'Horario de pedidos';
    title = 'Estamos fuera del horario normal';
    text = 'Puedes ver el catálogo, pero los pedidos automáticos se reciben de 7:00 AM a 8:45 PM. Si es urgente, contáctanos por WhatsApp.';
    block = true;
  } else if (plus && subtotal < PLUS_FREE_DELIVERY_MIN) {
    tone = 'blocked';
    kicker = 'Pollazo Plus';
    title = `Agrega ${money(PLUS_FREE_DELIVERY_MIN - subtotal)} más`;
    text = 'Tu Plus está activo. Para activar la entrega gratis en este pedido, agrega un poco más al carrito.';
    block = true;
  } else if (!plus && subtotal < MIN_DELIVERY_ORDER) {
    tone = 'blocked';
    kicker = 'Pedido mínimo';
    title = `Agrega ${money(MIN_DELIVERY_ORDER - subtotal)} más`;
    text = 'Para enviar a domicilio necesitamos que el pedido tenga un mínimo de productos.';
    block = true;
  } else if (firstFree) {
    kicker = 'Regalo de bienvenida';
    title = 'Tu primer delivery va gratis';
    text = 'Promoción aplicada dentro de cobertura. Gracias por probar la app de La Casa del Pollazo.';
  } else if (plus) {
    kicker = 'Pollazo Plus activo';
    title = 'Delivery gratis aplicado';
    text = 'Tu membresía está lista para este pedido dentro de cobertura.';
  }

  state.blockedMessage = block ? text : '';
  state.closed = !open;
  return { show: true, block, tone, kicker, title, text, urgent: !open };
};

const renderCard = () => {
  const scroll = findCartScroll();
  if (!scroll) return;

  const rules = evaluateRules();
  let card = document.getElementById(CARD_ID) as HTMLElement | null;

  if (!rules.show) {
    card?.remove();
    return;
  }

  if (!card) {
    card = document.createElement('section');
    card.id = CARD_ID;
    scroll.insertBefore(card, scroll.firstElementChild || null);
  }

  card.dataset.tone = rules.tone;
  card.innerHTML = `
    <p class="pollazo-rule-kicker">${rules.kicker}</p>
    <h3 class="pollazo-rule-title">${rules.title}</h3>
    <p class="pollazo-rule-text">${rules.text}</p>
    ${rules.urgent ? '<button type="button" class="pollazo-rule-button" data-pollazo-urgent-order="1">Solicitar por WhatsApp</button>' : ''}
  `;

  const urgentButton = card.querySelector<HTMLButtonElement>('[data-pollazo-urgent-order="1"]');
  if (urgentButton) urgentButton.onclick = () => { window.location.href = buildUrgentUrl(); };
};

const isCheckoutAction = (button: HTMLButtonElement) => {
  const text = normalize(button.textContent || '');
  return [
    'confirmar pedido',
    'continuar a pago',
    'ya pague',
    'ya pagué',
    'enviar a revision',
    'enviar a revisión',
    'confirm order',
    'continue to payment',
    'i paid',
  ].some(phrase => text.includes(phrase));
};

const interceptCheckout = (event: Event) => {
  const button = (event.target as HTMLElement | null)?.closest('button') as HTMLButtonElement | null;
  if (!button || !isCheckoutAction(button)) return;

  const rules = evaluateRules();
  if (rules.block) {
    event.preventDefault();
    event.stopPropagation();
    window.alert(rules.urgent ? 'Estamos fuera del horario normal. Usa WhatsApp si es urgente.' : state.blockedMessage || 'Revisa las condiciones del pedido.');
    renderCard();
    return;
  }

  const text = normalize(button.textContent || '');
  const likelyCashConfirm = text.includes('confirmar pedido') || text.includes('confirm order');
  const confirmationKey = 'pollazo_cash_confirmed_recent';

  if (likelyCashConfirm && sessionStorage.getItem(confirmationKey) !== '1') {
    const ok = window.confirm('¿Confirmas el pedido en efectivo? Pagarás al recibir. Evita pedidos por error o pedidos falsos.');
    if (!ok) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    sessionStorage.setItem(confirmationKey, '1');
    window.setTimeout(() => sessionStorage.removeItem(confirmationKey), 25000);
  }
};

export default function CheckoutBusinessRulesBridge() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    installStyles();

    let frame = 0;
    const run = () => {
      frame = 0;
      void refreshPreviousOrders().finally(() => {
        markPacificoOnly();
        renderCard();
      });
    };

    const schedule = () => {
      if (frame) return;
      frame = window.setTimeout(run, 160);
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'style'] });

    schedule();
    window.addEventListener('click', interceptCheckout, true);
    window.addEventListener('input', schedule, true);
    window.addEventListener('storage', schedule);
    window.addEventListener('popstate', schedule);

    return () => {
      if (frame) window.clearTimeout(frame);
      observer.disconnect();
      window.removeEventListener('click', interceptCheckout, true);
      window.removeEventListener('input', schedule, true);
      window.removeEventListener('storage', schedule);
      window.removeEventListener('popstate', schedule);
    };
  }, []);

  return null;
}
