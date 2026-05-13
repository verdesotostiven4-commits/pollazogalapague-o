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
    return 'Básicos de Despensa';
  }
  if (p.category === 'Salsas, aliños y aceites') {
    if (name.includes('aceite')) return 'Aceites';
    if (name.includes('achiote')) return 'Achiotes';
    if (name.includes('salsa') || name.includes('soya') || name.includes('ají') || name.includes('mayonesa') || name.includes('mostaza') || name.includes('bbq')) return 'Salsas y Aderezos';
    return 'Vinagres y Esencias';
  }
  if (p.category === 'Bebidas') {
    if (name.includes('agua') || name.includes('guitig')) return 'Aguas Minerales';
    if (name.includes('cerveza') || name.includes('caña')) return 'Licores';
    if (name.includes('cola') || name.includes('sprite') || name.includes('fanta') || name.includes('inca')) return 'Gaseosas';
    return 'Jugos y Refrescos';
  }
  if (p.category === 'Frutas y verduras') {
    if (name.includes('manzana') || name.includes('naranja') || name.includes('guineo') || name.includes('naranjilla')) return 'Frutas Frescas';
    return 'Hortalizas y Vegetales';
  }
  if (p.category === 'Snacks y dulces') {
    if (name.includes('galleta') || name.includes('oreo') || name.includes('ducales') || name.includes('zoologia')) return 'Galletas';
    return 'Golosinas y Caramelos';
  }
  if (p.category === 'Limpieza y hogar') {
    if (name.includes('detergente') || name.includes('deja')) return 'Cuidado de la Ropa';
    return 'Limpiadores y Varios';
  }
  return 'General';
};

type ActiveCat = 'Todos' | Category;
type SortOption = 'sugeridos' | 'precio-bajo' | 'precio-alto' | 'mas-pedidos';

interface Props {
  initialCategory?: ActiveCat;
  onCategoryChange?: (cat: ActiveCat) => void;
}

