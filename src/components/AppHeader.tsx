import { ShoppingCart, User, BarChart2, PackageSearch } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext';
import { Screen } from '../types';

interface Props {
  screen: Screen;
  onNavigate: (s: Screen) => void;
  onOpenProfile: () => void;
  customerAvatar?: string;
  onOpenTracking: () => void;
}

export default function AppHeader({ screen, onNavigate, onOpenProfile, customerAvatar, onOpenTracking }: Props) {
  const { total } = useCart();
  const { orders } = useAdmin();
  const { customerPhone } = useUser();
  const isHome = screen === 'home';

  const userNum = customerPhone ? customerPhone.replace(/\D/g, '').slice(-8) : '';
  const hasActiveTrack = orders?.some(o => (o.customer_phone || '').replace(/\D/g, '').slice(-8) === userNum && o.notes);

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-orange-50 sticky top-0 z-40 px-4 h-14 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <img src="/logo-final.png" alt="logo" className="h-8" />
        <span className="font-black text-[10px] uppercase italic leading-none">La Casa del Pollazo</span>
      </div>

      <div className="flex items-center gap-2">
        {isHome && (
          <button onClick={onOpenTracking} className="relative w-9 h-9 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center border border-orange-100">
            <PackageSearch size={18} />
            {hasActiveTrack && <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />}
          </button>
        )}
        
        <button onClick={() => onNavigate('ranking')} className="w-9 h-9 bg-gray-100 text-gray-400 rounded-xl flex items-center justify-center">
          <BarChart2 size={18} />
        </button>

        <button onClick={onOpenProfile} className="w-9 h-9 bg-orange-50 rounded-xl overflow-hidden border border-orange-100 flex items-center justify-center">
          {customerAvatar ? <img src={customerAvatar} className="w-full h-full object-cover" /> : <User size={18} className="text-orange-500" />}
        </button>

        <button onClick={() => onNavigate('cart')} className="relative w-9 h-9 bg-orange-500 text-white rounded-xl flex items-center justify-center shadow-lg">
          <ShoppingCart size={18} />
          {total > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-[9px] w-4 h-4 rounded-full flex items-center justify-center">{total}</span>}
        </button>
      </div>
    </header>
  );
}
