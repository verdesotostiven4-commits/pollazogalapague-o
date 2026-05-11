import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import ProductCard from './ProductCard';
import AnnouncementBanner from './AnnouncementBanner';
import { Category } from '../types';

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

type ActiveCat = 'Todos' | Category;

interface Props {
  initialCategory?: ActiveCat;
  onCategoryChange?: (cat: ActiveCat) => void;
}

export default function CatalogScreen({ initialCategory = 'Todos', onCategoryChange }: Props) {
  const { products, categories } = useAdmin();
  const ALL_CATS: ActiveCat[] = ['Todos', ...(categories as Category[])];
  const [activeCategory, setActiveCategory] = useState<ActiveCat>(initialCategory);
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null);
  const [animating, setAnimating] = useState(false);
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const isSearching = search.length > 0;

  const suggestions = isSearching
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 5)
    : [];

  const filtered = products.filter(p => {
    if (isSearching) return p.name.toLowerCase().includes(search.toLowerCase());
    return activeCategory === 'Todos' || p.category === activeCategory;
  });

  const displayedProducts = [...filtered].sort((a, b) => {
    if (activeCategory === 'Todos' && !isSearching) {
      const indexA = categories.indexOf(a.category);
      const indexB = categories.indexOf(b.category);
      const posA = indexA === -1 ? 999 : indexA;
      const posB = indexB === -1 ? 999 : indexB;
      return posA - posB;
    }
    return 0;
  });

  useEffect(() => {
    if (!tabBarRef.current || isSearching) return;
    const bar = tabBarRef.current;
    const idx = ALL_CATS.indexOf(activeCategory);
    const buttons = bar.querySelectorAll('button');
    const btn = buttons[idx] as HTMLButtonElement | undefined;
    if (btn) {
      const btnCenter = btn.offsetLeft + btn.offsetWidth / 2;
      const scrollTarget = btnCenter - bar.clientWidth / 2;
      bar.scrollTo({ left: scrollTarget, behavior: 'smooth' });
    }
  }, [activeCategory, isSearching, ALL_CATS]);

  const changeCategory = useCallback((next: ActiveCat) => {
    if (next === activeCategory || animating) return;
    const currIdx = ALL_CATS.indexOf(activeCategory);
    const nextIdx = ALL_CATS.indexOf(next);
    const dir = nextIdx > currIdx ? 'left' : 'right';
    setSlideDir(dir);
    setAnimating(true);
    setActiveCategory(next);
    onCategoryChange?.(next);
    
    const main = document.querySelector('main');
    main?.scrollTo({ top: 0, behavior: 'smooth' });

    setTimeout(() => {
      setAnimating(false);
      setSlideDir(null);
    }, 320);
  }, [activeCategory, animating, onCategoryChange, ALL_CATS]);

  const handleSwipeLeft = useCallback(() => {
    const idx = ALL_CATS.indexOf(activeCategory);
    if (idx < ALL_CATS.length - 1) changeCategory(ALL_CATS[idx + 1]);
  }, [activeCategory, changeCategory, ALL_CATS]);

  const handleSwipeRight = useCallback(() => {
    const idx = ALL_CATS.indexOf(activeCategory);
    if (idx > 0) changeCategory(ALL_CATS[idx - 1]);
  }, [activeCategory, changeCategory, ALL_CATS]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) handleSwipeLeft();
      else handleSwipeRight();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getGridStyle = (): React.CSSProperties => {
    if (!animating || !slideDir) return {};
    return {
      animation: `slideIn${slideDir === 'left' ? 'Left' : 'Right'} 0.32s cubic-bezier(0.25,0.46,0.45,0.94) forwards`,
    };
  };

  return (
    <div className="flex flex-col bg-gray-50 min-h-full">
      <AnnouncementBanner />
      
      {/* 🟢 HEADER FIJO (BUSCADOR + TABS) CON Z-INDEX CORRECTO */}
      <div className="sticky top-0 z-[100] bg-white shadow-sm">
        {/* BUSCADOR */}
        <div className="px-4 pt-3 pb-2 border-b border-gray-50">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setShowSuggestions(true); }}
              onFocus={() => search && setShowSuggestions(true)}
              placeholder="Buscar productos..."
              className="w-full bg-gray-100 rounded-xl pl-9 pr-9 py-2.5 text-sm text-gray-800 outline-none focus:bg-gray-50 focus:ring-2 focus:ring-orange-200 transition-all"
            />
            {search && (
              <button onClick={() => { setSearch(''); setShowSuggestions(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 active:text-gray-700">
                <X size={15} />
              </button>
            )}

            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[110]"
              >
                {suggestions.map(p => (
                  <button
                    key={p.id}
                    onMouseDown={() => { setSearch(p.name); setShowSuggestions(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-50 active:bg-orange-100 transition-colors text-left border-b border-gray-50 last:border-b-0"
                  >
                    {p.image && (
                      <img src={p.image} alt={p.name} className="w-9 h-9 rounded-xl object-contain bg-gray-50 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.category}</p>
                    </div>
                    <span className="text-xs text-orange-500 font-bold flex-shrink-0">
                      {p.price}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* TABS DE CATEGORÍAS */}
        {!isSearching && (
          <div className="bg-white border-b border-gray-100">
            <div ref={tabBarRef} className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-1.5 px-4 py-2.5" style={{ width: 'max-content' }}>
                {ALL_CATS.map(cat => {
                  const isActive = activeCategory === cat;
                  const icon = cat === 'Todos' ? '🛒' : (CATEGORY_ICONS[cat] ?? '📦');
                  const label = cat === 'Todos' ? 'Todos' : (SHORT_LABELS[cat] ?? cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => changeCategory(cat)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 whitespace-nowrap ${
                        isActive
                          ? 'bg-orange-500 text-white shadow-sm shadow-orange-300'
                          : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                      }`}
                    >
                      <span>{icon}</span>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="text-center text-[9px] text-gray-300 pb-1 font-medium uppercase tracking-widest">← desliza para cambiar →</p>
          </div>
        )}
      </div>

      {/* GRID DE PRODUCTOS — Soporta Swipe */}
      <div
        className="px-3 pt-3 pb-24"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-tight">
            {isSearching
              ? `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}`
              : `${displayedProducts.length} producto${displayedProducts.length !== 1 ? 's' : ''}`
            }
          </p>
          {activeCategory !== 'Todos' && !isSearching && (
            <div className="flex items-center gap-1 text-orange-500 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-100">
               <MapPin size={10} />
               <span className="text-[9px] font-black uppercase tracking-tighter">{activeCategory}</span>
            </div>
          )}
        </div>

        {displayedProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-6xl mb-4 grayscale">🔍</span>
            <p className="text-gray-400 font-black uppercase text-xs tracking-widest">Sin resultados</p>
          </div>
        ) : (
          /* ✅ GRID CORREGIDO PARA IPHONE (No Zoom) */
          <div className="grid grid-cols-2 gap-3 sm:gap-4" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', ...getGridStyle() }}>
            {displayedProducts.map(product => (
              <div key={`${product.id}-${activeCategory}`} className="w-full min-w-0">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInLeft {
          from { opacity: 0.2; transform: translateX(30px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0.2; transform: translateX(-30px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
