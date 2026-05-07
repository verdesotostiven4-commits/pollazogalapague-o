import { ShoppingCart, ChevronLeft, User, BarChart2, Zap } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useFlyToCart } from '../context/FlyToCartContext';
import { useRef, useEffect } from 'react';
import { Screen } from '../types';

interface Props {
  screen: Screen;
  onNavigate: (s: Screen) => void;
  onOpenProfile?: () => void;
  customerAvatar?: string;
}

// Títulos optimizados para ahorrar espacio
const screenTitles: Record<string, { main: string, sub?: string }> = {
  home: { main: '' },
  catalog: { main: 'Catálogo' },
  cart: { main: 'Mi Pedido' },
  info: { main: 'Información' },
  ranking: { main: 'Ranking', sub: 'VIP' },
  profile: { main: 'Mi Perfil' }
};

export default function AppHeader({ screen, onNavigate, onOpenProfile, customerAvatar }: Props) {
  const { total } = useCart();
  const { cartPop, setCartRef } = useFlyToCart();
  const cartBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (cartBtnRef.current) setCartRef(cartBtnRef as React.RefObject<HTMLButtonElement>);
  }, [setCartRef]);

  const isHome = screen === 'home';
  const title = screenTitles[screen];

  return (
    <header className="flex-shrink-0 safe-area-top bg-white/90 backdrop-blur-xl border-b border-orange-100/50 shadow-sm z-50 sticky top-0">
      <div className="flex items-center h-16 px-4 gap-2">
        
        {/* IZQUIERDA: Logo o Volver */}
        <div className="flex-1 flex items-center min-w-0">
          {isHome ? (
            <div className="flex items-center gap-2 truncate">
              <img src="/logo-final.png" alt="logo" className="h-9 w-9 object-contain" />
              <div className="flex flex-col leading-none truncate">
                <span className="font-black text-[10px] text-gray-900 uppercase tracking-tighter">El Pollazo</span>
                <span className="font-bold text-[8px] text-orange-500 uppercase mt-0.5">El Mirador</span>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => onNavigate('home')} 
              className="flex items-center gap-1 text-orange-600 font-black text-xs uppercase active:scale-95 transition-transform"
            >
              <ChevronLeft size={18} strokeWidth={3} /> <span className="hidden xs:inline">Inicio</span>
            </button>
          )}
        </div>

        {/* CENTRO: Título Responsivo (Solución al bug de overlap) */}
        {!isHome && (
          <div className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
            <span className="font-black text-gray-900 text-sm uppercase italic tracking-tight">
              {title.main}
            </span>
            {title.sub && (
              <span className="bg-orange-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md animate-pulse">
                {title.sub}
              </span>
            )}
          </div>
        )}

        {/* DERECHA: Acciones VIP */}
        <div className="flex-1 flex items-center justify-end gap-1.5">
          {/* Ranking */}
          <button 
            onClick={() => onNavigate('ranking')} 
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90 ${
              screen === 'ranking' ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'bg-gray-50 text-gray-400 border border-gray-100'
            }`}
          >
            <BarChart2 size={18} />
          </button>

          {/* Perfil (Centro de Mando) */}
          <button 
            onClick={onOpenProfile} 
            className={`w-9 h-9 rounded-xl overflow-hidden border transition-all active:scale-90 ${
              screen === 'profile' ? 'border-orange-500 ring-2 ring-orange-100' : 'border-gray-100 bg-gray-50'
            } flex items-center justify-center`}
          >
            {customerAvatar ? (
              <img src={customerAvatar} className="w-full h-full object-cover" />
            ) : (
              <User size={18} className={screen === 'profile' ? 'text-orange-500' : 'text-gray-400'} />
            )}
          </button>

          {/* Carrito */}
          <button 
            ref={cartBtnRef} 
            onClick={() => onNavigate('cart')} 
            className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90 ${
              screen === 'cart' ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-600 border border-orange-100'
            } ${cartPop ? 'scale-110 shadow-xl' : ''}`}
          >
            <ShoppingCart size={18} />
            {total > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                {total}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
