import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ChevronRight,
  ChevronDown,
  Banknote,
  QrCode,
  Building,
  AlertCircle,
  MapPin,
  Lock,
  Clock3,
  Info,
  CheckCircle2,
  ShieldCheck,
  PackageCheck,
  Sparkles,
  Wallet,
  Home,
  ReceiptText,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';
import {
  deliveryFeeOf,
  isFixedPrice,
} from '../utils/whatsapp';
import type { CartItem, PaymentMethod, Screen } from '../types';

interface Props {
  onCheckout: () => void;
  onNavigate: (s: Screen) => void;
  onRequireLogin: (mode: 'block' | 'change_location') => void;
  onEarlySave: () => Promise<void> | void;
}

type SupportedPaymentMethod = Extract<PaymentMethod, 'efectivo' | 'deuna' | 'transferencia'>;

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

const BUSINESS_DEUNA_PHONE = '0989795628';
const BUSINESS_BANK_ACCOUNT = '2204567890';
const BUSINESS_BANK_ID = '1726543210';
const BUSINESS_BENEFICIARY = 'La Casa del Pollazo';

const BANK_OPTIONS = [
  {
    id: 'pichincha',
    label: 'Banco Pichincha',
    badge: 'P',
    activeClass: 'bg-yellow-50 border-yellow-400 text-yellow-900 font-black scale-[1.01]',
    badgeClass: 'bg-yellow-400 text-yellow-950',
  },
  {
    id: 'guayaquil',
    label: 'Banco Guayaquil',
    badge: 'G',
    activeClass: 'bg-pink-50 border-pink-400 text-pink-700 font-black scale-[1.01]',
    badgeClass: 'bg-pink-500 text-white',
  },
  {
    id: 'pacifico',
    label: 'Banco del Pacífico',
    badge: 'B',
    activeClass: 'bg-teal-50 border-teal-400 text-teal-800 font-black scale-[1.01]',
    badgeClass: 'bg-teal-500 text-white',
  },
  {
    id: 'austro',
    label: 'Banco del Austro',
    badge: 'A',
    activeClass: 'bg-red-50 border-red-400 text-red-700 font-black scale-[1.01]',
    badgeClass: 'bg-red-500 text-white',
  },
  {
    id: 'otros',
    label: 'Produbanco / Otros Bancos',
    badge: 'O',
    activeClass: 'bg-green-50 border-green-400 text-green-700 font-black scale-[1.01]',
    badgeClass: 'bg-green-600 text-white',
  },
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

    frame += 1;

    if (frame < max) {
      requestAnimationFrame(animate);
    } else {
      canvas.remove();
    }
  }

  requestAnimationFrame(animate);
}

const triggerDryTap = () => {
  try {
    if ('vibrate' in navigator) navigator.vibrate(15);
  } catch {
    // Vibración opcional.
  }
};

const triggerDoubleTap = () => {
  try {
    if ('vibrate' in navigator) navigator.vibrate([25, 35, 25]);
  } catch {
    // Vibración opcional.
  }
};

const toMoney = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(2));
};

const parsePrice = (price?: string | number | null): number => {
  if (typeof price === 'number') {
    return price > 0 ? toMoney(price) : 0;
  }

  const raw = String(price || '').trim();

  if (!raw) return 0;

  const normalized = raw
    .replace(',', '.')
    .replace(/[^0-9.]/g, '');

  const numeric = Number.parseFloat(normalized);

  return Number.isFinite(numeric) ? toMoney(numeric) : 0;
};

const itemUnitPrice = (item: CartItem): number => {
  if (typeof item.product.custom_price === 'number' && item.product.custom_price > 0) {
    return toMoney(item.product.custom_price);
  }

  if (typeof item.custom_price === 'number' && item.custom_price > 0) {
    return toMoney(item.custom_price);
  }

  if (typeof item.price === 'number' && item.price > 0) {
    return toMoney(item.price);
  }

  return parsePrice(item.product.price);
};

