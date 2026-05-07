import { useEffect, useState, useRef } from 'react';
import { Clock, Truck, ChevronRight, Star, ChevronLeft, Zap, Gift, Target, History, Sparkles, Award } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext';
import ProductCard from './ProductCard';
import AnnouncementBanner from './AnnouncementBanner';
import { WHATSAPP } from '../utils/whatsapp';
import { Category, Screen } from '../types';

// 🛠️ REVELACIÓN AL SCROLL (Efecto Pin Pin Jeje)
function RevealOnScroll({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={ref} 
      className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

interface Props {
  onNavigate: (s: Screen) => void;
  onNavigateToCategory: (cat: Category) => void;
}

const BESTSELLER_IDS = ['pollo-entero', 'pechuga', 'cuartos', 'agua-vivant-625ml', 'colgate-triple-75ml', 'leche-tru-1l'];

const QUICK_CATEGORIES: { label: string; target: Category; icon: string }[] = [
  { label: 'Pollos', target: 'Pollos', icon: '🍗' },
  { label: 'Lácteos', target: 'Lácteos y refrigerados', icon: '🥛' },
  { label: 'Abarrotes', target: 'Abarrotes y básicos', icon: '🌾' },
  { label: 'Bebidas', target: 'Bebidas', icon: '🥤' },
  { label: 'Snacks', target: 'Snacks y dulces', icon: '🍫' },
  { label: 'Limpieza', target: 'Limpieza y hogar', icon: '🧼' },
];

export default function HomeScreen({ onNavigate, onNavigateToCategory }: Props) {
  // 🛡️ PROTECCIÓN ANTI-CRASH: Fallbacks por si el contexto no está listo
  const user = useUser();
  const customerName = user?.customerName || 'Guerrero';
  const points = user?.points ?? 0; // Si es null o undefined, usa 0
  
  const { products = [] } = useAdmin();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const bestsellers = products.filter(p => BESTSELLER_IDS.includes(p.id));
  const pairs = [];
  for (let i = 0; i < bestsellers.length; i += 2) { pairs.push(bestsellers.slice(i, i + 2)); }

  const handleScroll = () => {
    if (scrollRef.current) {
      const width = scrollRef.current.offsetWidth;
      const index = Math.round(scrollRef.current.scrollLeft / width);
      if (index !== activeIndex) setActiveIndex(index);
    }
  };

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
    <div className="flex flex-col bg-gray-50 pb-24">
      <AnnouncementBanner />
      
      {/* 1. HERO - EL MIRADOR ELITE */}
      <div className="relative overflow-hidden hero-water w-full shadow-inner z-0"> 
        <div className="px-6 pt-10 pb-14 relative z-10 text-center flex flex-col items-center">
          <div className="absolute inset-0 pointer-events-none opacity-20">
             <Star className="absolute top-10 left-10 animate-spin-slow text-yellow-200" size={30} />
             <Sparkles className="absolute top-20 right-20 animate-pulse text-white" size={25} />
          </div>

          <div className="flex justify-center mb-6">
            <img src="/logo-final.png" alt="logo" className="w-32 h-32 object-contain animate-float-gen drop-shadow-2xl" />
          </div>
          
          <div className="space-y-1">
            <h1 className="text-white font-black text-4xl leading-none tracking-tighter uppercase italic">El Pollazo</h1>
            <h2 className="font-black text-2xl leading-none text-yellow-300 tracking-widest uppercase opacity-90">El Mirador</h2>
          </div>

          <div className="w-full max-w-xs mt-8 flex gap-3">
             <button onClick={() => onNavigate('catalog')} className="flex-1 bg-white text-orange-600 font-black py-3.5 rounded-2xl shadow-xl active:scale-95 transition-all text-[10px] uppercase tracking-widest">Catálogo</button>
             <button onClick={openWhatsApp} className="flex-1 bg-[#25D366] text-white font-black py-3.5 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest">WhatsApp</button>
          </div>
        </div>
      </div>

      {/* 📍 2. VIP POINTS CARD (Protegida contra errores) */}
      <div className="px-6 -mt-8 relative z-20">
        <RevealOnScroll>
          <div className="bg-white/80 backdrop-blur-xl border-2 border-white rounded-[35px] p-6 shadow-[0_15px_35px_rgba(0,0,0,0.1)] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-tr from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg rotate-3">
                <Zap size={24} fill="currentColor" className="animate-pulse" />
              </div>
              <div className="leading-none text-left">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 italic">Bienvenido, {customerName}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-black text-gray-900 tabular-nums">
                    {points.toLocaleString()}
                  </span>
                  <span className="text-orange-500 font-black text-[9px] uppercase tracking-tighter mt-1">Pollazo Puntos 🍗</span>
                </div>
              </div>
            </div>
            <button onClick={() => onNavigate('ranking')} className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 border border-gray-100 active:scale-90 transition-all">
              <ChevronRight size={20} />
            </button>
          </div>
        </RevealOnScroll>
      </div>

      {/* 🎡 3. GAMIFICATION HUB */}
      <div className="px-6 py-8 grid grid-cols-2 gap-4">
        <RevealOnScroll delay={100}>
          <button className="w-full bg-slate-900 rounded-[30px] p-5 text-left relative overflow-hidden group active:scale-95 transition-all shadow-xl border-b-4 border-black">
            <div className="absolute -right-4 -top-4 text-orange-500/10 group-hover:rotate-12 transition-transform">
               <History size={80} />
            </div>
            <Gift className="text-orange-500 mb-3" size={24} />
            <p className="text-white font-black text-xs uppercase italic leading-none">Ruleta</p>
            <p className="text-orange-500/80 font-black text-[9px] uppercase mt-1">Giro Diario Gratis</p>
          </button>
        </RevealOnScroll>

        <RevealOnScroll delay={200}>
          <button className="w-full bg-white border border-gray-200 rounded-[30px] p-5 text-left relative overflow-hidden group active:scale-95 transition-all shadow-sm border-b-4 border-gray-100">
            <div className="absolute -right-4 -top-4 text-orange-500/5 group-hover:scale-110 transition-transform">
               <Target size={80} />
            </div>
            <Target className="text-orange-600 mb-3" size={24} />
            <p className="text-gray-900 font-black text-xs uppercase italic leading-none">Misiones</p>
            <p className="text-gray-400 font-black text-[9px] uppercase mt-1">Gana +Puntos</p>
          </button>
        </RevealOnScroll>
      </div>

      {/* 4. CATEGORÍAS */}
      <div className="px-6 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-gray-900 uppercase italic text-[11px] tracking-[0.2em]">Surtido del Barrio</h3>
          <button onClick={() => onNavigate('catalog')} className="text-orange-600 text-[9px] font-black uppercase flex items-center gap-1 bg-orange-100 px-3 py-1.5 rounded-xl">Todo <ChevronRight size={10}/></button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {QUICK_CATEGORIES.map((cat, idx) => (
            <RevealOnScroll key={cat.label} delay={idx * 50}>
              <button 
                onClick={() => onNavigateToCategory(cat.target)}
                className="bg-white border border-gray-100 p-4 rounded-[28px] flex flex-col items-center gap-2 shadow-sm active:scale-90 transition-all hover:bg-orange-50/30"
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-[9px] font-black text-gray-500 uppercase text-center leading-none tracking-tighter">{cat.label}</span>
              </button>
            </RevealOnScroll>
          ))}
        </div>
      </div>

      {/* 5. LOS MÁS PEDIDOS */}
      <div className="px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="bg-orange-500 p-1.5 rounded-lg text-white shadow-lg shadow-orange-200"><Trophy size={16}/></div>
            <h3 className="font-black text-gray-900 uppercase italic tracking-tight text-lg">Top del Mirador</h3>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => scrollTo(activeIndex - 1)} className="w-9 h-9 bg-white rounded-xl flex items-center justify-center border border-gray-100 shadow-sm active:scale-90 text-orange-500 transition-all"><ChevronLeft size={18}/></button>
            <button onClick={() => scrollTo(activeIndex + 1)} className="w-9 h-9 bg-white rounded-xl flex items-center justify-center border border-gray-100 shadow-sm active:scale-90 text-orange-500 transition-all"><ChevronRight size={18}/></button>
          </div>
        </div>
        
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide touch-auto"
          style={{ scrollBehavior: 'smooth' }}
        >
          {pairs.length > 0 ? pairs.map((pair, i) => (
            <div key={i} className="min-w-full snap-center grid grid-cols-2 gap-4 px-1 pb-4">
              {pair.map((p, pIdx) => (
                <RevealOnScroll key={p.id} delay={pIdx * 100}>
                  <ProductCard product={p} compact />
                </RevealOnScroll>
              ))}
            </div>
          )) : (
            <div className="w-full text-center py-10 opacity-30 italic font-black uppercase text-[10px]">Cargando favoritos...</div>
          )}
        </div>
      </div>

      {/* 6. INFO STRIP */}
      <div className="px-6 py-4">
         <div className="grid grid-cols-3 gap-2 bg-slate-900 p-6 rounded-[35px] shadow-2xl border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-orange-500/10 to-transparent pointer-events-none"></div>
            <div className="flex flex-col items-center text-center gap-2 relative z-10">
               <Clock size={18} className="text-orange-500" />
               <span className="text-[8px] font-black text-white uppercase tracking-widest leading-none">7 AM - 9 PM</span>
            </div>
            <div className="flex flex-col items-center text-center gap-2 border-x border-white/10 relative z-10 px-2">
               <Truck size={18} className="text-orange-500" />
               <span className="text-[8px] font-black text-white uppercase tracking-widest leading-none">A domicilio</span>
            </div>
            <div className="flex flex-col items-center text-center gap-2 relative z-10">
               <Award size={18} className="text-orange-500" />
               <span className="text-[8px] font-black text-white uppercase tracking-widest">Calidad 100%</span>
            </div>
         </div>
      </div>

      <style>{`
        .hero-water { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 15s linear infinite; }
        .hero-water::after {
          content: ''; position: absolute; bottom: -50px; left: -10%; width: 120%; height: 100px;
          background: #f9fafb; border-radius: 100%;
        }
      `}</style>
    </div>
  );
}
