import { Home, Grid3x3 as Grid3X3, ShoppingCart, Info } from 'lucide-react';
import { useCart } from '../context/CartContext';

type Screen = 'home' | 'catalog' | 'cart' | 'info';

interface Props {
  current: Screen;
  onNavigate: (s: Screen) => void;
}

const tabs: { id: Screen; icon: typeof Home; label: string }[] = [
  { id: 'home', icon: Home, label: 'Inicio' },
  { id: 'catalog', icon: Grid3X3, label: 'Catálogo' },
  { id: 'cart', icon: ShoppingCart, label: 'Pedido' },
  { id: 'info', icon: Info, label: 'Info' },
];

export default function BottomNav({ current, onNavigate }: Props) {
  const { total } = useCart();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-area-bottom" style={{ zIndex: 50 }}>
      <div className="flex h-16">
        {tabs.map(({ id, icon: Icon, label }) => {
          const isActive = current === id;
          const isCart = id === 'cart';
          const hasItems = isCart && total > 0;

          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 relative transition-all duration-200 active:scale-95 ${
                isActive ? 'text-orange-500' : 'text-gray-400'
              }`}
            >
              {isCart ? (
                <div className={`relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-br from-orange-500 to-yellow-400 shadow-lg shadow-orange-400/40'
                    : 'bg-gray-100'
                }`}>
                  <Icon size={20} className={isActive ? 'text-white' : 'text-gray-500'} strokeWidth={isActive ? 2.5 : 2} />
                  {/* Pulsing red dot when items in cart */}
                  {hasItems && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center">
                      <span className="absolute w-4 h-4 rounded-full bg-red-500 opacity-75 animate-ping" />
                      <span className="relative w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center leading-none">
                        {total > 9 ? '9+' : total}
                      </span>
                    </span>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                </div>
              )}
              <span className={`text-[10px] font-semibold leading-none ${isActive ? 'text-orange-500' : 'text-gray-400'}`}>
                {label}
              </span>
              {isActive && !isCart && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-orange-500" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
