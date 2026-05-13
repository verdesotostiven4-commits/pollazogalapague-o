import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Search, X, MapPin, ArrowUpDown, Check, ShoppingBag, ChevronRight, AlertCircle } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useCart } from '../context/CartContext';
import ProductCard from './ProductCard';
import AnnouncementBanner from './AnnouncementBanner';
import { Category, Product } from '../types';

const CATEGORY_ICONS: Record<string, string> = {
  'Pollos': '🍗', 'Embutidos': '🥓', 'Lácteos y refrigerados': '🥛',
  'Abarrotes y básicos': '🌾', 'Salsas, aliños y aceites': '🫙', 'Bebidas': '🥤',
  'Frutas y verduras': '🥦', 'Snacks y dulces': '🍫', 'Cuidado personal': '🧴', 'Limpieza y hogar': '🧹',
};

const SHORT_LABELS: Record<string, string> = {
  'Pollos': 'Pollos', 'Embutidos': 'Embutidos', 'Lácteos y refrigerados': 'Lácteos',
  'Abarrotes y básicos': 'Abarrotes', 'Salsas, aliños y aceites': 'Salsas', 'Bebidas': 'Bebidas',
  'Frutas y verduras': 'Frutas', 'Snacks y dulces': 'Snacks', 'Cuidado personal': 'Personal', 'Limpieza y hogar': 'Limpieza',
};

const ORDERED_CATEGORIES: string[] = [
  'Todos', 'Pollos', 'Embutidos', 'Lácteos y refrigerados', 'Abarrotes y básicos',
  'Bebidas', 'Salsas, aliños y aceites', 'Frutas y verduras', 'Snacks y dulces',
  'Cuidado personal', 'Limpieza y hogar'
];

const BESTSELLER_IDS = ['pollo-entero', 'pechuga', 'cuartos', 'agua-vivant-625ml', 'colgate-triple-75ml', 'leche-tru-1l'];

const normalizeText = (text: string) => 
  text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const getSubcategory = (p: Product): string => {
  if (p.subcategory) return p.subcategory;
  const name = p.name.toLowerCase();
  
  if (p.category === 'Pollos') {
    if (name.includes('entero')) return 'Pollo Entero';
    if (name.includes('menudencia')) return 'Menudencia';
    return 'Presas Especiales';
  }
  if (p.category === 'Lácteos y refrigerados') {
    if (name.includes('leche')) return 'Leches';
    if (name.includes('yogurt')) return 'Yogures';
    if (name.includes('galamix') || name.includes('avena')) return 'Bebidas Lácteas';
    if (name.includes('queso')) return 'Quesos';
    if (name.includes('mantequilla') || name.includes('vaquita')) return 'Mantequillas';
    return 'Refrigerados';
  }
  if (p.category === 'Abarrotes y básicos') {
    if (name.includes('arroz')) return 'Arroz';
    if (name.includes('fideo') || name.includes('tallarín') || name.includes('rapidito')) return 'Pastas y Sopas';
    if (name.includes('atún') || name.includes('sardina')) return 'Enlatados del Mar';
    if (name.includes('harina') || name.includes('maizabrosa')) return 'Harinas';
    if (name.includes('lenteja') || name.includes('garbanzo') || name.includes('alverja')) return 'Granos y Menestras';
    if (name.includes('azúcar') || name.includes('azucar') || name.includes('panela')) return 'Endulzantes';
    if (name.includes('maíz') || name.includes('champiñon')) return 'Conservas';
    if (name.includes('cafe') || name.includes('café') || name.includes('cocoa') || name.includes('ricacao')) return 'Café y Modificadores';
    return 'Básicos de Despensa';
  }
  if (p.category === 'Salsas, aliños y aceites') {
    if (name.includes('aceite')) return 'Aceites';
    if (name.includes('achiote')) return 'Achiotes';
    if (name.includes('salsa') || name.includes('soya') || name.includes('ají') || name.includes('mayonesa') || name.includes('mostaza') || name.includes('bbq')) return 'Salsas y Aderezos';
    if (name.includes('maggi') || name.includes('sazón') || name.includes('ranchero') || name.includes('caldo')) return 'Sazonadores';
    return 'Vinagres y Esencias';
  }
  if (p.category === 'Bebidas') {
    if (name.includes('agua') || name.includes('guitig')) return 'Aguas Minerales';
    if (name.includes('cerveza') || name.includes('caña')) return 'Licores';
    if (name.includes('powerade') || name.includes('ego')) return 'Energizantes e Hidratantes';
    if (name.includes('cola') || name.includes('sprite') || name.includes('fanta') || name.includes('inca')) return 'Gaseosas';
    return 'Jugos y Refrescos';
  }
  if (p.category === 'Frutas y verduras') {
    if (name.includes('manzana') || name.includes('naranja') || name.includes('guineo') || name.includes('naranjilla')) return 'Frutas Frescas';
    if (name.includes('papa') || name.includes('cebolla') || name.includes('ajo') || name.includes('pimiento') || name.includes('tomate')) return 'Vegetales y Hortalizas';
    return 'Hojas y Hierbas';
  }
  if (p.category === 'Snacks y dulces') {
    if (name.includes('galleta') || name.includes('oreo')) return 'Galletas';
    if (name.includes('chifle') || name.includes('pipas')) return 'Snacks Salados';
    if (name.includes('chocolate') || name.includes('nutella')) return 'Chocolates';
    return 'Golosinas y Postres';
  }
  if (p.category === 'Cuidado personal') {
    if (name.includes('toalla')) return 'Cuidado Femenino';
    if (name.includes('colgate') || name.includes('pasta')) return 'Cuidado Bucal';
    if (name.includes('head') || name.includes('shampoo')) return 'Cuidado Capilar';
    return 'Higiene Personal';
  }
  if (p.category === 'Limpieza y hogar') {
    if (name.includes('detergente') || name.includes('deja') || name.includes('suavitel')) return 'Cuidado de Ropa';
    if (name.includes('cloro') || name.includes('fabuloso') || name.includes('clorox')) return 'Limpieza de Superficies';
    if (name.includes('papel') || name.includes('servilletas')) return 'Papelería';
    return 'Artículos del Hogar';
  }
  return 'General';
};

