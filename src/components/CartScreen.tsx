import { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  MessageCircle,
  ChevronRight,
  ChevronDown,
  Banknote,
  QrCode,
  Building,
  AlertCircle,
  MapPin,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';
import {
  deliveryFeeOf,
  isFixedPrice,
  itemHasKnownPrice,
  itemUnitPrice,
} from '../utils/whatsapp';
import type { Screen } from '../types';

interface Props {
  onCheckout: () => void;
  onNavigate: (s: Screen) => void;
  onRequireLogin: (mode: 'block' | 'change_location') => void;
  onEarlySave: () => Promise<void> | void;
}

const CONFETTI_COLORS = [
  '#f97316',
  '#fbbf24',
  '#ea580c',
  '#fb923c',
  '#fde68a',
  '#f59e0b',
  '#fdba74',
  '#ffffff',
];

function spawnConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  if (!ctx) {
    canvas.remove();
    return;
  }

  const count = 55;
  const cx = canvas.width / 2;
  const cy = canvas.height * 0.55;

  const particles = Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8;
    const speed = 5 + Math.random() * 8;

    return {
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 5,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 3 + Math.random() * 5,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3,
    };
  });

  let frame = 0;
  const max = 65;

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const alpha = Math.max(0, 1 - frame / max);

    particles.forEach(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.25;
      particle.vx *= 0.98;
      particle.rotation += particle.rotSpeed;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.fillRect(
        -particle.size / 2,
        -particle.size / 2,
        particle.size,
        particle.size * 0.5
      );
      ctx.restore();
    });

    frame++;

    if (frame < max) {
      requestAnimationFrame(animate);
    } else {
      canvas.remove();
    }
  }

  requestAnimationFrame(animate);
}

// ✅ VIBRACIONES HÁPTICAS LOGÍSTICAS DIVERSIFICADAS
const triggerDryTap = () => {
  try {
    if ('vibrate' in navigator) navigator.vibrate(15);
  } catch {
    // Algunos navegadores no permiten vibración.
  }
};

const triggerDoubleTap = () => {
  try {
    if ('vibrate' in navigator) navigator.vibrate([25, 35, 25]);
  } catch {
    // Algunos navegadores no permiten vibración.
  }
};

const toMoney = (value: number): number => Number(value.toFixed(2));

