import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Search, X, MapPin, ArrowUpDown, ChevronDown, Check, ShoppingBag, ChevronRight, AlertCircle } from 'lucide-react';
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

// 🧠 Utilidad para remover acentos en la búsqueda inteligente
const normalizeText = (text: string) => 
  text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// 🧠 Motor de categorización realista (Arreglado)
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
  const [isSearchActive, setIsSearchActive] = useState(false);
  
  const tabBarRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 💰 Cálculo Financiero VIP (Detecta si hay productos de precio variable)
  const cartAnalytics = useMemo(() => {
    let money = 0;
    let hasVariablePrices = false;

    items.forEach(item => {
      const p = products.find(prod => prod.id === item.id);
      const priceStr = p?.price || '';
      if (priceStr.toLowerCase().includes('consultar')) {
        hasVariablePrices = true;
      } else {
        const cleanPrice = parseFloat(priceStr.replace(/[^0-9.]/g, '') || '0');
        money += (cleanPrice * item.quantity);
      }
    });

    return { totalMoney: money, hasVariablePrices };
  }, [items, products]);

  // 🧠 Lógica de Subcategorías de la Categoría Activa
  const subcategories = useMemo(() => {
    if (activeCategory === 'Todos') return [];
    const subs = products
      .filter(p => p.category === activeCategory)
      .map(p => getSubcategory(p));
    return Array.from(new Set(subs));
  }, [activeCategory, products]);

  // 🔥 Auto-Selección: Si entro a una categoría, me muestra la primera subcategoría automáticamente
  useEffect(() => {
    if (activeCategory !== 'Todos' && subcategories.length > 0) {
      setActiveSubcategory(subcategories[0]);
    } else {
      setActiveSubcategory(null);
    }
  }, [activeCategory, subcategories]);

  // 🖱️ Auto-Scroll suave en las "pastillas" superiores
  useEffect(() => {
    if (!tabBarRef.current || isSearchActive) return;
    const bar = tabBarRef.current;
    const idx = ALL_CATS.indexOf(activeCategory);
    const buttons = bar.querySelectorAll('button');
    const btn = buttons[idx] as HTMLButtonElement | undefined;
    if (btn) {
      const btnCenter = btn.offsetLeft + btn.offsetWidth / 2;
      const scrollTarget = btnCenter - bar.clientWidth / 2;
      bar.scrollTo({ left: scrollTarget, behavior: 'smooth' });
    }
  }, [activeCategory, isSearchActive, ALL_CATS]);

  const changeCategory = useCallback((next: ActiveCat) => {
    if (next === activeCategory) return;
    setActiveCategory(next);
    onCategoryChange?.(next);
    setSearch('');
    setIsSearchActive(false);
  }, [activeCategory, onCategoryChange]);

  // 🔍 Motor de Búsqueda Inteligente Global
  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const normalizedQuery = normalizeText(search);
    return products.filter(p => normalizeText(p.name).includes(normalizedQuery));
  }, [search, products]);

  // 📊 Filtro de Productos para el Grid principal
  const filtered = useMemo(() => {
    let base = activeCategory === 'Todos' ? products : products.filter(p => p.category === activeCategory);
    if (activeSubcategory) {
      base = base.filter(p => getSubcategory(p) === activeSubcategory);
    }
    return base;
  }, [activeCategory, activeSubcategory, products]);

  // ✅ Ordenamiento (Sorting)
  const displayedProducts = [...filtered].sort((a, b) => {
    if (sortBy === 'mas-pedidos') {
      const aIsBest = BESTSELLER_IDS.includes(a.id) ? 1 : 0;
      const bIsBest = BESTSELLER_IDS.includes(b.id) ? 1 : 0;
      return bIsBest - aIsBest;
    }
    if (sortBy === 'precio-bajo' || sortBy === 'precio-alto') {
      const pA = parseFloat(a.price.replace(/[^0-9.]/g, '') || '0');
      const pB = parseFloat(b.price.replace(/[^0-9.]/g, '') || '0');
      return sortBy === 'precio-bajo' ? pA - pB : pB - pA;
    }
    if (activeCategory === 'Todos') {
      return ORDERED_CATEGORIES.indexOf(a.category) - ORDERED_CATEGORIES.indexOf(b.category);
    }
    return 0;
  });

  return (
    <div className="flex flex-col bg-gray-50 min-h-full pb-32">
      <AnnouncementBanner />
      
      <div className="sticky top-0 z-[100] bg-white shadow-sm border-b border-gray-100">
        
        {/* BUSCADOR PRO Y ORDENAMIENTO */}
        <div className="px-4 pt-3 pb-2 flex items-center gap-2">
          <div className="relative flex-1 group">
            <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${isSearchActive ? 'text-orange-500' : 'text-gray-400'}`} />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setIsSearchActive(true); }}
              onFocus={() => setIsSearchActive(true)}
              placeholder="Ej. azúcar, pollos, arroz..."
              className="w-full bg-gray-100 rounded-[20px] pl-9 pr-9 py-2.5 text-sm text-gray-800 outline-none focus:bg-orange-50 focus:ring-1 focus:ring-orange-200 transition-all font-medium"
            />
            {search && (
              <button onClick={() => { setSearch(''); setIsSearchActive(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 bg-gray-200 rounded-full p-0.5">
                <X size={14} />
              </button>
            )}
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setShowSortMenu(!showSortMenu)}
              className={`p-2.5 rounded-[20px] border transition-all flex items-center gap-1.5 ${showSortMenu ? 'bg-gradient-to-r from-orange-500 to-fbbf24 border-transparent text-white shadow-md' : 'bg-white border-gray-200 text-gray-600 active:bg-gray-50'}`}
            >
              <ArrowUpDown size={18} />
              <span className="text-[10px] font-black uppercase hidden sm:block">Filtros</span>
            </button>

            {showSortMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-orange-50 overflow-hidden z-[120] animate-in slide-in-from-top-2 duration-200">
                <div className="p-2 space-y-1">
                  {[
                    { id: 'sugeridos', label: 'Sugeridos' },
                    { id: 'mas-pedidos', label: 'Más pedidos 🔥' },
                    { id: 'precio-bajo', label: 'Menor precio' },
                    { id: 'precio-alto', label: 'Mayor precio' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => { setSortBy(opt.id as SortOption); setShowSortMenu(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${sortBy === opt.id ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      {opt.label} {sortBy === opt.id && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* OVERLAY DE BÚSQUEDA INTELIGENTE */}
        {isSearchActive && search.length > 0 && (
          <div className="absolute left-0 right-0 top-full bg-white shadow-xl max-h-[60vh] overflow-y-auto z-[150] rounded-b-2xl border-t border-gray-100 p-2">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-3 pt-2 pb-1">Resultados globales</p>
            {searchResults.length === 0 ? (
              <div className="p-6 text-center text-gray-400 flex flex-col items-center">
                <span className="text-4xl mb-2 grayscale">🐣</span>
                <p className="text-sm font-medium">No encontramos "{search}"</p>
                <p className="text-[10px]">Intenta buscar con otras palabras.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2">
                {searchResults.map(p => (
                  <div key={`search-${p.id}`} onClick={() => { setSearch(''); setIsSearchActive(false); }}>
                    <ProductCard product={p} compact />
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => { setSearch(''); setIsSearchActive(false); }} className="w-full mt-2 py-3 bg-gray-50 text-gray-500 font-bold text-xs rounded-xl uppercase tracking-widest">
              Cerrar Búsqueda
            </button>
          </div>
        )}

        {/* TABS DE CATEGORÍAS PRINCIPALES */}
        {!isSearchActive && (
          <div className="bg-white">
            <div ref={tabBarRef} className="overflow-x-auto scrollbar-hide py-2 px-2">
              <div className="flex gap-1.5" style={{ width: 'max-content' }}>
                {ALL_CATS.map(cat => {
                  const isActive = activeCategory === cat;
                  const icon = cat === 'Todos' ? '🛒' : (CATEGORY_ICONS[cat] ?? '📦');
                  const label = cat === 'Todos' ? 'Descubrir' : (SHORT_LABELS[cat] ?? cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => changeCategory(cat)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-[20px] text-xs font-bold transition-all duration-300 whitespace-nowrap border ${
                        isActive
                          ? 'bg-gradient-to-r from-orange-500 to-fbbf24 text-white border-transparent shadow-md shadow-orange-500/20'
                          : 'bg-white text-gray-500 border-gray-100 hover:border-orange-200 hover:bg-orange-50'
                      }`}
                    >
                      <span className="text-sm">{icon}</span>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 🚀 SUB-CATEGORÍAS (Estilo Pastillas Melocotón) */}
        {!isSearchActive && subcategories.length > 0 && (
          <div className="bg-gray-50/50 border-t border-gray-100/50">
            <div className="overflow-x-auto scrollbar-hide py-2.5 px-3">
              <div className="flex gap-2" style={{ width: 'max-content' }}>
                {subcategories.map(sub => {
                  const isActive = activeSubcategory === sub;
                  return (
                    <button
                      key={sub}
                      onClick={() => setActiveSubcategory(sub)}
                      className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-tight whitespace-nowrap transition-all flex-shrink-0 border ${
                        isActive 
                        ? 'bg-orange-100 border-orange-400 text-orange-700 shadow-sm' 
                        : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      {sub}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* GRID DE PRODUCTOS PRINCIPAL */}
      <div className="px-3 pt-4">
        {!isSearchActive && (
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight flex items-center gap-1.5">
              <MapPin size={14} className="text-orange-500" />
              {activeSubcategory || (activeCategory === 'Todos' ? 'Todos los Productos' : activeCategory)}
            </h3>
            <span className="text-[10px] font-bold text-gray-400 bg-white border border-gray-100 px-2 py-1 rounded-full shadow-sm">
              {displayedProducts.length} ítems
            </span>
          </div>
        )}

        {displayedProducts.length === 0 && !isSearchActive ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-[32px] border border-dashed border-gray-200 shadow-sm mx-2">
            <Sparkles size={40} className="text-orange-200 mb-4" />
            <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Sección vacía</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 transition-all duration-500 animate-in fade-in">
            {displayedProducts.map(product => (
              <div key={`grid-${product.id}`} className="w-full min-w-0">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🚀 STICKY CART VIP (Motor de Pesaje incluido) */}
      {total > 0 && (
        <div className="fixed bottom-[85px] left-0 right-0 z-[120] px-4 animate-in slide-in-from-bottom-8 duration-500 pointer-events-none">
          <div className="max-w-md mx-auto relative group pointer-events-auto">
            {/* Si hay productos sin precio definido (Por peso) */}
            {cartAnalytics.hasVariablePrices && (
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-orange-600 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg border border-orange-100 flex items-center gap-1.5 whitespace-nowrap animate-bounce">
                <AlertCircle size={12} className="text-orange-500" />
                Tu pedido incluye productos por peso
              </div>
            )}
            
            <div 
              onClick={() => setIsOpen(true)}
              className="bg-gray-900/95 backdrop-blur-2xl p-3 rounded-[32px] shadow-[0_20px_50px_rgba(249,115,22,0.15)] flex items-center justify-between cursor-pointer active:scale-95 transition-all border border-orange-500/20"
            >
              <div className="flex items-center gap-3 pl-3">
                <div className="relative bg-gradient-to-tr from-orange-600 to-fbbf24 p-2.5 rounded-full shadow-inner">
                  <ShoppingBag className="text-white" size={20} />
                  <span className="absolute -top-2 -right-2 bg-white text-orange-600 text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-orange-100 animate-pulse">
                    {total}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-white/50 text-[9px] font-black uppercase tracking-widest">
                    {cartAnalytics.hasVariablePrices ? 'Subtotal (Base)' : 'Total de tu Pedido'}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-white font-black text-xl leading-none">
                      ${cartAnalytics.totalMoney.toFixed(2)}
                    </span>
                    {cartAnalytics.hasVariablePrices && <span className="text-fbbf24 text-[10px] font-bold">+ Aprox</span>}
                  </div>
                </div>
              </div>
              
              <button className="bg-gradient-to-r from-orange-500 to-fbbf24 text-white px-5 py-3 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-lg hover:shadow-orange-500/50 flex items-center gap-1.5">
                Ver Canasta <ChevronRight size={16} strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