type ActiveCat = 'Todos' | Category;
type SortOption = 'sugeridos' | 'precio-bajo' | 'precio-alto' | 'mas-pedidos';

interface Props {
  initialCategory?: ActiveCat;
  onCategoryChange?: (cat: ActiveCat) => void;
  onNavigate?: (screen: 'home' | 'catalog' | 'cart' | 'info' | 'ranking') => void;
}

export default function CatalogScreen({ initialCategory = 'Todos', onCategoryChange, onNavigate }: Props) {
  const { products, categories } = useAdmin();
  const { total, items, setIsOpen } = useCart();
  
  const ALL_CATS = ORDERED_CATEGORIES.filter(c => c === 'Todos' || categories.includes(c as Category)) as ('Todos' | Category)[];
  
  const [activeCategory, setActiveCategory] = useState<ActiveCat>(initialCategory);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('sugeridos');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [search, setSearch] = useState('');
  
  const tabBarRef = useRef<HTMLDivElement>(null);
  const subBarRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const cartAnalytics = useMemo(() => {
    let money = 0;
    let hasVariablePrices = false;
    items.forEach(item => {
      const p = products.find(prod => prod.id === item.product.id) || item.product;
      const priceStr = p.price || '';
      if (priceStr.toLowerCase().includes('consultar')) {
        hasVariablePrices = true;
      } else {
        const numMatch = priceStr.match(/[\d.]+/);
        money += (numMatch ? parseFloat(numMatch[0]) : 0) * item.quantity;
      }
    });
    return { totalMoney: money, hasVariablePrices };
  }, [items, products]);

  const subcategories = useMemo(() => {
    if (activeCategory === 'Todos') return [];
    return Array.from(new Set(products.filter(p => p.category === activeCategory).map(p => getSubcategory(p))));
  }, [activeCategory, products]);

  // 🚀 RESET DE SCROLL AL CAMBIAR SECCIÓN
  useEffect(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeCategory, activeSubcategory]);

  // 🔥 AUTO-SELECCIÓN DE SUB
  useEffect(() => {
    if (activeCategory !== 'Todos' && subcategories.length > 0 && !activeSubcategory) {
      setActiveSubcategory(subcategories[0]);
    }
  }, [activeCategory, subcategories, activeSubcategory]);

  const syncPillsScroll = (ref: React.RefObject<HTMLDivElement>, index: number) => {
    if (ref.current) {
      const btn = ref.current.querySelectorAll('button')[index];
      if (btn) {
        ref.current.scrollTo({
          left: (btn as HTMLElement).offsetLeft + (btn as HTMLElement).offsetWidth / 2 - ref.current.clientWidth / 2,
          behavior: 'smooth'
        });
      }
    }
  };

  useEffect(() => {
    syncPillsScroll(tabBarRef, ALL_CATS.indexOf(activeCategory));
  }, [activeCategory]);

  useEffect(() => {
    if (activeSubcategory) syncPillsScroll(subBarRef, subcategories.indexOf(activeSubcategory));
  }, [activeSubcategory, subcategories]);

  const changeCategory = (next: 'Todos' | Category) => {
    if (next === activeCategory) return;
    setActiveSubcategory(null);
    setActiveCategory(next);
    onCategoryChange?.(next);
  };

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const query = normalizeText(search);
    return products.filter(p => normalizeText(p.name).includes(query)).slice(0, 15);
  }, [search, products]);

  const filtered = useMemo(() => {
    let base = activeCategory === 'Todos' ? products : products.filter(p => p.category === activeCategory);
    if (activeSubcategory) base = base.filter(p => getSubcategory(p) === activeSubcategory);
    return base;
  }, [activeCategory, activeSubcategory, products]);

  const displayedProducts = [...filtered].sort((a, b) => {
    if (sortBy === 'mas-pedidos') return (BESTSELLER_IDS.includes(b.id) ? 1 : 0) - (BESTSELLER_IDS.includes(a.id) ? 1 : 0);
    if (sortBy === 'precio-bajo' || sortBy === 'precio-alto') {
      const pA = parseFloat(a.price.replace(/[^0-9.]/g, '') || '0');
      const pB = parseFloat(b.price.replace(/[^0-9.]/g, '') || '0');
      return sortBy === 'precio-bajo' ? pA - pB : pB - pA;
    }
    return activeCategory === 'Todos' ? ORDERED_CATEGORIES.indexOf(a.category) - ORDERED_CATEGORIES.indexOf(b.category) : 0;
  });

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      const catIdx = ALL_CATS.indexOf(activeCategory);
      if (activeCategory === 'Todos') {
        if (dx < 0 && catIdx < ALL_CATS.length - 1) changeCategory(ALL_CATS[catIdx + 1]);
        if (dx > 0 && catIdx > 0) changeCategory(ALL_CATS[catIdx - 1]);
      } else {
        const subIdx = subcategories.indexOf(activeSubcategory || '');
        if (dx < 0) {
          if (subIdx < subcategories.length - 1) setActiveSubcategory(subcategories[subIdx + 1]);
          else if (catIdx < ALL_CATS.length - 1) changeCategory(ALL_CATS[catIdx + 1]);
        } else {
          if (subIdx > 0) setActiveSubcategory(subcategories[subIdx - 1]);
          else if (catIdx > 0) changeCategory(ALL_CATS[catIdx - 1]);
        }
      }
    }
    touchStartX.current = null; touchStartY.current = null;
  };

  const openCart = () => {
    if (onNavigate) onNavigate('cart');
    else if (setIsOpen) setIsOpen(true);
  };

  return (
    <div className="flex flex-col bg-gray-50 min-h-full pb-32 relative">
      <AnnouncementBanner />
      
      <div className="sticky top-0 z-[120] bg-white shadow-sm border-b border-gray-100">
        {/* BUSCADOR CON FONDO SÓLIDO PARA ELIMINAR BUG "R" */}
        <div className="px-4 pt-3 pb-2 flex items-center gap-2 relative z-[160] bg-white">
          <div className="relative flex-1 group">
            <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${search ? 'text-orange-500' : 'text-gray-400'}`} />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="¿Qué buscas hoy?"
              className="w-full bg-gray-100 rounded-[20px] pl-9 pr-9 py-2.5 text-sm text-gray-800 outline-none focus:bg-white focus:ring-2 focus:ring-orange-200 transition-all font-medium"
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X size={14} /></button>}
          </div>
          <button onClick={() => setShowSortMenu(!showSortMenu)} className={`p-2.5 rounded-[20px] border transition-all ${showSortMenu ? 'bg-orange-50 text-orange-600 border-orange-200 shadow-inner' : 'bg-white border-gray-200 text-gray-600'}`}><ArrowUpDown size={18} /></button>
        </div>

        {/* 🚀 OVERLAY DE RESULTADOS FULL WIDTH (CORREGIDO PARA NO TAPAR EL INPUT) */}
        {search.length > 0 && (
          <div className="fixed left-0 right-0 top-[60px] bottom-0 bg-white z-[150] overflow-y-auto animate-in fade-in">
            <div className="p-3 bg-orange-50 text-[10px] font-black uppercase tracking-widest text-orange-600 border-b border-orange-100/50">Resultados Globales</div>
            {searchResults.length === 0 ? (
              <div className="p-12 text-center text-gray-400">No encontramos "{search}" 🐣</div>
            ) : (
              <div className="flex flex-col divide-y divide-gray-50">
                {searchResults.map(p => (
                  <button key={`s-${p.id}`} onClick={() => { setSearch(''); changeCategory(p.category as any); setTimeout(() => setActiveSubcategory(getSubcategory(p)), 100); }}
                    className="flex flex-row items-center p-4 hover:bg-orange-50 active:bg-orange-100 transition-colors w-full text-left gap-4"
                  >
                    <img src={p.image || ''} alt={p.name} className="w-16 h-16 object-contain bg-white rounded-xl border border-gray-100 p-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-bold text-gray-900 truncate">{p.name}</p>
                      <p className="text-[11px] font-bold uppercase text-orange-500">{getSubcategory(p)}</p>
                    </div>
                    <span className="text-[16px] font-black text-orange-600 whitespace-nowrap">{p.price}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TABS PRINCIPALES */}
        <div className="bg-white relative z-[100]">
          <div ref={tabBarRef} className="overflow-x-auto scrollbar-hide py-2 px-4">
            <div className="flex gap-1.5" style={{ width: 'max-content' }}>
              {ALL_CATS.map(cat => (
                <button key={cat} onClick={() => changeCategory(cat)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${activeCategory === cat ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-500 active:scale-95'}`}
                >
                  <span>{CATEGORY_ICONS[cat as string] || '🛒'}</span> <span>{SHORT_LABELS[cat as string] || cat}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SUB-CATEGORÍAS CON AUTO-SCROLL */}
        {subcategories.length > 0 && (
          <div className="bg-orange-50/40 border-t border-orange-100/30 relative z-[90]">
            <div ref={subBarRef} className="overflow-x-auto scrollbar-hide py-2.5 px-4">
              <div className="flex gap-2" style={{ width: 'max-content' }}>
                {subcategories.map(sub => (
                  <button key={sub} onClick={() => setActiveSubcategory(sub)}
                    className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase transition-all border ${activeSubcategory === sub ? 'bg-orange-100 border-orange-400 text-orange-700 shadow-sm scale-105' : 'bg-white border-orange-200 text-gray-400'}`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ÁREA DE SWIPE TOTAL */}
      <div className="px-3 pt-4 min-h-[80vh] flex flex-col" onTouchStart={e => { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; }} onTouchEnd={handleTouchEnd}>
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-sm font-black text-gray-800 uppercase flex items-center gap-1.5"><MapPin size={14} className="text-orange-500" /> {activeSubcategory || activeCategory}</h3>
          <span className="text-[10px] font-bold text-gray-400 bg-white border border-gray-100 px-2 py-1 rounded-full">{displayedProducts.length} ítems</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 flex-1">
          {displayedProducts.map(p => <div key={p.id} className="w-full min-w-0"><ProductCard product={p} /></div>)}
        </div>
      </div>

      {/* STICKY CART NARANJA VIP */}
      {total > 0 && (
        <div className="fixed bottom-[85px] left-0 right-0 z-[200] px-4 animate-in slide-in-from-bottom-8">
          <div className="max-w-md mx-auto">
            <button onClick={openCart} className="w-full bg-orange-500 p-3 rounded-[32px] shadow-[0_20px_50px_rgba(249,115,22,0.4)] flex items-center justify-between border border-orange-400 active:scale-95 transition-transform">
              <div className="flex items-center gap-3 pl-3 text-white">
                <div className="relative bg-white/20 p-2.5 rounded-full shadow-inner">
                  <ShoppingBag size={20} />
                  <span className="absolute -top-2 -right-2 bg-white text-orange-600 text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-orange-500 animate-bounce">{total}</span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-white/80 text-[9px] font-black uppercase">{cartAnalytics.hasVariablePrices ? 'Subtotal Aprox.' : 'Total del Pedido'}</span>
                  <span className="font-black text-xl leading-none">${cartAnalytics.totalMoney.toFixed(2)}</span>
                </div>
              </div>
              <div className="bg-white text-orange-600 px-5 py-3 rounded-[24px] font-black text-xs uppercase flex items-center gap-1.5 shadow-lg">Ver mi canasta <ChevronRight size={16} strokeWidth={3} /></div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
``` 🦾 🍗🔥🚀👑🏝️