export default function CartScreen({
  onCheckout,
  onNavigate,
  onRequireLogin,
  onEarlySave,
}: Props) {
  const { items, removeItem, updateQuantity, clearCart, total } = useCart();

  const {
    customerName,
    customerPhone,
    customerLat,
    customerLng,
    customerReference,
  } = useUser();

  const [confirmClear, setConfirmClear] = useState(false);
  const [showArrow, setShowArrow] = useState(true);

  const [paymentMethod, setPaymentMethod] = useState<
    'efectivo' | 'deuna' | 'transferencia' | null
  >(null);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [isOrderSaved, setIsOrderSaved] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const subtotal = toMoney(total);
  const deliveryFee = deliveryFeeOf(subtotal);
  const finalTotal = toMoney(subtotal + deliveryFee);

  const hasConsult = items.some(item => !itemHasKnownPrice(item));
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  const isPaymentReady =
    paymentMethod === 'efectivo' ||
    paymentMethod === 'deuna' ||
    (paymentMethod === 'transferencia' && selectedBank !== null);

  const resetSavedOrder = () => {
    if (isOrderSaved) {
      setIsOrderSaved(false);
    }
  };

  const handleClearRequest = () => {
    if (confirmClear) {
      clearCart();
      setConfirmClear(false);
      setIsOrderSaved(false);
      setPaymentMethod(null);
      setSelectedBank(null);
      return;
    }

    setConfirmClear(true);
    window.setTimeout(() => setConfirmClear(false), 3000);
  };

  const handleRemoveItem = (productId: string) => {
    removeItem(productId);
    resetSavedOrder();
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    updateQuantity(productId, quantity);
    resetSavedOrder();
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setShowArrow(e.currentTarget.scrollTop <= 10);
  };

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  };

  // ✅ AUTO-SCROLL INTELIGENTE
  useEffect(() => {
    if (paymentMethod) {
      const timer = window.setTimeout(() => {
        scrollToBottom();
      }, 150);

      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [paymentMethod, selectedBank, isOrderSaved]);

  const handlePaymentMethodClick = (
    method: 'efectivo' | 'deuna' | 'transferencia'
  ) => {
    const hasProfile = Boolean(customerName && customerPhone);
    const hasLocation = Boolean(customerLat && customerLng && customerReference);

    if (!hasProfile || !hasLocation) {
      triggerDryTap();
      onRequireLogin('block');
      return;
    }

    setPaymentMethod(method);
    setIsOrderSaved(false);

    if (method === 'transferencia') {
      triggerDoubleTap();
    } else {
      setSelectedBank(null);
      triggerDryTap();
    }
  };

  const handleEarlySaveClick = async () => {
    if (!isPaymentReady || isSavingOrder) return;

    triggerDryTap();
    setIsSavingOrder(true);

    try {
      localStorage.setItem('selectedPaymentMethod', paymentMethod || '');
      localStorage.setItem('selectedBank', selectedBank || 'Ninguno');

      await onEarlySave();

      setIsOrderSaved(true);
    } catch (error) {
      console.error('No se pudo guardar el pedido anticipado:', error);
      setIsOrderSaved(false);
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleCopyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLabel(label);
      window.setTimeout(() => setCopiedLabel(null), 2000);
    } catch {
      setCopiedLabel(null);
    }
  };

  const handleBankSelect = (bank: string) => {
    setSelectedBank(bank);
    setIsOrderSaved(false);
    triggerDoubleTap();
  };

  const handleCheckout = () => {
    if (!isPaymentReady || !isOrderSaved) return;

    triggerDryTap();
    spawnConfetti();

    window.setTimeout(() => onCheckout(), 200);
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 px-6 text-center">
        <div className="w-24 h-24 bg-orange-50 rounded-3xl flex items-center justify-center mb-5">
          <ShoppingBag size={40} className="text-orange-300" />
        </div>

        <h2 className="font-black text-gray-900 text-xl mb-2">
          Tu pedido está vacío
        </h2>

        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
          Agrega productos del catálogo para comenzar tu pedido.
        </p>

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
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 px-4 pt-4 pb-2 space-y-3 overflow-y-auto scrollbar-hide"
      >
        {items.map(item => {
          const unitPrice = itemUnitPrice(item);
          const itemSubtotal = unitPrice > 0 ? (unitPrice * item.quantity).toFixed(2) : null;
          const customPrice = item.product.custom_price;
          const fixed = isFixedPrice(item.product.price);

          return (
            <div
              key={item.product.id}
              className="flex gap-3 bg-white rounded-2xl p-3 shadow-sm border border-gray-100"
            >
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="w-full h-full object-contain p-1"
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-gray-900 font-bold text-sm leading-snug truncate">
                  {item.product.name}
                </p>

                <p
                  className={`text-xs mt-0.5 font-semibold ${
                    itemSubtotal ? 'text-orange-500' : 'text-gray-400'
                  }`}
                >
                  {itemSubtotal
                    ? `$${itemSubtotal}`
                    : customPrice || fixed
                      ? `$${unitPrice.toFixed(2)}`
                      : 'Consultar precio'}
                </p>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                    className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 active:scale-90 active:bg-orange-100 transition-all"
                    aria-label="Restar producto"
                  >
                    <Minus size={13} />
                  </button>

                  <span className="text-gray-900 font-black text-sm w-6 text-center">
                    {item.quantity}
                  </span>

                  <button
                    onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                    className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 active:scale-90 active:bg-orange-200 transition-all"
                    aria-label="Sumar producto"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              <button
                onClick={() => handleRemoveItem(item.product.id)}
                className="self-center p-2 text-gray-300 hover:text-red-400 active:text-red-500 rounded-xl hover:bg-red-50 transition-all"
                aria-label="Eliminar producto"
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}

        <button
          onClick={handleClearRequest}
          className={`w-full text-xs font-semibold py-4 transition-all duration-300 ${
            confirmClear
              ? 'text-red-600 font-black scale-105'
              : 'text-gray-400 active:text-red-400'
          }`}
        >
          {confirmClear ? '¿ESTÁS SEGURO? PULSA OTRA VEZ ❌' : 'Vaciar carrito'}
        </button>

        {/* ✅ SECCIÓN DE CONFIRMACIÓN / CAMBIO DE UBICACIÓN */}
        {customerLat && customerLng && (
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in duration-300">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <MapPin size={16} />
              </div>

              <div className="min-w-0">
                <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">
                  Dirección de Entrega
                </span>
                <p className="text-xs font-bold text-gray-700 truncate">
                  {customerReference || 'Ubicación en Puerto Ayora'}
                </p>
              </div>
            </div>

            <button
              onClick={() => onRequireLogin('change_location')}
              className="text-[11px] bg-white text-orange-600 font-black px-3 py-1.5 rounded-xl border border-gray-200/80 active:scale-95 transition-all flex-shrink-0 shadow-sm"
            >
              Cambiar
            </button>
          </div>
        )}

        {/* SECCIÓN DE MÉTODOS DE PAGO INTERACTIVOS */}
        <div className="pt-4 border-t border-gray-100 space-y-3">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">
            Método de Pago
          </h3>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handlePaymentMethodClick('efectivo')}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 ${
                paymentMethod === 'efectivo'
                  ? 'bg-orange-50 border-orange-400 text-orange-600 font-black shadow-sm'
                  : 'bg-gray-50 border-gray-100 text-gray-400 font-bold'
              }`}
            >
              <Banknote
                size={20}
                className={paymentMethod === 'efectivo' ? 'text-orange-500' : 'text-gray-400'}
              />
              <span className="text-[11px] mt-1">Efectivo</span>
            </button>

            <button
              onClick={() => handlePaymentMethodClick('deuna')}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 ${
                paymentMethod === 'deuna'
                  ? 'bg-purple-50 border-purple-400 text-purple-700 font-black shadow-sm'
                  : 'bg-gray-50 border-gray-100 text-gray-400 font-bold'
              }`}
            >
              <QrCode
                size={20}
                className={paymentMethod === 'deuna' ? 'text-purple-600' : 'text-gray-400'}
              />
              <span className="text-[11px] mt-1">Deuna!</span>
            </button>

            <button
              onClick={() => handlePaymentMethodClick('transferencia')}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 ${
                paymentMethod === 'transferencia'
                  ? 'bg-blue-50 border-blue-400 text-blue-700 font-black shadow-sm'
                  : 'bg-gray-50 border-gray-100 text-gray-400 font-bold'
              }`}
            >
              <Building
                size={20}
                className={paymentMethod === 'transferencia' ? 'text-blue-600' : 'text-gray-400'}
              />
              <span className="text-[11px] mt-1">Transferencia</span>
            </button>
          </div>

          <div className="transition-all duration-300">
            {isOrderSaved && paymentMethod === 'efectivo' && (
              <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100 text-center animate-in fade-in duration-300">
                <p className="text-xs text-gray-500 font-bold">
                  Pagas en efectivo al recibir tu pedido en tu puerta. 💵
                </p>
              </div>
            )}

            {isOrderSaved && paymentMethod === 'deuna' && (
              <div className="bg-purple-50/40 rounded-2xl p-4 border border-purple-100 flex flex-col items-center text-center space-y-2 animate-in fade-in duration-300">
                <p className="text-xs text-purple-900 font-black uppercase tracking-tight">
                  Escanea el código desde tu App Deuna! o Pichincha
                </p>

                <div className="w-32 h-32 bg-white rounded-xl p-2 border border-purple-200/60 shadow-inner flex items-center justify-center">
                  <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=LaCasaDelPollazoDeunaQR"
                    alt="QR Deuna"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="flex flex-col items-center gap-1 w-full pt-1">
                  <p className="text-[10px] text-purple-700 font-bold uppercase">
                    ¿En el mismo celular? Paga directo al número:
                  </p>

                  <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-purple-200/60 w-full max-w-[200px]">
                    <span className="font-mono font-black text-purple-950 text-xs">
                      0989795628
                    </span>

                    <button
                      onClick={() => handleCopyText('0989795628', 'celular_deuna')}
                      className="text-[9px] bg-purple-100 text-purple-700 font-black px-2 py-1 rounded-lg active:scale-90 transition-all"
                    >
                      {copiedLabel === 'celular_deuna' ? '¡Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-purple-500 font-black uppercase tracking-tight">
                  ⚠️ RECUERDA ENVIAR EL COMPROBANTE DE PAGO AL FINALIZAR
                </p>
              </div>
            )}

            {paymentMethod === 'transferencia' && (
              <div className="space-y-3 animate-in fade-in duration-300">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                  Selecciona tu Banco de Origen:
                </p>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleBankSelect('pichincha')}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      selectedBank === 'pichincha'
                        ? 'bg-yellow-50 border-yellow-400 text-yellow-900 font-black scale-[1.01]'
                        : 'bg-white border-gray-100 text-gray-600 font-bold'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center text-xs text-yellow-950 font-black">
                      P
                    </span>
                    <span className="text-xs">Banco Pichincha</span>
                  </button>

                  <button
                    onClick={() => handleBankSelect('guayaquil')}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      selectedBank === 'guayaquil'
                        ? 'bg-pink-50 border-pink-400 text-pink-700 font-black scale-[1.01]'
                        : 'bg-white border-gray-100 text-gray-600 font-bold'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center text-xs text-white font-black">
                      G
                    </span>
                    <span className="text-xs">Banco Guayaquil</span>
                  </button>

                  <button
                    onClick={() => handleBankSelect('pacifico')}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      selectedBank === 'pacifico'
                        ? 'bg-teal-50 border-teal-400 text-teal-800 font-black scale-[1.01]'
                        : 'bg-white border-gray-100 text-gray-600 font-bold'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center text-xs text-white font-black">
                      B
                    </span>
                    <span className="text-xs">Banco del Pacífico</span>
                  </button>

                  <button
                    onClick={() => handleBankSelect('austro')}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      selectedBank === 'austro'
                        ? 'bg-red-50 border-red-400 text-red-700 font-black scale-[1.01]'
                        : 'bg-white border-gray-100 text-gray-600 font-bold'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-xs text-white font-black">
                      A
                    </span>
                    <span className="text-xs">Banco del Austro</span>
                  </button>

                  <button
                    onClick={() => handleBankSelect('otros')}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      selectedBank === 'otros'
                        ? 'bg-green-50 border-green-400 text-green-700 font-black scale-[1.01]'
                        : 'bg-white border-gray-100 text-gray-600 font-bold'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center text-xs text-white font-black">
                      O
                    </span>
                    <span className="text-xs">Produbanco / Otros Bancos</span>
                  </button>
                </div>

                {isOrderSaved && selectedBank && (
                  <div className="bg-blue-50/40 rounded-2xl p-3 border border-blue-100 space-y-2 mt-2 animate-in fade-in duration-300">
                    <p className="text-xs text-blue-900 font-black uppercase tracking-tight">
                      Datos de nuestra cuenta central Pichincha:
                    </p>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-blue-50">
                        <div>
                          <span className="text-[9px] text-gray-400 block font-bold uppercase">
                            Banco
                          </span>
                          <span className="font-bold text-gray-700">
                            Banco Pichincha (Ahorros)
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-blue-50">
                        <div>
                          <span className="text-[9px] text-gray-400 block font-bold uppercase">
                            Número de Cuenta
                          </span>
                          <span className="font-mono font-black text-gray-800">
                            2204567890
                          </span>
                        </div>

                        <button
                          onClick={() => handleCopyText('2204567890', 'cuenta')}
                          className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded-lg active:scale-90 transition-all"
                        >
                          {copiedLabel === 'cuenta' ? '¡Copiado!' : 'Copiar'}
                        </button>
                      </div>

                      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-blue-50">
                        <div>
                          <span className="text-[9px] text-gray-400 block font-bold uppercase">
                            Cédula del Titular (Para Interbancarios)
                          </span>
                          <span className="font-mono font-black text-gray-800">
                            1726543210
                          </span>
                        </div>

                        <button
                          onClick={() => handleCopyText('1726543210', 'cedula')}
                          className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded-lg active:scale-90 transition-all"
                        >
                          {copiedLabel === 'cedula' ? '¡Copiado!' : 'Copiar'}
                        </button>
                      </div>

                      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-blue-50">
                        <div>
                          <span className="text-[9px] text-gray-400 block font-bold uppercase">
                            Beneficiario
                          </span>
                          <span className="font-bold text-gray-700">
                            La Casa del Pollazo
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[10px] text-blue-500 font-black uppercase tracking-tight mt-1">
                      ⚠️ RECUERDA ENVIAR EL COMPROBANTE DE PAGO AL FINALIZAR
                    </p>
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

      <div className="px-4 pb-4 pt-3 bg-white border-t border-gray-100 space-y-3 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Productos</span>
            <span className="text-gray-800 font-bold">
              {totalUnits} unidad{totalUnits !== 1 ? 'es' : ''}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-500">
              {hasConsult ? 'Subtotal parcial' : 'Subtotal'}
            </span>
            <span className="text-orange-600 font-black">
              ${subtotal.toFixed(2)}
            </span>
          </div>

          {subtotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Delivery</span>
              <span className="text-gray-800 font-bold">
                {deliveryFee > 0 ? `$${deliveryFee.toFixed(2)}` : 'GRATIS'}
              </span>
            </div>
          )}

          {subtotal > 0 && (
            <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
              <span className="text-gray-700 font-black">Total final</span>
              <span className="text-orange-600 font-black">
                ${finalTotal.toFixed(2)}
              </span>
            </div>
          )}

          {hasConsult && (
            <p className="text-xs text-gray-400 pt-1 border-t border-gray-200 uppercase font-bold text-[9px]">
              Algunos productos requieren confirmación de precio
            </p>
          )}
        </div>

        {isPaymentReady ? (
          isOrderSaved ? (
            <button
              onClick={handleCheckout}
              className="w-full flex items-center justify-center gap-3 bg-green-500 text-white font-black py-4 rounded-2xl transition-all duration-200 shadow-xl shadow-green-500/30 active:scale-[0.98] text-base animate-in slide-in-from-bottom-4"
            >
              <MessageCircle size={20} />
              {paymentMethod === 'efectivo'
                ? 'Enviar pedido por WhatsApp'
                : 'LISTO, ENVIAR COMPROBANTE POR WHATSAPP 💬'}
            </button>
          ) : (
            <button
              onClick={handleEarlySaveClick}
              disabled={isSavingOrder}
              className={`w-full flex items-center justify-center gap-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black py-4 rounded-2xl transition-all duration-200 shadow-xl shadow-orange-500/40 active:scale-[0.98] text-base border-b-4 border-orange-700 animate-in slide-in-from-bottom-4 ${
                isSavingOrder ? 'opacity-70 cursor-wait' : ''
              }`}
            >
              {isSavingOrder ? 'GUARDANDO PEDIDO...' : 'PROCESAR PEDIDO Y VER DATOS DE PAGO 🚀'}
            </button>
          )
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
