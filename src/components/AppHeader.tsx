import { ShoppingCart, ChevronLeft, User, BarChart2 } from 'lucide-react';
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

const screenTitles: Record<string, string> = {
  home: '',
  catalog: 'Catálogo',
  cart: 'Mi Pedido',
  info: 'Información',
  ranking: 'Ranking VIP',
};

// Enlace del Logo Oficial
const LOGO_URL = "https://blogger.googleusercontent.com/img/a/AVvXsEjjZyWBEfS2-yN9AffqCBbrsiquVeUUQYsQPGLI31cI5B5mVzSowezui2lHQ6gpXGKpU5x6Uuuy_YtDfGm72-81dSiCAYnAfNRqcWavKUNO0LMmpeI_bh80Tb1CcAUqM21cn-YPji0ZHyuDq_6CcKs4-kIJmzsEqwFYeXxkMD9SlSrjmhOylKISX_CwHY0";

export default function AppHeader({ screen, onNavigate, onOpenProfile, customerAvatar }: Props) {
  const { total } = useCart();
  const { cartPop, setCartRef } = useFlyToCart();
  const cartBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (cartBtnRef.current) setCartRef(cartBtnRef as React.RefObject<HTMLButtonElement>);
  }, [setCartRef]);

  const isHome = screen === 'home';

  return (
    <header className="flex-shrink-0 safe-area-top bg-white/80 backdrop-blur-md border-b border-orange-50 shadow-sm z-40 sticky top-0">
      <div className="flex items-center justify-between px-4 h-14 relative">
        {isHome ? (
          <div className="flex items-center gap-2.5">
            {/* ✅ LOGO MEJORADO */}
            <div className="relative">
              <img 
                src={LOGO_URL} 
                alt="Pollazo Logo" 
                className="h-10 w-10 object-contain drop-shadow-sm" 
              />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-black text-[12px] text-slate-900 uppercase tracking-tight">Pollazo El Mirador</span>
              <span className="font-bold text-[8px] text-orange-500 uppercase tracking-widest mt-0.5">Market Especializado</span>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => onNavigate('home')} 
            className="flex items-center gap-1 text-orange-500 font-black text-xs uppercase tracking-widest active:scale-90 transition-transform"
          >
            <ChevronLeft size={18} strokeWidth={3} /> Inicio
          </button>
        )}

        {!isHome && (
          <span className="absolute left-1/2 -translate-x-1/2 font-black text-slate-900 text-sm uppercase italic tracking-tighter">
            {screenTitles[screen]}
          </span>
        )}

        <div className="flex items-center gap-2">
          {/* BOTÓN RANKING */}
          <button 
            onClick={() => onNavigate('ranking')} 
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90 ${
              screen === 'ranking' ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'bg-slate-100 text-slate-400'
            }`}
          >
            <BarChart2 size={18} />
          </button>

          {/* BOTÓN PERFIL */}
          <button 
            onClick={onOpenProfile} 
            className="w-9 h-9 rounded-xl bg-orange-50 overflow-hidden border border-orange-100 flex items-center justify-center active:scale-90 transition-transform"
          >
            {customerAvatar ? (
              <img src={customerAvatar} className="w-full h-full object-cover" alt="Perfil" />
            ) : (
              <User size={18} className="text-orange-500" />
            )}
          </button>

          {/* BOTÓN CARRITO */}
          <button 
            ref={cartBtnRef} 
            onClick={() => onNavigate('cart')} 
            className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90 ${
              screen === 'cart' ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'bg-orange-50 text-orange-500'
            } ${cartPop ? 'scale-110' : ''}`}
          >
            <ShoppingCart size={18} />
            {total > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md border-2 border-white animate-in zoom-in">
                {total}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
