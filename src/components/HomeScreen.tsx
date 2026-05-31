import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Clock,
  Truck,
  ChevronRight,
  Star,
  ChevronLeft,
  Sparkles,
  MessageCircle,
  ShieldCheck,
  Tag,
  Store,
  PackageCheck,
  MapPin,
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext';
import ProductCard from './ProductCard';
import AnnouncementBanner from './AnnouncementBanner';
import { WHATSAPP } from '../utils/whatsapp';
import { Category, Screen } from '../types';

interface Props {
  onNavigate: (s: Screen) => void;
  onNavigateToCategory: (cat: Category) => void;
}

const LOGO_URL =
  'https://blogger.googleusercontent.com/img/a/AVvXsEjjZyWBEfS2-yN9AffqCBbrsiquVeUUQYsQPGLI31cI5B5mVzSowezui2lHQ6gpXGKpU5x6Uuuy_YtDfGm72-81dSiCAYnAfNRqcWavKUNO0LMmpeI_bh80Tb1CcAUqM21cn-YPji0ZHyuDq_6CcKs4-kIJmzsEqwFYeXxkMD9SlSrjmhOylKISX_CwHY0';

const BESTSELLER_IDS = [
  'pollo-entero',
  'pechuga',
  'cuartos',
  'agua-vivant-625ml',
  'colgate-triple-75ml',
  'leche-tru-1l',
];

const QUICK_CATEGORIES: { label: string; target: Category; icon: string }[] = [
  { label: 'Pollos', target: 'Pollos', icon: '🍗' },
  { label: 'Embutidos', target: 'Embutidos', icon: '🥓' },
  { label: 'Bebidas', target: 'Bebidas', icon: '🥤' },
  { label: 'Lácteos', target: 'Lácteos y refrigerados', icon: '🥛' },
  { label: 'Abarrotes', target: 'Abarrotes y básicos', icon: '🌾' },
  { label: 'Snacks', target: 'Snacks y dulces', icon: '🍫' },
];

const SOUNDS = [
  'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  'https://assets.mixkit.co/active_storage/sfx/2574/2574-preview.mp3',
  'https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3',
];

const SPARKLE_POSITIONS = [
  'top-2 right-3',
  'bottom-3 left-4',
  'top-3 left-5',
];

const TRUST_ITEMS = [
  {
    icon: <ShieldCheck size={18} />,
    title: 'Fresco diario',
    text: 'Pollo y básicos para tu casa.',
  },
  {
    icon: <Truck size={18} />,
    title: 'Delivery',
    text: 'Entrega en Puerto Ayora.',
  },
  {
    icon: <MessageCircle size={18} />,
    title: 'Atención fácil',
    text: 'Te ayudamos por WhatsApp.',
  },
];

function getGreeting() {
  const hour = new Date().getHours();

  if (hour >= 6 && hour < 12) {
    return {
      title: '¡Buenos días!',
      phrase: '¿Qué compraremos para el desayuno? ☕',
    };
  }

  if (hour >= 12 && hour < 18) {
    return {
      title: '¡Buenas tardes!',
      phrase: '¿Un pollito para el asado hoy? 🍗',
    };
  }

  return {
    title: '¡Buenas noches!',
    phrase: '¿Cenamos algo rico del Pollazo? 🌙',
  };
}

function triggerLightHaptic() {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(18);
    }
  } catch {
    // Vibración opcional.
  }
}

