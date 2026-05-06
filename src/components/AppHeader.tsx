import { ShoppingCart, ChevronLeft, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useFlyToCart } from '../context/FlyToCartContext';
import { useRef, useEffect } from 'react';

type Screen = 'home' | 'catalog' | 'cart' | 'info';

const screenTitles: Record<Screen, string> = {
  home: '',
  catalog: 'Catálogo',
  cart: 'Mi Pedido',
  info: 'Información',
};

interface Props {
  screen: Screen;
  onNavigate: (s: Screen) => void;
  scrolled: boolean;
  onOpenProfile?: () => void;
  customerAvatar?: string;
}

export default function AppHeader({ screen, onNavigate, scrolled: _scrolled, onOpenProfile, customerAvatar }: Props) {
  const { total } = useCart();
  const { cartPop, setCartRef } = useFlyToCart();
  const cartBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setCartRef(cartBtnRef as React.RefObject<HTMLButtonElement>);
  }, [setCartRef]);

  const isHome = screen === 'home';

  return (
    <header
      className="flex-shrink-0 safe-area-top bg-white"
      style={{
        zIndex: 40,
        borderBottom: '1px solid rgba(249,115,22,0.10)',
        boxShadow: '0 1px 12px rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex items-center justify-between px-4 h-14">
        {/* Izquierda (Logo o Botón de Volver) */}
        {isHome ? (
          <div className="flex items-center gap-2.5">
            <img
              src="/logo-final.png"
              alt="logo"
              className="h-9 w-auto object-contain"
            />
            <div>
              <div className="font-black text-xs leading-none text-gray-900">
                Pollazo El Mirador
              </div>
              <div className="font-bold text-[10px] tracking-wider uppercase leading-none mt-0.5 text-orange-500">
                Market Especializado
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-1 text-orange-500 font-semibold text-sm active:opacity-60 transition-opacity"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
            Inicio
          </button>
        )}

        {/* Título Central */}
        {!isHome && (
          <span className="font-bold text-gray-900 text-base absolute left-1/2 -translate-x-1/2 pointer-events-none">
            {screenTitles[screen]}
          </span>
        )}

        {/* Lado Derecho: Botón de Perfil + Carrito */}
        <div className="flex items-center gap-2">
          
          {/* Botón de Perfil */}
          <button
            onClick={onOpenProfile}
            className="relative w-10 h-10 flex items-center justify-center rounded-2xl bg-orange-50 active:bg-orange-100 transition-colors overflow-hidden"
          >
            {customerAvatar ? (
              <img src={customerAvatar} alt="Perfil" className="w-full h-full object-cover" />
            ) : (
              <User size={20} className="text-orange-500" />
            )}
          </button>

          {/* Botón de Carrito */}
          <button
            ref={cartBtnRef}
            onClick={() => onNavigate('cart')}
            className={`relative w-10 h-10 flex items-center justify-center rounded-2xl transition-all duration-200 ${
              screen === 'cart'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-400/40'
                : 'bg-orange-50 text-orange-500 active:bg-orange-100'
            } ${cartPop ? 'scale-125' : ''}`}
          >
            <ShoppingCart size={20} />
            {total > 0 && (
              <span
                className={`absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 ${cartPop ? 'scale-150' : ''}`}
                style={{ transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}
              >
                {total}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
