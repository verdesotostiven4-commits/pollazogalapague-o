import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Search, X, MapPin, ArrowUpDown, ChevronDown, Check, ShoppingBag, ChevronRight } from 'lucide-react';
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

const ORDERED_CATEGORIES: string[] = [
  'Todos', 'Pollos', 'Embutidos', 'Lácteos y refrigerados', 'Abarrotes y básicos',
  'Bebidas', 'Salsas, aliños y aceites', 'Frutas y verduras', 'Snacks y dulces',
  'Cuidado personal', 'Limpieza y hogar'
];

// 🧠 Motor de mapeo automático para mantener products.ts limpio
const getSubcategory = (p: Product): string => {
  if (p.subcategory) return p.subcategory;
  const name = p.name.toLowerCase();
  if (p.category === 'Pollos') return name.includes('entero') ? 'Pollo Entero' : 'Presas';
  if (p.category === 'Lácteos y refrigerados') {
    if (name.includes('leche')) return 'Leches';
    if (name.includes('yogurt')) return 'Yogures';
    return 'Quesos y Otros';
  }
  if (p.category === 'Bebidas') return name.includes('agua') ? 'Aguas' : 'Gaseosas';
  return 'General';
};

export default function CatalogScreen({ initialCategory = 'Todos', onCategoryChange }: { initialCategory?: any, onCategoryChange?: (cat: any) => void }) {
  const { products, categories } = useAdmin();
  const { total, items, setIsOpen } = useCart();
  
  const ALL_CATS = ORDERED_CATEGORIES.filter(c => c === 'Todos' || categories.includes(c as Category));
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('sugeridos');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [search, setSearch] = useState('');
  const [animating, setAnimating] = useState(false);

  const totalMoney = useMemo(() => {
    return items.reduce((sum, item) => {
      const p = products.find(prod => prod.id === item.id);
      const price = parseFloat(p?.price?.toString().replace(/[^0-9.]/g, '') || '0');
      return sum + (price * item.quantity);
    }, 0);
  }, [items, products]);

  const subcategories = useMemo(() => {
    if (activeCategory === 'Todos') return [];
    const subs = products.filter(p => p.category === activeCategory).map(p => getSubcategory(p));
    return Array.from(new Set(subs));
  }, [activeCategory, products]);

  // 🔥 Auto-selección de primera subcategoría
  useEffect(() => {
    if (activeCategory !== 'Todos' && subcategories.length > 0) {
      setActiveSubcategory(subcategories[0]);
    } else {
      setActiveSubcategory(null);
    }
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);
  }, [activeCategory, subcategories]);

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = activeCategory === 'Todos' || p.category === activeCategory;
    const matchesSub = !activeSubcategory || getSubcategory(p) === activeSubcategory;
    return matchesSearch && matchesCat && matchesSub;
  });

  // Swipe Logic para Subcategorías
  const touchStart = useRef<number | null>(null);
  const handleSwipe = (dir: 'L' | 'R') => {
    if (!activeSubcategory) return;
    const idx = subcategories.indexOf(activeSubcategory);
    if (dir === 'L' && idx < subcategories.length - 1) setActiveSubcategory(subcategories[idx + 1]);
    if (dir === 'R' && idx > 0) setActiveSubcategory(subcategories[idx - 1]);
  };

  return (
    <div className="flex flex-col bg-gray-50 min-h-full pb-32">
      <AnnouncementBanner />
      <div className="sticky top-0 z-[100] bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="px-4 py-3 flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar en El Pollazo..." className="w-full bg-gray-100 rounded-xl pl-9 py-2 text-sm outline-none" />
          </div>
          <button onClick={() => setShowSortMenu(!showSortMenu)} className="p-2 bg-white border border-gray-200 rounded-xl"><ArrowUpDown size={18} /></button>
        </div>

        {/* Categorías Principales */}
        <div className="overflow-x-auto scrollbar-hide flex gap-2 px-4 pb-2">
          {ALL_CATS.map(cat => (
            <button key={cat} onClick={() => { setActiveCategory(cat); onCategoryChange?.(cat); }} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {CATEGORY_ICONS[cat] || '📦'} {cat}
            </button>
          ))}
        </div>

        {/* Subcategorías (Estilo PedidosYa) */}
        {subcategories.length > 0 && (
          <div className="flex overflow-x-auto gap-2 px-4 py-2 bg-gray-50/50 scrollbar-hide border-t border-gray-50">
            {subcategories.map(sub => (
              <button key={sub} onClick={() => setActiveSubcategory(sub)} className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-tight whitespace-nowrap transition-all ${activeSubcategory === sub ? 'bg-gray-800 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-400'}`}>
                {sub}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid de Productos con Swipe */}
      <div 
        className={`px-4 pt-4 grid grid-cols-2 gap-3 transition-opacity duration-300 ${animating ? 'opacity-0' : 'opacity-100'}`}
        onTouchStart={e => touchStart.current = e.touches[0].clientX}
        onTouchEnd={e => {
          if (!touchStart.current) return;
          const diff = touchStart.current - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 60) handleSwipe(diff > 0 ? 'L' : 'R');
        }}
      >
        {filtered.map(p => <ProductCard key={p.id} product={p} />)}
      </div>

      {/* 🚀 STICKY CART (Efecto BOOM VIP) */}
      {total > 0 && (
        <div className="fixed bottom-24 left-0 right-0 z-[110] px-4 animate-in fade-in slide-in-from-bottom-5">
          <div onClick={() => setIsOpen(true)} className="max-w-md mx-auto bg-gray-900/95 backdrop-blur-xl p-3 rounded-[28px] shadow-2xl flex items-center justify-between cursor-pointer active:scale-95 transition-transform border border-white/10">
            <div className="flex items-center gap-3 pl-3">
              <div className="relative bg-orange-500 p-2 rounded-full">
                <ShoppingBag className="text-white" size={20} />
                <span className="absolute -top-2 -right-2 bg-white text-orange-600 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg border border-orange-500">{total}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-white/50 text-[9px] font-bold uppercase tracking-widest">Total Pedido</span>
                <span className="text-white font-black text-lg leading-none">${totalMoney.toFixed(2)}</span>
              </div>
            </div>
            <button className="bg-orange-500 text-white px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest flex items-center gap-2">Ver Carrito <ChevronRight size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