export default function CatalogScreen({ initialCategory = 'Todos', onCategoryChange }: Props) {
  const { products, categories } = useAdmin();
  const { total, items, setIsOpen } = useCart();
  
  const ALL_CATS: ActiveCat[] = ORDERED_CATEGORIES.filter(c => c === 'Todos' || categories.includes(c as Category)) as ActiveCat[];
  
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
    const subs = products.filter(p => p.category === activeCategory).map(p => getSubcategory(p));
    return Array.from(new Set(subs));
  }, [activeCategory, products]);

  // 🔥 EFECTO SEGUIMIENTO: Auto-scroll para centrar pastillas activas
  useEffect(() => {
    if (tabBarRef.current && activeCategory) {
      const activeBtn = tabBarRef.current.querySelector(`[data-cat="${activeCategory}"]`);
      if (activeBtn) activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeCategory]);

  useEffect(() => {
    if (subBarRef.current && activeSubcategory) {
      const activeBtn = subBarRef.current.querySelector(`[data-sub="${activeSubcategory}"]`);
      if (activeBtn) activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeSubcategory, subcategories]);

  useEffect(() => {
    if (activeCategory !== 'Todos' && subcategories.length > 0) {
      setActiveSubcategory(subcategories[0]);
    } else {
      setActiveSubcategory(null);
    }
    const main = document.querySelector('main');
    if (main) main.scrollTop = 0;
  }, [activeCategory, subcategories]);

  const changeCategory = useCallback((next: ActiveCat) => {
    if (next === activeCategory) return;
    setActiveCategory(next);
    onCategoryChange?.(next);
  }, [activeCategory, onCategoryChange]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const normalizedQuery = normalizeText(search);
    return products.filter(p => normalizeText(p.name).includes(normalizedQuery));
  }, [search, products]);

  const filtered = useMemo(() => {
    let base = activeCategory === 'Todos' ? products : products.filter(p => p.category === activeCategory);
    if (activeSubcategory) base = base.filter(p => getSubcategory(p) === activeSubcategory);
    return base;
  }, [activeCategory, activeSubcategory, products]);

  const displayedProducts = [...filtered].sort((a, b) => {
    if (sortBy === 'mas-pedidos') {
      const aIsBest = BESTSELLER_IDS.includes(a.id) ? 1 : 0;
      const bIsBest = BESTSELLER_IDS.includes(b.id) ? 1 : 0;
      return bIsBest - aIsBest;
    }
    if (sortBy === 'precio-bajo' || sortBy === 'precio-alto') {
      const numA = parseFloat(a.price.replace(/[^0-9.]/g, '') || '0');
      const numB = parseFloat(b.price.replace(/[^0-9.]/g, '') || '0');
      return sortBy === 'precio-bajo' ? numA - numB : numB - numA;
    }
    return 0;
  });

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      const catIndex = ALL_CATS.indexOf(activeCategory);
      if (activeCategory === 'Todos') {
        if (dx < 0 && catIndex < ALL_CATS.length - 1) changeCategory(ALL_CATS[catIndex + 1]);
        if (dx > 0 && catIndex > 0) changeCategory(ALL_CATS[catIndex - 1]);
      } else if (subcategories.length > 0 && activeSubcategory) {
        const subIndex = subcategories.indexOf(activeSubcategory);
        if (dx < 0) {
          if (subIndex < subcategories.length - 1) setActiveSubcategory(subcategories[subIndex + 1]);
          else if (catIndex < ALL_CATS.length - 1) changeCategory(ALL_CATS[catIndex + 1]);
        } else {
          if (subIndex > 0) setActiveSubcategory(subcategories[subIndex - 1]);
          else if (catIndex > 0) changeCategory(ALL_CATS[catIndex - 1]);
        }
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const openCart = () => {
    // Forzamos navegación global
    window.history.pushState({ screen: 'cart' }, '');
    window.dispatchEvent(new PopStateEvent('popstate'));
    if (setIsOpen) setIsOpen(true);
  };

  return (
    <div className="flex flex-col bg-gray-50 min-h-full pb-32 relative">
      <AnnouncementBanner />
      
      <div className="sticky top-0 z-[120] bg-white shadow-sm border-b border-gray-100">
        <div className="px-4 pt-3 pb-2 flex items-center gap-2 relative">
          <div className="relative flex-1 group z-[130]">
            <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${search ? 'text-orange-500' : 'text-gray-400'}`} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="¿Qué buscas hoy?..."
              className="w-full bg-gray-100 rounded-[20px] pl-9 pr-9 py-2.5 text-sm text-gray-800 outline-none focus:bg-white focus:border focus:border-orange-200 transition-all font-medium"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 bg-gray-200 rounded-full p-0.5"><X size={14} /></button>
            )}
            
            {/* 🚀 BUSCADOR FULL WIDTH TIKTOK STYLE */}
            {search.length > 0 && (
              <div className="fixed inset-x-0 top-[110px] bottom-0 bg-white/95 backdrop-blur-xl z-[150] overflow-y-auto animate-in fade-in duration-200">
                <div className="p-3 bg-orange-50 text-[10px] font-black uppercase tracking-widest text-orange-600 border-b border-orange-100/30">Resultados Instantáneos</div>
                <div className="flex flex-col divide-y divide-gray-50">
                  {searchResults.map(p => (
                    <button 
                      key={`search-${p.id}`}
                      onClick={() => { setSearch(''); changeCategory(p.category as ActiveCat); setTimeout(() => setActiveSubcategory(getSubcategory(p)), 150); }}
                      className="flex items-center gap-4 p-4 hover:bg-orange-50 active:bg-orange-100 transition-colors w-full text-left"
                    >
                      <img src={p.image || '/placeholder.png'} alt={p.name} className="w-12 h-12 object-contain bg-white rounded-xl border border-gray-100 p-1 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-bold text-gray-900 truncate">{p.name}</p>
                        <p className="text-[11px] font-black uppercase tracking-wider text-orange-500">{getSubcategory(p)}</p>
                      </div>
                      <div className="shrink-0 text-right"><span className="text-[16px] font-black text-orange-600">{p.price}</span></div>
                    </button>
                  ))}
                  {searchResults.length === 0 && <div className="p-20 text-center text-gray-400 font-bold italic">No hay rastro de ese producto... 🐣</div>}
                </div>
              </div>
            )}
          </div>
          
          <div className="relative z-[105]">
            <button onClick={() => setShowSortMenu(!showSortMenu)} className={`p-2.5 rounded-[20px] border transition-all flex items-center gap-1.5 ${showSortMenu ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-white border-gray-200 text-gray-600 active:bg-gray-50'}`}><ArrowUpDown size={18} /></button>
            {showSortMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in slide-in-from-top-2 duration-200 z-[120]">
                <div className="p-2 space-y-1">
                  {[{ id: 'sugeridos', label: 'Sugeridos' }, { id: 'mas-pedidos', label: 'Más pedidos 🔥' }, { id: 'precio-bajo', label: 'Menor precio' }, { id: 'precio-alto', label: 'Mayor precio' }].map((opt) => (
                    <button key={opt.id} onClick={() => { setSortBy(opt.id as SortOption); setShowSortMenu(false); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${sortBy === opt.id ? 'bg-orange-50 text-orange-600' : 'text-gray-600 active:bg-gray-50'}`}>{opt.label} {sortBy === opt.id && <Check size={14} />}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white">
          <div ref={tabBarRef} className="overflow-x-auto scrollbar-hide py-2 px-4 flex gap-1.5">
            {ALL_CATS.map(cat => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  data-cat={cat}
                  onClick={() => changeCategory(cat)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 whitespace-nowrap ${isActive ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-500'}`}
                >
                  <span>{CATEGORY_ICONS[cat] || '🛒'}</span>
                  <span>{cat === 'Todos' ? 'Descubrir' : (SHORT_LABELS[cat] ?? cat)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {subcategories.length > 0 && (
          <div className="bg-orange-50/40 border-t border-orange-100/20 relative z-[90]">
            <div ref={subBarRef} className="overflow-x-auto scrollbar-hide py-2.5 px-4 flex gap-2">
              {subcategories.map(sub => {
                const isActive = activeSubcategory === sub;
                return (
                  <button
                    key={sub}
                    data-sub={sub}
                    onClick={() => setActiveSubcategory(sub)}
                    className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-tight whitespace-nowrap transition-all border ${isActive ? 'bg-orange-100 border-orange-400 text-orange-700 shadow-sm scale-105' : 'bg-white border-orange-200/50 text-gray-400'}`}
                  >
                    {sub}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div 
        className="px-3 pt-4 min-h-[70vh]" 
        onTouchStart={handleTouchStart} 
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight flex items-center gap-1.5"><MapPin size={14} className="text-orange-500" />{activeSubcategory || activeCategory}</h3>
          <span className="text-[10px] font-bold text-gray-400 bg-white border border-gray-100 px-2.5 py-1 rounded-full">{displayedProducts.length} ítems</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 transition-all duration-300">
          {displayedProducts.map(product => (
            <div key={product.id} className="w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        {displayedProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="text-5xl mb-4 grayscale opacity-30">🐣</span>
            <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Sección en camino...</p>
          </div>
        )}
      </div>

      {total > 0 && (
        <div className="fixed bottom-[85px] left-0 right-0 z-[200] px-4 animate-in slide-in-from-bottom-8 duration-500 pointer-events-none">
          <div className="max-w-md mx-auto relative group pointer-events-auto">
            {cartAnalytics.hasVariablePrices && (
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-orange-600 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg border border-orange-200 flex items-center gap-1.5 animate-bounce">
                <AlertCircle size={12} className="text-orange-500" />
                Precio final sujeto a peso
              </div>
            )}
            <button 
              onClick={openCart}
              className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 p-3.5 rounded-[32px] shadow-[0_15px_45px_rgba(249,115,22,0.4)] flex items-center justify-between active:scale-95 transition-all border-b-4 border-orange-700"
            >
              <div className="flex items-center gap-3 pl-2">
                <div className="relative bg-white/25 p-2 rounded-full"><ShoppingBag className="text-white" size={22} /><span className="absolute -top-2 -right-2 bg-white text-orange-600 text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-orange-500 animate-pulse">{total}</span></div>
                <div className="flex flex-col text-left"><span className="text-white/80 text-[10px] font-black uppercase tracking-widest leading-none">Total estimado</span><span className="text-white font-black text-2xl leading-tight">${cartAnalytics.totalMoney.toFixed(2)}</span></div>
              </div>
              <div className="bg-white/20 px-5 py-2.5 rounded-full font-black text-[13px] text-white uppercase tracking-widest flex items-center gap-1">Ver Canasta <ChevronRight size={18} /></div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
