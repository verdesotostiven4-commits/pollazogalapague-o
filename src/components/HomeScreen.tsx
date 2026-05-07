import { useEffect, useState, useRef } from 'react';
import { MessageCircle, Clock, Truck, ChevronRight, Star, ChevronLeft } from 'lucide-react';
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

const QUICK_CATEGORIES: { label: Category; icon: string }[] = [
  { label: 'Pollos', icon: '🍗' },
  { label: 'Embutidos', icon: '🥓' },
  { label: 'Bebidas', icon: '🥤' },
  { label: 'Lácteos y refrigerados', icon: '🥛' },
  { label: 'Abarrotes y básicos', icon: '🌾' },
  { label: 'Snacks y dulces', icon: '🍫' },
];

export default function HomeScreen({ onNavigate, onNavigateToCategory }: Props) {
  const { customerName } = useUser();
  const { products } = useAdmin();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

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
      setActiveIndex(index);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      if (scrollRef.current) {
        const nextIndex = (activeIndex + 1) % pairs.length;
        const width = scrollRef.current.offsetWidth;
        scrollRef.current.scrollTo({
          left: nextIndex * width,
          behavior: 'smooth'
        });
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
    window.open(`https://wa.me/${WHATSAPP.replace(/\D/g, '')}?text=Hola%2C%20quiero%20hacer%20un%20pedido%20en%20La%20Casa%20del%20Pollazo%20El%20Mirador.`, '_blank');
  };

  return (
    <div className="flex flex-col bg-gray-50 pb-10">
      <AnnouncementBanner />
      
      {/* 1. HERO NARANJA COMPLETO */}
      <div className="relative overflow-hidden hero-water w-full shadow-inner z-0"> 
        <div className="px-6 pt-10 pb-12 relative z-10 text-center flex flex-col items-center">
          <p className="text-white/80 text-[10px] font-black uppercase tracking-[0.3em] mb-4">La Casa del Pollazo 🍗</p>
          <div className="flex justify-center mb-6">
            <img src="/logo-final.png" alt="logo" className="w-40 h-40 object-contain animate-float-gen drop-shadow-2xl" />
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
             <button onClick={() => onNavigate('catalog')} className="flex-1 bg-white text-orange-600 font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-transform text-xs uppercase tracking-widest">Ver Catálogo</button>
             <button onClick={openWhatsApp} className="flex-1 bg-[#25D366] text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2 text-xs uppercase tracking-widest">WhatsApp</button>
          </div>
        </div>
      </div>

      {/* 2. SALUDO PERSONALIZADO */}
      <div className="px-6 pt-8 pb-2">
        <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.15em] leading-none">Bienvenido de nuevo,</p>
        <h2 className="text-3xl font-black text-gray-900 italic mt-1 leading-tight">
          Hola, <span className="text-orange-500">{customerName.split(' ') || 'Cliente'}</span> 👋
        </h2>
      </div>

      {/* 3. CATEGORÍAS RÁPIDAS */}
      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-4 px-2">
          <h3 className="font-black text-gray-900 uppercase italic text-[11px] tracking-widest">Explorar Categorías</h3>
          <button onClick={() => onNavigate('catalog')} className="text-orange-500 text-[10px] font-black uppercase flex items-center gap-1 bg-orange-50 px-2.5 py-1.5 rounded-lg active:scale-95 transition-all">Ver todo <ChevronRight size={12}/></button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {QUICK_CATEGORIES.map((cat) => (
            <button 
              key={cat.label} 
              onClick={() => onNavigateToCategory(cat.label)}
              className="bg-white border border-orange-50 p-4 rounded-[24px] flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-all hover:bg-orange-50"
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-[9px] font-black text-gray-600 uppercase text-center leading-none">{cat.label.split(' ')}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. LOS MÁS PEDIDOS (CON SCROLL NATIVO Y BLINDADO) */}
      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <h3 className="font-black text-gray-900 uppercase italic tracking-tight text-lg">Los más pedidos</h3>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => scrollTo(activeIndex - 1)} className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-sm active:scale-90 text-orange-500"><ChevronLeft size={16}/></button>
            <button onClick={() => scrollTo(activeIndex + 1)} className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-sm active:scale-90 text-orange-500"><ChevronRight size={16}/></button>
          </div>
        </div>
        
        {/* ✅ FIX AQUÍ: Se cambió 'touch-pan-x' por 'touch-pan-y' */}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide touch-pan-y" 
          style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
        >
          {pairs.map((pair, i) => (
            <div key={i} className="min-w-full snap-center grid grid-cols-2 gap-4 px-1 pb-2">
              {pair.map(p => (
                <ProductCard key={p.id} product={p} compact />
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

      {/* 5. INFO STRIP */}
      <div className="px-4 py-4 mb-4">
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
    </div>
  );
}
