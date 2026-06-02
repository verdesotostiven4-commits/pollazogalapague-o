import {
  Home,
  Grid3x3 as Grid3X3,
  ShoppingCart,
  Info,
  Sparkles,
  ClipboardList,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import type { Screen } from '../types';

type BottomTab = Exclude<Screen, 'ranking'>;

interface Props {
  current: Screen;
  onNavigate: (s: Screen) => void;
}

const tabs: Array<{
  id: BottomTab;
  icon: LucideIcon;
  labelKey: string;
}> = [
  { id: 'home', icon: Home, labelKey: 'nav.home' },
  { id: 'catalog', icon: Grid3X3, labelKey: 'nav.catalog' },
  { id: 'orders', icon: ClipboardList, labelKey: 'nav.orders' },
  { id: 'cart', icon: ShoppingCart, labelKey: 'nav.cart' },
  { id: 'info', icon: Info, labelKey: 'nav.info' },
];

export default function BottomNav({ current, onNavigate }: Props) {
  const { cartCount } = useCart();
  const { t } = useLanguage();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 safe-area-bottom z-50 pointer-events-none"
      aria-label="Navegación principal"
    >
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none" />

      <div className="relative mx-2 mb-2 rounded-[30px] bg-white/94 backdrop-blur-xl border border-orange-100 shadow-[0_-10px_35px_rgba(249,115,22,0.14)] overflow-visible pointer-events-auto">
        <div className="flex h-[68px] overflow-visible">
          {tabs.map(({ id, icon: Icon, labelKey }) => {
            const label = t(labelKey);
            const isActive = current === id;
            const isCart = id === 'cart';
            const hasItems = isCart && cartCount > 0;

            return (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(id)}
                className="flex-1 flex flex-col items-center justify-center gap-1 relative transition-all duration-200 active:scale-95 overflow-visible"
                aria-label={`Ir a ${label}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <div
                  className={`relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 overflow-visible ${
                    isActive
                      ? 'bg-gradient-to-br from-orange-500 to-yellow-400 text-white shadow-lg shadow-orange-400/35 -translate-y-1'
                      : isCart && hasItems
                        ? 'bg-orange-50 text-orange-500'
                        : 'bg-gray-50 text-gray-400'
                  }`}
                >
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.7 : 2.2}
                    className={isActive ? 'drop-shadow-sm' : ''}
                  />

                  {isActive && (
                    <Sparkles
                      size={10}
                      className="absolute -top-1 -left-1 text-yellow-200 animate-pulse"
                    />
                  )}

                  {hasItems && (
                    <span className="absolute -top-2 -right-2 flex items-center justify-center z-20">
                      <span className="absolute w-7 h-7 rounded-full bg-red-500 opacity-30 animate-ping" />
                      <span className="relative min-w-[21px] h-[21px] px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center leading-none border-2 border-white shadow-md">
                        {cartCount > 99 ? '99+' : cartCount > 9 ? '9+' : cartCount}
                      </span>
                    </span>
                  )}
                </div>

                <span
                  className={`text-[8px] font-black leading-none uppercase tracking-tight transition-colors ${
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
