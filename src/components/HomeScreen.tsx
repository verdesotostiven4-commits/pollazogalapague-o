import { MessageCircle, Clock, Truck, ChevronRight, Star } from 'lucide-react';
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
  const bestsellers = products.slice(0, 4); // O los IDs que prefieras

  const openWhatsApp = () => {
    window.open(`https://wa.me/${WHATSAPP.replace(/\D/g, '')}?text=Hola%2C%20quiero%20hacer%20un%20pedido%20en%20La%20Casa%20del%20Pollazo%20El%20Mirador.`, '_blank');
  };

  return (
    <div className="flex flex-col bg-gray-50">
      <AnnouncementBanner />
      
      <div className="px-5 pt-6 pb-2">
        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">{greeting}</p>
        <h2 className="text-3xl font-black text-gray-900 italic">{customerName || 'Cliente'} 👋</h2>
      </div>

      <div className="relative overflow-hidden hero-water w-full"> 
        <div className="px-6 pt-10 pb-10 relative z-10 text-center">
          <div className="flex justify-center mb-6 relative">
            <img src="/logo-final.png" alt="logo" className="w-40 h-40 object-contain relative z-10 animate-float-gen" />
          </div>
          <h1 className="text-white font-black text-4xl leading-tight drop-shadow-lg uppercase tracking-tighter">Pollo Fresco</h1>
          <h2 className="font-black text-3xl leading-tight text-yellow-300 drop-shadow-lg uppercase tracking-tighter">Directo a tu puerta</h2>
          <div className="mt-8 flex gap-3">
             <button onClick={() => onNavigate('catalog')} className="flex-1 bg-white text-orange-600 font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-transform">Ver Catálogo</button>
             <button onClick={openWhatsApp} className="flex-1 bg-green-500 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2"><MessageCircle size={18}/> WhatsApp</button>
          </div>
        </div>
      </div>

      <div className="px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-gray-900 uppercase italic">Los más pedidos</h3>
          <button onClick={() => onNavigate('catalog')} className="text-orange-500 text-xs font-bold flex items-center">Ver todo <ChevronRight size={14}/></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {bestsellers.map(p => <ProductCard key={p.id} product={p} compact />)}
        </div>
      </div>
    </div>
  );
}
