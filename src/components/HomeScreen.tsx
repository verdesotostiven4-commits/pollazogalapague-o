import { useEffect, useRef, useState, useCallback } from 'react';
import { MessageCircle, Clock, Truck, ChevronRight, Star, ChevronLeft } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import ProductCard from './ProductCard';
import AnnouncementBanner from './AnnouncementBanner';
import { WHATSAPP } from '../utils/whatsapp';
import { Category } from '../types';

type Screen = 'home' | 'catalog' | 'cart' | 'info';

interface Props {
  onNavigate: (s: Screen) => void;
  onNavigateToCategory: (cat: Category) => void;
}

const BESTSELLER_IDS = ['pollo-entero', 'pechuga', 'cuartos', 'coca-cola-300ml'];

const QUICK_CATEGORIES: { label: Category; icon: string }[] = [
  { label: 'Pollos', icon: '🍗' },
  { label: 'Embutidos', icon: '🥓' },
  { label: 'Bebidas', icon: '🥤' },
  { label: 'Lácteos y refrigerados', icon: '🥛' },
  { label: 'Abarrotes y básicos', icon: '🌾' },
  { label: 'Snacks y dulces', icon: '🍫' },
];

const QUICK_LABELS: Record<string, string> = {
  'Pollos': 'Pollos',
  'Embutidos': 'Embutidos',
  'Bebidas': 'Bebidas',
  'Lácteos y refrigerados': 'Lácteos',
  'Abarrotes y básicos': 'Abarrotes',
  'Snacks y dulces': 'Snacks',
};

function getDynamicGreeting(): string {
  const h = new Date().getHours();
  if (h >= 7 && h < 12) return '¡Buenos días! ¿Qué desayunamos hoy? ☀️';
  if (h >= 12 && h < 19) return '¡Buenas tardes! ¿Sale un pollito para el almuerzo? 🍗';
  if (h >= 19 && h < 21) return '¡Buenas noches! Cerremos el día con algo rico 🌙';
  return 'Bienvenido a La Casa del Pollazo 🍗';
}

