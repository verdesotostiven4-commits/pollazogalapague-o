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
  if (p.category === 'Pollos') return name.includes('entero') ? 'Pollo Entero' : name.includes('menudencia') ? 'Menudencia' : 'Presas Especiales';
  if (p.category === 'Lácteos y refrigerados') {
    if (name.includes('leche')) return 'Leches';
    if (name.includes('yogurt')) return 'Yogures';
    if (name.includes('queso')) return 'Quesos';
    return 'Mantequillas y Otros';
  }
  if (p.category === 'Abarrotes y básicos') return name.includes('arroz') ? 'Arroz' : name.includes('fideo') ? 'Pastas' : 'Básicos';
  return 'General';
};

interface Props {
  initialCategory?: 'Todos' | Category;
  onCategoryChange?: (cat: 'Todos' | Category) => void;
  onNavigate?: (screen: any) => void; // ✅ Recibe navegación de App.tsx
}

export default function CatalogScreen({ initialCategory = 'Todos', onCategoryChange, onNavigate }: Props) {
  const { products, categories } = useAdmin();
  const { total, items } = useCart();
  const ALL_CATS = ORDERED_CATEGORIES.filter(c => c === 'Todos' || categories.includes(c as Category)) as ('Todos' | Category)[];
  
  const [activeCategory, setActiveCategory] = useState<'Todos' | Category>(initialCategory);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('sugeridos');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [search, setSearch] = useState('');
  
  const tabBarRef = useRef<HTMLDivElement>(null);
  const subBarRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const cartAnalytics = useMemo(() => {
    let money = 0; let hasVariablePrices = false;
    items.forEach(item => {
      const p = products.find(prod => prod.id === item.product.id) || item.product;
      if (p.price?.toLowerCase().includes('consultar')) hasVariablePrices = true;
      else {
        const numMatch = p.price?.match(/[\d.]+/);
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

  // 🔥 Auto-Selección y Reset de Scroll
  useEffect(() => {
    if (activeCategory !== 'Todos' && subcategories.length > 0) setActiveSubcategory(subcategories[0]);
    else setActiveSubcategory(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
  }, [activeCategory, subcategories]);

  // 🖱️ Tracking de Categorías (Auto-Scroll)
  useEffect(() => {
    const bar = tabBarRef.current;
    if (bar) {
      const idx = ALL_CATS.indexOf(activeCategory);
      const btn = bar.querySelectorAll('button')[idx];
      if (btn) bar.scrollTo({ left: btn.offsetLeft + btn.offsetWidth / 2 - bar.clientWidth / 2, behavior: 'smooth' });
    }
  }, [activeCategory, ALL_CATS]);

  // 🖱️ Tracking de Subcategorías (Auto-Scroll)
  useEffect(() => {
    const bar = subBarRef.current;
    if (bar && activeSubcategory) {
      const idx = subcategories.indexOf(activeSubcategory);
      const btn = bar.querySelectorAll('button')[idx];
      if (btn) bar.scrollTo({ left: btn.offsetLeft + btn.offsetWidth / 2 - bar.clientWidth / 2, behavior: 'smooth' });
    }
  }, [activeSubcategory, subcategories]);

  const changeCategory = useCallback((next: any) => {
    if (next === activeCategory) return;
    setActiveCategory(next);
    onCategoryChange?.(next);
  }, [activeCategory, onCategoryChange]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = normalizeText(search);
    return products.filter(p => normalizeText(p.name).includes(q)).slice(0, 10);
  }, [search, products]);

  const filtered = useMemo(() => {
    let base = activeCategory === 'Todos' ? products : products.filter(p => p.category === activeCategory);
    if (activeSubcategory) base = base.filter(p => getSubcategory(p) === activeSubcategory);
    return base;
  }, [activeCategory, activeSubcategory, products]);

  const displayedProducts = [...filtered].sort((a, b) => {
    if (sortBy === 'precio-bajo') return (parseFloat(a.price.replace(/[^0-9.]/g, '')) || 0) - (parseFloat(b.price.replace(/[^0-9.]/g, '')) || 0);
    if (sortBy === 'precio-alto') return (parseFloat(b.price.replace(/[^0-9.]/g, '')) || 0) - (parseFloat(a.price.replace(/[^0-9.]/g, '')) || 0);
    return 0;
  });

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      const catIdx = ALL_CATS.indexOf(activeCategory);
      if (activeCategory === 'Todos') {
        if (dx < 0 && catIdx < ALL_CATS.length - 1) changeCategory(ALL_CATS[catIdx + 1]);
        if (dx > 0 && catIdx > 0) changeCategory(ALL_CATS[catIdx - 1]);
      } else if (subcategories.length > 0 && activeSubcategory) {
        const subIdx = subcategories.indexOf(activeSubcategory);
        if (dx < 0) { 
          if (subIdx < subcategories.length - 1) setActiveSubcategory(subcategories[subIdx + 1]);
          else if (catIdx < ALL_CATS.length - 1) changeCategory(ALL_CATS[catIdx + 1]);
        } else if (dx > 0) {
          if (subIdx > 0) setActiveSubcategory(subcategories[subIdx - 1]);
          else if (catIdx > 0) changeCategory(ALL_CATS[catIdx - 1]);
        }
      }
    }
    touchStartX.current = null; touchStartY.current = null;
  };

  return (
    <div className="flex flex-col bg-gray-50 min-h-full pb-40 relative" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <AnnouncementBanner />
      
      {/* HEADER & SEARCH */}
      <div className="sticky top-0 z-[150] bg-white shadow-sm border-b border-gray-100">
        <div className="px-4 pt-3 pb-2 flex items-center gap-2 relative">
          <div className="relative flex-1 group z-[160]">
            <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${search ? 'text-orange-500' : 'text-gray-400'}`} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="¿Qué se te antoja hoy?" className="w-full bg-gray-100 rounded-[20px] pl-9 pr-9 py-2.5 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-orange-200 transition-all font-medium" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 bg-gray-200 rounded-full p-0.5"><X size={14} /></button>}
            
            {/* 🚀 DROPDOWN TIKTOK FULL WIDTH */}
            {search.length > 0 && (
              <div className="fixed left-0 right-0 top-[110px] bg-white/98 backdrop-blur-xl shadow-2xl border-t border-gray-100 overflow-y-auto max-h-[65vh] z-[200]">
                {searchResults.length === 0 ? <div className="p-10 text-center text-gray-400 font-bold">No hay resultados para "{search}"</div> : (
                  <div className="flex flex-col divide-y divide-gray-50">
                    {searchResults.map(p => (
                      <button key={p.id} onClick={() => { setSearch(''); changeCategory(p.category); setTimeout(() => setActiveSubcategory(getSubcategory(p)), 100); }} className="flex items-center gap-4 p-4 hover:bg-orange-50 transition-colors text-left">
                        <img src={p.image} className="w-12 h-12 object-contain bg-white rounded-xl border border-gray-100 p-1" alt="" />
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900">{p.name}</p>
                          <p className="text-[10px] font-black uppercase text-orange-500 tracking-widest">{getSubcategory(p)}</p>
                        </div>
                        <span className="text-sm font-black text-orange-600">{p.price}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <button onClick={() => setShowSortMenu(!showSortMenu)} className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-600"><ArrowUpDown size={18} /></button>
        </div>

        {/* TABS CATEGORÍAS */}
        <div ref={tabBarRef} className="overflow-x-auto scrollbar-hide py-2 px-4 bg-white flex gap-1.5">
          {ALL_CATS.map(cat => (
            <button key={cat} onClick={() => changeCategory(cat)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-500'}`}>
              <span>{CATEGORY_ICONS[cat as string] || '🛒'}</span>{SHORT_LABELS[cat as string] || cat}
            </button>
          ))}
        </div>

        {/* TABS SUBCATEGORÍAS (MELOCOTÓN) */}
        {subcategories.length > 0 && (
          <div ref={subBarRef} className="bg-orange-50/40 border-t border-orange-100/30 overflow-x-auto scrollbar-hide py-2 px-4 flex gap-2">
            {subcategories.map(sub => (
              <button key={sub} onClick={() => setActiveSubcategory(sub)} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter whitespace-nowrap transition-all border ${activeSubcategory === sub ? 'bg-orange-100 border-orange-400 text-orange-700' : 'bg-white border-gray-200 text-gray-400'}`}>
                {sub}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* GRID PRODUCTOS (RESPONDE SWIPE EN TODO EL CONTENEDOR) */}
      <div className="px-3 pt-5 min-h-[70vh]">
        <div className="flex items-center justify-between mb-5 px-2">
          <h3 className="text-sm font-black text-gray-800 uppercase flex items-center gap-1.5"><MapPin size={14} className="text-orange-500" /> {activeSubcategory || 'Catálogo'}</h3>
          <span className="text-[10px] font-bold text-gray-400 bg-white px-2 py-1 rounded-full border border-gray-100">{displayedProducts.length} ítems</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {displayedProducts.map(p => <div key={p.id} className="w-full"><ProductCard product={p} /></div>)}
        </div>
      </div>

      {/* 🚀 STICKY CART VIP (NARANJA RADIANTE) */}
      {total > 0 && (
        <div className="fixed bottom-[85px] left-0 right-0 z-[250] px-4 animate-in slide-in-from-bottom-10 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            {cartAnalytics.hasVariablePrices && (
              <div className="bg-white text-orange-600 px-4 py-1.5 rounded-t-2xl text-[9px] font-black uppercase tracking-widest border border-orange-100 text-center shadow-lg translate-y-1 mx-8 flex items-center justify-center gap-1">
                <AlertCircle size={10} /> Algunos precios dependen del peso
              </div>
            )}
            <button onClick={() => onNavigate?.('cart')} className="w-full bg-gradient-to-r from-orange-500 to-orange-600 p-3.5 rounded-[28px] shadow-[0_15px_40px_rgba(249,115,22,0.4)] flex items-center justify-between active:scale-95 transition-all border border-white/20">
              <div className="flex items-center gap-3 pl-2">
                <div className="relative bg-white/20 p-2 rounded-full"><ShoppingBag className="text-white" size={22} />
                  <span className="absolute -top-1 -right-1 bg-white text-orange-600 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md">{total}</span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-white/70 text-[9px] font-black uppercase tracking-widest">Total Estimado</span>
                  <span className="text-white font-black text-xl leading-none">${cartAnalytics.totalMoney.toFixed(2)}</span>
                </div>
              </div>
              <div className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-1 transition-colors">
                Ver Canasta <ChevronRight size={16} />
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
