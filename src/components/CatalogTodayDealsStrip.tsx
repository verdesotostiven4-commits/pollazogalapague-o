import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Flame, Plus, Sparkles } from 'lucide-react';
import { products as seedProducts } from '../data/products';
import {
  DEFAULT_PROMOTIONS,
  buildPromotionViews,
  type ProductPromotionView,
} from '../utils/promoEngine';
import type { CartItem, Product } from '../types';

const HOST_ID = 'pollazo-catalog-today-deals-host';
const STORAGE_KEY = 'pollazo_cart_items';
const ADD_EVENT = 'pollazo:add-cart-product';

const normalize = (value: unknown) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const toMoney = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? Number(value.toFixed(2)) : 0;

  const parsed = Number.parseFloat(
    String(value || '')
      .replace(',', '.')
      .replace(/[^0-9.]/g, '')
  );

  return Number.isFinite(parsed) && parsed > 0 ? Number(parsed.toFixed(2)) : 0;
};

const getPrice = (product: Product) => {
  if (typeof product.custom_price === 'number' && product.custom_price > 0) return Number(product.custom_price.toFixed(2));
  return toMoney(product.price);
};

const readCartItems = (): CartItem[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const visibleText = (element: Element | null) => normalize((element as HTMLElement | null)?.innerText || element?.textContent || '');

const isCatalogScreenActive = () => {
  if (typeof document === 'undefined') return false;

  const nav = document.querySelector('nav[aria-label="Navegación principal"]');
  const activeNavText = visibleText(nav?.querySelector('[aria-current="page"]') || null);
  const headerText = visibleText(document.querySelector('header'));
  const bodyText = visibleText(document.body);

  if (activeNavText.includes('info') || headerText.includes('informacion') || bodyText.includes('contacto directo')) return false;
  if (activeNavText.includes('carrito') || headerText.includes('carrito') || bodyText.includes('tus productos')) return false;
  if (activeNavText.includes('pedido') || headerText.includes('pedidos')) return false;
  if (activeNavText.includes('inicio') || headerText.includes('la casa del pollazo')) return false;

  return activeNavText.includes('catalogo') || headerText.includes('catalogo');
};

const isRecommendationCandidate = (product: Product) => {
  if (product.available === false || product.is_variable) return false;

  const price = getPrice(product);
  if (price <= 0) return false;

  const haystack = normalize(`${product.name} ${product.category} ${product.subcategory || ''} ${product.badge || ''}`);

  return [
    'agua',
    'cola',
    'sprite',
    'fanta',
    'bebida',
    'gaseosa',
    'jugo',
    'leche',
    'arroz',
    'azucar',
    'atun',
    'salsa',
    'aji',
    'chifle',
    'galleta',
    'servilleta',
    'yogurt',
  ].some(keyword => haystack.includes(keyword));
};

const findCatalogHost = () => {
  if (!isCatalogScreenActive()) {
    document.getElementById(HOST_ID)?.remove();
    return null;
  }

  const existing = document.getElementById(HOST_ID);
  if (existing) return existing;

  const sectionTitle = Array.from(document.querySelectorAll<HTMLElement>('h2, h3, p')).find(heading => {
    const text = normalize(heading.textContent);
    return (
      text.includes('todos') ||
      text.includes('pollos') ||
      text.includes('abarrotes') ||
      text.includes('bebidas') ||
      text.includes('lacteos') ||
      text.includes('lácteos')
    );
  });

  const sectionRow = sectionTitle?.closest('div');
  const container = sectionRow?.parentElement;
  if (!sectionRow || !container) return null;

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.setAttribute('data-pollazo-today-deals', '1');
  sectionRow.insertAdjacentElement('afterend', host);
  return host;
};

export default function CatalogTodayDealsStrip() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [cartVersion, setCartVersion] = useState(0);

  useEffect(() => {
    const syncHost = () => setHost(findCatalogHost());

    syncHost();

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(syncHost);
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-current', 'class'],
    });

    const interval = window.setInterval(() => {
      setCartVersion(version => version + 1);
      syncHost();
    }, 1300);

    const timers = [120, 400, 900, 1600].map(delay => window.setTimeout(syncHost, delay));

    window.addEventListener('click', syncHost, true);
    window.addEventListener('popstate', syncHost);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
      timers.forEach(timer => window.clearTimeout(timer));
      window.removeEventListener('click', syncHost, true);
      window.removeEventListener('popstate', syncHost);
      document.getElementById(HOST_ID)?.remove();
    };
  }, []);

  const cartItems = useMemo(() => readCartItems(), [cartVersion, addedId]);

  const cartIds = useMemo(
    () => new Set(cartItems.map(item => String(item.product?.id || item.id).split('-')[0])),
    [cartItems]
  );

  const cartNames = useMemo(
    () => new Set(cartItems.map(item => normalize(item.product?.name || item.name)).filter(Boolean)),
    [cartItems]
  );

  const promotionViews = useMemo(() => {
    return buildPromotionViews(seedProducts, DEFAULT_PROMOTIONS, {
      includePlusOnly: true,
      applyPromoPrices: false,
      maxItems: 6,
    }).filter(view => !cartIds.has(String(view.product.id)) && !cartNames.has(normalize(view.product.name)));
  }, [cartIds, cartNames]);

  const recommendations = useMemo(() => {
    const today = new Date().getDay();

    return seedProducts
      .filter(product => !cartIds.has(String(product.id)))
      .filter(product => !cartNames.has(normalize(product.name)))
      .filter(isRecommendationCandidate)
      .sort((a, b) => {
        const aName = normalize(a.name);
        const bName = normalize(b.name);
        const aDrink = Number(aName.includes('agua') || aName.includes('cola') || aName.includes('sprite') || aName.includes('bebida'));
        const bDrink = Number(bName.includes('agua') || bName.includes('cola') || bName.includes('sprite') || bName.includes('bebida'));
        if (aDrink !== bDrink) return bDrink - aDrink;

        const aScore = (aName.length + today + String(a.id).length) % 9;
        const bScore = (bName.length + today + String(b.id).length) % 9;
        if (aScore !== bScore) return bScore - aScore;

        return getPrice(a) - getPrice(b);
      })
      .slice(0, 6);
  }, [cartIds, cartNames]);

  const hasRealPromotions = promotionViews.length > 0;
  const cards: Array<Product | ProductPromotionView> = hasRealPromotions ? promotionViews : recommendations;

  if (!host || cards.length < 3) return null;

  const bodyText = normalize(document.body.textContent);
  if (!isCatalogScreenActive() || bodyText.includes('pedido registrado') || bodyText.includes('carrito bloqueado')) return null;

  const title = hasRealPromotions ? 'Ofertas de hoy' : 'Para completar tu pedido';
  const subtitle = hasRealPromotions
    ? 'Promos activas por tiempo limitado.'
    : 'Extras útiles y rápidos para sumar a tu compra.';

  const Icon = hasRealPromotions ? Flame : Sparkles;

  return createPortal(
    <section className="mb-4 rounded-[26px] border border-orange-100 bg-white px-3 py-3 shadow-sm animate-in fade-in duration-300 overflow-hidden">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-2xl bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center flex-shrink-0">
            <Icon size={16} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[13px] font-black text-slate-900 uppercase italic leading-tight">{title}</h3>
            <p className="text-[10px] font-bold text-slate-400 leading-snug truncate">{subtitle}</p>
          </div>
        </div>
        {hasRealPromotions && (
          <span className="text-[9px] font-black text-orange-500 bg-orange-50 border border-orange-100 rounded-full px-2.5 py-1 whitespace-nowrap">
            Hoy
          </span>
        )}
      </div>

      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1 -mx-1 pl-1 pr-7 snap-x snap-mandatory">
        {cards.map(card => {
          const promotionView = 'promotion' in card ? card : null;
          const product = promotionView ? promotionView.product : card;
          const price = getPrice(product);
          const added = addedId === product.id;

          return (
            <article key={product.id} className="w-[116px] flex-shrink-0 snap-start rounded-[20px] border border-slate-100 bg-slate-50/70 p-2">
              <div className="h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center overflow-hidden mb-2">
                <img src={product.image || '/logo-final.png'} alt={product.name} className="w-full h-full object-contain p-1.5" />
              </div>
              <p className="text-[10px] font-black text-slate-800 leading-tight line-clamp-2 min-h-[26px]">{product.name}</p>
              {promotionView && (
                <p className="mt-1 text-[8px] font-black uppercase tracking-wide text-orange-500 truncate">
                  {promotionView.promotion.label}
                </p>
              )}
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[11px] font-black text-orange-600">${price.toFixed(2)}</span>
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent(ADD_EVENT, { detail: { product, quantity: 1 } }));
                    setAddedId(product.id);
                    setCartVersion(version => version + 1);
                    window.setTimeout(() => setAddedId(null), 800);
                  }}
                  className={`w-7 h-7 rounded-xl flex items-center justify-center text-white shadow-sm active:scale-90 transition-all ${
                    added ? 'bg-green-500' : 'bg-gradient-to-br from-orange-500 to-yellow-400'
                  }`}
                  aria-label={`Agregar ${product.name}`}
                >
                  <Plus size={14} strokeWidth={3} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>,
    host
  );
}
