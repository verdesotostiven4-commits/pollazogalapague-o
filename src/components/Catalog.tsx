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

// 🧠 Lógica de Mapeo VIP para mantener products.ts limpio
const getSubcategory = (p: Product): string => {
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
    if (name.includes('azúcar') || name.includes('azucar') || name.includes('panela')) return 'Dulces';
    if (name.includes('atún') || name.includes('sardina')) return 'Enlatados';
    if (name.includes('fideo') || name.includes('tallarín') || name.includes('rapidito')) return 'Pastas';
    return 'Harinas y Otros';
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

  // Calcular dinero total para el Sticky Cart
  const totalMoney = useMemo(() => {
    return items.reduce((sum, item) => {
      const priceStr = item.product.price?.replace('$', '') || '0';
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

  // Reset de subcategoría al cambiar categoría principal
  useEffect(() => {
    setActiveSubcategory(null);
    if (activeCategory !== null) {
      setProductGridVisible(false);
      setTimeout(() => setProductGridVisible(true), 60);
    }
  }, [activeCategory]);

  const filtered = useMemo(() => {
    if (activeCategory === null) return [];
    let base = activeCategory === 'Todos' 
      ? products 
      : products.filter(p => p.category === activeCategory);
    
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
        
        {/* HEADER VIP */}
        <div className={`text-center mb-10 transition-all duration-600 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <span className="inline-block text-orange-500 font-bold text-xs tracking-widest uppercase mb-2">Riobamba • El Pollazo</span>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 leading-tight">
            Catálogo <span className="text-orange-500">Premium</span>
          </h2>
        </div>

        {/* BESTSELLERS */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4 justify-center">
            <Flame size={15} className="text-orange-500 animate-pulse" />
            <span className="text-xs font-black text-gray-700 uppercase tracking-widest">Favoritos de la semana</span>
          </div>
          <div className="flex overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide gap-3 sm:justify-center">
            {bestsellers.map(product => (
              <div key={product.id} className="w-44 flex-shrink-0 transition-transform hover:scale-105">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>

        {/* CATEGORY SELECTOR */}
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {['Todos', ...categories].map((cat, i) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat as any)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-[20px] font-bold text-sm transition-all duration-300 ${
                activeCategory === cat 
                ? 'bg-orange-500 text-white shadow-lg scale-105' 
                : 'bg-white border border-gray-100 text-gray-600 hover:bg-orange-50'
              }`}
            >
              <span>{CATEGORY_ICONS[cat] || '📦'}</span>
              <span>{cat}</span>
            </button>
          ))}
        </div>

        {/* SUBCATEGORY PILLS (Estilo PedidosYa) */}
        {subcategories.length > 0 && (
          <div className="flex overflow-x-auto gap-2 pb-6 mb-4 scrollbar-hide">
            <button
              onClick={() => setActiveSubcategory(null)}
              className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-tight whitespace-nowrap transition-all ${
                !activeSubcategory ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              Todos {activeCategory}
            </button>
            {subcategories.map(sub => (
              <button
                key={sub}
                onClick={() => setActiveSubcategory(sub)}
                className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-tight whitespace-nowrap transition-all ${
                  activeSubcategory === sub ? 'bg-orange-500 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}

        {/* GRID DE PRODUCTOS */}
        <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-6 transition-all duration-500 ${productGridVisible ? 'opacity-100' : 'opacity-0 translate-y-4'}`}>
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {activeCategory === null && (
          <div className="text-center py-20 bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-200">
            <Sparkles className="mx-auto text-orange-300 mb-2" />
            <p className="text-gray-400 font-medium">Selecciona una categoría para empezar</p>
          </div>
        )}
      </div>

      {/* STICKY CART BAR (Efecto BOOM VIP) */}
      {total > 0 && (
        <div className="fixed bottom-6 left-0 right-0 z-[100] px-4 animate-in fade-in slide-in-from-bottom-10 duration-500">
          <div className="max-w-md mx-auto bg-gray-900/90 backdrop-blur-xl border border-white/10 p-3 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-between group">
            <div className="flex items-center gap-4 pl-4">
              <div className="relative">
                <ShoppingBag className="text-fbbf24" size={24} />
                <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-gray-900 animate-bounce">
                  {total}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-white/60 text-[10px] font-bold uppercase tracking-tighter leading-none">Total estimado</span>
                <span className="text-fbbf24 font-black text-xl leading-tight">
                  ${totalMoney.toFixed(2)}
                </span>
              </div>
            </div>
            
            <button 
              onClick={() => setIsOpen(true)}
              className="bg-gradient-to-r from-orange-500 to-fbbf24 text-white px-6 py-3 rounded-[24px] font-black text-sm uppercase tracking-wider shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              Ver pedido
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
