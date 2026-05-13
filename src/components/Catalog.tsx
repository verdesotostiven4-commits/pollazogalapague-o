import { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Flame, ShoppingBag, Sparkles } from 'lucide-react';
import { products, categories } from '../data/products';
import ProductCard from './ProductCard';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { Category, Product } from '../types';
import { useCart } from '../context/CartContext';

const BESTSELLER_IDS = ['pollo-entero', 'pechuga', 'cuartos', 'coca-cola-300ml'];
const bestsellers = products.filter(p => BESTSELLER_IDS.includes(p.id));

const CATEGORY_ICONS: Record<string, string> = {
  'Todos': '🛒',
  'Pollos': '🍗',
  'Embutidos': '🥓',
  'Menudencia': '🫀',
  'Lácteos y refrigerados': '🥛',
  'Abarrotes y básicos': '🌾',
  'Salsas, aliños y aceites': '🫙',
  'Bebidas': '🥤',
  'Frutas y verduras': '🥦',
  'Snacks y dulces': '🍫',
  'Cuidado personal': '🧴',
  'Limpieza y hogar': '🧹',
};

// 🧠 Lógica para inyectar subcategorías sin ensuciar products.ts
const getSubcategory = (p: Product): string => {
  if (p.subcategory) return p.subcategory; // Si ya viene de la BD, la usa
  const name = p.name.toLowerCase();
  
  if (p.category === 'Pollos') {
    if (name.includes('entero')) return 'Pollo Entero';
    if (name.includes('menudencia')) return 'Menudencia';
    return 'Presas';
  }
  if (p.category === 'Lácteos y refrigerados') {
    if (name.includes('leche')) return 'Leches';
    if (name.includes('yogurt') || name.includes('galamix')) return 'Yogures';
    if (name.includes('queso')) return 'Quesos';
    return 'Mantequillas';
  }
  if (p.category === 'Abarrotes y básicos') {
    if (name.includes('arroz')) return 'Arroz';
    if (name.includes('fideo') || name.includes('tallarín') || name.includes('rapidito')) return 'Pastas y Fideos';
    if (name.includes('atún') || name.includes('sardina')) return 'Enlatados del Mar';
    if (name.includes('harina') || name.includes('maizabrosa')) return 'Harinas';
    if (name.includes('lenteja') || name.includes('garbanzo')) return 'Granos Secos';
    if (name.includes('azúcar') || name.includes('azucar') || name.includes('panela')) return 'Endulzantes';
    return 'Conservas y Básicos';
  }
  if (p.category === 'Salsas, aliños y aceites') {
    if (name.includes('aceite')) return 'Aceites';
    if (name.includes('achiote')) return 'Achiotes';
    if (name.includes('salsa') || name.includes('soya') || name.includes('ají') || name.includes('mayonesa') || name.includes('mostaza') || name.includes('bbq')) return 'Salsas y Aderezos';
    if (name.includes('maggi') || name.includes('ranchero') || name.includes('aliño')) return 'Aliños y Sazonadores';
    return 'Vinagres y Esencias';
  }
  if (p.category === 'Bebidas') {
    if (name.includes('agua') || name.includes('guitig')) return 'Aguas';
    if (name.includes('cerveza') || name.includes('caña')) return 'Licores';
    if (name.includes('powerade') || name.includes('ego')) return 'Energizantes';
    if (name.includes('cola') || name.includes('sprite') || name.includes('fanta') || name.includes('inca')) return 'Gaseosas';
    if (name.includes('cafe') || name.includes('café')) return 'Café';
    return 'Jugos y Tés';
  }
  if (p.category === 'Frutas y verduras') {
    if (name.includes('manzana') || name.includes('naranja') || name.includes('guineo') || name.includes('naranjilla')) return 'Frutas Frescas';
    return 'Verduras y Hortalizas';
  }
  if (p.category === 'Snacks y dulces') {
    if (name.includes('galleta') || name.includes('oreo') || name.includes('ducales') || name.includes('zoologia')) return 'Galletas';
    if (name.includes('chifle')) return 'Snacks Salados';
    if (name.includes('chocolate') || name.includes('nutella')) return 'Chocolates';
    return 'Golosinas';
  }
  if (p.category === 'Cuidado personal') {
    if (name.includes('toallas')) return 'Cuidado Femenino';
    if (name.includes('desodorante')) return 'Desodorantes';
    if (name.includes('colgate')) return 'Cuidado Bucal';
    return 'Higiene Personal';
  }
  if (p.category === 'Limpieza y hogar') {
    if (name.includes('detergente') || name.includes('deja') || name.includes('suavitel')) return 'Cuidado de Ropa';
    if (name.includes('foco')) return 'Iluminación';
    if (name.includes('fundas')) return 'Fundas de Basura';
    if (name.includes('papel') || name.includes('servilletas')) return 'Papelería';
    return 'Limpiadores y Esponjas';
  }
  return 'General';
};

