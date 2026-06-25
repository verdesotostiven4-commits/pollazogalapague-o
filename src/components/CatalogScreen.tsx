import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  X,
  MapPin,
  ArrowUpDown,
  Check,
  ShoppingBag,
  ChevronRight,
  Star,
  DollarSign,
  PackageCheck,
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useCart } from '../context/CartContext';
import ProductCard from './ProductCard';
import AnnouncementBanner from './AnnouncementBanner';
import type { Category, Product, Screen } from '../types';

type CatalogCategory = 'Todos' | Category;

type SortOption =
  | 'sugeridos'
  | 'mas-pedidos'
  | 'precio-bajo'
  | 'precio-alto'
  | 'disponibles';

const PAGE_SIZE = 32;

const CATEGORY_ICONS: Record<string, string> = {
  Todos: '🛒',
  Pollos: '🍗',
  Embutidos: '🥓',
  'Lácteos y refrigerados': '🥛',
  'Abarrotes y básicos': '🌾',
  'Salsas, aliños y aceites': '🫙',
  Bebidas: '🥤',
  'Frutas y verduras': '🥦',
  'Snacks y dulces': '🍫',
  'Cuidado personal': '🧴',
  'Limpieza y hogar': '🧹',
};

const SHORT_LABELS: Record<string, string> = {
  Todos: 'Todos',
  Pollos: 'Pollos',
  Embutidos: 'Embutidos',
  'Lácteos y refrigerados': 'Lácteos',
  'Abarrotes y básicos': 'Abarrotes',
  'Salsas, aliños y aceites': 'Salsas',
  Bebidas: 'Bebidas',
  'Frutas y verduras': 'Frutas',
  'Snacks y dulces': 'Snacks',
  'Cuidado personal': 'Personal',
  'Limpieza y hogar': 'Limpieza',
};

const ORDERED_CATEGORIES: CatalogCategory[] = [
  'Todos',
  'Pollos',
  'Embutidos',
  'Lácteos y refrigerados',
  'Abarrotes y básicos',
  'Bebidas',
  'Salsas, aliños y aceites',
  'Frutas y verduras',
  'Snacks y dulces',
  'Cuidado personal',
  'Limpieza y hogar',
];

const BESTSELLER_IDS = [
  'pollo-entero',
  'pechuga',
  'cuartos',
  'agua-vivant-625ml',
  'colgate-triple-75ml',
  'leche-tru-1l',
];

const SORT_OPTIONS: Array<{
  id: SortOption;
  label: string;
  description: string;
  icon: typeof Star;
}> = [
  { id: 'sugeridos', label: 'Sugeridos', description: 'Orden recomendado', icon: Star },
  { id: 'mas-pedidos', label: 'Más pedidos', description: 'Productos populares', icon: PackageCheck },
  { id: 'precio-bajo', label: 'Menor precio', description: 'De barato a caro', icon: DollarSign },
  { id: 'precio-alto', label: 'Mayor precio', description: 'De caro a barato', icon: DollarSign },
  { id: 'disponibles', label: 'Disponibles', description: 'Agotados al final', icon: Check },
];

const normalizeText = (text: unknown) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const toMoney = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(2));
};

const parsePrice = (price?: string | number | null): number => {
  if (typeof price === 'number') return price > 0 ? toMoney(price) : 0;

  const numeric = Number.parseFloat(
    String(price || '')
      .replace(',', '.')
      .replace(/[^0-9.]/g, '')
  );

  return Number.isFinite(numeric) ? toMoney(numeric) : 0;
};

const getProductPrice = (product: Product) => {
  if (typeof product.custom_price === 'number' && product.custom_price > 0) {
    return toMoney(product.custom_price);
  }

  return parsePrice(product.price);
};

const productIsAvailable = (product: Product) => product.available !== false;

