import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Sparkles } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { getProductDisplay } from '../utils/productI18n';
import type { Product } from '../types';

const HOST_ID = 'pollazo-cart-complete-order-host';

const toMoney = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? Number(value.toFixed(2)) : 0;

  const parsed = Number.parseFloat(
    String(value || '')
      .replace(',', '.')
      .replace(/[^0-9.]/g, '')
  );

  return Number.isFinite(parsed) && parsed > 0 ? Number(parsed.toFixed(2)) : 0;
};

const normalized = (value: unknown) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const productPrice = (product: Product) => {
  if (typeof product.custom_price === 'number' && product.custom_price > 0) return Number(product.custom_price.toFixed(2));
  return toMoney(product.price);
};

const isGoodSuggestion = (product: Product) => {
  if (product.available === false || product.is_variable) return false;

  const price = productPrice(product);
  if (price <= 0) return false;

  const haystack = normalized(`${product.name} ${product.category} ${product.subcategory || ''}`);

  return [
    'agua',
    'cola',
    'sprite',
    'fanta',
    'bebida',
    'gaseosa',
    'jugo',
    'salsa',
    'aji',
    'mayonesa',
    'mostaza',
    'arroz',
    'azucar',
    'leche',
    'galleta',
    'chifle',
    'servilleta',
  ].some(keyword => haystack.includes(keyword));
};

const findHost = () => {
  const existing = document.getElementById(HOST_ID);
  if (existing) return existing;

  const headings = Array.from(document.querySelectorAll<HTMLElement>('h3, p')).filter(element => {
    const text = normalized(element.textContent);
    return text.includes('tus productos') || text.includes('your products') || text.includes('商品');
  });

  const productSection = headings
    .map(heading => heading.closest('section'))
    .find(Boolean) as HTMLElement | null;

  if (!productSection || !productSection.parentElement) return null;

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.setAttribute('data-pollazo-cart-suggestions', '1');
  productSection.insertAdjacentElement('afterend', host);
  return host;
};

export default function CartCompleteOrderSuggestions() {
  const { products } = useAdmin();
  const { items, addItem } = useCart();
  const { language } = useLanguage();
  const { hasPollazoPlus } = useUser();
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  useEffect(() => {
    const syncHost = () => setHost(findHost());

    syncHost();

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(syncHost);
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    const timers = [120, 400, 900, 1600].map(delay => window.setTimeout(syncHost, delay));

    return () => {
      observer.disconnect();
      timers.forEach(timer => window.clearTimeout(timer));
      document.getElementById(HOST_ID)?.remove();
    };
  }, []);

  const cartIds = useMemo(
    () => new Set(items.map(item => String(item.product.id || item.id).split('-')[0])),
    [items]
  );

  const suggestions = useMemo(() => {
    return products
      .filter(product => !cartIds.has(String(product.id)))
      .filter(isGoodSuggestion)
      .sort((a, b) => {
        const aName = normalized(a.name);
        const bName = normalized(b.name);
        const aDrink = Number(aName.includes('agua') || aName.includes('cola') || aName.includes('sprite') || aName.includes('bebida'));
        const bDrink = Number(bName.includes('agua') || bName.includes('cola') || bName.includes('sprite') || bName.includes('bebida'));
        if (aDrink !== bDrink) return bDrink - aDrink;
        return productPrice(a) - productPrice(b);
      })
      .slice(0, 8);
  }, [cartIds, products]);

  if (!host || suggestions.length === 0 || items.length === 0) return null;

  const bodyText = normalized(document.body.textContent);
  if (bodyText.includes('carrito bloqueado') || bodyText.includes('pedido registrado')) return null;

  const title = language === 'en' ? 'Complete your order' : 'Completa tu pedido';
  const subtitle = hasPollazoPlus
    ? language === 'en'
      ? 'You already have free delivery. Add an extra without paying another delivery.'
      : 'Ya tienes envío gratis. Agrega un extra sin pagar otro delivery.'
    : language === 'en'
      ? 'Quick extras customers usually add before confirming.'
      : 'Extras rápidos que suelen acompañar tu compra.';

  return createPortal(
    <section className="bg-white rounded-[28px] border border-orange-100/70 p-3.5 shadow-sm space-y-3 animate-in fade-in duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center flex-shrink-0 border border-orange-100">
            <Sparkles size={17} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[13px] font-black text-slate-900 uppercase italic leading-tight">{title}</h3>
            <p className="text-[10px] font-bold text-slate-400 leading-snug mt-0.5">{subtitle}</p>
          </div>
        </div>
        <span className="text-[9px] font-black text-orange-500 bg-orange-50 border border-orange-100 rounded-full px-2.5 py-1 whitespace-nowrap">
          + fácil
        </span>
      </div>

      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
        {suggestions.map(product => {
          const display = getProductDisplay(product, language);
          const price = productPrice(product);
          const added = justAddedId === product.id;

          return (
            <article
              key={product.id}
              className="w-[132px] flex-shrink-0 rounded-[22px] border border-slate-100 bg-slate-50/60 p-2.5"
            >
              <div className="h-16 rounded-2xl bg-white border border-slate-100 flex items-center justify-center mb-2 overflow-hidden">
                <img src={product.image || '/logo-final.png'} alt={display.name} className="w-full h-full object-contain p-1.5" />
              </div>
              <p className="text-[11px] font-black text-slate-800 leading-tight line-clamp-2 min-h-[28px]">{display.name}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[12px] font-black text-orange-600">${price.toFixed(2)}</span>
                <button
                  type="button"
                  onClick={() => {
                    addItem(product);
                    setJustAddedId(product.id);
                    window.setTimeout(() => setJustAddedId(null), 900);
                  }}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm active:scale-90 transition-all ${
                    added ? 'bg-green-500' : 'bg-gradient-to-br from-orange-500 to-yellow-400'
                  }`}
                  aria-label={`Agregar ${display.name}`}
                >
                  <Plus size={15} strokeWidth={3} />
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
