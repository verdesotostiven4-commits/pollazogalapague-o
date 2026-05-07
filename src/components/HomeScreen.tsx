import { MessageCircle, ChevronRight } from 'lucide-react';
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

export default function HomeScreen({ onNavigate }: Props) {
  const { customerName } = useUser();
  const { products } = useAdmin();
  const bestsellers = products.slice(0, 4);

  const openWhatsApp = () => {
    window.open(`https://wa.me/${WHATSAPP.replace(/\D/g, '')}?text=Hola%2C%20quiero%20hacer%20un%20pedido%20en%20La%20Casa%20del%20Pollazo%20El%20Mirador.`, '_blank');
  };

  return (
    <div className="flex flex-col bg-gray-50">
      <AnnouncementBanner />
      
      <div className="px-6 pt-6 pb-4 bg-white">
        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest leading-none">Bienvenido de nuevo,</p>
        <h2 className="text-3xl font-black text-gray-900 italic mt-1">{customerName || 'Cliente'} 👋</h2>
      </div>

      {/* HERO NARANJA COMPLETO */}
      <div className="relative overflow-hidden hero-water w-full shadow-lg"> 
        <div className="px-6 pt-10 pb-12 relative z-10 text-center">
          <div className="flex justify-center mb-6">
            <img src="/logo-final.png" alt="logo" className="w-44 h-44 object-contain animate-float-gen drop-shadow-2xl" />
          </div>
          <h1 className="text-white font-black text-4xl leading-tight drop-shadow-md tracking-tighter uppercase">Pollo Fresco</h1>
          <h2 className="font-black text-3xl leading-tight text-yellow-300 drop-shadow-md tracking-tighter uppercase mt-1">Directo a tu puerta</h2>
          
          <div className="mt-10 flex gap-3">
             <button onClick={() => onNavigate('catalog')} className="flex-1 bg-white text-orange-600 font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-transform text-sm uppercase">Ver Catálogo</button>
             <button onClick={openWhatsApp} className="flex-1 bg-green-500 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2 text-sm uppercase"><MessageCircle size={18}/> WhatsApp</button>
          </div>
        </div>
      </div>

      <div className="px-4 py-8">
        <div className="flex items-center justify-between mb-5 px-1">
          <h3 className="font-black text-gray-900 uppercase italic tracking-tight">🔥 Los más pedidos</h3>
          <button onClick={() => onNavigate('catalog')} className="text-orange-500 text-xs font-bold flex items-center gap-1">Ver todo <ChevronRight size={14}/></button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {bestsellers.map(p => <ProductCard key={p.id} product={p} compact />)}
        </div>
      </div>
    </div>
  );
}
