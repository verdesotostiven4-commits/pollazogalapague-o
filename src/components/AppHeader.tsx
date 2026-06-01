import { useEffect, useRef, type RefObject } from 'react';
import {
  ShoppingCart,
  ChevronLeft,
  User,
  BarChart2,
  Crown,
  Sparkles,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useFlyToCart } from '../context/FlyToCartContext';
import { useUser } from '../context/UserContext';
import type { Screen } from '../types';

interface Props {
  screen: Screen;
  onNavigate: (s: Screen) => void;
  onOpenProfile?: () => void;
  customerAvatar?: string;
}

const LOGO_URL =
  'https://blogger.googleusercontent.com/img/a/AVvXsEjjZyWBEfS2-yN9AffqCBbrsiquVeUUQYsQPGLI31cI5B5mVzSowezui2lHQ6gpXGKpU5x6Uuuy_YtDfGm72-81dSiCAYnAfNRqcWavKUNO0LMmpeI_bh80Tb1CcAUqM21cn-YPji0ZHyuDq_6CcKs4-kIJmzsEqwFYeXxkMD9SlSrjmhOylKISX_CwHY0';

const screenTitles: Record<Screen, string> = {
  home: '',
  catalog: 'Catálogo',
  orders: 'Mis pedidos',
  cart: 'Carrito',
  info: 'Información',
  ranking: 'Ranking VIP',
};

export default function AppHeader({
  screen,
  onNavigate,
  onOpenProfile,
  customerAvatar,
}: Props) {
  const { cartCount } = useCart();
  const { cartPop, setCartRef } = useFlyToCart();
  const {
    customerAvatar: storedAvatar,
    customerName,
  } = useUser();

  const cartBtnRef = useRef<HTMLButtonElement>(null);
  const avatarUrl = customerAvatar || storedAvatar;
  const isHome = screen === 'home';

  useEffect(() => {
    const logo = new Image();
    logo.decoding = 'async';
    logo.src = LOGO_URL;

    if (avatarUrl) {
      const avatar = new Image();
      avatar.decoding = 'async';
      avatar.src = avatarUrl;
    }
  }, [avatarUrl]);

  useEffect(() => {
    if (cartBtnRef.current) {
      setCartRef(cartBtnRef as RefObject<HTMLButtonElement>);
    }
  }, [setCartRef]);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <header className="flex-shrink-0 safe-area-top bg-white/92 backdrop-blur-xl border-b border-orange-50 shadow-sm z-40 sticky top-0">
      <div className="flex items-center justify-between px-4 h-16 relative">
        {isHome ? (
          <button
            type="button"
            onClick={handleRefresh}
            className="flex items-center gap-2.5 cursor-pointer active:scale-95 transition-transform text-left min-w-0"
            aria-label="Actualizar inicio"
          >
            <div className="relative w-11 h-11 flex-shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 to-yellow-300/20 rounded-[18px] blur-md" />
              <img
                src={LOGO_URL}
                alt="La Casa del Pollazo"
                className="relative h-11 w-11 object-contain drop-shadow-sm transition-opacity duration-300"
                loading="eager"
                decoding="async"
              />
            </div>

            <div className="flex flex-col leading-none min-w-0">
              <span className="font-black text-[11px] text-gray-900 uppercase tracking-tight truncate">
                La Casa del Pollazo
              </span>
              <span className="font-black text-[9px] text-orange-500 uppercase tracking-widest mt-1.5 truncate">
                El #1 del mercado
              </span>
            </div>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-1 text-orange-500 font-black text-sm active:scale-95 transition-transform min-w-[78px]"
            aria-label="Volver al inicio"
          >
            <ChevronLeft size={21} strokeWidth={3} />
            Inicio
          </button>
        )}

        {!isHome && (
          <span className="absolute left-1/2 -translate-x-1/2 font-black text-gray-900 text-[13px] uppercase tracking-wide max-w-[155px] truncate leading-none text-center">
            {screenTitles[screen]}
          </span>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('ranking')}
            className={`relative w-10 h-10 flex items-center justify-center rounded-2xl transition-all active:scale-90 ${
              screen === 'ranking'
                ? 'bg-gradient-to-br from-orange-500 to-yellow-400 text-white shadow-lg shadow-orange-200'
                : 'bg-gray-100 text-gray-400 hover:bg-orange-50 hover:text-orange-500'
            }`}
            aria-label="Ir al ranking VIP"
          >
            {screen === 'ranking' ? (
              <Crown size={18} className="drop-shadow-sm" />
            ) : (
              <BarChart2 size={18} />
            )}

            {screen !== 'ranking' && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-yellow-400 border-2 border-white shadow-sm">
                <span className="absolute inset-0 rounded-full bg-yellow-300 animate-ping opacity-50" />
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenProfile}
            className="relative w-10 h-10 rounded-2xl bg-orange-50 overflow-hidden border border-orange-100 flex items-center justify-center active:scale-90 transition-transform shadow-sm"
            aria-label={customerName ? `Perfil de ${customerName}` : 'Abrir perfil'}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                className="w-full h-full object-cover"
                alt="Perfil"
                loading="eager"
                decoding="async"
              />
            ) : (
              <User size={19} className="text-orange-500" />
            )}
          </button>

          <button
            ref={cartBtnRef}
            type="button"
            onClick={() => onNavigate('cart')}
            className={`relative w-10 h-10 flex items-center justify-center rounded-2xl transition-all active:scale-90 overflow-visible ${
              screen === 'cart'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
                : 'bg-orange-50 text-orange-500 hover:bg-orange-100'
            } ${cartPop ? 'scale-110 ring-4 ring-orange-200' : ''}`}
            aria-label="Abrir carrito"
          >
            <ShoppingCart size={19} />

            {cartPop && (
              <Sparkles
                size={13}
                className="absolute -top-1 -left-1 text-yellow-400 animate-ping"
              />
            )}

            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black min-w-[19px] h-[19px] px-1 rounded-full flex items-center justify-center shadow-sm border-2 border-white leading-none">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
