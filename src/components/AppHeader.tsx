import { ShoppingCart, ChevronLeft, User, BarChart2, PackageSearch } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useFlyToCart } from '../context/FlyToCartContext';
import { useRef, useEffect } from 'react';
import { Screen } from '../types';

interface Props {
  screen: Screen;
  onNavigate: (s: Screen) => void;
  onOpenProfile?: () => void;
  customerAvatar?: string;
  onOpenTracking: () => void;
}

const screenTitles: Record<string, string> = {
  home: '',
  catalog: 'Catálogo',
  cart: 'Mi Pedido',
  info: 'Información',
  ranking: 'Ranking VIP',
};

export default function AppHeader({ screen, onNavigate, onOpenProfile, customerAvatar, onOpenTracking }: Props) {
  const { total } = useCart();
  const { cartPop, setCartRef } = useFlyToCart();
  const cartBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (cartBtnRef.current) setCartRef(cartBtnRef as React.RefObject<HTMLButtonElement>);
  }, [setCartRef]);

  const isHome = screen === 'home';

  return (
    <header className="flex-shrink-0 safe-area-top bg-white border-b border-orange-50 shadow-sm z-40">
      <div className="flex items-center justify-between px-4 h-14 relative">
        {isHome ? (
          <div className="flex items-center gap-2">
            <img src="/logo-final.png" alt="logo" className="h-9 w-auto" />
            <div className="flex flex-col leading-none">
              <span className="font-black text-[11px] text-gray-900 uppercase">Pollazo El Mirador</span>
              <span className="font-bold text-[9px] text-orange-500 uppercase tracking-tighter mt-1">Market Especializado</span>
            </div>
          </div>
        ) : (
          <button onClick={() => onNavigate('home')} className="flex items-center gap-1 text-orange-500 font-bold text-sm">
            <ChevronLeft size={20} strokeWidth={3} /> Inicio
          </button>
        )}

        {!isHome && <span className="absolute left-1/2 -translate-x-1/2 font-black text-gray-900 text-sm uppercase italic">{screenTitles[screen]}</span>}

        <div className="flex items-center gap-2">
          <button 
            onClick={onOpenTracking}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-green-50 text-green-600 border border-green-100 active:scale-90 transition-transform"
          >
            <PackageSearch size={18} />
          </button>

          <button onClick={() => onNavigate('ranking')} className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${screen === 'ranking' ? 'bg-orange-500 text-white shadow-md shadow-orange-100' : 'bg-gray-100 text-gray-400'}`}>
            <BarChart2 size={18} />
          </button>

          <button onClick={onOpenProfile} className="w-9 h-9 rounded-xl bg-orange-50 overflow-hidden border border-orange-100 flex items-center justify-center active:scale-90">
            {customerAvatar ? <img src={customerAvatar} className="w-full h-full object-cover" /> : <User size={18} className="text-orange-500" />}
          </button>

          <button ref={cartBtnRef} onClick={() => onNavigate('cart')} 
            className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-all ${screen === 'cart' ? 'bg-orange-500 text-white shadow-md' : 'bg-orange-50 text-orange-500'} ${cartPop ? 'scale-125' : ''}`}>
            <ShoppingCart size={18} />
            {total > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm">{total}</span>}
          </button>
        </div>
      </div>
    </header>
  );
}
