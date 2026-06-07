import { useEffect } from 'react';

const STYLE_ID = 'pollazo-sales-marketing-bridge-style';
const CARD_MARK = 'data-pollazo-sales-card';
const PLUS_MARK = 'data-pollazo-plus-nudge';

const DAILY_BADGES = [
  'Selección de hoy',
  'Más pedido',
  'Compra inteligente',
  'Recomendado',
  'Ideal con Plus',
  'Favorito local',
  'Para completar tu pedido',
];

const hashText = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
};

const textOf = (element: Element | null) => String(element?.textContent || '').trim();

const isCatalogVisible = () => {
  const title = textOf(document.querySelector('h1, h2, [aria-label]')).toLowerCase();
  const bodyText = textOf(document.body).toLowerCase();
  return bodyText.includes('catálogo') || bodyText.includes('catalogo') || title.includes('catálogo') || title.includes('catalogo');
};

const chooseBadge = (cardText: string) => {
  const normalized = cardText.toLowerCase();

  if (normalized.includes('agotado') || normalized.includes('sin stock')) return '';
  if (normalized.includes('por valor') || normalized.includes('elige el valor')) return 'Por valor';
  if (normalized.includes('pollo') || normalized.includes('chorizo') || normalized.includes('leche')) return 'Más pedido';
  if (normalized.includes('azúcar') || normalized.includes('atun') || normalized.includes('atún')) return 'Compra inteligente';

  const day = new Date().getDay();
  const index = (hashText(normalized) + day) % DAILY_BADGES.length;
  return DAILY_BADGES[index];
};

const installStyles = () => {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .pollazo-sales-badge {
      position: absolute;
      left: 10px;
      top: 10px;
      z-index: 5;
      max-width: calc(100% - 20px);
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 8px;
      border-radius: 999px;
      border: 1px solid rgba(251, 191, 36, 0.45);
      background: rgba(255, 255, 255, 0.94);
      color: #ea580c;
      box-shadow: 0 10px 22px rgba(249, 115, 22, 0.12);
      font-size: 8px;
      line-height: 1;
      font-weight: 950;
      letter-spacing: 0.09em;
      text-transform: uppercase;
      pointer-events: none;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .pollazo-sales-badge::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 999px;
      background: linear-gradient(135deg, #f97316, #facc15);
      box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.12);
      flex: 0 0 auto;
    }

    .pollazo-sales-nudge {
      margin: 8px 0 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 10px;
      border-radius: 16px;
      border: 1px solid rgba(251, 191, 36, 0.30);
      background: linear-gradient(135deg, rgba(255, 247, 237, 0.98), rgba(254, 252, 232, 0.98));
      color: #9a3412;
      font-size: 9px;
      line-height: 1.25;
      font-weight: 900;
      letter-spacing: 0.02em;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
    }

    .pollazo-sales-nudge strong {
      color: #ea580c;
      font-weight: 950;
    }

    .pollazo-plus-cart-nudge {
      margin-top: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.74);
      border: 1px solid rgba(251, 191, 36, 0.35);
      box-shadow: 0 10px 28px rgba(249, 115, 22, 0.08);
      color: #9a3412;
      font-size: 10px;
      font-weight: 900;
      line-height: 1.35;
    }

    .pollazo-plus-cart-nudge span {
      width: 28px;
      height: 28px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      color: white;
      background: linear-gradient(135deg, #f97316, #facc15);
      box-shadow: 0 8px 18px rgba(249, 115, 22, 0.24);
    }
  `;

  document.head.appendChild(style);
};

const enhanceCatalogCards = () => {
  if (!isCatalogVisible()) return;

  const cards = Array.from(document.querySelectorAll<HTMLElement>('.group.relative.flex.flex-col'));

  cards.forEach(card => {
    const cardText = textOf(card);
    if (!cardText || card.getAttribute(CARD_MARK) === '1') return;

    const imageArea = card.querySelector<HTMLElement>('.relative.w-full');
    const contentArea = card.querySelector<HTMLElement>('.flex.flex-col.flex-1');
    if (!imageArea || !contentArea) return;

    const badge = chooseBadge(cardText);
    if (badge && !imageArea.querySelector('.pollazo-sales-badge')) {
      const badgeNode = document.createElement('div');
      badgeNode.className = 'pollazo-sales-badge';
      badgeNode.textContent = badge;
      imageArea.appendChild(badgeNode);
    }

    if (!cardText.toLowerCase().includes('agotado') && !contentArea.querySelector('.pollazo-sales-nudge')) {
      const nudge = document.createElement('div');
      nudge.className = 'pollazo-sales-nudge';
      nudge.innerHTML = '<strong>Tip:</strong> agrega algo más y aprovecha el mismo pedido.';
      const buttonArea = contentArea.lastElementChild;
      if (buttonArea) contentArea.insertBefore(nudge, buttonArea);
    }

    card.setAttribute(CARD_MARK, '1');
  });
};

const enhancePlusCartBanner = () => {
  const plusTitles = Array.from(document.querySelectorAll<HTMLElement>('h3, p')).filter(element => {
    const text = textOf(element).toLowerCase();
    return text.includes('delivery gratis aplicado') || text.includes('pollazo plus activo');
  });

  plusTitles.forEach(title => {
    const section = title.closest('section');
    if (!section || section.getAttribute(PLUS_MARK) === '1') return;

    const nudge = document.createElement('div');
    nudge.className = 'pollazo-plus-cart-nudge';
    nudge.innerHTML = '<span>+</span><div>Ya tienes envío gratis: aprovecha agregando básicos, bebidas o extras sin pagar otro delivery.</div>';
    section.appendChild(nudge);
    section.setAttribute(PLUS_MARK, '1');
  });
};

const runEnhancements = () => {
  installStyles();
  enhanceCatalogCards();
  enhancePlusCartBanner();
};

export default function SalesMarketingBridge() {
  useEffect(() => {
    runEnhancements();

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(runEnhancements);
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    const timers = [120, 350, 800, 1500].map(delay => window.setTimeout(runEnhancements, delay));

    return () => {
      observer.disconnect();
      timers.forEach(timer => window.clearTimeout(timer));
    };
  }, []);

  return null;
}
