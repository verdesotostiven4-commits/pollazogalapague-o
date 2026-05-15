import { useState, useRef } from 'react';
import { Plus, Minus, Trash2, ShoppingBag, MessageCircle, ChevronRight, ChevronDown } from 'lucide-react';
import { useCart } from '../context/CartContext';

type Screen = 'home' | 'catalog' | 'cart' | 'info';

interface Props {
  onCheckout: () => void;
  onNavigate: (s: Screen) => void;
}

const isFixedPrice = (price: string | undefined) => {
  const p = price ?? '';
  return p.startsWith('$') && !isNaN(parseFloat(p.replace('$', '')));
};

const CONFETTI_COLORS = ['#f97316', '#fbbf24', '#ea580c', '#fb923c', '#fde68a', '#f59e0b', '#fdba74', '#ffffff'];

function spawnConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;
  const count = 55;
  const cx = canvas.width / 2;
  const cy = canvas.height * 0.55;

  const particles = Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8;
    const speed = 5 + Math.random() * 8;
    return {
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 5,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 3 + Math.random() * 5,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3,
    };
  });

  let frame = 0;
  const MAX = 65;

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const alpha = Math.max(0, 1 - frame / MAX);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.vx *= 0.98;
      p.rotation += p.rotSpeed;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
      ctx.restore();
    });
    frame++;
    if (frame < MAX) requestAnimationFrame(animate);
    else { canvas.remove(); }
  }
  requestAnimationFrame(animate);
}

function triggerHaptic() {
  try { if ('vibrate' in navigator) navigator.vibrate([30, 15, 30]); } catch {}
}

export default function CartScreen({ onCheckout, onNavigate }: Props) {
  const { items, removeItem, updateQuantity, clearCart, total } = useCart();
  const [confirmClear, setConfirmClear] = useState(false);
  const [showArrow, setShowArrow] = useState(true); 
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleClearRequest = () => {
    if (confirmClear) {
      clearCart();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop > 10) {
      setShowArrow(false);
    } else {
      setShowArrow(true);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const hasConsult = items.some(i => !i.product.custom_price && !isFixedPrice(i.product.price));
  const totalUnits = items.reduce((s, i) => s + i.quantity, 0);

  const handleCheckout = () => {
    triggerHaptic();
    spawnConfetti();
    setTimeout(() => onCheckout(), 200);
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 px-6 text-center">
        <div className="w-24 h-24 bg-orange-50 rounded-3xl flex items-center justify-center mb-5">
          <ShoppingBag size={40} className="text-orange-300" />
        </div>
        <h2 className="font-black text-gray-900 text-xl mb-2">Tu pedido está vacío</h2>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed">Agrega productos del catálogo para comenzar tu pedido.</p>
        <button
          onClick={() => onNavigate('catalog')}
          className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-yellow-400 text-white font-bold px-8 py-3.5 rounded-2xl shadow-lg shadow-orange-300/40 active:scale-95 transition-transform"
        >
          Ver catálogo <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  return (
    /* ✅ CAMBIO: h-full y overflow-hidden para bloquear el scroll exterior */
    <div className="flex flex-col h-full bg-white overflow-hidden relative">
      
      {/* ✅ CAMBIO: flex-1 sin max-h rígido para que se ajuste al espacio real */}
      <div 
        ref={scrollRef} 
        onScroll={handleScroll}
        className="flex-1 px-4 pt-4 pb-2 space-y-3 overflow-y-auto scrollbar-hide"
      >
        {items.map(item => {
          const customPrice = item.product.custom_price;
          const fixed = isFixedPrice(item.product.price);
          const priceToDisplay = customPrice || (fixed ? parseFloat((item.product.price ?? '0').replace('$', '')) : null);
          const itemSubtotal = priceToDisplay ? (priceToDisplay * item.quantity).toFixed(2) : null;

          return (
            <div key={item.product.id} className="flex gap-3 bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
                <img src={item.product.image} alt={item.product.name} className="w-full h-full object-contain p-1" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 font-bold text-sm leading-snug truncate">{item.product.name}</p>
                <p className={`text-xs mt-0.5 font-semibold ${itemSubtotal ? 'text-orange-500' : 'text-gray-400'}`}>
                  {itemSubtotal ? `$${itemSubtotal}` : 'Consultar precio'}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 active:scale-90 active:bg-orange-100 transition-all">
                    <Minus size={13} />
                  </button>
                  <span className="text-gray-900 font-black text-sm w-6 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 active:scale-90 active:bg-orange-200 transition-all">
                    <Plus size={13} />
                  </button>
                </div>
              </div>
              <button onClick={() => removeItem(item.product.id)}
                className="self-center p-2 text-gray-300 hover:text-red-400 active:text-red-500 rounded-xl hover:bg-red-50 transition-all">
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}

        <button 
          onClick={handleClearRequest} 
          className={`w-full text-xs font-semibold py-4 transition-all duration-300 ${
            confirmClear ? 'text-red-600 font-black scale-105' : 'text-gray-400 active:text-red-400'
          }`}
        >
          {confirmClear ? '¿ESTÁS SEGURO? PULSA OTRA VEZ ❌' : 'Vaciar carrito'}
        </button>
      </div>

      {showArrow && items.length > 5 && (
        /* ✅ AJUSTE: Posición de la flecha un poco más arriba para que no choque con el total */
        <div 
          onClick={scrollToBottom}
          className="absolute bottom-[240px] left-1/2 -translate-x-1/2 animate-bounce text-orange-500 z-20 cursor-pointer active:scale-90 transition-transform"
        >
          <ChevronDown size={28} strokeWidth={3} />
        </div>
      )}

      {/* ✅ CAMBIO: pb-4 en lugar de pb-6 para que no haya espacio extra abajo del botón */}
      <div className="px-4 pb-4 pt-3 bg-white border-t border-gray-100 space-y-3 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Productos</span>
            <span className="text-gray-800 font-bold">{totalUnits} unidad{totalUnits !== 1 ? 'es' : ''}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{hasConsult ? 'Subtotal parcial' : 'Total'}</span>
            <span className="text-orange-600 font-black">${total.toFixed(2)}</span>
          </div>
          {hasConsult && (
            <p className="text-xs text-gray-400 pt-1 border-t border-gray-200 uppercase font-bold text-[9px]">
              Algunos productos requieren confirmación de precio
            </p>
          )}
        </div>
        <button
          onClick={handleCheckout}
          className="w-full flex items-center justify-center gap-3 bg-green-500 text-white font-black py-4 rounded-2xl transition-all duration-200 shadow-xl shadow-green-500/30 active:scale-[0.98] text-base"
        >
          <MessageCircle size={20} />
          Enviar pedido por WhatsApp
        </button>
      </div>
    </div>
  );
}
