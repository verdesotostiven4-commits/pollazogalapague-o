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

// 🧠 Motor de Categorización Inteligente (Mantiene tu data limpia)
const getSubcategory = (p: Product): string => {
  if (p.subcategory) return p.subcategory;
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
    if (name.includes('atún') || name.includes('sardina')) return 'Enlatados';
    if (name.includes('azúcar') || name.includes('azucar') || name.includes('panela')) return 'Dulces y Panela';
    return 'Harinas y Granos';
  }
  if (p.category === 'Salsas, aliños y aceites') {
    if (name.includes('aceite')) return 'Aceites';
    if (name.includes('salsa') || name.includes('mayonesa') || name.includes('mostaza')) return 'Salsas';
    return 'Aliños';
  }
  if (p.category === 'Bebidas') {
    if (name.includes('agua') || name.includes('guitig')) return 'Aguas';
    if (name.includes('cola') || name.includes('sprite')) return 'Gaseosas';
    return 'Otras Bebidas';
  }
  return 'General';
};

export default function Catalog() {
  const { ref, visible } = useScrollReveal();
  const { total, items, setIsOpen } = useCart();
  const [activeCategory, setActiveCategory] = useState<'Todos' | Category | null>(null);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [productGridVisible, setProductGridVisible] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  
  // Ref para el swipe (deslizar)
  const touchStart = useRef<number | null>(null);
  const touchEnd = useRef<number | null>(null);

  // 💰 Total en dinero
  const totalMoney = useMemo(() => {
    return items.reduce((sum, item) => {
      const priceStr = item.product.price?.replace('$', '').trim() || '0';
      return sum + (parseFloat(priceStr) || 0) * item.quantity;
    }, 0);
  }, [items]);

  // Lista de subcategorías de la categoría actual
  const subcategories = useMemo(() => {
    if (!activeCategory || activeCategory === 'Todos') return [];
    const subs = products
      .filter(p => p.category === activeCategory)
      .map(p => getSubcategory(p));
    return Array.from(new Set(subs));
  }, [activeCategory]);

  // 🔥 EFECTO 1: Auto-seleccionar la primera subcategoría al cambiar categoría
  useEffect(() => {
    if (activeCategory && activeCategory !== 'Todos' && subcategories.length > 0) {
      setActiveSubcategory(subcategories[0]);
    } else {
      setActiveSubcategory(null);
    }
    
    setProductGridVisible(false);
    setTimeout(() => setProductGridVisible(true), 100);
  }, [activeCategory, subcategories]);

  // 🖱️ EFECTO 2: Lógica de Swipe para Subcategorías
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEnd.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current || subcategories.length === 0) return;
    
    const distance = touchStart.current - touchEnd.current;
    const isLeftSwipe = distance > 70;
    const isRightSwipe = distance < -70;

    const currentIndex = subcategories.indexOf(activeSubcategory || '');

    if (isLeftSwipe && currentIndex < subcategories.length - 1) {
      // Siguiente subcategoría
      setActiveSubcategory(subcategories[currentIndex + 1]);
    } else if (isRightSwipe && currentIndex > 0) {
      // Anterior subcategoría
      setActiveSubcategory(subcategories[currentIndex - 1]);
    }

    touchStart.current = null;
    touchEnd.current = null;
  };

  const filteredProducts = useMemo(() => {
    if (activeCategory === null) return [];
    let base = activeCategory === 'Todos' ? products : products.filter(p => p.category === activeCategory);
    if (activeSubcategory) {
      base = base.filter(p => getSubcategory(p) === activeSubcategory);
    }
    return base;
  }, [activeCategory, activeSubcategory]);

  return (
    <section id="catalog" ref={ref as React.RefObject<HTMLElement>} className="py-16 bg-white/80 backdrop-blur-md relative overflow-hidden pb-32">
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        
        <h2 className="text-3xl font-black text-center mb-8">
          Catálogo <span className="text-orange-500">Pollazo</span>
        </h2>

        {/* CATEGORÍAS PRINCIPALES */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {['Todos', ...categories].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all ${
                activeCategory === cat 
                ? 'bg-orange-500 text-white shadow-lg scale-105' 
                : 'bg-white border border-gray-100 text-gray-500 hover:bg-orange-50'
              }`}
            >
              <span>{CATEGORY_ICONS[cat] || '📦'}</span>
              {cat}
            </button>
          ))}
        </div>

        {/* 🚀 SUB-CATEGORÍAS (Estilo PedidosYa) */}
        {subcategories.length > 0 && (
          <div className="relative mb-6">
            <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide px-2">
              {subcategories.map((sub) => (
                <button
                  key={sub}
                  onClick={() => setActiveSubcategory(sub)}
                  className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-tight whitespace-nowrap transition-all ${
                    activeSubcategory === sub 
                    ? 'bg-gray-900 text-white shadow-md scale-105' 
                    : 'bg-gray-100 text-gray-400 border border-transparent'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-gray-400 text-center mt-1 animate-pulse">
              ← Desliza para cambiar de sección →
            </div>
          </div>
        )}

        {/* 📊 GRID DE PRODUCTOS CON SOPORTE SWIPE */}
        <div 
          className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 transition-all duration-300 ${productGridVisible ? 'opacity-100' : 'opacity-0 translate-y-4'}`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {activeCategory === null && (
          <div className="text-center py-20">
            <Sparkles className="mx-auto text-orange-200 mb-2" size={40} />
            <p className="text-gray-400 font-bold">Selecciona una categoría para ver productos</p>
          </div>
        )}
      </div>

      {/* 🚀 STICKY CART (Efecto BOOM VIP) */}
      {total > 0 && (
        <div className="fixed bottom-20 left-0 right-0 z-[100] px-4 animate-in fade-in slide-in-from-bottom-10 duration-500">
          <div 
            onClick={() => setIsOpen(true)}
            className="max-w-md mx-auto bg-gray-900/95 backdrop-blur-2xl border border-white/10 p-3 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex items-center justify-between cursor-pointer active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-4 pl-4">
              <div className="relative">
                <div className="bg-orange-500 p-2 rounded-full">
                  <ShoppingBag className="text-white" size={20} />
                </div>
                <span className="absolute -top-1 -right-1 bg-white text-gray-900 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-orange-500">
                  {total}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-white/50 text-[9px] font-black uppercase tracking-widest">Tu pedido</span>
                <span className="text-white font-black text-xl leading-none">
                  ${totalMoney.toFixed(2)}
                </span>
              </div>
            </div>
            
            <button className="bg-orange-500 text-white px-6 py-3 rounded-[24px] font-black text-sm uppercase tracking-widest shadow-lg flex items-center gap-2">
              Ver carrito
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