// Bestseller carousel: 2x2 grid, arrows, 4s autoplay, 10s pause after interaction
function BestsellerCarousel() {
  const { products } = useAdmin();
  const bestsellers = products.filter(p => BESTSELLER_IDS.includes(p.id));
  // Group into pairs
  const pairs: typeof bestsellers[] = [];
  for (let i = 0; i < bestsellers.length; i += 2) {
    pairs.push(bestsellers.slice(i, i + 2));
  }

  const [index, setIndex] = useState(0);
  const autoRef = useRef<ReturnType<typeof setTimeout>>();
  const pausedUntilRef = useRef<number>(0);
  const total = Math.max(1, pairs.length);

  const startAutoplay = useCallback(() => {
    if (autoRef.current) clearTimeout(autoRef.current);
    autoRef.current = setTimeout(() => {
      if (Date.now() >= pausedUntilRef.current) {
        setIndex(prev => (prev + 1) % total);
        startAutoplay();
      } else {
        // Check again after pause expires
        const remaining = pausedUntilRef.current - Date.now();
        autoRef.current = setTimeout(() => {
          setIndex(prev => (prev + 1) % total);
          startAutoplay();
        }, remaining);
      }
    }, 4000);
  }, [total]);

  useEffect(() => {
    startAutoplay();
    return () => { if (autoRef.current) clearTimeout(autoRef.current); };
  }, [startAutoplay]);

  const handlePrev = () => {
    pausedUntilRef.current = Date.now() + 10000;
    setIndex(prev => (prev - 1 + total) % total);
    startAutoplay();
  };

  const handleNext = () => {
    pausedUntilRef.current = Date.now() + 10000;
    setIndex(prev => (prev + 1) % total);
    startAutoplay();
  };

  return (
    <div className="relative">
      {/* Arrow left */}
      <button
        onClick={handlePrev}
        className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 text-orange-500 rounded-full shadow-md flex items-center justify-center active:scale-90 transition-transform border border-orange-100"
        aria-label="Anterior"
      >
        <ChevronLeft size={16} strokeWidth={2.5} />
      </button>

      {/* Slide container */}
      <div className="overflow-hidden mx-10">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {(pairs.length ? pairs : [[]]).map((pair, pi) => (
            <div key={pi} className="flex gap-3 px-1 min-w-full items-stretch">
              {pair.map(product => (
                <div key={product.id} className="flex-1 flex flex-col">
                  <ProductCard product={product} className="flex-1" />
                </div>
              ))}
              {pair.length < 2 && <div className="flex-1" />}
            </div>
          ))}
        </div>
      </div>

      {/* Arrow right */}
      <button
        onClick={handleNext}
        className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 text-orange-500 rounded-full shadow-md flex items-center justify-center active:scale-90 transition-transform border border-orange-100"
        aria-label="Siguiente"
      >
        <ChevronRight size={16} strokeWidth={2.5} />
      </button>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 mt-3">
        {pairs.map((_, pi) => (
          <button
            key={pi}
            onClick={() => { pausedUntilRef.current = Date.now() + 10000; setIndex(pi); startAutoplay(); }}
            className={`rounded-full transition-all duration-300 ${pi === index ? 'w-5 h-1.5 bg-orange-500' : 'w-1.5 h-1.5 bg-gray-200'}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function HomeScreen({ onNavigate, onNavigateToCategory }: Props) {
  const greeting = getDynamicGreeting();

  const openWhatsApp = () => {
    window.open(
      `https://wa.me/${WHATSAPP}?text=Hola%2C%20quiero%20hacer%20un%20pedido%20en%20La%20Casa%20del%20Pollazo%20El%20Mirador.`,
      '_blank'
    );
  };

  return (
    <div className="flex flex-col bg-gray-50">
      <AnnouncementBanner />
      {/* HERO */}
      <div className="relative overflow-hidden hero-water">
        {/* Water ripple overlays */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-72 h-72 rounded-full" style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 65%)',
            animation: 'water-ripple 10s ease-in-out infinite',
          }} />
          <div className="absolute bottom-[-15%] right-[-5%] w-60 h-60 rounded-full" style={{
            background: 'radial-gradient(circle, rgba(254,240,138,0.3) 0%, transparent 65%)',
            animation: 'water-ripple-2 13s ease-in-out infinite',
          }} />
        </div>

        <div className="px-4 pt-10 pb-8 relative z-10">
          <p className="text-white/90 text-xs font-semibold text-center mb-4 tracking-wide" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
            {greeting}
          </p>

          <div className="flex justify-center mb-5 relative">
            <div className="absolute pointer-events-none" style={{
              width: 200, height: 200, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.28) 0%, rgba(251,191,36,0.18) 50%, transparent 72%)',
              animation: 'logoGlowPulse 2.8s ease-in-out infinite',
            }} />
            <img
              src="/logo-final.png"
              alt="La Casa del Pollazo"
              className="w-36 h-36 object-contain relative z-10"
              style={{
                filter: 'drop-shadow(0 10px 32px rgba(0,0,0,0.3)) drop-shadow(0 0 24px rgba(255,255,255,0.25))',
                animation: 'splashFloat 3.6s ease-in-out infinite',
              }}
            />
          </div>

          <div className="text-center mb-5">
            <h1 className="text-white font-black text-3xl leading-tight" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
              Pollo fresco
            </h1>
            <h2 className="font-black text-3xl leading-tight" style={{ color: '#FFD700', textShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
              directo a tu puerta
            </h2>
            <p className="text-white/90 text-sm font-semibold mt-2" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
              Pedidos rápidos por WhatsApp
            </p>
            <div className="inline-flex items-center gap-1.5 bg-black/20 backdrop-blur-sm rounded-full px-3.5 py-1.5 mt-2.5 border border-white/20">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              <span className="text-white/90 text-xs font-semibold">Puerto Ayora, Galápagos</span>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap justify-center mb-6">
            {[
              { icon: <Clock size={11} />, text: '7 AM – 9 PM' },
              { icon: <Truck size={11} />, text: 'Delivery' },
              { icon: <Star size={11} className="fill-white" />, text: 'Calidad garantizada' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 bg-black/20 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/20">
                <span className="text-white">{icon}</span>
                <span className="text-white/90 text-xs font-semibold">{text}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onNavigate('catalog')}
              className="flex-1 bg-white font-black py-3.5 rounded-2xl text-sm shadow-lg active:scale-95 transition-transform"
              style={{ color: '#c2410c', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
            >
              Ver catálogo
            </button>
            <button
              onClick={openWhatsApp}
              className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white font-bold py-3.5 rounded-2xl text-sm active:scale-95 transition-transform"
              style={{ boxShadow: '0 4px 20px rgba(34,197,94,0.35)' }}
            >
              <MessageCircle size={16} />
              WhatsApp
            </button>
          </div>
        </div>
      </div>

      {/* QUICK CATEGORIES — linked to catalog */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-gray-900 text-base">Categorías</h2>
          <button onClick={() => onNavigate('catalog')} className="flex items-center gap-0.5 text-orange-500 text-xs font-semibold active:opacity-60">
            Ver todo <ChevronRight size={14} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {QUICK_CATEGORIES.map(({ label, icon }) => (
            <button
              key={label}
              onClick={() => onNavigateToCategory(label)}
              className="flex flex-col items-center gap-1.5 bg-white rounded-2xl py-3.5 px-2 border border-gray-100 shadow-sm active:scale-95 active:bg-orange-50 transition-all"
            >
              <span className="text-2xl">{icon}</span>
              <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{QUICK_LABELS[label] ?? label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* BESTSELLERS — 2x2 with arrows */}
      <div className="pt-3 pb-3 px-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-base">🔥</span>
            <h2 className="font-black text-gray-900 text-base">Más pedidos</h2>
          </div>
          <button onClick={() => onNavigate('catalog')} className="flex items-center gap-0.5 text-orange-500 text-xs font-semibold active:opacity-60">
            Ver todo <ChevronRight size={14} />
          </button>
        </div>
        <BestsellerCarousel />
      </div>

      {/* WHATSAPP CTA */}
      <div className="mx-4 mt-1 mb-2">
        <button
          onClick={openWhatsApp}
          className="w-full flex items-center justify-between bg-green-500 text-white font-bold px-5 py-4 rounded-2xl shadow-lg shadow-green-500/25 active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <MessageCircle size={20} />
            </div>
            <div className="text-left">
              <div className="font-black text-sm">Pedir por WhatsApp</div>
              <div className="text-white/80 text-xs">Respuesta inmediata</div>
            </div>
          </div>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* INFO STRIP */}
      <div className="mx-4 mt-3 mb-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex divide-x divide-gray-100">
          {[
            { icon: <Clock size={18} className="text-orange-500" />, label: '7 AM – 8/9 PM', sub: 'Todos los días' },
            { icon: <Truck size={18} className="text-orange-500" />, label: 'Delivery', sub: 'Puerto Ayora' },
            { icon: <MessageCircle size={18} className="text-green-500" />, label: 'WhatsApp', sub: 'Pedido fácil' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex-1 flex flex-col items-center py-4 px-3 gap-1.5">
              {icon}
              <span className="text-xs font-bold text-gray-800 text-center">{label}</span>
              <span className="text-[10px] text-gray-400 text-center">{sub}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