const itemHasKnownPrice = (item: CartItem): boolean => {
  return itemUnitPrice(item) > 0 || isFixedPrice(item.product.price);
};

const hasValidDeliveryLocation = (
  lat: number | null,
  lng: number | null,
  reference: string
): boolean => {
  return (
    typeof lat === 'number' &&
    Number.isFinite(lat) &&
    typeof lng === 'number' &&
    Number.isFinite(lng) &&
    reference.trim().length > 0
  );
};

const clearPaymentStorage = () => {
  localStorage.removeItem('selectedPaymentMethod');
  localStorage.removeItem('selectedBank');
};

function StepTitle({
  step,
  title,
  subtitle,
  icon,
  done = false,
}: {
  step: number;
  title: string;
  subtitle: string;
  icon: ReactNode;
  done?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
          done
            ? 'bg-green-500 text-white'
            : 'bg-gradient-to-br from-orange-500 to-yellow-400 text-white'
        }`}
      >
        {done ? <CheckCircle2 size={20} /> : icon}
      </div>

      <div className="min-w-0">
        <p className="text-[9px] font-black text-orange-500 uppercase tracking-[0.22em] leading-none">
          Paso {step}
        </p>
        <h3 className="text-sm font-black text-slate-900 uppercase italic leading-tight mt-1">
          {title}
        </h3>
        <p className="text-[11px] font-bold text-slate-400 leading-relaxed mt-1">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

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
  const [showPaymentHint, setShowPaymentHint] = useState(true);

  const [paymentMethod, setPaymentMethod] = useState<SupportedPaymentMethod | null>(null);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isOrderSaved, setIsOrderSaved] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const paymentSectionRef = useRef<HTMLDivElement>(null);

  const subtotal = toMoney(total);
  const deliveryFee = deliveryFeeOf(subtotal);
  const finalTotal = toMoney(subtotal + deliveryFee);

  const hasConsult = items.some(item => !itemHasKnownPrice(item));
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  const hasProfile = Boolean(customerName.trim() && customerPhone.trim());
  const hasLocation = hasValidDeliveryLocation(customerLat, customerLng, customerReference);

  const canUseDigitalPayment = !hasConsult && finalTotal > 0;

  const isPaymentReady =
    paymentMethod === 'efectivo' ||
    (canUseDigitalPayment && paymentMethod === 'deuna') ||
    (canUseDigitalPayment && paymentMethod === 'transferencia' && selectedBank !== null);

  const checkoutLabel = paymentMethod === 'efectivo'
    ? hasConsult
      ? 'Ver confirmación'
      : 'Confirmar pedido'
    : 'Ya pagué / continuar';

  const registerLabel = paymentMethod === 'efectivo'
    ? hasConsult
      ? 'Registrar para confirmar precio'
      : 'Registrar pedido'
    : 'Registrar y ver pago';

  const showNotice = (message: string) => {
    setActionNotice(message);
    window.setTimeout(() => setActionNotice(null), 2800);
  };

  const blockIfOrderSaved = () => {
    if (!isOrderSaved) return false;

    triggerDryTap();
    showNotice(
      'Este pedido ya fue registrado. Para evitar errores, termina la confirmación o crea un pedido nuevo después.'
    );
    return true;
  };

  const scrollToPayment = () => {
    paymentSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const handleClearRequest = () => {
    if (blockIfOrderSaved()) return;

    if (confirmClear) {
      clearCart();
      clearPaymentStorage();
      setConfirmClear(false);
      setPaymentMethod(null);
      setSelectedBank(null);
      setActionNotice(null);
      return;
    }

    setConfirmClear(true);
    window.setTimeout(() => setConfirmClear(false), 3000);
  };

  const handleRemoveItem = (productId: string) => {
    if (blockIfOrderSaved()) return;
    removeItem(productId);
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (blockIfOrderSaved()) return;
    updateQuantity(productId, quantity);
  };

  useEffect(() => {
    if (paymentMethod || isOrderSaved) {
      const timer = window.setTimeout(() => {
        paymentSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 150);

      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [paymentMethod, selectedBank, isOrderSaved]);

  useEffect(() => {
    if (items.length === 0) {
      setPaymentMethod(null);
      setSelectedBank(null);
      setIsOrderSaved(false);
      setIsSavingOrder(false);
      setActionNotice(null);
      clearPaymentStorage();
    }
  }, [items.length]);

  const handlePaymentMethodClick = (method: SupportedPaymentMethod) => {
    if (!hasProfile || !hasLocation) {
      triggerDryTap();
      onRequireLogin('block');
      return;
    }

    if ((method === 'deuna' || method === 'transferencia') && !canUseDigitalPayment) {
      triggerDryTap();
      showNotice(
        'Hay productos con precio a consultar. Por ahora este pedido debe quedar por confirmar antes de pagar.'
      );
      return;
    }

    if (isOrderSaved && paymentMethod && method !== paymentMethod) {
      triggerDryTap();
      showNotice('El método de pago ya quedó asociado a este pedido. Finaliza o crea un pedido nuevo.');
      return;
    }

    setPaymentMethod(method);
    setShowPaymentHint(false);

    if (method === 'transferencia') {
      if (paymentMethod !== 'transferencia') {
        setSelectedBank(null);
      }

      triggerDoubleTap();
    } else {
      setSelectedBank(null);
      triggerDryTap();
    }
  };

  const handleEarlySaveClick = async () => {
    if (isSavingOrder || isOrderSaved) return;

    if (!hasProfile || !hasLocation) {
      triggerDryTap();
      onRequireLogin('block');
      return;
    }

    if (!paymentMethod) {
      triggerDryTap();
      showNotice('Selecciona primero un método de pago.');
      scrollToPayment();
      return;
    }

    if ((paymentMethod === 'deuna' || paymentMethod === 'transferencia') && !canUseDigitalPayment) {
      triggerDryTap();
      showNotice('Este pedido tiene precios por confirmar. Primero debe revisarlo el negocio.');
      return;
    }

    if (paymentMethod === 'transferencia' && !selectedBank) {
      triggerDryTap();
      showNotice('Selecciona tu banco antes de registrar el pedido.');
      scrollToPayment();
      return;
    }

    if (!isPaymentReady) return;

    triggerDryTap();
    setIsSavingOrder(true);
    setActionNotice(null);

    try {
      localStorage.setItem('selectedPaymentMethod', paymentMethod);
      localStorage.setItem('selectedBank', selectedBank || 'Ninguno');

      await onEarlySave();

      setIsOrderSaved(true);

      if (paymentMethod === 'efectivo') {
        showNotice('Pedido registrado. Ahora puedes ver la confirmación dentro de la app.');
      } else {
        showNotice('Pedido registrado. Revisa los datos de pago y continúa cuando termines.');
      }
    } catch (error) {
      console.error('No se pudo guardar el pedido anticipado:', error);
      setIsOrderSaved(false);
      showNotice('No se pudo registrar el pedido. Intenta otra vez.');
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
      showNotice('No se pudo copiar. Mantén presionado el dato para copiarlo manualmente.');
    }
  };

  const handleBankSelect = (bank: string) => {
    if (blockIfOrderSaved()) return;

    setSelectedBank(bank);
    triggerDoubleTap();
  };

  const handleCheckout = () => {
    if (!isPaymentReady || !isOrderSaved) {
      triggerDryTap();
      showNotice('Primero registra el pedido para continuar.');
      return;
    }

    triggerDryTap();
    spawnConfetti();

    window.setTimeout(() => onCheckout(), 200);
  };

  const renderPaymentStatusBox = () => {
    if (!paymentMethod) return null;

    if (!isOrderSaved) {
      return (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 flex gap-3 animate-in fade-in duration-300">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-amber-600 flex-shrink-0 shadow-sm">
            <Clock3 size={18} />
          </div>

          <div>
            <p className="text-[10px] font-black text-amber-700 uppercase">
              Falta registrar el pedido
            </p>
            <p className="text-[10px] font-bold text-amber-700/80 leading-relaxed mt-1">
              Primero toca “Registrar pedido”. Luego verás la confirmación o datos de pago.
            </p>
          </div>
        </div>
      );
    }

    if (paymentMethod === 'efectivo') {
      return (
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-3 flex gap-3 animate-in fade-in duration-300">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-orange-600 flex-shrink-0 shadow-sm">
            <Banknote size={18} />
          </div>

          <div>
            <p className="text-[10px] font-black text-orange-700 uppercase">
              Pago contra entrega
            </p>
            <p className="text-[10px] font-bold text-orange-700/80 leading-relaxed mt-1">
              Revisaremos tu pedido antes de prepararlo. Pagarás cuando recibas.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 flex gap-3 animate-in fade-in duration-300">
        <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-blue-600 flex-shrink-0 shadow-sm">
          <CheckCircle2 size={18} />
        </div>

        <div>
          <p className="text-[10px] font-black text-blue-700 uppercase">
            Pago en validación
          </p>
          <p className="text-[10px] font-bold text-blue-700/80 leading-relaxed mt-1">
            Realiza el pago y continúa. Si necesitas enviar comprobante o ayuda, puedes usar WhatsApp al final.
          </p>
        </div>
      </div>
    );
  };

  const renderPaymentButton = (
    method: SupportedPaymentMethod,
    label: string,
    description: string,
    icon: ReactNode,
    activeClass: string,
    defaultClass: string,
    disabledReason?: string
  ) => {
    const active = paymentMethod === method;
    const lockedOther = isOrderSaved && paymentMethod !== method;
    const blockedByConsult =
      (method === 'deuna' || method === 'transferencia') && !canUseDigitalPayment;

    const disabled = lockedOther || blockedByConsult;

    return (
      <button
        type="button"
        onClick={() => {
          if (disabledReason && blockedByConsult) {
            triggerDryTap();
            showNotice(disabledReason);
            return;
          }

          handlePaymentMethodClick(method);
        }}
        disabled={lockedOther}
        className={`relative flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left active:scale-[0.98] ${
          active ? activeClass : defaultClass
        } ${disabled ? 'opacity-45 cursor-not-allowed' : ''}`}
      >
        {isOrderSaved && active && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center border-2 border-white shadow-sm">
            <Lock size={10} />
          </span>
        )}

        {blockedByConsult && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-slate-300 text-white flex items-center justify-center border-2 border-white shadow-sm">
            <Lock size={10} />
          </span>
        )}

        <div className="w-10 h-10 rounded-2xl bg-white/80 flex items-center justify-center shadow-sm flex-shrink-0">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-black uppercase leading-none">
            {label}
          </p>
          <p className="text-[10px] font-bold opacity-70 leading-relaxed mt-1">
            {description}
          </p>
        </div>
      </button>
    );
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 px-6 text-center">
        <div className="w-24 h-24 bg-orange-50 rounded-3xl flex items-center justify-center mb-5">
          <ShoppingBag size={40} className="text-orange-300" />
        </div>

        <h2 className="font-black text-gray-900 text-xl mb-2">
          Tu carrito está vacío
        </h2>

        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
          Agrega productos del catálogo para comenzar tu pedido.
        </p>

        <button
          type="button"
          onClick={() => onNavigate('catalog')}
          className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-yellow-400 text-white font-bold px-8 py-3.5 rounded-2xl shadow-lg shadow-orange-300/40 active:scale-95 transition-transform"
        >
          Ver catálogo <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative">
      <div
        ref={scrollRef}
        className="flex-1 px-4 pt-4 pb-32 space-y-4 overflow-y-auto scrollbar-hide"
      >
        {isOrderSaved && (
          <div className="bg-slate-900 text-white rounded-[26px] p-4 flex items-center gap-3 shadow-lg animate-in fade-in duration-300">
            <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Lock size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest">
                Pedido registrado
              </p>
              <p className="text-[10px] font-bold text-white/70 mt-1 leading-relaxed">
                Para evitar errores, el carrito y método de pago quedan bloqueados.
              </p>
            </div>
          </div>
        )}

        <section className="bg-white rounded-[30px] border border-orange-100 p-4 shadow-sm space-y-3">
          <StepTitle
            step={1}
            title="Tus productos"
            subtitle={`${totalUnits} unidad${totalUnits !== 1 ? 'es' : ''} en el carrito`}
            icon={<ShoppingBag size={20} />}
            done={items.length > 0}
          />

          <div className="space-y-2.5 pt-1">
            {items.map(item => {
              const unitPrice = itemUnitPrice(item);
              const itemSubtotal = unitPrice > 0 ? (unitPrice * item.quantity).toFixed(2) : null;
              const customPrice = item.product.custom_price;
              const fixed = isFixedPrice(item.product.price);

              return (
                <div
                  key={item.product.id}
                  className={`flex gap-3 rounded-2xl p-3 border transition-all ${
                    isOrderSaved
                      ? 'border-slate-200 bg-slate-50/70'
                      : 'border-gray-100 bg-white shadow-sm'
                  }`}
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
                    <img
                      src={item.product.image || '/logo-final.png'}
                      alt={item.product.name}
                      className="w-full h-full object-contain p-1"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-black text-sm leading-snug line-clamp-2">
                      {item.product.name}
                    </p>

                    <p
                      className={`text-xs mt-1 font-black ${
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
                        type="button"
                        onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                        disabled={isOrderSaved}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                          isOrderSaved
                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-600 active:scale-90 active:bg-orange-100'
                        }`}
                        aria-label="Restar producto"
                      >
                        <Minus size={13} />
                      </button>

                      <span className="text-gray-900 font-black text-sm w-6 text-center">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                        disabled={isOrderSaved}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                          isOrderSaved
                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                            : 'bg-orange-100 text-orange-600 active:scale-90 active:bg-orange-200'
                        }`}
                        aria-label="Sumar producto"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.product.id)}
                    disabled={isOrderSaved}
                    className={`self-center p-2 rounded-xl transition-all ${
                      isOrderSaved
                        ? 'text-gray-200 cursor-not-allowed'
                        : 'text-gray-300 hover:text-red-400 active:text-red-500 hover:bg-red-50'
                    }`}
                    aria-label="Eliminar producto"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleClearRequest}
            disabled={isOrderSaved}
            className={`w-full text-[11px] font-black py-3 rounded-2xl border transition-all duration-300 ${
              isOrderSaved
                ? 'text-gray-300 bg-gray-50 border-gray-100 cursor-not-allowed'
                : confirmClear
                  ? 'text-red-600 bg-red-50 border-red-100 scale-[1.01]'
                  : 'text-gray-400 bg-gray-50 border-gray-100 active:text-red-400'
            }`}
          >
            {isOrderSaved
              ? 'Pedido registrado: carrito bloqueado'
              : confirmClear
                ? '¿Seguro? toca otra vez para vaciar'
                : 'Vaciar carrito'}
          </button>
        </section>

        <section className="bg-white rounded-[30px] border border-gray-100 p-4 shadow-sm space-y-3">
          <StepTitle
            step={2}
            title="Entrega"
            subtitle={hasLocation ? 'Dirección lista para entregar' : 'Completa tus datos y ubicación'}
            icon={<Home size={20} />}
            done={hasProfile && hasLocation}
          />

          {!hasProfile || !hasLocation ? (
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-3 flex gap-3 animate-in fade-in duration-300">
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-orange-600 flex-shrink-0 shadow-sm">
                <ShieldCheck size={18} />
              </div>

              <div className="flex-1">
                <p className="text-[10px] font-black text-orange-700 uppercase">
                  Necesitamos saber dónde entregar
                </p>
                <p className="text-[10px] font-bold text-orange-700/80 leading-relaxed mt-1">
                  Completa tu nombre, WhatsApp y punto exacto para continuar.
                </p>

                <button
                  type="button"
                  onClick={() => onRequireLogin('block')}
                  className="mt-3 bg-white text-orange-600 border border-orange-200 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase active:scale-95"
                >
                  Completar datos
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in duration-300">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin size={17} />
                </div>

                <div className="min-w-0">
                  <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">
                    Dirección de entrega
                  </span>
                  <p className="text-xs font-bold text-gray-700 line-clamp-2">
                    {customerReference || 'Ubicación en Puerto Ayora'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (blockIfOrderSaved()) return;
                  onRequireLogin('change_location');
                }}
                disabled={isOrderSaved}
                className={`text-[11px] font-black px-3 py-2 rounded-xl border transition-all flex-shrink-0 shadow-sm ${
                  isOrderSaved
                    ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed'
                    : 'bg-white text-orange-600 border-gray-200/80 active:scale-95'
                }`}
              >
                Cambiar
              </button>
            </div>
          )}
        </section>

        {actionNotice && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 flex gap-3 animate-in fade-in duration-300">
            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-blue-500 flex-shrink-0 shadow-sm">
              <Info size={16} />
            </div>
            <p className="text-[10px] font-black text-blue-700 uppercase leading-relaxed">
              {actionNotice}
            </p>
          </div>
        )}

        <section
          ref={paymentSectionRef}
          className="bg-white rounded-[30px] border border-gray-100 p-4 shadow-sm space-y-3"
        >
          <StepTitle
            step={3}
            title="Forma de pago"
            subtitle={
              paymentMethod
                ? paymentMethod === 'efectivo'
                  ? 'Pagarás al recibir'
                  : 'Pedido con pago digital'
                : 'Elige cómo quieres pagar'
            }
            icon={<Wallet size={20} />}
            done={Boolean(paymentMethod)}
          />

          {hasConsult && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-3 flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-yellow-600 flex-shrink-0 shadow-sm">
                <AlertCircle size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black text-yellow-700 uppercase">
                  Hay precios por confirmar
                </p>
                <p className="text-[10px] font-bold text-yellow-700/80 leading-relaxed mt-1">
                  Para productos con precio a consultar, el negocio confirma el total antes de preparar.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2">
            {renderPaymentButton(
              'efectivo',
              hasConsult ? 'Confirmar precio' : 'Efectivo',
              hasConsult ? 'El negocio revisa el total' : 'Pagas al recibir',
              <Banknote
                size={21}
                className={paymentMethod === 'efectivo' ? 'text-orange-500' : 'text-gray-400'}
              />,
              'bg-orange-50 border-orange-400 text-orange-700 font-black shadow-sm',
              'bg-gray-50 border-gray-100 text-gray-500 font-bold'
            )}

            {renderPaymentButton(
              'deuna',
              'Deuna',
              'Pago rápido por QR o número',
              <QrCode
                size={21}
                className={paymentMethod === 'deuna' ? 'text-purple-600' : 'text-gray-400'}
              />,
              'bg-purple-50 border-purple-400 text-purple-700 font-black shadow-sm',
              'bg-gray-50 border-gray-100 text-gray-500 font-bold',
              'No se puede pagar por Deuna hasta confirmar todos los precios.'
            )}

            {renderPaymentButton(
              'transferencia',
              'Transferencia',
              'Elige tu banco y copia datos',
              <Building
                size={21}
                className={paymentMethod === 'transferencia' ? 'text-blue-600' : 'text-gray-400'}
              />,
              'bg-blue-50 border-blue-400 text-blue-700 font-black shadow-sm',
              'bg-gray-50 border-gray-100 text-gray-500 font-bold',
              'No se puede pagar por transferencia hasta confirmar todos los precios.'
            )}
          </div>

          {renderPaymentStatusBox()}

          {isOrderSaved && paymentMethod === 'deuna' && (
            <div className="bg-purple-50/40 rounded-2xl p-4 border border-purple-100 flex flex-col items-center text-center space-y-2 animate-in fade-in duration-300">
              <p className="text-xs text-purple-900 font-black uppercase tracking-tight">
                Escanea el código desde Deuna o Pichincha
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

                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-purple-200/60 w-full max-w-[220px]">
                  <span className="font-mono font-black text-purple-950 text-xs">
                    {BUSINESS_DEUNA_PHONE}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleCopyText(BUSINESS_DEUNA_PHONE, 'celular_deuna')}
                    className="text-[9px] bg-purple-100 text-purple-700 font-black px-2 py-1 rounded-lg active:scale-90 transition-all"
                  >
                    {copiedLabel === 'celular_deuna' ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-purple-500 font-black uppercase tracking-tight">
                Luego toca “Ya pagué / continuar”.
              </p>
            </div>
          )}

          {paymentMethod === 'transferencia' && (
            <div className="space-y-3 animate-in fade-in duration-300">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                Selecciona tu banco:
              </p>

              <div className="flex flex-col gap-2">
                {BANK_OPTIONS.map(bank => (
                  <button
                    type="button"
                    key={bank.id}
                    onClick={() => handleBankSelect(bank.id)}
                    disabled={isOrderSaved && selectedBank !== bank.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      selectedBank === bank.id
                        ? bank.activeClass
                        : 'bg-white border-gray-100 text-gray-600 font-bold'
                    } ${isOrderSaved && selectedBank !== bank.id ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${bank.badgeClass}`}
                    >
                      {bank.badge}
                    </span>
                    <span className="text-xs">{bank.label}</span>
                  </button>
                ))}
              </div>

              {isOrderSaved && selectedBank && (
                <div className="bg-blue-50/40 rounded-2xl p-3 border border-blue-100 space-y-2 mt-2 animate-in fade-in duration-300">
                  <p className="text-xs text-blue-900 font-black uppercase tracking-tight">
                    Datos de nuestra cuenta:
                  </p>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-blue-50">
                      <div>
                        <span className="text-[9px] text-gray-400 block font-bold uppercase">
                          Banco
                        </span>
                        <span className="font-bold text-gray-700">
                          Banco Pichincha · Ahorros
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-blue-50">
                      <div>
                        <span className="text-[9px] text-gray-400 block font-bold uppercase">
                          Número de cuenta
                        </span>
                        <span className="font-mono font-black text-gray-800">
                          {BUSINESS_BANK_ACCOUNT}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyText(BUSINESS_BANK_ACCOUNT, 'cuenta')}
                        className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded-lg active:scale-90 transition-all"
                      >
                        {copiedLabel === 'cuenta' ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>

                    <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-blue-50">
                      <div>
                        <span className="text-[9px] text-gray-400 block font-bold uppercase">
                          Cédula
                        </span>
                        <span className="font-mono font-black text-gray-800">
                          {BUSINESS_BANK_ID}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyText(BUSINESS_BANK_ID, 'cedula')}
                        className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded-lg active:scale-90 transition-all"
                      >
                        {copiedLabel === 'cedula' ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>

                    <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-blue-50">
                      <div>
                        <span className="text-[9px] text-gray-400 block font-bold uppercase">
                          Beneficiario
                        </span>
                        <span className="font-bold text-gray-700">
                          {BUSINESS_BENEFICIARY}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-blue-500 font-black uppercase tracking-tight mt-1">
                    Luego toca “Ya pagué / continuar”.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="bg-white rounded-[30px] border border-gray-100 p-4 shadow-sm space-y-3">
          <StepTitle
            step={4}
            title="Confirmar"
            subtitle="Revisa el total antes de registrar"
            icon={<ReceiptText size={20} />}
            done={isPaymentReady && isOrderSaved}
          />

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
                <span className="text-gray-700 font-black">
                  {hasConsult ? 'Total parcial' : 'Total final'}
                </span>
                <span className="text-orange-600 font-black">
                  ${finalTotal.toFixed(2)}
                </span>
              </div>
            )}

            {hasConsult && (
              <p className="text-[9px] text-gray-400 pt-1 border-t border-gray-200 uppercase font-bold leading-relaxed">
                Algunos productos requieren confirmación de precio. El negocio confirmará el total antes de preparar.
              </p>
            )}

            {isPaymentReady && (
              <div className="bg-white border border-gray-100 rounded-xl p-2 flex items-start gap-2">
                <AlertCircle size={14} className="text-orange-500 flex-shrink-0 mt-0.5" />
                <p className="text-[9px] text-gray-500 font-black uppercase leading-relaxed">
                  Todo pedido queda por confirmar hasta que el negocio valide disponibilidad y/o pago.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {showPaymentHint && !paymentMethod && items.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setShowPaymentHint(false);
            scrollToPayment();
          }}
          className="absolute bottom-[102px] left-1/2 -translate-x-1/2 animate-bounce text-orange-500 z-20 cursor-pointer active:scale-90 transition-transform bg-white border border-orange-100 shadow-lg rounded-full px-4 py-2 flex items-center gap-1.5"
          aria-label="Bajar a método de pago"
        >
          <span className="text-[9px] font-black uppercase">Elegir pago</span>
          <ChevronDown size={18} strokeWidth={3} />
        </button>
      )}

      <div className="absolute left-0 right-0 bottom-0 z-30 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 bg-white/95 backdrop-blur-xl border-t border-orange-100 shadow-[0_-10px_35px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
              {hasConsult ? 'Total parcial' : 'Total final'}
            </p>
            <p className="text-2xl font-black text-orange-600 leading-none mt-1">
              ${finalTotal.toFixed(2)}
            </p>
          </div>

          <div className="text-right">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
              Pago
            </p>
            <p className="text-[11px] font-black text-gray-700 uppercase mt-1">
              {paymentMethod
                ? paymentMethod === 'efectivo'
                  ? 'Efectivo'
                  : paymentMethod === 'deuna'
                    ? 'Deuna'
                    : selectedBank
                      ? 'Transferencia'
                      : 'Elige banco'
                : 'Pendiente'}
            </p>
          </div>
        </div>

        {isPaymentReady ? (
          isOrderSaved ? (
            <button
              type="button"
              onClick={handleCheckout}
              className="w-full flex items-center justify-center gap-3 bg-green-500 text-white font-black py-4 rounded-2xl transition-all duration-200 shadow-xl shadow-green-500/30 active:scale-[0.98] text-[13px] uppercase tracking-widest animate-in slide-in-from-bottom-4"
            >
              <PackageCheck size={20} />
              {checkoutLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleEarlySaveClick}
              disabled={isSavingOrder}
              className={`w-full flex items-center justify-center gap-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black py-4 rounded-2xl transition-all duration-200 shadow-xl shadow-orange-500/40 active:scale-[0.98] text-[13px] uppercase tracking-widest border-b-4 border-orange-700 animate-in slide-in-from-bottom-4 ${
                isSavingOrder ? 'opacity-70 cursor-wait' : ''
              }`}
            >
              <Sparkles size={20} />
              {isSavingOrder ? 'Registrando...' : registerLabel}
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={() => {
              if (!hasProfile || !hasLocation) {
                onRequireLogin('block');
                return;
              }

              scrollToPayment();
            }}
            className="w-full flex items-center justify-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 text-[11px] font-black p-4 rounded-2xl text-center uppercase tracking-tight active:scale-[0.98] transition-all"
          >
            <AlertCircle size={16} />
            {hasConsult
              ? 'Elige confirmar precio / efectivo'
              : 'Elige tu forma de pago'}
          </button>
        )}
      </div>
    </div>
  );
}
