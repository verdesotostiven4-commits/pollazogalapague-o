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

// 🧠 Buscador Inteligente Normalizado
const normalizeText = (text: string) => 
  text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// 🧠 Motor de Categorización Realista
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
    if (name.includes('huevo')) return 'Huevos Frescos';
    if (name.includes('cafe') || name.includes('café') || name.includes('cocoa') || name.includes('ricacao')) return 'Café y Modificadores';
    return 'Básicos de Despensa';
  }
  if (p.category === 'Salsas, aliños y aceites') {
    if (name.includes('aceite')) return 'Aceites';
    if (name.includes('achiote')) return 'Achiotes';
    if (name.includes('salsa') || name.includes('soya') || name.includes('ají') || name.includes('mayonesa') || name.includes('mostaza') || name.includes('bbq')) return 'Salsas y Aderezos';
    if (name.includes('maggi') || name.includes('sazón') || name.includes('ranchero') || name.includes('caldo')) return 'Sazonadores';
    if (name.includes('vinagre') || name.includes('esencia')) return 'Vinagres y Esencias';
    return 'Salsas y Condimentos';
  }
  if (p.category === 'Bebidas') {
    if (name.includes('agua') || name.includes('guitig')) return 'Aguas Minerales';
    if (name.includes('cerveza') || name.includes('caña')) return 'Licores';
    if (name.includes('powerade') || name.includes('ego')) return 'Energizantes e Hidratantes';
    if (name.includes('cola') || name.includes('sprite') || name.includes('fanta') || name.includes('inca')) return 'Gaseosas';
    if (name.includes('tea') || name.includes('limonada') || name.includes('frua') || name.includes('malta')) return 'Jugos y Refrescos';
    return 'Bebidas Generales';
  }
  if (p.category === 'Frutas y verduras') {
    if (name.includes('manzana') || name.includes('naranja') || name.includes('guineo') || name.includes('naranjilla') || name.includes('tomate de árbol')) return 'Frutas Frescas';
    if (name.includes('lechuga') || name.includes('albahaca') || name.includes('hierbita')) return 'Hojas y Hierbas';
    return 'Hortalizas y Vegetales';
  }
  if (p.category === 'Snacks y dulces') {
    if (name.includes('galleta') || name.includes('oreo') || name.includes('ducales') || name.includes('zoologia') || name.includes('llantitas')) return 'Galletas';
    if (name.includes('chifle') || name.includes('pipas')) return 'Snacks Salados';
    if (name.includes('chocolate') || name.includes('nutella')) return 'Chocolates';
    if (name.includes('gelatina') || name.includes('gelatoni') || name.includes('gigante')) return 'Postres y Helados';
    return 'Golosinas y Caramelos';
  }
  if (p.category === 'Cuidado personal') {
    if (name.includes('toallas')) return 'Cuidado Íntimo Femenino';
    if (name.includes('desodorante')) return 'Desodorantes';
    if (name.includes('colgate')) return 'Cuidado Bucal';
    if (name.includes('head') || name.includes('shampoo')) return 'Cuidado Capilar';
    if (name.includes('prestobarba') || name.includes('crema') || name.includes('saviloe')) return 'Cuidado de la Piel y Afeitado';
    return 'Higiene Personal';
  }
  if (p.category === 'Limpieza y hogar') {
    if (name.includes('detergente') || name.includes('deja') || name.includes('suavitel')) return 'Cuidado de la Ropa';
    if (name.includes('cloro') || name.includes('fabuloso') || name.includes('clorox') || name.includes('limp')) return 'Limpieza de Superficies';
    if (name.includes('jabon') || name.includes('jabón') || name.includes('lava') || name.includes('axion')) return 'Jabones y Lavavajillas';
    if (name.includes('foco')) return 'Iluminación';
    if (name.includes('fundas')) return 'Bolsas para Basura';
    if (name.includes('papel') || name.includes('servilletas')) return 'Papeles del Hogar';
    if (name.includes('esponja') || name.includes('paño') || name.includes('cleanful') || name.includes('bileda')) return 'Accesorios de Limpieza';
    if (name.includes('incienso') || name.includes('velas')) return 'Aromatizantes y Velas';
    return 'Artículos Varios';
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

  // 💰 Cálculo de Carrito
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
        const cleanPrice = numMatch ? parseFloat(numMatch[0]) : 0;
        money += (cleanPrice * item.quantity);
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
    if (activeCategory !== 'Todos' && subcategories.length > 0) {
      setActiveSubcategory(subcategories[0]);
    } else {
      setActiveSubcategory(null);
    }
    const main = document.querySelector('main');
    if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeCategory, subcategories]);

  // 🖱️ Auto-Scroll de Pastillas
  const scrollActiveIntoView = (ref: React.RefObject<HTMLDivElement>, index: number) => {
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
    scrollActiveIntoView(tabBarRef, ALL_CATS.indexOf(activeCategory));
  }, [activeCategory, ALL_CATS]);

  useEffect(() => {
    if (activeSubcategory) {
      scrollActiveIntoView(subBarRef, subcategories.indexOf(activeSubcategory));
    }
  }, [activeSubcategory, subcategories]);

  const changeCategory = useCallback((next: ActiveCat) => {
    if (next === activeCategory) return;
    setActiveCategory(next);
    onCategoryChange?.(next);
  }, [activeCategory, onCategoryChange]);

  // 🔍 Resultados de Búsqueda TikTok Style
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

  // 🖱️ SWIPE MAESTRO INTEGRAL
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
    else {
      window.history.pushState({ screen: 'cart' }, '');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className="flex flex-col bg-gray-50 min-h-full pb-32 relative">
      <AnnouncementBanner />
      
      {/* 🚀 BUSCADOR GOOGLE/TIKTOK FULL WIDTH */}
      <div className="sticky top-0 z-[120] bg-white shadow-sm border-b border-gray-100">
        <div className="px-4 pt-3 pb-2 flex items-center gap-2 relative">
          <div className="relative flex-1 group z-[130]">
            <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${search ? 'text-orange-500' : 'text-gray-400'}`} />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar en El Pollazo..."
              className="w-full bg-gray-100 rounded-[20px] pl-9 pr-9 py-2.5 text-sm text-gray-800 outline-none focus:bg-white focus:ring-2 focus:ring-orange-200 transition-all font-medium"
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X size={14} /></button>}
            
            {/* DROPDOWN FULL WIDTH */}
            {search.length > 0 && (
              <div className="fixed left-0 right-0 top-[60px] bg-white shadow-2xl border-t border-gray-100 overflow-hidden max-h-[70vh] overflow-y-auto z-[150]">
                {searchResults.length === 0 ? (
                  <div className="p-10 text-center text-gray-400">No encontramos "{search}"</div>
                ) : (
                  <div className="flex flex-col divide-y divide-gray-50">
                    {searchResults.map(p => (
                      <button key={`search-${p.id}`} onClick={() => { setSearch(''); changeCategory(p.category as ActiveCat); setTimeout(() => setActiveSubcategory(getSubcategory(p)), 100); }}
                        className="flex flex-row items-center p-4 hover:bg-orange-50 active:bg-orange-100 transition-colors w-full text-left gap-4"
                      >
                        <img src={p.image || ''} alt={p.name} className="w-12 h-12 object-contain bg-white rounded-xl border border-gray-100 p-1 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-bold text-gray-900 truncate">{p.name}</p>
                          <p className="text-[11px] font-bold uppercase text-orange-500">{getSubcategory(p)}</p>
                        </div>
                        <span className="text-[16px] font-black text-orange-600">{p.price}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <button onClick={() => setShowSortMenu(!showSortMenu)} className={`p-2.5 rounded-[20px] border transition-all ${showSortMenu ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-white border-gray-200 text-gray-600'}`}><ArrowUpDown size={18} /></button>
        </div>

        {/* TABS ORIGINALES */}
        <div className="bg-white">
          <div ref={tabBarRef} className="overflow-x-auto scrollbar-hide py-2 px-4">
            <div className="flex gap-1.5" style={{ width: 'max-content' }}>
              {ALL_CATS.map(cat => {
                const isActive = activeCategory === cat;
                return (
                  <button key={cat} onClick={() => changeCategory(cat)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${isActive ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-500'}`}
                  >
                    <span>{CATEGORY_ICONS[cat] || '🛒'}</span> <span>{SHORT_LABELS[cat] || cat}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* SUB-CATEGORÍAS MELOCOTÓN */}
        {subcategories.length > 0 && (
          <div className="bg-orange-50/40 border-t border-orange-100/30">
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

      {/* ÁREA DE SWIPE TOTAL (Mínimo 70vh para atrapar gestos en espacios vacíos) */}
      <div className="px-3 pt-4 min-h-[75vh]" onTouchStart={e => { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; }} onTouchEnd={handleTouchEnd}>
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-sm font-black text-gray-800 uppercase flex items-center gap-1.5"><MapPin size={14} className="text-orange-500" /> {activeSubcategory || activeCategory}</h3>
          <span className="text-[10px] font-bold text-gray-400 bg-white border border-gray-100 px-2 py-1 rounded-full">{displayedProducts.length} ítems</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {displayedProducts.map(p => <div key={p.id} className="w-full min-w-0"><ProductCard product={p} /></div>)}
        </div>
      </div>

      {/* 🚀 STICKY CART NARANJA VIP */}
      {total > 0 && (
        <div className="fixed bottom-[85px] left-0 right-0 z-[200] px-4 animate-in slide-in-from-bottom-8">
          <div className="max-w-md mx-auto">
            <button onClick={openCart} className="w-full bg-orange-500 p-3 rounded-[32px] shadow-2xl flex items-center justify-between border border-orange-400">
              <div className="flex items-center gap-3 pl-3">
                <div className="relative bg-white/20 p-2.5 rounded-full">
                  <ShoppingBag className="text-white" size={20} />
                  <span className="absolute -top-2 -right-2 bg-white text-orange-600 text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-orange-500">{total}</span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-white/80 text-[9px] font-black uppercase">{cartAnalytics.hasVariablePrices ? 'Subtotal Aprox.' : 'Total del Pedido'}</span>
                  <span className="text-white font-black text-xl leading-none">${cartAnalytics.totalMoney.toFixed(2)}</span>
                </div>
              </div>
              <div className="bg-white text-orange-600 px-5 py-3 rounded-[24px] font-black text-xs uppercase flex items-center gap-1.5">Ver mi canasta <ChevronRight size={16} /></div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