const getSubcategory = (product: Product): string => {
  if (product.subcategory) return product.subcategory;

  const name = normalizeText(product.name);

  if (product.category === 'Pollos') {
    if (name.includes('entero')) return 'Enteros';
    if (name.includes('menudencia')) return 'Menudencia';
    return 'Presas especiales';
  }

  if (product.category === 'Lácteos y refrigerados') {
    if (name.includes('leche')) return 'Leches';
    if (name.includes('yogurt')) return 'Yogures';
    if (name.includes('galamix') || name.includes('avena')) return 'Bebidas lácteas';
    if (name.includes('queso')) return 'Quesos';
    if (name.includes('mantequilla') || name.includes('vaquita')) return 'Mantequillas';
    return 'Refrigerados';
  }

  if (product.category === 'Abarrotes y básicos') {
    if (name.includes('arroz')) return 'Arroz';
    if (name.includes('fideo') || name.includes('tallarin') || name.includes('rapidito')) return 'Pastas y sopas';
    if (name.includes('atun') || name.includes('sardina')) return 'Enlatados del mar';
    if (name.includes('harina') || name.includes('maizabrosa')) return 'Harinas';
    if (name.includes('lenteja') || name.includes('garbanzo') || name.includes('alverja')) return 'Granos y menestras';
    if (name.includes('azucar') || name.includes('panela')) return 'Endulzantes';
    return 'Básicos de despensa';
  }

  if (product.category === 'Salsas, aliños y aceites') {
    if (name.includes('aceite')) return 'Aceites';
    if (name.includes('achiote')) return 'Achiotes';
    if (name.includes('salsa') || name.includes('soya') || name.includes('aji') || name.includes('mayonesa') || name.includes('mostaza') || name.includes('bbq')) return 'Salsas y aderezos';
    if (name.includes('maggi') || name.includes('sazon') || name.includes('ranchero') || name.includes('caldo')) return 'Sazonadores';
    return 'Vinagres y esencias';
  }

  if (product.category === 'Bebidas') {
    if (name.includes('agua') || name.includes('guitig')) return 'Aguas minerales';
    if (name.includes('cerveza') || name.includes('cana')) return 'Licores';
    if (name.includes('powerade') || name.includes('ego')) return 'Energizantes';
    if (name.includes('cola') || name.includes('sprite') || name.includes('fanta') || name.includes('inca')) return 'Gaseosas';
    return 'Jugos y refrescos';
  }

  if (product.category === 'Frutas y verduras') {
    if (name.includes('manzana') || name.includes('naranja') || name.includes('guineo') || name.includes('naranjilla')) return 'Frutas frescas';
    if (name.includes('papa') || name.includes('cebolla') || name.includes('ajo') || name.includes('pimiento') || name.includes('tomate')) return 'Vegetales';
    return 'Hojas y hierbas';
  }

  if (product.category === 'Snacks y dulces') {
    if (name.includes('galleta') || name.includes('oreo')) return 'Galletas';
    if (name.includes('chifle') || name.includes('pipas')) return 'Snacks salados';
    if (name.includes('chocolate') || name.includes('nutella')) return 'Chocolates';
    return 'Golosinas';
  }

  if (product.category === 'Cuidado personal') {
    if (name.includes('toalla')) return 'Cuidado femenino';
    if (name.includes('colgate') || name.includes('pasta')) return 'Cuidado bucal';
    if (name.includes('head') || name.includes('shampoo')) return 'Cuidado capilar';
    return 'Higiene personal';
  }

  if (product.category === 'Limpieza y hogar') {
    if (name.includes('detergente') || name.includes('deja') || name.includes('suavitel')) return 'Cuidado de ropa';
    if (name.includes('cloro') || name.includes('fabuloso') || name.includes('clorox')) return 'Superficies';
    if (name.includes('papel') || name.includes('servilletas')) return 'Papelería';
    return 'Artículos del hogar';
  }

  return 'General';
};

