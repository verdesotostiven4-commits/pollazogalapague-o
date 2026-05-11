import { useEffect, useState, useRef } from 'react';
// ✅ IMPORTACIÓN CORREGIDA: Añadimos Sparkles aquí
import { Clock, Truck, ChevronRight, Star, ChevronLeft, Sparkles } from 'lucide-react';
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

const BESTSELLER_IDS = ['pollo-entero', 'pechuga', 'cuartos', 'agua-vivant-625ml', 'colgate-triple-75ml', 'leche-tru-1l'];

const QUICK_CATEGORIES: { label: string; target: Category; icon: string }[] = [
  { label: 'Pollos', target: 'Pollos', icon: '🍗' },
  { label: 'Embutidos', target: 'Embutidos', icon: '🥓' },
  { label: 'Bebidas', target: 'Bebidas', icon: '🥤' },
  { label: 'LÁCTEOS', target: 'Lácteos y refrigerados', icon: '🥛' },
  { label: 'ABARROTES', target: 'Abarrotes y básicos', icon: '🌾' },
  { label: 'Snacks', target: 'Snacks y dulces', icon: '🍫' },
];

export default function HomeScreen({ onNavigate, onNavigateToCategory }: Props) {
  const { customerName } = useUser();
  const { products } = useAdmin();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [logoAnimIndex, setLogoAnimIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return { title: "¡Buenos días!", phrase: "¿Qué compraremos para el desayuno? ☕" };
    if (hour >= 12 && hour < 18) return { title: "¡Buenas tardes!", phrase: "¿Un pollito para el asado hoy? 🍗" };
    return { title: "¡Buenas noches!", phrase: "¿Cenamos algo rico del Pollazo? 🌙" };
  };
  const greeting = getGreeting();

  const handleLogoClick = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setLogoAnimIndex((prev) => (prev + 1) % 3);
    setTimeout(() => setIsAnimating(false), 700);
  };

  const bestsellers = products.filter(p => BESTSELLER_IDS.includes(p.id));
  const pairs = [];
  for (let i = 0; i < bestsellers.length; i += 2) {
    pairs.push(bestsellers.slice(i, i + 2));
  }

  const handleScroll = () => {
    if (scrollRef.current) {
      const width = scrollRef.current.offsetWidth;
      const scrollLeft = scrollRef.current.scrollLeft;
      const index = Math.round(scrollLeft / width);
      if (index !== activeIndex) setActiveIndex(index);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      if (scrollRef.current) {
        const nextIndex = (activeIndex + 1) % pairs.length;
        const width = scrollRef.current.offsetWidth;
        scrollRef.current.scrollTo({ left: nextIndex * width, behavior: 'smooth' });
      }
    }, 4500);
    return () => clearInterval(timer);
  }, [activeIndex, pairs.length]);

  const scrollTo = (idx: number) => {
    if (scrollRef.current) {
      const width = scrollRef.current.offsetWidth;
      scrollRef.current.scrollTo({ left: idx * width, behavior: 'smooth' });
    }
  };

  const openWhatsApp = () => {
    window.open(`https://wa.me/${WHATSAPP.replace(/\D/g, '')}?text=Hola%2C%20quiero%20hacer%20un%20pedido.`, '_blank');
  };

  return (
    <div className="flex flex-col bg-gray-50 pb-10">
      <AnnouncementBanner />
      
      <div className="relative overflow-hidden hero-water w-full shadow-inner z-0"> 
        <div className="px-6 pt-10 pb-12 relative z-10 text-center flex flex-col items-center">
          
          <div className="mb-4">
            <p className="text-white font-black text-xl italic drop-shadow-sm leading-none uppercase">{greeting.title}</p>
            <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mt-2">{greeting.phrase}</p>
          </div>

          <div className="flex justify-center mb-6 relative cursor-pointer active:scale-95 transition-transform" onClick={handleLogoClick}>
            <img 
              src="https://blogger.googleusercontent.com/img/a/AVvXsEjjZyWBEfS2-yN9AffqCBbrsiquVeUUQYsQPGLI31cI5B5mVzSowezui2lHQ6gpXGKpU5x6Uuuy_YtDfGm72-81dSiCAYnAfNRqcWavKUNO0LMmpeI_bh80Tb1CcAUqM21cn-YPji0ZHyuDq_6CcKs4-kIJmzsEqwFYeXxkMD9SlSrjmhOylKISX_CwHY0" 
              alt="logo" 
              className={`w-52 h-52 object-contain drop-shadow-2xl transition-all duration-300
                ${!isAnimating ? 'animate-float-gen' : ''}
                ${isAnimating && logoAnimIndex === 0 ? 'animate-logo-spin' : ''}
                ${isAnimating && logoAnimIndex === 1 ? 'animate-logo-jump' : ''}
                ${isAnimating && logoAnimIndex === 2 ? 'animate-logo-flip' : ''}
              `} 
            />
            {/* Ahora Sparkles sí está importado y no dará error */}
            {isAnimating && <Sparkles className="absolute top-0 right-0 text-yellow-300 animate-ping" size={40} />}
          </div>

          <div className="space-y-1">
            <h1 className="text-white font-black text-4xl leading-none drop-shadow-md tracking-tighter uppercase">Pollo Fresco</h1>
            <h2 className="font-black text-3xl leading-none text-yellow-300 drop-shadow-md tracking-tighter uppercase">Directo a tu puerta</h2>
          </div>

          <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-md rounded-full px-4 py-2 border border-white/20 mt-6 mb-8 text-white">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Puerto Ayora, Galápagos</span>
          </div>

          <div className="w-full max-w-sm flex gap-3">
             <button onClick={() => onNavigate('catalog')} className="flex-1 bg-white text-orange-600 font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-transform text-xs uppercase tracking-widest text-center">Catálogo</button>
             <button onClick={openWhatsApp} className="flex-1 bg-[#25D366] text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2 text-xs uppercase tracking-widest">WhatsApp</button>
          </div>
        </div>
      </div>

      <div className="px-6 pt-8 pb-2">
        <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.15em] leading-none">Bienvenido de nuevo,</p>
        <h2 className="text-3xl font-black text-gray-900 italic mt-1 leading-tight">
          Hola, <span className="text-orange-500">{typeof customerName === 'string' ? customerName : 'Cliente'}</span> 👋
        </h2>
      </div>

      <div className="px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-gray-900 uppercase italic text-[11px] tracking-widest">Explorar Categorías</h3>
          <button onClick={() => onNavigate('catalog')} className="text-orange-500 text-[10px] font-black uppercase flex items-center gap-1 bg-orange-50 px-2.5 py-1.5 rounded-lg active:scale-95 transition-all">Ver todo <ChevronRight size={12}/></button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {QUICK_CATEGORIES.map((cat) => (
            <button 
              key={cat.label} 
              onClick={() => onNavigateToCategory(cat.target)}
              className="bg-white border border-orange-50 p-4 rounded-[24px] flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-all hover:bg-orange-50"
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-[9px] font-black text-gray-600 uppercase text-center leading-none tracking-tighter">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <h3 className="font-black text-gray-900 uppercase italic tracking-tight text-lg">Los más pedidos</h3>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => scrollTo(activeIndex - 1)} className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-sm active:scale-90 text-orange-500"><ChevronLeft size={16}/></button>
            <button onClick={() => scrollTo(activeIndex + 1)} className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-sm active:scale-90 text-orange-500"><ChevronRight size={16}/></button>
          </div>
        </div>
        
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide touch-auto"
          style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
        >
          {pairs.map((pair, i) => (
            <div key={i} className="min-w-full snap-center grid grid-cols-2 gap-4 px-1 pb-2">
              {pair.map(p => (
                <div key={p.id} className="w-full">
                  <ProductCard product={p} compact />
                </div>
              ))}
            </div>
          ))}
        </div>
        
        <div className="flex justify-center gap-2 mt-6">
          {pairs.map((_, i) => (
            <button 
              key={i} 
              onClick={() => scrollTo(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === activeIndex ? 'w-8 bg-orange-500' : 'w-2 bg-gray-200'}`} 
            />
          ))}
        </div>
      </div>

      <div className="px-6 py-4 mb-4">
         <div className="grid grid-cols-3 gap-2 bg-white p-5 rounded-[32px] border border-orange-100 shadow-sm">
            <div className="flex flex-col items-center text-center gap-1.5">
               <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-orange-500"><Clock size={18}/></div>
               <span className="text-[9px] font-black text-gray-800 uppercase leading-none">7 AM - 9 PM</span>
            </div>
            <div className="flex flex-col items-center text-center gap-1.5 border-x border-gray-100">
               <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-orange-500"><Truck size={18}/></div>
               <span className="text-[9px] font-black text-gray-800 uppercase leading-none">Delivery</span>
            </div>
            <div className="flex flex-col items-center text-center gap-1.5">
               <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-orange-500"><Star size={18} fill="currentColor"/></div>
               <span className="text-[9px] font-black text-gray-800 uppercase leading-none">Garantía</span>
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
        .animate-logo-spin { animation: logo-spin 0.6s ease-in-out; }
        .animate-logo-jump { animation: logo-jump 0.6s ease-in-out; }
        .animate-logo-flip { animation: logo-flip 0.7s ease-in-out; }
      `}</style>
    </div>
  );
}
