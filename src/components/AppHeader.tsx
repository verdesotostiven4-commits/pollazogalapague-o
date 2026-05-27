import { useEffect, useMemo, useRef, type RefObject } from 'react';
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
  cart: 'Mi Pedido',
  info: 'Información',
  ranking: 'Ranking VIP',
};

const getCustomerLevel = (exp: number) => {
  if (exp >= 250) return { level: 5, emoji: '🏆', label: 'Leyenda' };
  if (exp >= 120) return { level: 4, emoji: '👑', label: 'VIP' };
  if (exp >= 60) return { level: 3, emoji: '⭐', label: 'Fiel' };
  if (exp >= 25) return { level: 2, emoji: '🔥', label: 'Fan' };

  return { level: 1, emoji: '🐣', label: 'Nuevo' };
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
    customerExp,
    isVip,
    customerName,
  } = useUser();

  const cartBtnRef = useRef<HTMLButtonElement>(null);
  const avatarUrl = customerAvatar || storedAvatar;
  const isHome = screen === 'home';
  const level = useMemo(() => getCustomerLevel(customerExp || 0), [customerExp]);

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
    <header className="flex-shrink-0 safe-area-top bg-white/85 backdrop-blur-xl border-b border-orange-50 shadow-sm z-40 sticky top-0">
      <div className="flex items-center justify-between px-4 h-14 relative">
        {isHome ? (
          <button
            type="button"
            onClick={handleRefresh}
            className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform text-left min-w-0"
            aria-label="Actualizar inicio"
          >
            <div className="relative w-10 h-10 flex-shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 to-yellow-300/20 rounded-2xl blur-md" />
              <img
                src={LOGO_URL}
                alt="La Casa del Pollazo"
                className="relative h-10 w-10 object-contain drop-shadow-sm transition-opacity duration-300"
                loading="eager"
                decoding="async"
              />
            </div>

            <div className="flex flex-col leading-none min-w-0">
              <span className="font-black text-[10.5px] text-gray-900 uppercase tracking-tight truncate">
                La Casa del Pollazo
              </span>
              <span className="font-black text-[9px] text-orange-500 uppercase tracking-widest mt-1 truncate">
                El #1 del mercado
              </span>
            </div>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-1 text-orange-500 font-black text-sm active:scale-95 transition-transform"
            aria-label="Volver al inicio"
          >
            <ChevronLeft size={20} strokeWidth={3} />
            Inicio
          </button>
        )}

        {!isHome && (
          <span className="absolute left-1/2 -translate-x-1/2 font-black text-gray-900 text-sm uppercase italic tracking-tighter max-w-[128px] truncate">
            {screenTitles[screen]}
          </span>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('ranking')}
            className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90 ${
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
            className="relative w-9 h-9 rounded-xl bg-orange-50 overflow-visible border border-orange-100 flex items-center justify-center active:scale-90 transition-transform shadow-sm"
            aria-label={customerName ? `Perfil de ${customerName}` : 'Abrir perfil'}
          >
            <div className="w-full h-full rounded-xl overflow-hidden flex items-center justify-center bg-orange-50">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  className="w-full h-full object-cover"
                  alt="Perfil"
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <User size={18} className="text-orange-500" />
              )}
            </div>

            <span className="absolute -bottom-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-slate-900 text-white text-[8px] font-black flex items-center justify-center border-2 border-white leading-none shadow-sm">
              {level.level}
            </span>

            {isVip && (
              <span className="absolute -top-1 -left-1 w-[17px] h-[17px] rounded-full bg-yellow-400 text-yellow-950 flex items-center justify-center border-2 border-white shadow-sm">
                <Crown size={10} fill="currentColor" />
              </span>
            )}
          </button>

          <button
            ref={cartBtnRef}
            type="button"
            onClick={() => onNavigate('cart')}
            className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90 ${
              screen === 'cart'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
                : 'bg-orange-50 text-orange-500 hover:bg-orange-100'
            } ${cartPop ? 'scale-110 ring-4 ring-orange-200' : ''}`}
            aria-label="Abrir carrito"
          >
            <ShoppingCart size={18} />

            {cartPop && (
              <Sparkles
                size={13}
                className="absolute -top-1 -left-1 text-yellow-400 animate-ping"
              />
            )}

            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-[18px] h-[18px] min-w-[18px] rounded-full flex items-center justify-center shadow-sm border border-white leading-none">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {isHome && customerName && (
        <div className="px-4 pb-2 -mt-1">
          <div className="inline-flex items-center gap-1.5 bg-orange-50/80 border border-orange-100 rounded-full px-3 py-1">
            <span className="text-[10px] leading-none">{level.emoji}</span>
            <span className="text-[8px] font-black uppercase tracking-widest text-orange-600">
              Nivel {level.level} · {level.label}
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