interface Props {
  initialCategory?: CatalogCategory;
  onCategoryChange?: (cat: CatalogCategory) => void;
  onNavigate?: (screen: Screen) => void;
}

export default function CatalogScreen({
  initialCategory = 'Todos',
  onCategoryChange,
  onNavigate,
}: Props) {
  const { products, categories } = useAdmin();
  const { items, setIsOpen, cartCount } = useCart();

  const [activeCategory, setActiveCategory] = useState<CatalogCategory>(initialCategory);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('sugeridos');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const tabBarRef = useRef<HTMLDivElement>(null);
  const subBarRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const allCategories = useMemo(() => {
    return ORDERED_CATEGORIES.filter(category => category === 'Todos' || categories.includes(category));
  }, [categories]);

  const cartAnalytics = useMemo(() => {
    let money = 0;
    let hasVariablePrices = false;
    let hasConsultPrices = false;

    items.forEach(item => {
      const productPrice =
        typeof item.product.custom_price === 'number' && item.product.custom_price > 0
          ? item.product.custom_price
          : typeof item.custom_price === 'number' && item.custom_price > 0
            ? item.custom_price
            : typeof item.price === 'number' && item.price > 0
              ? item.price
              : parsePrice(item.product.price);

      money += productPrice * item.quantity;
      if (item.product.is_variable || item.product.custom_price) hasVariablePrices = true;
      if (productPrice <= 0) hasConsultPrices = true;
    });

    return { totalMoney: toMoney(money), hasVariablePrices, hasConsultPrices };
  }, [items]);

  const subcategories = useMemo(() => {
    if (activeCategory === 'Todos') return [];

    return Array.from(
      new Set(
        products
          .filter(product => product.category === activeCategory)
          .map(product => getSubcategory(product))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [activeCategory, products]);

  const filtered = useMemo(() => {
    let base = activeCategory === 'Todos'
      ? products
      : products.filter(product => product.category === activeCategory);

    if (activeSubcategory) {
      base = base.filter(product => getSubcategory(product) === activeSubcategory);
    }

    return base;
  }, [activeCategory, activeSubcategory, products]);

  const displayedProducts = useMemo(() => {
    const sorted = [...filtered];

    sorted.sort((a, b) => {
      const availableA = productIsAvailable(a);
      const availableB = productIsAvailable(b);

      if (availableA !== availableB) return availableA ? -1 : 1;

      if (sortBy === 'mas-pedidos') {
        const scoreA = BESTSELLER_IDS.includes(a.id) ? 1 : 0;
        const scoreB = BESTSELLER_IDS.includes(b.id) ? 1 : 0;
        if (scoreA !== scoreB) return scoreB - scoreA;
      }

      if (sortBy === 'precio-bajo' || sortBy === 'precio-alto') {
        const priceA = getProductPrice(a);
        const priceB = getProductPrice(b);
        if (priceA !== priceB) return sortBy === 'precio-bajo' ? priceA - priceB : priceB - priceA;
      }

      if (sortBy === 'disponibles') return a.name.localeCompare(b.name);

      if (activeCategory === 'Todos') {
        const categoryA = ORDERED_CATEGORIES.indexOf(a.category);
        const categoryB = ORDERED_CATEGORIES.indexOf(b.category);
        if (categoryA !== categoryB) return categoryA - categoryB;
      }

      const bestA = BESTSELLER_IDS.includes(a.id) ? 1 : 0;
      const bestB = BESTSELLER_IDS.includes(b.id) ? 1 : 0;
      if (bestA !== bestB) return bestB - bestA;

      return a.name.localeCompare(b.name);
    });

    return sorted;
  }, [activeCategory, filtered, sortBy]);

  const visibleProducts = useMemo(
    () => displayedProducts.slice(0, visibleCount),
    [displayedProducts, visibleCount]
  );

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];

    const query = normalizeText(search);

    return products
      .filter(product => {
        const haystack = normalizeText([
          product.name,
          product.category,
          product.subcategory,
          product.description,
          getSubcategory(product),
        ].filter(Boolean).join(' '));

        return haystack.includes(query);
      })
      .sort((a, b) => {
        const availableA = productIsAvailable(a);
        const availableB = productIsAvailable(b);
        if (availableA !== availableB) return availableA ? -1 : 1;

        const bestA = BESTSELLER_IDS.includes(a.id) ? 1 : 0;
        const bestB = BESTSELLER_IDS.includes(b.id) ? 1 : 0;
        return bestB - bestA;
      })
      .slice(0, 18);
  }, [products, search]);

  useEffect(() => {
    setActiveCategory(initialCategory);
    setActiveSubcategory(null);
    setVisibleCount(PAGE_SIZE);
  }, [initialCategory]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);

    const main = document.querySelector('main');
    main?.scrollTo({ top: 0, behavior: 'auto' });
  }, [activeCategory, activeSubcategory, sortBy]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return undefined;

    const observer = new IntersectionObserver(
      entries => {
        if (!entries[0]?.isIntersecting) return;

        setVisibleCount(current => Math.min(current + PAGE_SIZE, displayedProducts.length));
      },
      { root: null, rootMargin: '700px 0px 700px 0px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [displayedProducts.length, visibleProducts.length]);

  const syncPillsScroll = (ref: React.RefObject<HTMLDivElement>, index: number) => {
    if (!ref.current || index < 0) return;

    const btn = ref.current.querySelectorAll('button')[index] as HTMLElement | undefined;
    if (!btn) return;

    ref.current.scrollTo({
      left: btn.offsetLeft + btn.offsetWidth / 2 - ref.current.clientWidth / 2,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    syncPillsScroll(tabBarRef, allCategories.indexOf(activeCategory));
  }, [activeCategory, allCategories]);

  useEffect(() => {
    if (!activeSubcategory) {
      syncPillsScroll(subBarRef, 0);
      return;
    }

    syncPillsScroll(subBarRef, subcategories.indexOf(activeSubcategory) + 1);
  }, [activeSubcategory, subcategories]);

  const changeCategory = (next: CatalogCategory) => {
    if (next === activeCategory && activeSubcategory === null) return;

    setActiveSubcategory(null);
    setActiveCategory(next);
    setShowSortMenu(false);
    setVisibleCount(PAGE_SIZE);
    onCategoryChange?.(next);
  };

  const chooseSearchProduct = (product: Product) => {
    setSearch('');
    setShowSortMenu(false);
    setActiveCategory(product.category);
    onCategoryChange?.(product.category);

    window.setTimeout(() => {
      setActiveSubcategory(getSubcategory(product));
      setVisibleCount(PAGE_SIZE);
    }, 60);
  };

  const openCart = () => {
    if (onNavigate) {
      onNavigate('cart');
      return;
    }

    setIsOpen(true);
  };

  const selectedSort = SORT_OPTIONS.find(option => option.id === sortBy) || SORT_OPTIONS[0];

  return (
    <div className="flex flex-col bg-gray-50 min-h-full pb-32 relative">
      <AnnouncementBanner />

      <div className="sticky top-0 z-[120] bg-white shadow-sm border-b border-gray-100">
        <div className="px-4 pt-3 pb-2 flex items-center gap-2 relative z-[160] bg-white">
          <div className="relative flex-1 group">
            <Search
              size={16}
              className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${search ? 'text-orange-500' : 'text-gray-400'}`}
            />

            <input
              type="text"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="¿Qué buscas hoy?"
              className="w-full bg-gray-100 rounded-[20px] pl-9 pr-9 py-2.5 text-sm text-gray-800 outline-none focus:bg-white focus:ring-2 focus:ring-orange-200 transition-all font-medium"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 active:scale-90 transition-transform"
                aria-label="Limpiar búsqueda"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowSortMenu(current => !current)}
            className={`p-2.5 rounded-[20px] border transition-all ${
              showSortMenu ? 'bg-orange-50 text-orange-600 border-orange-200 shadow-inner' : 'bg-white border-gray-200 text-gray-600 active:scale-95'
            }`}
            aria-label="Ordenar catálogo"
          >
            <ArrowUpDown size={18} />
          </button>
        </div>

        {showSortMenu && (
          <div className="absolute right-4 top-[58px] z-[180] w-64 bg-white rounded-[28px] border border-orange-100 shadow-2xl shadow-orange-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-4 py-3 bg-orange-50 border-b border-orange-100">
              <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Ordenar productos</p>
              <p className="text-[10px] font-bold text-orange-500/70 mt-0.5">Actual: {selectedSort.label}</p>
            </div>

            <div className="p-2">
              {SORT_OPTIONS.map(option => {
                const Icon = option.icon;
                const active = sortBy === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setSortBy(option.id);
                      setShowSortMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all active:scale-[0.98] ${
                      active ? 'bg-orange-50 text-orange-600' : 'hover:bg-gray-50 text-gray-500'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${active ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      <Icon size={16} />
                    </div>

                    <div className="flex-1">
                      <p className="text-xs font-black uppercase">{option.label}</p>
                      <p className="text-[10px] font-bold opacity-70">{option.description}</p>
                    </div>

                    {active && <Check size={16} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {search.length > 0 && (
          <div className="fixed left-0 right-0 top-[60px] bottom-0 bg-white z-[150] overflow-y-auto animate-in fade-in">
            <div className="p-3 bg-orange-50 text-[10px] font-black uppercase tracking-widest text-orange-600 border-b border-orange-100/50">
              Resultados globales
            </div>

            {searchResults.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <ShoppingBag size={38} className="mx-auto text-orange-200 mb-3" />
                <p className="font-black text-gray-500 uppercase">No encontramos “{search}”</p>
                <p className="text-xs font-bold text-gray-400 mt-2">Intenta buscar con otra palabra.</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-gray-50">
                {searchResults.map(product => {
                  const price = getProductPrice(product);
                  const available = productIsAvailable(product);

                  return (
                    <button
                      key={`s-${product.id}`}
                      type="button"
                      onClick={() => chooseSearchProduct(product)}
                      className="flex flex-row items-center p-4 hover:bg-orange-50 active:bg-orange-100 transition-colors w-full text-left gap-4"
                    >
                      <img
                        src={product.image || '/logo-final.png'}
                        alt={product.name}
                        className="w-16 h-14 object-contain bg-white rounded-xl border border-gray-100 p-1 shrink-0"
                        loading="lazy"
                        decoding="async"
                      />

                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-bold text-gray-900 truncate">{product.name}</p>
                        <p className="text-[11px] font-bold uppercase text-orange-500 truncate">{getSubcategory(product)}</p>
                        {!available && <p className="text-[9px] font-black text-red-500 uppercase mt-0.5">Agotado</p>}
                      </div>

                      <span className="text-[16px] font-black text-orange-600 whitespace-nowrap">
                        {product.is_variable ? 'Por valor' : price > 0 ? `$${price.toFixed(2)}` : 'Consultar'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="bg-white relative z-[100]">
          <div ref={tabBarRef} className="overflow-x-auto scrollbar-hide py-2 px-4">
            <div className="flex gap-1.5" style={{ width: 'max-content' }}>
              {allCategories.map(category => (
                <button
                  key={category}
                  type="button"
                  onClick={() => changeCategory(category)}
                  aria-current={activeCategory === category && !activeSubcategory ? 'page' : undefined}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    activeCategory === category && !activeSubcategory
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-500 active:scale-95'
                  }`}
                >
                  <span>{CATEGORY_ICONS[category] || '🛒'}</span>
                  <span>{SHORT_LABELS[category] || category}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {subcategories.length > 0 && (
          <div className="bg-orange-50/40 border-t border-orange-100/30 relative z-[90]">
            <div ref={subBarRef} className="overflow-x-auto scrollbar-hide py-2.5 px-4">
              <div className="flex gap-2" style={{ width: 'max-content' }}>
                <button
                  type="button"
                  onClick={() => setActiveSubcategory(null)}
                  className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase transition-all border ${
                    activeSubcategory === null ? 'bg-orange-100 border-orange-400 text-orange-700 shadow-sm' : 'bg-white border-orange-200 text-gray-400'
                  }`}
                >
                  Todos
                </button>

                {subcategories.map(subcategory => (
                  <button
                    key={subcategory}
                    type="button"
                    onClick={() => setActiveSubcategory(subcategory)}
                    className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase transition-all border ${
                      activeSubcategory === subcategory ? 'bg-orange-100 border-orange-400 text-orange-700 shadow-sm' : 'bg-white border-orange-200 text-gray-400'
                    }`}
                  >
                    {subcategory}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-3 pt-4 min-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-sm font-black text-gray-800 uppercase flex items-center gap-1.5 min-w-0">
            <MapPin size={14} className="text-orange-500 flex-shrink-0" />
            <span className="truncate">{activeSubcategory || activeCategory}</span>
          </h3>

          <span className="text-[10px] font-bold text-gray-400 bg-white border border-gray-100 px-2 py-1 rounded-full">
            {displayedProducts.length} ítems
          </span>
        </div>

        {displayedProducts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-16">
            <ShoppingBag size={48} className="text-orange-200 mb-4" />
            <p className="font-black text-gray-700 uppercase">Sin productos aquí</p>
            <p className="text-xs font-bold text-gray-400 leading-relaxed mt-2">Prueba otra subcategoría o vuelve a “Todos”.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 flex-1">
              {visibleProducts.map(product => (
                <div key={product.id} className="w-full min-w-0">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>

            <div ref={loadMoreRef} className="py-8 flex items-center justify-center">
              {visibleProducts.length < displayedProducts.length ? (
                <button
                  type="button"
                  onClick={() => setVisibleCount(current => Math.min(current + PAGE_SIZE, displayedProducts.length))}
                  className="px-5 py-3 rounded-2xl bg-white border border-orange-100 text-orange-600 text-[11px] font-black uppercase shadow-sm active:scale-95 transition-transform"
                >
                  Cargar más productos
                </button>
              ) : (
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Fin del catálogo</span>
              )}
            </div>
          </>
        )}
      </div>

      {cartCount > 0 && (
        <div className="fixed bottom-[85px] left-0 right-0 z-[200] px-4 animate-in slide-in-from-bottom-8">
          <div className="max-w-md mx-auto">
            <button
              type="button"
              onClick={openCart}
              className="w-full bg-orange-500 p-3 rounded-[32px] shadow-2xl flex items-center justify-between border border-orange-400 active:scale-95 transition-transform"
            >
              <div className="flex items-center gap-3 pl-3 text-white">
                <div className="relative bg-white/20 p-2.5 rounded-full shadow-inner">
                  <ShoppingBag size={20} />
                  <span className="absolute -top-2 -right-2 bg-white text-orange-600 text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-orange-500">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                </div>

                <div className="flex flex-col text-left">
                  <span className="text-white/80 text-[9px] font-black uppercase">
                    {cartAnalytics.hasConsultPrices
                      ? 'Subtotal parcial'
                      : cartAnalytics.hasVariablePrices
                        ? 'Subtotal elegido'
                        : 'Total del pedido'}
                  </span>
                  <span className="font-black text-xl leading-none">${cartAnalytics.totalMoney.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-white text-orange-600 px-5 py-3 rounded-[24px] font-black text-xs uppercase flex items-center gap-1.5 shadow-lg">
                Ver canasta
                <ChevronRight size={16} strokeWidth={3} />
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
