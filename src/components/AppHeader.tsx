import { ShoppingCart, ChevronLeft, User, BarChart2, PackageSearch } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useFlyToCart } from '../context/FlyToCartContext';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext';
import { useRef, useEffect } from 'react';
import { Screen } from '../types';

interface Props {
  screen: Screen;
  onNavigate: (s: Screen) => void;
  onOpenProfile?: () => void;
  customerAvatar?: string;
  onOpenTracking: () => void;
}

export default function AppHeader({ screen, onNavigate, onOpenProfile, customerAvatar, onOpenTracking }: Props) {
  const { total } = useCart();
  const { cartPop, setCartRef } = useFlyToCart();
  const { orders } = useAdmin();
  const { customerPhone } = useUser();
  const cartBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (cartBtnRef.current) setCartRef(cartBtnRef as React.RefObject<HTMLButtonElement>);
  }, [setCartRef]);

  const isHome = screen === 'home';

  // Punto verde si hay pedido activo
  const userNum = customerPhone ? customerPhone.replace(/\D/g, '') : '';
  const hasActiveOrder = orders?.some(o => {
    const orderNum = (o.customer_phone || '').replace(/\D/g, '');
    const match = orderNum.length >= 8 && userNum.length >= 8 && orderNum.slice(-8) === userNum.slice(-8);
    return match && ['Recibido', 'Preparando', 'Enviado'].includes(o.status);
  });

  return (
    <header className="flex-shrink-0 safe-area-top bg-white/80 backdrop-blur-md border-b border-orange-50 shadow-sm z-40 sticky top-0">
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

        <div className="flex items-center gap-2">
          {isHome && (
            <button onClick={onOpenTracking} className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-orange-50 text-orange-500 border border-orange-100 active:scale-90 transition-transform">
              <PackageSearch size={18} />
              {hasActiveOrder && <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse shadow-sm" />}
            </button>
          )}
          <button onClick={() => onNavigate('ranking')} className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${screen === 'ranking' ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>
            <BarChart2 size={18} />
          </button>
          <button onClick={onOpenProfile} className="w-9 h-9 rounded-xl bg-orange-50 overflow-hidden border border-orange-100 flex items-center justify-center">
            {customerAvatar ? <img src={customerAvatar} className="w-full h-full object-cover" /> : <User size={18} className="text-orange-500" />}
          </button>
          <button ref={cartBtnRef} onClick={() => onNavigate('cart')} className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-all ${screen === 'cart' ? 'bg-orange-500 text-white shadow-md' : 'bg-orange-50 text-orange-500'} ${cartPop ? 'scale-125' : ''}`}>
            <ShoppingCart size={18} />
            {total > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm">{total}</span>}
          </button>
        </div>
      </div>
    </header>
  );
}
