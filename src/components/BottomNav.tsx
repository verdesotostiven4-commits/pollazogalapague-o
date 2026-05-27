import {
  Home,
  Grid3x3 as Grid3X3,
  ShoppingCart,
  Info,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCart } from '../context/CartContext';
import type { Screen } from '../types';

type BottomTab = Exclude<Screen, 'ranking'>;

interface Props {
  current: Screen;
  onNavigate: (s: Screen) => void;
}

const tabs: Array<{
  id: BottomTab;
  icon: LucideIcon;
  label: string;
}> = [
  { id: 'home', icon: Home, label: 'Inicio' },
  { id: 'catalog', icon: Grid3X3, label: 'Catálogo' },
  { id: 'cart', icon: ShoppingCart, label: 'Pedido' },
  { id: 'info', icon: Info, label: 'Info' },
];

export default function BottomNav({ current, onNavigate }: Props) {
  const { cartCount } = useCart();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 safe-area-bottom z-50"
      aria-label="Navegación principal"
    >
      <div className="mx-3 mb-2 rounded-[28px] bg-white/90 backdrop-blur-xl border border-orange-100 shadow-[0_-8px_30px_rgba(249,115,22,0.12)] overflow-hidden">
        <div className="flex h-16">
          {tabs.map(({ id, icon: Icon, label }) => {
            const isActive = current === id;
            const isCart = id === 'cart';
            const hasItems = isCart && cartCount > 0;

            return (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(id)}
                className="flex-1 flex flex-col items-center justify-center gap-1 relative transition-all duration-200 active:scale-95"
                aria-label={`Ir a ${label}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <div
                  className={`relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-br from-orange-500 to-yellow-400 text-white shadow-lg shadow-orange-400/35 -translate-y-1'
                      : isCart && hasItems
                        ? 'bg-orange-50 text-orange-500'
                        : 'bg-gray-50 text-gray-400'
                  }`}
                >
                  <Icon
                    size={isCart ? 20 : 21}
                    strokeWidth={isActive ? 2.7 : 2.2}
                    className={isActive ? 'drop-shadow-sm' : ''}
                  />

                  {isActive && (
                    <Sparkles
                      size={11}
                      className="absolute -top-1 -left-1 text-yellow-200 animate-pulse"
                    />
                  )}

                  {hasItems && (
                    <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center">
                      <span className="absolute w-5 h-5 rounded-full bg-red-500 opacity-60 animate-ping" />
                      <span className="relative min-w-[19px] h-[19px] px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center leading-none border-2 border-white shadow-sm">
                        {cartCount > 99 ? '99+' : cartCount > 9 ? '9+' : cartCount}
                      </span>
                    </span>
                  )}
                </div>

                <span
                  className={`text-[9px] font-black leading-none uppercase tracking-tight transition-colors ${
                    isActive ? 'text-orange-500' : 'text-gray-400'
                  }`}
                >
                  {label}
                </span>

                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-1 rounded-t-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