export default function HomeScreen({ onNavigate, onNavigateToCategory }: Props) {
  const { customerName } = useUser();
  const { products } = useAdmin();

  const [activeIndex, setActiveIndex] = useState(0);
  const [logoAnimIndex, setLogoAnimIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const greeting = getGreeting();

  const bestsellers = useMemo(() => {
    const selected = products.filter(product => BESTSELLER_IDS.includes(product.id));

    if (selected.length > 0) return selected;

    return products.slice(0, 6);
  }, [products]);

  const pairs = useMemo(() => {
    const nextPairs = [];

    for (let i = 0; i < bestsellers.length; i += 2) {
      nextPairs.push(bestsellers.slice(i, i + 2));
    }

    return nextPairs;
  }, [bestsellers]);

  useEffect(() => {
    if (pairs.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      setActiveIndex(current => {
        const nextIndex = (current + 1) % pairs.length;
        const width = scrollRef.current?.offsetWidth || 0;

        if (scrollRef.current && width > 0) {
          scrollRef.current.scrollTo({
            left: nextIndex * width,
            behavior: 'smooth',
          });
        }

        return nextIndex;
      });
    }, 5000);

    return () => window.clearInterval(timer);
  }, [pairs.length]);

  const handleLogoClick = () => {
    if (isAnimating) return;

    triggerLightHaptic();

    const audio = new Audio(SOUNDS[logoAnimIndex]);
    audio.volume = 0.45;
    audio.play().catch(() => undefined);

    setIsAnimating(true);
    setLogoAnimIndex(prev => (prev + 1) % 3);

    window.setTimeout(() => setIsAnimating(false), 720);
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;

    const width = scrollRef.current.offsetWidth;

    if (width <= 0) return;

    const nextIndex = Math.round(scrollRef.current.scrollLeft / width);

    if (nextIndex !== activeIndex) {
      setActiveIndex(nextIndex);
    }
  };

  const scrollTo = (requestedIndex: number) => {
    if (!scrollRef.current || pairs.length === 0) return;

    const safeIndex = (requestedIndex + pairs.length) % pairs.length;
    const width = scrollRef.current.offsetWidth;

    scrollRef.current.scrollTo({
      left: safeIndex * width,
      behavior: 'smooth',
    });

    setActiveIndex(safeIndex);
  };

  const openWhatsApp = () => {
    window.open(
      `https://wa.me/${WHATSAPP.replace(/\D/g, '')}?text=Hola%2C%20quiero%20hacer%20un%20pedido%20en%20La%20Casa%20del%20Pollazo.`,
      '_blank'
    );
  };

  return (
    <div className="flex flex-col bg-gray-50 pb-10">
      <AnnouncementBanner />

      <div className="relative overflow-hidden hero-water w-full shadow-inner z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.25),transparent_42%)]" />
        <div className="absolute -top-20 -right-16 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-12 -left-20 w-56 h-56 rounded-full bg-yellow-200/20 blur-3xl" />

        <div className="px-5 pt-7 pb-11 relative z-10 text-center flex flex-col items-center">
          <div className="mb-4 text-center">
            {customerName && (
              <p className="text-yellow-100/95 text-[13px] font-black leading-none mb-2 drop-shadow-sm">
                Hola, <span className="text-white">{customerName}</span> 👋
              </p>
            )}

            <p className="text-white font-black text-[28px] leading-none tracking-tight drop-shadow-md">
              {greeting.title}
            </p>

            <p className="text-yellow-100/95 text-[14px] font-semibold leading-snug mt-2 drop-shadow-sm">
              {greeting.phrase}
            </p>
          </div>

          <div
            className="flex justify-center mb-6 relative cursor-pointer active:scale-95 transition-transform"
            onClick={handleLogoClick}
          >
            <div className="absolute inset-0 rounded-full bg-white/15 blur-3xl scale-90" />

            <img
              src={LOGO_URL}
              alt="La Casa del Pollazo"
              className={`relative w-52 h-52 object-contain drop-shadow-2xl transition-all duration-300 ${
                !isAnimating ? 'animate-float-gen' : ''
              } ${isAnimating && logoAnimIndex === 0 ? 'animate-logo-spin' : ''} ${
                isAnimating && logoAnimIndex === 1 ? 'animate-logo-jump' : ''
              } ${isAnimating && logoAnimIndex === 2 ? 'animate-logo-flip' : ''}`}
            />

            {isAnimating && (
              <Sparkles
                className={`absolute text-yellow-300 animate-ping ${SPARKLE_POSITIONS[logoAnimIndex]}`}
                size={50}
              />
            )}
          </div>

          <div className="space-y-1">
            <h1 className="text-white font-black text-[42px] leading-none drop-shadow-md tracking-tighter uppercase">
              Pollo Fresco
            </h1>

            <h2 className="font-black text-[20px] leading-none text-yellow-300 drop-shadow-md tracking-tight uppercase mt-1">
              Directo a tu casa
            </h2>
          </div>

          <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-md rounded-full px-4 py-2 border border-white/20 mt-5 mb-7 text-white">
            <MapPin size={13} className="text-yellow-200" />
            <span className="text-[10px] font-black uppercase tracking-wider">
              Puerto Ayora · Galápagos
            </span>
          </div>

          <div className="w-full max-w-sm flex gap-3">
            <button
              type="button"
              onClick={() => onNavigate('catalog')}
              className="flex-1 bg-white text-orange-600 font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-transform text-xs uppercase tracking-widest text-center flex items-center justify-center gap-2"
            >
              <Store size={16} />
              Comprar
            </button>

            <button
              type="button"
              onClick={openWhatsApp}
              className="flex-1 bg-[#25D366] text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
            >
              <MessageCircle size={16} />
              WhatsApp
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-5 relative z-10">
        <div className="bg-white rounded-[30px] border border-orange-100 shadow-xl shadow-orange-100/40 p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center flex-shrink-0">
              <Tag size={22} />
            </div>

            <div className="flex-1 min-w-0 text-left">
              <p className="text-[9px] font-black text-orange-500 uppercase tracking-[0.2em]">
                Ofertas del día
              </p>

              <h3 className="text-sm font-black text-gray-900 uppercase italic leading-tight mt-1">
                Precios frescos y disponibilidad diaria
              </h3>

              <p className="text-[11px] font-bold text-gray-500 leading-relaxed mt-1">
                Consulta pollos y básicos antes de pedir.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pt-8 pb-2">
        <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.15em] leading-none">
          Compra rápido
        </p>
        <h2 className="text-3xl font-black text-gray-900 italic mt-1 leading-tight">
          Elige tu categoría
        </h2>
      </div>

      <div className="px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-gray-900 uppercase italic text-[11px] tracking-widest">
            Explorar
          </h3>

          <button
            type="button"
            onClick={() => onNavigate('catalog')}
            className="text-orange-500 text-[10px] font-black uppercase flex items-center gap-1 bg-orange-50 px-2.5 py-1.5 rounded-lg active:scale-95 transition-all"
          >
            Ver todo <ChevronRight size={12} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {QUICK_CATEGORIES.map(cat => (
            <button
              key={cat.label}
              type="button"
              onClick={() => onNavigateToCategory(cat.target)}
              className="bg-white border border-orange-50 p-4 rounded-[24px] flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-all hover:bg-orange-50"
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-[9px] font-black text-gray-600 uppercase text-center leading-none tracking-tighter">
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-4">
        <div className="bg-white rounded-[30px] border border-orange-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[9px] font-black text-orange-500 uppercase tracking-[0.2em]">
                Confianza Pollazo
              </p>
              <h3 className="text-sm font-black text-gray-900 uppercase italic mt-1">
                Comprar aquí es fácil
              </h3>
            </div>

            <PackageCheck size={22} className="text-orange-500" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {TRUST_ITEMS.map(item => (
              <div
                key={item.title}
                className="bg-gray-50 border border-gray-100 rounded-2xl p-3 text-center"
              >
                <div className="w-9 h-9 mx-auto rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center mb-2">
                  {item.icon}
                </div>

                <p className="text-[8px] font-black text-gray-900 uppercase leading-tight">
                  {item.title}
                </p>

                <p className="text-[8px] font-bold text-gray-400 leading-tight mt-1 line-clamp-2">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {pairs.length > 0 && (
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔥</span>
              <h3 className="font-black text-gray-900 uppercase italic tracking-tight text-lg">
                Los más pedidos
              </h3>
            </div>

            {pairs.length > 1 && (
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => scrollTo(activeIndex - 1)}
                  className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-sm active:scale-90 text-orange-500"
                  aria-label="Productos anteriores"
                >
                  <ChevronLeft size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => scrollTo(activeIndex + 1)}
                  className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-sm active:scale-90 text-orange-500"
                  aria-label="Productos siguientes"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide touch-auto"
            style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
          >
            {pairs.map((pair, index) => (
              <div
                key={index}
                className="min-w-full snap-center grid grid-cols-2 gap-4 px-1 pb-2"
              >
                {pair.map(product => (
                  <div key={product.id} className="w-full">
                    <ProductCard product={product} compact />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {pairs.length > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {pairs.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => scrollTo(index)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === activeIndex ? 'w-8 bg-orange-500' : 'w-2 bg-gray-200'
                  }`}
                  aria-label={`Ir al grupo ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="px-6 py-4 mb-4">
        <div className="grid grid-cols-3 gap-2 bg-white p-5 rounded-[32px] border border-orange-100 shadow-sm">
          <div className="flex flex-col items-center text-center gap-1.5">
            <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-orange-500">
              <Clock size={18} />
            </div>
            <span className="text-[9px] font-black text-gray-800 uppercase leading-none">
              7 AM - 9 PM
            </span>
          </div>

          <div className="flex flex-col items-center text-center gap-1.5 border-x border-gray-100">
            <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-orange-500">
              <Truck size={18} />
            </div>
            <span className="text-[9px] font-black text-gray-800 uppercase leading-none">
              Delivery
            </span>
          </div>

          <div className="flex flex-col items-center text-center gap-1.5">
            <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-orange-500">
              <Star size={18} fill="currentColor" />
            </div>
            <span className="text-[9px] font-black text-gray-800 uppercase leading-none">
              Garantía
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes logo-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes logo-jump {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.1); }
        }

        @keyframes logo-flip {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }

        .animate-logo-spin {
          animation: logo-spin 0.6s ease-in-out;
        }

        .animate-logo-jump {
          animation: logo-jump 0.6s ease-in-out;
        }

        .animate-logo-flip {
          animation: logo-flip 0.7s ease-in-out;
        }
      `}</style>
    </div>
  );
}
