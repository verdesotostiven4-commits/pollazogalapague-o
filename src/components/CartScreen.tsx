import { Plus, Minus, Trash2, ShoppingBag, MessageCircle, ChevronRight, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext';

type Screen = 'home' | 'catalog' | 'cart' | 'info';

interface Props {
  onCheckout: () => void;
  onNavigate: (s: Screen) => void;
}

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
  // ✅ Usamos el dinero (total) y las unidades (cartCount) del cerebro del carrito
  const { items, removeItem, updateQuantity, clearCart, total, cartCount } = useCart();

  // ✅ LÓGICA DE ENVÍO: $1.50 si es menor a $25, de lo contrario GRATIS
  const deliveryFee = total >= 25 ? 0 : 1.50;
  const finalTotal = total + deliveryFee;

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
    <div className="flex flex-col min-h-full">
      <div className="flex-1 px-4 pt-4 pb-2 space-y-3">
        {items.map(item => {
          // Calculamos el subtotal de este item específico
          const itemPrice = item.product.custom_price || parseFloat((item.product.price || '0').replace(/[^0-9.]/g, ''));
          const itemSubtotal = (itemPrice * item.quantity).toFixed(2);

          return (
            <div key={item.product.id} className="flex gap-3 bg-white rounded-2xl p-3 shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
                <img src={item.product.image} alt={item.product.name} className="w-full h-full object-contain p-1" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 font-bold text-sm leading-snug truncate">{item.product.name}</p>
                <p className="text-xs mt-0.5 font-black text-orange-500">
                  ${itemSubtotal}
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
        <button onClick={clearCart} className="w-full text-gray-400 text-xs font-semibold py-2 active:text-red-400 transition-colors">
          Vaciar pedido
        </button>
      </div>

      <div className="px-4 pb-6 pt-3 bg-white border-t border-gray-100 space-y-3">
        <div className="bg-gray-50 rounded-[30px] p-5 space-y-3 shadow-inner">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 font-bold">Productos ({cartCount})</span>
            <span className="text-gray-800 font-black">${total.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 font-bold flex items-center gap-2">
              <Truck size={14} className="text-orange-400" /> Costo de envío
            </span>
            <span className={`font-black ${deliveryFee === 0 ? 'text-green-500' : 'text-gray-800'}`}>
              {deliveryFee === 0 ? 'GRATIS' : `+$${deliveryFee.toFixed(2)}`}
            </span>
          </div>

          <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
            <span className="text-gray-900 font-black text-base uppercase italic tracking-tighter">Total a Pagar</span>
            <span className="text-orange-600 font-black text-2xl tracking-tighter">${finalTotal.toFixed(2)}</span>
          </div>

          {deliveryFee > 0 && (
            <p className="text-[10px] text-center text-orange-400 font-bold uppercase tracking-widest bg-orange-50 py-2 rounded-xl">
              ¡Agrega ${(25 - total).toFixed(2)} más para envío GRATIS! 🎁
            </p>
          )}
        </div>

        <button
          onClick={handleCheckout}
          className="w-full flex items-center justify-center gap-3 bg-green-500 text-white font-black py-4 rounded-3xl transition-all duration-200 shadow-xl shadow-green-500/30 active:scale-[0.98] text-base uppercase tracking-widest border-b-4 border-green-700"
        >
          <MessageCircle size={20} fill="currentColor" />
          Enviar por WhatsApp
        </button>
      </div>
    </div>
  );
}
