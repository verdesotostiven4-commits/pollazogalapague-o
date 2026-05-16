import { useState, useRef } from 'react';
import { Plus, Minus, Trash2, ShoppingBag, MessageCircle, ChevronRight, ChevronDown, Banknote, QrCode, Building, AlertCircle } from 'lucide-react';
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

// ✅ VIBRACIONES HÁPTICAS LOGÍSTICAS DIVERSIFICADAS
const triggerDryTap = () => {
  try { if ('vibrate' in navigator) navigator.vibrate(15); } catch {} // Un toque seco
};

const triggerDoubleTap = () => {
  try { if ('vibrate' in navigator) navigator.vibrate([25, 35, 25]); } catch {} // Dos toques rápidos
};

export default function CartScreen({ onCheckout, onNavigate }: Props) {
  const { items, removeItem, updateQuantity, clearCart, total } = useCart();
  const [confirmClear, setConfirmClear] = useState(false);
  const [showArrow, setShowArrow] = useState(true); 
  
  // ✅ ESTADOS DE MÉTODO DE PAGO INICIALIZADOS EN NULL (BLOQUEO ACTIVO)
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'deuna' | 'transferencia' | null>(null);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  
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

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 2000);
  };

  // ✅ Validación estricta para activar el botón de WhatsApp
  const isPaymentReady = paymentMethod === 'efectivo' || paymentMethod === 'deuna' || (paymentMethod === 'transferencia' && selectedBank !== null);

  const hasConsult = items.some(i => !i.product.custom_price && !isFixedPrice(i.product.price));
  const totalUnits = items.reduce((s, i) => s + i.quantity, 0);

  const handleCheckout = () => {
    if (!isPaymentReady) return;
    triggerDryTap();
    spawnConfetti();
    
    // Almacenamos los datos exactos para el mensaje automático de WhatsApp y el Admin
    localStorage.setItem('selectedPaymentMethod', paymentMethod || '');
    localStorage.setItem('selectedBank', selectedBank || 'Ninguno');
    
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
    <div className="flex flex-col h-full bg-white overflow-hidden relative">
      {/* Contenedor con scroll para los productos */}
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

        {/* ✅ SECCIÓN DE MÉTODOS DE PAGO INTERACTIVOS */}
        <div className="pt-4 border-t border-gray-100 space-y-3">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Método de Pago</h3>
          
          <div className="grid grid-cols-3 gap-2">
            {/* Efectivo */}
            <button
              onClick={() => { setPaymentMethod('efectivo'); setSelectedBank(null); triggerDryTap(); }}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 ${
                paymentMethod === 'efectivo'
                  ? 'bg-orange-50 border-orange-400 text-orange-600 font-black shadow-sm'
                  : 'bg-gray-50 border-gray-100 text-gray-400 font-bold'
              }`}
            >
              <Banknote size={20} className={paymentMethod === 'efectivo' ? 'text-orange-500' : 'text-gray-400'} />
              <span className="text-[11px] mt-1">Efectivo</span>
            </button>

            {/* Deuna! */}
            <button
              onClick={() => { setPaymentMethod('deuna'); setSelectedBank(null); triggerDryTap(); }}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 ${
                paymentMethod === 'deuna'
                  ? 'bg-purple-50 border-purple-400 text-purple-700 font-black shadow-sm'
                  : 'bg-gray-50 border-gray-100 text-gray-400 font-bold'
              }`}
            >
              <QrCode size={20} className={paymentMethod === 'deuna' ? 'text-purple-600' : 'text-gray-400'} />
              <span className="text-[11px] mt-1">Deuna!</span>
            </button>

            {/* Transferencia */}
            <button
              onClick={() => { setPaymentMethod('transferencia'); triggerDoubleTap(); }}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 ${
                paymentMethod === 'transferencia'
                  ? 'bg-blue-50 border-blue-400 text-blue-700 font-black shadow-sm'
                  : 'bg-gray-50 border-gray-100 text-gray-400 font-bold'
              }`}
            >
              <Building size={20} className={paymentMethod === 'transferencia' ? 'text-blue-600' : 'text-gray-400'} />
              <span className="text-[11px] mt-1">Transferencia</span>
            </button>
          </div>

          {/* Despliegues Dinámicos */}
          <div className="transition-all duration-300">
            {paymentMethod === 'efectivo' && (
              <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100 text-center animate-in fade-in duration-300">
                <p className="text-xs text-gray-500 font-bold">Pagas en efectivo al recibir tu pedido en tu puerta. 💵</p>
              </div>
            )}

            {paymentMethod === 'deuna' && (
              <div className="bg-purple-50/40 rounded-2xl p-4 border border-purple-100 flex flex-col items-center text-center space-y-2 animate-in fade-in duration-300">
                <p className="text-xs text-purple-900 font-black uppercase tracking-tight">Escanea el código desde tu App Deuna! o Pichincha</p>
                <div className="w-32 h-32 bg-white rounded-xl p-2 border border-purple-200/60 shadow-inner flex items-center justify-center">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=LaCasaDelPollazoDeunaQR" alt="QR Deuna" className="w-full h-full object-contain" />
                </div>
                <p className="text-[10px] text-purple-500 font-black uppercase tracking-tight">⚠️ RECUERDA ENVIAR EL COMPROBANTE DE PAGO AL FINALIZAR</p>
              </div>
            )}

            {paymentMethod === 'transferencia' && (
              <div className="space-y-3 animate-in fade-in duration-300">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Selecciona tu Banco de Origen:</p>
                
                {/* 🇪🇨 SUBMENÚ INTERACTIVO DE BANCOS DE ECUADOR */}
                <div className="flex flex-col gap-2">
                  {/* Pichincha */}
                  <button 
                    onClick={() => { setSelectedBank('pichincha'); triggerDoubleTap(); }}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      selectedBank === 'pichincha' ? 'bg-yellow-50 border-yellow-400 text-yellow-900 font-black scale-[1.01]' : 'bg-white border-gray-100 text-gray-600 font-bold'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center text-xs text-yellow-950 font-black">P</span>
                    <span className="text-xs">Banco Pichincha</span>
                  </button>

                  {/* Guayaquil */}
                  <button 
                    onClick={() => { setSelectedBank('guayaquil'); triggerDoubleTap(); }}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      selectedBank === 'guayaquil' ? 'bg-pink-50 border-pink-400 text-pink-700 font-black scale-[1.01]' : 'bg-white border-gray-100 text-gray-600 font-bold'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center text-xs text-white font-black">G</span>
                    <span className="text-xs">Banco Guayaquil</span>
                  </button>

                  {/* Pacífico */}
                  <button 
                    onClick={() => { setSelectedBank('pacifico'); triggerDoubleTap(); }}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      selectedBank === 'pacifico' ? 'bg-teal-50 border-teal-400 text-teal-800 font-black scale-[1.01]' : 'bg-white border-gray-100 text-gray-600 font-bold'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center text-xs text-white font-black">B</span>
                    <span className="text-xs">Banco del Pacífico</span>
                  </button>

                  {/* Austro */}
                  <button 
                    onClick={() => { setSelectedBank('austro'); triggerDoubleTap(); }}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      selectedBank === 'austro' ? 'bg-red-50 border-red-400 text-red-700 font-black scale-[1.01]' : 'bg-white border-gray-100 text-gray-600 font-bold'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-xs text-white font-black">A</span>
                    <span className="text-xs">Banco del Austro</span>
                  </button>

                  {/* Produbanco / Bolivariano */}
                  <button 
                    onClick={() => { setSelectedBank('otros'); triggerDoubleTap(); }}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      selectedBank === 'otros' ? 'bg-green-50 border-green-400 text-green-700 font-black scale-[1.01]' : 'bg-white border-gray-100 text-gray-600 font-bold'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center text-xs text-white font-black">O</span>
                    <span className="text-xs">Produbanco / Otros Bancos</span>
                  </button>
                </div>

                {/* CUADRO DE DATOS CENTRALIZADO EN PICHINCHA SI SE SELECCIONÓ BANCO */}
                {selectedBank && (
                  <div className="bg-blue-50/40 rounded-2xl p-3 border border-blue-100 space-y-2 mt-2 animate-in fade-in duration-300">
                    <p className="text-xs text-blue-900 font-black uppercase tracking-tight">Datos de nuestra cuenta central Pichincha:</p>
                    
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-blue-50">
                        <div>
                          <span className="text-[9px] text-gray-400 block font-bold uppercase">Banco</span>
                          <span className="font-bold text-gray-700">Banco Pichincha (Ahorros)</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-blue-50">
                        <div>
                          <span className="text-[9px] text-gray-400 block font-bold uppercase">Número de Cuenta</span>
                          <span className="font-mono font-black text-gray-800">2204567890</span>
                        </div>
                        <button onClick={() => handleCopyText('2204567890', 'cuenta')} className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded-lg active:scale-90 transition-all">
                          {copiedLabel === 'cuenta' ? '¡Copiado!' : 'Copiar'}
                        </button>
                      </div>

                      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-blue-50">
                        <div>
                          <span className="text-[9px] text-gray-400 block font-bold uppercase">Cédula del Titular (Para Interbancarios)</span>
                          <span className="font-mono font-black text-gray-800">1726543210</span>
                        </div>
                        <button onClick={() => handleCopyText('1726543210', 'cedula')} className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded-lg active:scale-90 transition-all">
                          {copiedLabel === 'cedula' ? '¡Copiado!' : 'Copiar'}
                        </button>
                      </div>

                      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-blue-50">
                        <div>
                          <span className="text-[9px] text-gray-400 block font-bold uppercase">Beneficiario</span>
                          <span className="font-bold text-gray-700">La Casa del Pollazo</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-blue-500 font-black uppercase tracking-tight mt-1">⚠️ RECUERDA ENVIAR EL COMPROBANTE DE PAGO AL FINALIZAR</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showArrow && items.length > 5 && (
        <div 
          onClick={scrollToBottom}
          className="absolute bottom-[240px] left-1/2 -translate-x-1/2 animate-bounce text-orange-500 z-20 cursor-pointer active:scale-90 transition-transform"
        >
          <ChevronDown size={28} strokeWidth={3} />
        </div>
      )}

      {/* Sección inferior fija */}
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

        {/* ✅ LÓGICA DE CONDICIONAL: SE MUESTRA EL BOTÓN DE WHATSAPP SOLO SI YA SE COMPLETARON LOS PASOS ANTERIORES */}
        {isPaymentReady ? (
          <button
            onClick={handleCheckout}
            className="w-full flex items-center justify-center gap-3 bg-green-500 text-white font-black py-4 rounded-2xl transition-all duration-200 shadow-xl shadow-green-500/30 active:scale-[0.98] text-base animate-in slide-in-from-bottom-4"
          >
            <MessageCircle size={20} />
            Enviar pedido por WhatsApp
          </button>
        ) : (
          <div className="w-full flex items-center justify-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-black p-4 rounded-2xl text-center uppercase tracking-tight animate-pulse">
            <AlertCircle size={16} />
            Selecciona tu método de pago para completar el pedido
          </div>
        )}
      </div>
    </div>
  );
}
