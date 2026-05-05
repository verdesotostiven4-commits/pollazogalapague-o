import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Flame } from 'lucide-react';
import { products, categories } from '../data/products';
import ProductCard from './ProductCard';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { Category } from '../types';

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

export default function Catalog() {
  const { ref, visible } = useScrollReveal();
  const [activeCategory, setActiveCategory] = useState<'Todos' | Category | null>(null);
  const [catVisible, setCatVisible] = useState(false);
  const [firstPulse, setFirstPulse] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [productGridVisible, setProductGridVisible] = useState(false);
  const autoSlideRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const startAutoSlide = () => {
    if (autoSlideRef.current) clearInterval(autoSlideRef.current);
    autoSlideRef.current = setInterval(() => {
      setCarouselIndex(prev => (prev + 1) % bestsellers.length);
    }, 3500);
  };

  useEffect(() => {
    startAutoSlide();
    return () => {
      if (autoSlideRef.current) clearInterval(autoSlideRef.current);
    };
  }, []);

  const goTo = (index: number) => {
    setCarouselIndex((index + bestsellers.length) % bestsellers.length);
    startAutoSlide();
  };

  useEffect(() => {
    if (visible && !catVisible) {
      const t1 = setTimeout(() => setCatVisible(true), 200);
      const t2 = setTimeout(() => setFirstPulse(true), 600);
      const t3 = setTimeout(() => setFirstPulse(false), 1500);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [visible]);

  useEffect(() => {
    if (activeCategory !== null) {
      setProductGridVisible(false);
      const t = setTimeout(() => setProductGridVisible(true), 60);
      return () => clearTimeout(t);
    }
  }, [activeCategory]);

  const filtered = activeCategory === null
    ? []
    : activeCategory === 'Todos'
    ? products
    : products.filter(p => p.category === activeCategory);

  return (
    <section id="catalog" ref={ref as React.RefObject<HTMLElement>} className="py-16 sm:py-20 bg-white/70 backdrop-blur-sm relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(249,115,22,0.05),transparent_65%)]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* COMPACT HEADER */}
        <div className={`text-center mb-10 transition-all duration-600 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <span className="inline-block text-orange-500 font-bold text-xs tracking-widest uppercase mb-2">
            Nuestros productos
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 leading-tight">
            Catálogo <span className="text-gradient-warm">completo</span>
          </h2>
          <p className="text-gray-500 text-sm sm:text-base mt-2 max-w-xl mx-auto">
            Pollo fresco y todo lo que necesitas, disponible para entrega.
          </p>
        </div>

        {/* BESTSELLERS — horizontal card strip on mobile, carousel on all */}
        <div className={`mb-12 transition-all duration-600 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="flex items-center gap-2 mb-4 justify-center">
            <Flame size={15} className="text-orange-500" />
            <span className="text-xs font-black text-gray-700 uppercase tracking-widest">Más pedidos</span>
            <Flame size={15} className="text-orange-500" />
          </div>

          {/* Mobile: horizontal scroll strip */}
          <div className="sm:hidden overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            <div className="flex gap-3" style={{ width: 'max-content' }}>
              {bestsellers.map(product => (
                <div key={product.id} className="w-44 flex-shrink-0">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>

          {/* Desktop: carousel centered */}
          <div className="hidden sm:block">
            <div className="relative max-w-xs mx-auto">
              <div className="overflow-hidden rounded-2xl">
                <div
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
                >
                  {bestsellers.map(product => (
                    <div key={product.id} className="w-full flex-shrink-0">
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => goTo(carouselIndex - 1)}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-8 h-8 bg-white border border-orange-200 rounded-full shadow-md flex items-center justify-center text-gray-600 hover:text-orange-500 hover:border-orange-400 transition-all duration-200 hover:scale-110 z-10"
                aria-label="Anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => goTo(carouselIndex + 1)}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-8 h-8 bg-white border border-orange-200 rounded-full shadow-md flex items-center justify-center text-gray-600 hover:text-orange-500 hover:border-orange-400 transition-all duration-200 hover:scale-110 z-10"
                aria-label="Siguiente"
              >
                <ChevronRight size={16} />
              </button>

              <div className="flex justify-center gap-1.5 mt-3">
                {bestsellers.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={`rounded-full transition-all duration-300 ${
                      i === carouselIndex
                        ? 'w-5 h-1.5 bg-orange-500'
                        : 'w-1.5 h-1.5 bg-orange-200 hover:bg-orange-400'
                    }`}
                    aria-label={`Ir al producto ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* DIVIDER */}
        <div className={`flex items-center gap-4 mb-8 transition-all duration-600 delay-150 ${visible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-200 to-transparent" />
          <span className="text-gray-400 text-xs font-semibold uppercase tracking-widest whitespace-nowrap">Explora por categoría</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-200 to-transparent" />
        </div>

        {/* CATEGORY SELECTOR */}
        <div className={`transition-all duration-600 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-1.5">
              <p className="text-gray-500 text-sm">Toca una categoría para ver los productos disponibles</p>
              <ChevronDown
                size={14}
                className="text-orange-400 shrink-0"
                style={{ animation: 'subtleBounce 1.4s ease-in-out infinite' }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-center mb-10">
            {categories.map((cat, i) => {
              const isFirst = i === 0;
              const isActive = activeCategory === cat;
              const icon = CATEGORY_ICONS[cat] ?? '📦';
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat as 'Todos' | Category)}
                  className={`relative flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-semibold text-sm transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500 to-yellow-400 text-white shadow-md shadow-orange-500/25 scale-105'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50 hover:scale-105 active:scale-95 shadow-sm'
                  } ${catVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
                  style={{ transitionDelay: catVisible ? `${i * 55}ms` : '0ms' }}
                >
                  <span className="text-base leading-none">{icon}</span>
                  <span>{cat}</span>
                  {isFirst && firstPulse && !isActive && (
                    <span className="absolute inset-0 rounded-2xl ring-2 ring-orange-400 animate-ping opacity-50 pointer-events-none" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* PRODUCT GRID */}
        {activeCategory !== null && filtered.length > 0 && (
          <div
            ref={gridRef}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4"
          >
            {filtered.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                className={`transition-all duration-400 ${
                  productGridVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: productGridVisible ? `${i * 40}ms` : '0ms' }}
              />
            ))}
          </div>
        )}

        {activeCategory !== null && filtered.length === 0 && (
          <div className="text-center py-14 text-gray-400">
            <p className="text-base">No hay productos en esta categoría aún.</p>
          </div>
        )}

        {activeCategory === null && (
          <div className="text-center py-6 text-gray-400 text-sm">
            Selecciona una categoría para ver todos los productos.
          </div>
        )}
      </div>
    </section>
  );
}
