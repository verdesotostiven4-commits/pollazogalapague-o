import { MessageCircle, Clock, Truck, ChevronRight, Star, MapPin } from 'lucide-react';
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

function getDynamicGreeting(): string {
  const h = new Date().getHours();
  if (h >= 7 && h < 12) return '¡Buenos días! ☀️';
  if (h >= 12 && h < 19) return '¡Buenas tardes! 🍗';
  if (h >= 19 && h < 21) return '¡Buenas noches! 🌙';
  return '¡Bienvenido! 🍗';
}

export default function HomeScreen({ onNavigate }: Props) {
  const greeting = getDynamicGreeting();
  const { customerName } = useUser();
  const { products } = useAdmin();
  // Mostramos los primeros 4 productos como "Más pedidos"
  const bestsellers = products.slice(0, 4);

  const openWhatsApp = () => {
    window.open(`https://wa.me/${WHATSAPP.replace(/\D/g, '')}?text=Hola%2C%20quiero%20hacer%20un%20pedido%20en%20La%20Casa%20del%20Pollazo%20El%20Mirador.`, '_blank');
  };

  return (
    <div className="flex flex-col bg-gray-50">
      <AnnouncementBanner />
      
      {/* 1. BIENVENIDA PERSONALIZADA FUERA DEL HERO */}
      <div className="px-6 pt-6 pb-5 bg-white">
        <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] leading-none">{greeting}</p>
        <h2 className="text-4xl font-black text-gray-900 italic mt-2 tracking-tight">
          Hola, <span className="text-orange-500">{customerName.split(' ') || 'Cliente'}</span> 👋
        </h2>
      </div>

      {/* 2. HERO NARANJA - FULL WIDTH (SIN BORDES) */}
      <div className="relative overflow-hidden hero-water w-full shadow-inner"> 
        <div className="px-6 pt-10 pb-12 relative z-10 text-center flex flex-col items-center">
          
          <p className="text-white/80 text-[11px] font-bold uppercase tracking-[0.2em] mb-4">
            Bienvenido a La Casa del Pollazo 🍗
          </p>

          <div className="flex justify-center mb-6">
            <img src="/logo-final.png" alt="logo" className="w-40 h-40 object-contain animate-float-gen drop-shadow-[0_10px_20px_rgba(0,0,0,0.3)]" />
          </div>

          <div className="space-y-1">
            <h1 className="text-white font-black text-4xl leading-none drop-shadow-md tracking-tighter uppercase">Pollo Fresco</h1>
            <h2 className="font-black text-3xl leading-none text-yellow-300 drop-shadow-md tracking-tighter uppercase">Directo a tu puerta</h2>
          </div>

          <p className="text-white/90 text-sm font-bold mt-4 mb-6">Pedidos rápidos por WhatsApp</p>

          {/* BADGE DE UBICACIÓN RECUPERADO */}
          <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-md rounded-full px-4 py-2 border border-white/20 mb-6">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            <span className="text-white text-[11px] font-bold uppercase tracking-wider">Puerto Ayora, Galápagos</span>
          </div>

          {/* FILA DE ICONOS RECUPERADA */}
          <div className="flex gap-2 flex-wrap justify-center mb-8">
            <div className="flex items-center gap-1.5 bg-black/15 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/10">
              <Clock size={12} className="text-white" />
              <span className="text-white text-[10px] font-bold">7 AM – 9 PM</span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/15 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/10">
              <Truck size={12} className="text-white" />
              <span className="text-white text-[10px] font-bold">Delivery</span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/15 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/10">
              <Star size={12} className="text-yellow-300 fill-yellow-300" />
              <span className="text-white text-[10px] font-bold">Calidad garantizada</span>
            </div>
          </div>
          
          {/* BOTONES RECUPERADOS */}
          <div className="w-full max-w-sm flex gap-3">
             <button onClick={() => onNavigate('catalog')} className="flex-1 bg-white text-orange-600 font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-transform text-xs uppercase tracking-wider">
               Ver Catálogo
             </button>
             <button onClick={openWhatsApp} className="flex-1 bg-[#25D366] text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2 text-xs uppercase tracking-wider">
               <MessageCircle size={18} fill="white" className="text-[#25D366]" /> WhatsApp
             </button>
          </div>
        </div>
      </div>

      {/* 3. SECCIÓN DE PRODUCTOS */}
      <div className="px-4 py-10">
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <h3 className="font-black text-gray-900 uppercase italic tracking-tight text-lg">Los más pedidos</h3>
          </div>
          <button onClick={() => onNavigate('catalog')} className="text-orange-500 text-xs font-black uppercase flex items-center gap-1 bg-orange-50 px-3 py-1.5 rounded-lg">
            Ver todo <ChevronRight size={14} strokeWidth={3} />
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {bestsellers.map(p => (
            <ProductCard key={p.id} product={p} compact />
          ))}
        </div>
      </div>

      {/* FOOTER DEL HOME */}
      <div className="px-6 py-10 bg-white border-t border-gray-100 mb-10 text-center">
        <img src="/logo-final.png" className="w-12 h-12 mx-auto opacity-20 grayscale mb-4" />
        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.3em]">Pollazo El Mirador</p>
      </div>
    </div>
  );
}