export default function Catalog() {
  const { ref, visible } = useScrollReveal();
  const { total, items, setIsOpen } = useCart();
  const [activeCategory, setActiveCategory] = useState<'Todos' | Category | null>(null);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [catVisible, setCatVisible] = useState(false);
  const [firstPulse, setFirstPulse] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [productGridVisible, setProductGridVisible] = useState(false);
  const autoSlideRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // 💰 Lógica de cálculo en tiempo real
  const totalMoney = useMemo(() => {
    return items.reduce((sum, item) => {
      const priceStr = item.product.price?.replace('$', '').trim() || '0';
      const priceNum = parseFloat(priceStr) || 0;
      return sum + (priceNum * item.quantity);
    }, 0);
  }, [items]);

  const startAutoSlide = () => {
    if (autoSlideRef.current) clearInterval(autoSlideRef.current);
    autoSlideRef.current = setInterval(() => {
      setCarouselIndex(prev => (prev + 1) % bestsellers.length);
    }, 3500);
  };

  useEffect(() => {
    startAutoSlide();
    return () => { if (autoSlideRef.current) clearInterval(autoSlideRef.current); };
  }, []);

  const goTo = (index: number) => {
    setCarouselIndex((index + bestsellers.length) % bestsellers.length);
    startAutoSlide();
  };

  useEffect(() => {
    if (visible && !catVisible) {
      setTimeout(() => setCatVisible(true), 200);
      setTimeout(() => setFirstPulse(true), 600);
      setTimeout(() => setFirstPulse(false), 1500);
    }
  }, [visible]);

  useEffect(() => {
    setActiveSubcategory(null);
    if (activeCategory !== null) {
      setProductGridVisible(false);
      setTimeout(() => setProductGridVisible(true), 60);
    }
  }, [activeCategory]);

  const filtered = useMemo(() => {
    if (activeCategory === null) return [];
    let base = activeCategory === 'Todos' ? products : products.filter(p => p.category === activeCategory);
    
    if (activeSubcategory) {
      base = base.filter(p => getSubcategory(p) === activeSubcategory);
    }
    return base;
  }, [activeCategory, activeSubcategory]);

  const subcategories = useMemo(() => {
    if (!activeCategory || activeCategory === 'Todos') return [];
    const subs = products
      .filter(p => p.category === activeCategory)
      .map(p => getSubcategory(p));
    return Array.from(new Set(subs));
  }, [activeCategory]);

  return (
    <section id="catalog" ref={ref as React.RefObject<HTMLElement>} className="py-16 sm:py-20 bg-white/70 backdrop-blur-sm relative overflow-hidden pb-32">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(249,115,22,0.05),transparent_65%)]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* COMPACT HEADER */}
        <div className={`text-center mb-8 transition-all duration-600 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 leading-tight">
            Catálogo <span className="text-orange-500">Premium</span>
          </h2>
        </div>

        {/* BESTSELLERS */}
        <div className={`mb-10 transition-all duration-600 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="flex items-center gap-2 mb-4 justify-center">
            <Flame size={15} className="text-orange-500 animate-pulse" />
            <span className="text-xs font-black text-gray-700 uppercase tracking-widest">Sugeridos del mes</span>
            <Flame size={15} className="text-orange-500 animate-pulse" />
          </div>
          <div className="sm:hidden overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            <div className="flex gap-3" style={{ width: 'max-content' }}>
              {bestsellers.map(product => (
                <div key={product.id} className="w-44 flex-shrink-0 transition-transform hover:scale-105 active:scale-95">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
          <div className="hidden sm:block relative max-w-xs mx-auto">
            <div className="overflow-hidden rounded-2xl">
              <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${carouselIndex * 100}%)` }}>
                {bestsellers.map(product => (
                  <div key={product.id} className="w-full flex-shrink-0"><ProductCard product={product} /></div>
                ))}
              </div>
            </div>
            <button onClick={() => goTo(carouselIndex - 1)} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-8 h-8 bg-white border border-orange-200 rounded-full shadow-md flex items-center justify-center text-gray-600 hover:text-orange-500"><ChevronLeft size={16} /></button>
            <button onClick={() => goTo(carouselIndex + 1)} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-8 h-8 bg-white border border-orange-200 rounded-full shadow-md flex items-center justify-center text-gray-600 hover:text-orange-500"><ChevronRight size={16} /></button>
          </div>
        </div>

        {/* CATEGORY SELECTOR */}
        <div className={`transition-all duration-600 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {categories.map((cat, i) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat as Category)}
                  className={`relative flex items-center gap-1.5 px-4 py-2.5 rounded-[20px] font-semibold text-sm transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500 to-yellow-400 text-white shadow-lg shadow-orange-500/30 scale-105'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50'
                  }`}
                >
                  <span className="text-base leading-none">{CATEGORY_ICONS[cat] ?? '📦'}</span>
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 🚀 EL HACK: SUBCATEGORY SELECTOR (Estilo PedidosYa) */}
        {subcategories.length > 0 && (
          <div className="flex overflow-x-auto gap-2 pb-6 mb-4 px-2 scrollbar-hide">
            <button
              onClick={() => setActiveSubcategory(null)}
              className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-tight whitespace-nowrap transition-all flex-shrink-0 ${
                !activeSubcategory ? 'bg-gray-800 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              Ver Todo
            </button>
            {subcategories.map(sub => (
              <button
                key={sub}
                onClick={() => setActiveSubcategory(sub)}
                className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-tight whitespace-nowrap transition-all flex-shrink-0 ${
                  activeSubcategory === sub ? 'bg-orange-500 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-500'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}

        {/* 📊 PRODUCT GRID */}
        {activeCategory !== null && (
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="font-black text-xl text-gray-800">{activeSubcategory || activeCategory}</h3>
            <span className="text-xs font-semibold text-gray-400">{filtered.length} productos</span>
          </div>
        )}

        {activeCategory !== null && filtered.length > 0 && (
          <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
            {filtered.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                className={`transition-all duration-400 ${productGridVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ transitionDelay: productGridVisible ? `${i * 30}ms` : '0ms' }}
              />
            ))}
          </div>
        )}

        {activeCategory !== null && filtered.length === 0 && (
          <div className="text-center py-14 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
            <p className="text-gray-400 font-medium">No hay productos en esta sección.</p>
          </div>
        )}

        {activeCategory === null && (
          <div className="text-center py-12">
            <Sparkles className="mx-auto text-orange-200 mb-3" size={32} />
            <p className="text-gray-400 font-medium text-sm">Selecciona una categoría arriba para empezar a comprar.</p>
          </div>
        )}
      </div>

      {/* 🚀 EL HACK: STICKY CART VIP */}
      {total > 0 && (
        <div className="fixed bottom-20 left-0 right-0 z-[100] px-4 animate-in fade-in slide-in-from-bottom-10 duration-500 pointer-events-none">
          <div className="max-w-md mx-auto bg-gray-900/95 backdrop-blur-xl border border-white/10 p-3 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-between pointer-events-auto cursor-pointer" onClick={() => setIsOpen(true)}>
            <div className="flex items-center gap-4 pl-4">
              <div className="relative">
                <ShoppingBag className="text-yellow-400" size={24} />
                <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-gray-900 shadow-lg">
                  {total}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-white/60 text-[10px] font-bold uppercase tracking-tighter leading-none">Total estimado</span>
                <span className="text-yellow-400 font-black text-xl leading-tight">
                  ${totalMoney.toFixed(2)}
                </span>
              </div>
            </div>
            
            <button className="bg-gradient-to-r from-orange-500 to-yellow-400 text-white px-6 py-3 rounded-[24px] font-black text-sm uppercase tracking-wider shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 pointer-events-none">
              Ver pedido
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
