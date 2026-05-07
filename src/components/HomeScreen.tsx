import { useEffect, useState, useRef, useMemo } from 'react';
import { Clock, Truck, ChevronRight, Star, ChevronLeft, Zap, Gift, Target, History, Sparkles, Award } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext';
import ProductCard from './ProductCard';
import AnnouncementBanner from './AnnouncementBanner';
import { WHATSAPP } from '../utils/whatsapp';
import { Category, Screen } from '../types';

function RevealOnScroll({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setIsVisible(true); }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'}`} style={{ transitionDelay: `${delay}ms` }}>
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
  const { customerName = 'Guerrero', points = 0 } = useUser();
  const { products = [] } = useAdmin();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 🛡️ Filtro seguro: Si products no existe, devolvemos array vacío
  const bestsellers = useMemo(() => 
    (products || []).filter(p => BESTSELLER_IDS.includes(p.id))
  , [products]);

  const pairs = useMemo(() => {
    const p = [];
    for (let i = 0; i < bestsellers.length; i += 2) { p.push(bestsellers.slice(i, i + 2)); }
    return p;
  }, [bestsellers]);

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
      
      <div className="relative overflow-hidden hero-water w-full shadow-inner z-0 px-6 pt-10 pb-14 text-center flex flex-col items-center">
          <div className="absolute inset-0 opacity-20 pointer-events-none">
             <Star className="absolute top-10 left-10 animate-spin-slow text-yellow-200" size={30} />
             <Sparkles className="absolute top-20 right-20 animate-pulse text-white" size={25} />
          </div>
          <img src="/logo-final.png" alt="logo" className="w-32 h-32 object-contain drop-shadow-2xl mb-6" />
          <h1 className="text-white font-black text-4xl tracking-tighter uppercase italic">El Pollazo</h1>
          <h2 className="font-black text-2xl text-yellow-300 tracking-widest uppercase">El Mirador</h2>
      </div>

      {/* 📍 VIP CARD */}
      <div className="px-6 -mt-8 relative z-20">
        <RevealOnScroll>
          <div className="bg-white/90 backdrop-blur-xl border-2 border-white rounded-[35px] p-6 shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-4 text-left">
              <div className="w-12 h-12 bg-gradient-to-tr from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg rotate-3">
                <Zap size={24} fill="currentColor" className="animate-pulse" />
              </div>
              <div className="leading-none">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 italic">Hola, {customerName}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-black text-gray-900 tabular-nums">{(points || 0).toLocaleString()}</span>
                  <span className="text-orange-500 font-black text-[9px] uppercase mt-1">Pollazo Puntos 🍗</span>
                </div>
              </div>
            </div>
            <button onClick={() => onNavigate('ranking')} className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-orange-500 border border-gray-100">
              <ChevronRight size={20} />
            </button>
          </div>
        </RevealOnScroll>
      </div>

      <div className="px-6 py-8 grid grid-cols-2 gap-4">
          <button className="w-full bg-slate-900 rounded-[30px] p-5 text-left relative overflow-hidden group shadow-xl active:scale-95 transition-all">
            <Gift className="text-orange-500 mb-3" size={24} />
            <p className="text-white font-black text-xs uppercase italic leading-none">Ruleta</p>
            <p className="text-orange-500/80 font-black text-[9px] uppercase mt-1">Giro Diario Gratis</p>
          </button>
          <button className="w-full bg-white border border-gray-200 rounded-[30px] p-5 text-left relative overflow-hidden group shadow-sm active:scale-95 transition-all">
            <Target className="text-orange-600 mb-3" size={24} />
            <p className="text-gray-900 font-black text-xs uppercase italic leading-none">Misiones</p>
            <p className="text-gray-400 font-black text-[9px] uppercase mt-1">Gana +Puntos</p>
          </button>
      </div>

      <div className="px-6 pb-6">
        <h3 className="font-black text-gray-900 uppercase italic text-[11px] tracking-[0.2em] mb-4">Surtido del Barrio</h3>
        <div className="grid grid-cols-3 gap-3">
          {QUICK_CATEGORIES.map((cat, idx) => (
            <RevealOnScroll key={cat.label} delay={idx * 50}>
              <button onClick={() => onNavigateToCategory(cat.target)} className="bg-white border border-gray-100 p-4 rounded-[28px] flex flex-col items-center gap-2 shadow-sm active:scale-90 transition-all">
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-[9px] font-black text-gray-500 uppercase text-center leading-none tracking-tighter">{cat.label}</span>
              </button>
            </RevealOnScroll>
          ))}
        </div>
      </div>

      <style>{`
        .hero-water { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); }
        .hero-water::after { content: ''; position: absolute; bottom: -50px; left: -10%; width: 120%; height: 100px; background: #f9fafb; border-radius: 100%; }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 15s linear infinite; }
      `}</style>
    </div>
  );
}
