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

// 🧠 Buscador Inteligente
const normalizeText = (text: string) => 
  text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// 🧠 Categorización Realista
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
  const { total, items } = useCart();
  
  const ALL_CATS: ActiveCat[] = ORDERED_CATEGORIES.filter(c => c === 'Todos' || categories.includes(c as Category)) as ActiveCat[];
  
  const [activeCategory, setActiveCategory] = useState<ActiveCat>(initialCategory);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('sugeridos');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [search, setSearch] = useState('');
  
  const tabBarRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // 💰 Cálculo Real de Precios
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

  // 🧠 Lógica de Subcategorías
  const subcategories = useMemo(() => {
    if (activeCategory === 'Todos') return [];
    const subs = products
      .filter(p => p.category === activeCategory)
      .map(p => getSubcategory(p));
    return Array.from(new Set(subs));
  }, [activeCategory, products]);

  // 🔥 Auto-Selección
  useEffect(() => {
    if (activeCategory !== 'Todos' && subcategories.length > 0) {
      setActiveSubcategory(subcategories[0]);
    } else {
      setActiveSubcategory(null);
    }
  }, [activeCategory, subcategories]);

  const changeCategory = useCallback((next: ActiveCat) => {
    if (next === activeCategory) return;
    setActiveCategory(next);
    onCategoryChange?.(next);
  }, [activeCategory, onCategoryChange]);

  // 🔍 Resultados del Buscador (Lista Full Width Estilo TikTok)
  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const normalizedQuery = normalizeText(search);
    return products.filter(p => normalizeText(p.name).includes(normalizedQuery));
  }, [search, products]);

  // 📊 Filtro de Productos para el Grid
  const filtered = useMemo(() => {
    let base = activeCategory === 'Todos' ? products : products.filter(p => p.category === activeCategory);
    if (activeSubcategory) {
      base = base.filter(p => getSubcategory(p) === activeSubcategory);
    }
    return base;
  }, [activeCategory, activeSubcategory, products]);

  // ✅ Ordenamiento
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

  // 🖱️ SWIPE MAESTRO (Multinivel: Pasa de Subcategoría a Categoría Principal)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;

    // Solo si el deslizamiento es horizontal claro
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (activeCategory === 'Todos') {
        // En "Todos", desliza entre categorías principales
        const catIndex = ALL_CATS.indexOf(activeCategory);
        if (dx < 0 && catIndex < ALL_CATS.length - 1) changeCategory(ALL_CATS[catIndex + 1]);
        if (dx > 0 && catIndex > 0) changeCategory(ALL_CATS[catIndex - 1]);
      } else if (subcategories.length > 0 && activeSubcategory) {
        // En una categoría, desliza entre subcategorías
        const subIndex = subcategories.indexOf(activeSubcategory);
        const catIndex = ALL_CATS.indexOf(activeCategory);

        if (dx < 0) { // Desliza Izquierda (Siguiente)
          if (subIndex < subcategories.length - 1) {
            setActiveSubcategory(subcategories[subIndex + 1]); // Pasa a siguiente Subcat
          } else if (catIndex < ALL_CATS.length - 1) {
            changeCategory(ALL_CATS[catIndex + 1]); // Pasa a siguiente Categoría
          }
        } else if (dx > 0) { // Desliza Derecha (Anterior)
          if (subIndex > 0) {
            setActiveSubcategory(subcategories[subIndex - 1]); // Pasa a anterior Subcat
          } else if (catIndex > 0) {
            changeCategory(ALL_CATS[catIndex - 1]); // Pasa a anterior Categoría
          }
        }
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // ✅ Navegación manual al carrito (Evita que setIsOpen falle si no existe)
  const openCart = () => {
    // Despacha evento de navegación para que AppShell lo escuche
    window.history.pushState({ screen: 'cart' }, '');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="flex flex-col bg-gray-50 min-h-full pb-32">
      <AnnouncementBanner />
      
      <div className="sticky top-0 z-[100] bg-white shadow-sm border-b border-gray-100">
        
        {/* BUSCADOR TIPO GOOGLE/TIKTOK Y ORDENAMIENTO */}
        <div className="px-4 pt-3 pb-2 flex items-center gap-2 relative">
          <div className="relative flex-1 group z-[110]">
            <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${search ? 'text-orange-500' : 'text-gray-400'}`} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Ej. azúcar, pollos, arroz..."
              className="w-full bg-gray-100 rounded-[20px] pl-9 pr-9 py-2.5 text-sm text-gray-800 outline-none focus:bg-white focus:border focus:border-orange-200 focus:shadow-sm transition-all font-medium"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 bg-gray-200 rounded-full p-0.5">
                <X size={14} />
              </button>
            )}
            
            {/* 🚀 DROPDOWN LISTA ESTILO TIKTOK (Ocupa todo el ancho) */}
            {search.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white shadow-2xl rounded-b-[24px] border border-gray-100 overflow-hidden max-h-[70vh] overflow-y-auto">
                <div className="p-3 bg-orange-50 text-[10px] font-black uppercase tracking-widest text-orange-600 border-b border-orange-100/50">
                  Resultados de la búsqueda
                </div>
                {searchResults.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500 font-medium">No encontramos "{search}"</div>
                ) : (
                  <div className="flex flex-col divide-y divide-gray-50">
                    {searchResults.map(p => (
                      <button 
                        key={`search-${p.id}`}
                        onClick={() => {
                          setSearch('');
                          changeCategory(p.category as ActiveCat);
                          setTimeout(() => setActiveSubcategory(getSubcategory(p)), 100);
                        }}
                        className="flex flex-col items-start justify-center p-4 hover:bg-orange-50/50 active:bg-orange-100 transition-colors w-full text-left"
                      >
                        <div className="flex justify-between items-center w-full mb-1">
                          <p className="text-[15px] font-bold text-gray-900 line-clamp-1">{p.name}</p>
                          <span className="text-[15px] font-black text-orange-600 shrink-0">{p.price}</span>
                        </div>
                        {/* El texto que pediste naranja debajo del producto */}
                        <p className="text-[11px] font-bold uppercase tracking-wider text-orange-500 truncate w-full">
                          {p.category} • {getSubcategory(p)}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="relative z-[105]">
            <button 
              onClick={() => setShowSortMenu(!showSortMenu)}
              className={`p-2.5 rounded-[20px] border transition-all flex items-center gap-1.5 ${showSortMenu ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-white border-gray-200 text-gray-600 active:bg-gray-50'}`}
            >
              <ArrowUpDown size={18} />
              <span className="text-[10px] font-black uppercase hidden sm:block">Ordenar</span>
            </button>

            {showSortMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in slide-in-from-top-2 duration-200">
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

        {/* TABS DE CATEGORÍAS PRINCIPALES (TU DISEÑO ORIGINAL BLANCO Y GRIS) */}
        {!search && (
          <div className="bg-white">
            <div ref={tabBarRef} className="overflow-x-auto scrollbar-hide py-2 px-4">
              <div className="flex gap-1.5" style={{ width: 'max-content' }}>
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
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                      }`}
                    >
                      <span>{icon}</span>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 🚀 SUB-CATEGORÍAS (Tono Naranja/Melocotón Elegante) */}
        {!search && subcategories.length > 0 && (
          <div className="bg-orange-50/50 border-t border-orange-100/30 relative">
            <div className="overflow-x-auto scrollbar-hide py-2.5 px-4">
              <div className="flex gap-2" style={{ width: 'max-content' }}>
                {subcategories.map(sub => {
                  const isActive = activeSubcategory === sub;
                  return (
                    <button
                      key={sub}
                      onClick={() => setActiveSubcategory(sub)}
                      className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-tight whitespace-nowrap transition-all flex-shrink-0 border ${
                        isActive 
                        ? 'bg-orange-100 border-orange-400 text-orange-700 shadow-sm scale-105' 
                        : 'bg-white border-orange-200/50 text-gray-500 hover:bg-orange-50'
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

      {/* GRID DE PRODUCTOS PRINCIPAL CON SOPORTE SWIPE MAESTRO */}
      {!search && (
        <div 
          className="px-3 pt-4"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight flex items-center gap-1.5">
              <MapPin size={14} className="text-orange-500" />
              {activeSubcategory || (activeCategory === 'Todos' ? 'Catálogo General' : activeCategory)}
            </h3>
            <span className="text-[10px] font-bold text-gray-400 bg-white border border-gray-100 px-2 py-1 rounded-full shadow-sm">
              {displayedProducts.length} ítems
            </span>
          </div>

          {displayedProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-[32px] border border-dashed border-gray-200 shadow-sm mx-2">
              <span className="text-5xl mb-4 grayscale opacity-50">🛒</span>
              <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Sección vacía</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 transition-all duration-300">
              {displayedProducts.map(product => (
                <div key={`grid-${product.id}`} className="w-full min-w-0">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 🚀 STICKY CART VIP (DISEÑO NARANJA RADIANTE) */}
      {total > 0 && (
        <div className="fixed bottom-[85px] left-0 right-0 z-[200] px-4 animate-in slide-in-from-bottom-8 duration-500 pointer-events-none">
          <div className="max-w-md mx-auto relative group pointer-events-auto">
            {/* Aviso inteligente de productos por peso */}
            {cartAnalytics.hasVariablePrices && (
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-orange-600 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg border border-orange-200 flex items-center gap-1.5 whitespace-nowrap animate-bounce">
                <AlertCircle size={12} className="text-orange-500" />
                Incluye productos por peso
              </div>
            )}
            
            {/* BOTÓN REAL QUE ABRE EL CARRITO (DISEÑO NARANJA) */}
            <button 
              onClick={openCart}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 backdrop-blur-2xl p-3 rounded-[32px] shadow-[0_20px_50px_rgba(249,115,22,0.4)] flex items-center justify-between active:scale-95 transition-all border border-orange-400"
            >
              <div className="flex items-center gap-3 pl-3">
                <div className="relative bg-white/20 p-2.5 rounded-full shadow-inner">
                  <ShoppingBag className="text-white" size={20} />
                  <span className="absolute -top-2 -right-2 bg-white text-orange-600 text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-orange-500 animate-pulse">
                    {total}
                  </span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-white/80 text-[9px] font-black uppercase tracking-widest">
                    {cartAnalytics.hasVariablePrices ? 'Subtotal (Falta Peso)' : 'Total a Pagar'}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-white font-black text-xl leading-none">
                      ${cartAnalytics.totalMoney.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white text-orange-600 px-5 py-3 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-1.5">
                Ver Canasta <ChevronRight size={16} strokeWidth={3} />
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
