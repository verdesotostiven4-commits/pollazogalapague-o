import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Flame, Plus } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { getProductDisplay } from '../utils/productI18n';
import type { Product } from '../types';

const HOST_ID = 'pollazo-catalog-today-deals-host';

const normalize = (value: unknown) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

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

const isDealCandidate = (product: Product) => {
  if (product.available === false || product.is_variable) return false;

  const price = getPrice(product);
  if (price <= 0) return false;

  const haystack = normalize(`${product.name} ${product.category} ${product.subcategory || ''} ${product.badge || ''}`);

  return [
    'pollo',
    'pechuga',
    'cuarto',
    'alas',
    'agua',
    'cola',
    'leche',
    'arroz',
    'azucar',
    'atun',
    'salsa',
    'chifle',
  ].some(keyword => haystack.includes(keyword));
};

const findCatalogHost = () => {
  const existing = document.getElementById(HOST_ID);
  if (existing) return existing;

  const body = normalize(document.body.textContent);
  if (!body.includes('catalogo') && !body.includes('catálogo')) return null;

  const sectionTitle = Array.from(document.querySelectorAll<HTMLElement>('h3')).find(heading => {
    const text = normalize(heading.textContent);
    return text.includes('todos') || text.includes('pollos') || text.includes('abarrotes') || text.includes('bebidas') || text.includes('lacteos');
  });

  const sectionRow = sectionTitle?.closest('div');
  const container = sectionRow?.parentElement;
  if (!container) return null;

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.setAttribute('data-pollazo-today-deals', '1');
  sectionRow.insertAdjacentElement('afterend', host);
  return host;
};

export default function CatalogTodayDealsStrip() {
  const { products } = useAdmin();
  const { items, addItem } = useCart();
  const { language } = useLanguage();
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);

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

    const timers = [120, 400, 900, 1600].map(delay => window.setTimeout(syncHost, delay));

    return () => {
      observer.disconnect();
      timers.forEach(timer => window.clearTimeout(timer));
      document.getElementById(HOST_ID)?.remove();
    };
  }, []);

  const cartIds = useMemo(
    () => new Set(items.map(item => String(item.product.id || item.id))),
    [items]
  );

  const deals = useMemo(() => {
    const today = new Date().getDay();

    return products
      .filter(product => !cartIds.has(String(product.id)))
      .filter(isDealCandidate)
      .sort((a, b) => {
        const aScore = (normalize(a.name).length + today + String(a.id).length) % 9;
        const bScore = (normalize(b.name).length + today + String(b.id).length) % 9;
        if (aScore !== bScore) return bScore - aScore;
        return getPrice(a) - getPrice(b);
      })
      .slice(0, 6);
  }, [cartIds, products]);

  if (!host || deals.length < 3) return null;

  const title = language === 'en' ? 'Today’s picks' : 'Ofertas de hoy';
  const subtitle = language === 'en'
    ? 'Selected products to complete your order.'
    : 'Productos seleccionados para completar tu compra.';

  return createPortal(
    <section className="mb-4 rounded-[26px] border border-orange-100 bg-white px-3 py-3 shadow-sm animate-in fade-in duration-300">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-2xl bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center flex-shrink-0">
            <Flame size={16} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[13px] font-black text-slate-900 uppercase italic leading-tight">{title}</h3>
            <p className="text-[10px] font-bold text-slate-400 leading-snug truncate">{subtitle}</p>
          </div>
        </div>
        <span className="text-[9px] font-black text-orange-500 bg-orange-50 border border-orange-100 rounded-full px-2.5 py-1 whitespace-nowrap">
          Hoy
        </span>
      </div>

      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
        {deals.map(product => {
          const display = getProductDisplay(product, language);
          const price = getPrice(product);
          const added = addedId === product.id;

          return (
            <article key={product.id} className="w-[124px] flex-shrink-0 rounded-[20px] border border-slate-100 bg-slate-50/70 p-2">
              <div className="h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center overflow-hidden mb-2">
                <img src={product.image || '/logo-final.png'} alt={display.name} className="w-full h-full object-contain p-1.5" />
              </div>
              <p className="text-[10.5px] font-black text-slate-800 leading-tight line-clamp-2 min-h-[27px]">{display.name}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[11px] font-black text-orange-600">${price.toFixed(2)}</span>
                <button
                  type="button"
                  onClick={() => {
                    addItem(product);
                    setAddedId(product.id);
                    window.setTimeout(() => setAddedId(null), 800);
                  }}
                  className={`w-7 h-7 rounded-xl flex items-center justify-center text-white shadow-sm active:scale-90 transition-all ${
                    added ? 'bg-green-500' : 'bg-gradient-to-br from-orange-500 to-yellow-400'
                  }`}
                  aria-label={`Agregar ${display.name}`}
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
