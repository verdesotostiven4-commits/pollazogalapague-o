import { useMemo, useRef, useState } from 'react';
import {
  Check,
  MessageCircle,
  DollarSign,
  X,
  Plus,
  Minus,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import type { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useFlyToCart } from '../context/FlyToCartContext';
import { useAdmin } from '../context/AdminContext';
import { useLanguage } from '../context/LanguageContext';
import { getProductDisplay, productUi } from '../utils/productI18n';

const BUDGET_LIMITS: Record<string, { min: number; max: number; presets: number[] }> = {
  'pollo-entero': { min: 7, max: 60, presets: [8, 10, 15] },
  pechuga: { min: 3.5, max: 35, presets: [4, 7, 10] },
  alas: { min: 2.5, max: 25, presets: [3, 5, 8] },
  cuartos: { min: 2, max: 15, presets: [2.5, 3.5, 5] },
  menudencia: { min: 1, max: 10, presets: [1, 2, 3] },
  default: { min: 1, max: 100, presets: [5, 10, 15] },
};

interface Props {
  product: Product;
  style?: React.CSSProperties;
  className?: string;
  compact?: boolean;
}

const isConsultPrice = (price?: string | null) => {
  const clean = String(price || '').trim().toLowerCase();
  return !clean || clean.includes('consultar');
};

const toMoney = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(2));
};

const parseMoneyInput = (value: string) => {
  const normalized = value.replace(',', '.').replace(/[^0-9.]/g, '');
  const parts = normalized.split('.');

  if (parts.length > 2) {
    return `${parts[0]}.${parts.slice(1).join('')}`;
  }

  return normalized;
};

const moneyFromInput = (value: string) => {
  const parsed = Number.parseFloat(parseMoneyInput(value));
  return Number.isFinite(parsed) ? toMoney(parsed) : 0;
};

const getBaseProductId = (id: string) => {
  const match = Object.keys(BUDGET_LIMITS).find(
    limitId => id === limitId || id.startsWith(`${limitId}-`)
  );

  return match || 'default';
};

function triggerHaptic() {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(25);
    }
  } catch {
    // Vibración opcional.
  }
}

export default function ProductCard({
  product,
  style,
  className = '',
  compact = false,
}: Props) {
  const { items, addItem, updateQuantity, removeItem } = useCart();
  const { triggerFly } = useFlyToCart();
  const { overrides } = useAdmin();
  const { language } = useLanguage();

  const [added, setAdded] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [imageFailed, setImageFailed] = useState(false);

  const btnRef = useRef<HTMLButtonElement>(null);

  const translated = useMemo(() => getProductDisplay(product, language), [product, language]);

  const config = useMemo(() => {
    return BUDGET_LIMITS[getBaseProductId(product.id)] || BUDGET_LIMITS.default;
  }, [product.id]);

  const override = overrides[product.id];
  const available = override?.available ?? product.available !== false;
  const displayPrice = override?.price ?? product.price ?? null;

  const effectiveProduct: Product = {
    ...product,
    price: displayPrice,
    available,
  };

  const cartItem = useMemo(() => {
    if (product.is_variable) return null;

    return (
      items.find(item => {
        const itemProductId = String(item.product.id || '');
        const itemId = String(item.id || '');
        const productId = String(product.id || '');

        return itemProductId === productId || itemId === productId;
      }) || null
    );
  }, [items, product.id, product.is_variable]);

  const cartQuantity = cartItem?.quantity || 0;
  const cartProductId = String(cartItem?.product.id || cartItem?.id || product.id);

  const consult = isConsultPrice(displayPrice);
  const currentNum = moneyFromInput(customValue);
  const isValidCustomValue = currentNum >= config.min && currentNum <= config.max;

  const minText = `$${config.min.toFixed(2)}`;
  const maxText = `$${config.max.toFixed(2)}`;
  const productImage = !imageFailed && product.image ? product.image : '/logo-final.png';

  const runFlyAnimation = () => {
    if (!btnRef.current) return;

    const rect = btnRef.current.getBoundingClientRect();

    triggerFly(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      product.image || '/logo-final.png'
    );
  };

  const markAdded = () => {
    setAdded(true);
    window.setTimeout(() => setAdded(false), 900);
  };

  const handleIncrease = () => {
    if (!available || product.is_variable) return;

    triggerHaptic();
    runFlyAnimation();

    if (cartItem) {
      updateQuantity(cartProductId, cartQuantity + 1);
    } else {
      addItem(effectiveProduct);
    }

    markAdded();
  };

  const handleDecrease = () => {
    if (!cartItem || product.is_variable) return;

    triggerHaptic();

    if (cartQuantity <= 1) {
      removeItem(cartProductId);
      return;
    }

    updateQuantity(cartProductId, cartQuantity - 1);
  };

  const executeAddVariable = (priceOverride?: number) => {
    if (added || !available) return;

    const valueToUse = typeof priceOverride === 'number' ? toMoney(priceOverride) : currentNum;

    if (valueToUse < config.min || valueToUse > config.max) return;

    triggerHaptic();
    runFlyAnimation();

    addItem({
      ...effectiveProduct,
      custom_price: valueToUse,
      price: `$${valueToUse.toFixed(2)}`,
    });

    markAdded();
    setShowPriceModal(false);
    setCustomValue('');
  };

  const handleAdd = () => {
    if (added || !available) return;

    if (product.is_variable) {
      setShowPriceModal(true);
      return;
    }

    handleIncrease();
  };

  const handleCloseModal = () => {
    setShowPriceModal(false);
    setCustomValue('');
  };

  const handleCustomChange = (value: string) => {
    setCustomValue(parseMoneyInput(value));
  };

  return (
    <>
      <div
        style={style}
        className={`group relative flex flex-col h-auto self-start bg-white border border-gray-100 rounded-[24px] overflow-hidden shadow-sm transition-all duration-300 ${
          compact
            ? 'active:shadow-md'
            : 'hover:shadow-lg hover:shadow-orange-100/60 hover:-translate-y-1'
        } ${className} ${!available ? 'opacity-60 grayscale-[20%]' : ''}`}
      >
        <div className={`relative w-full overflow-hidden bg-gradient-to-br from-gray-50 to-orange-50/30 ${compact ? 'h-[132px]' : 'h-[150px]'}`}>
          <img
            src={productImage}
            alt={translated.name}
            className="w-full h-full object-contain p-2.5 group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
          />

          {!available && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[1px]">
              <span className="bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg uppercase tracking-widest">
                {productUi('product.soldOut', language)}
              </span>
            </div>
          )}

          {available && product.badge && (
            <span className="absolute top-2 left-2 bg-gradient-to-r from-orange-500 to-yellow-400 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">
              {translated.badge || product.badge}
            </span>
          )}

          {available && product.is_variable && (
            <span className="absolute top-2 right-2 bg-white/95 border border-orange-200 text-orange-500 text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm uppercase">
              {productUi('product.byValue', language)}
            </span>
          )}

          {available && consult && !product.is_variable && !compact && (
            <span className="absolute top-2.5 right-2.5 bg-white/95 border border-orange-200 text-orange-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {productUi('product.consult', language)}
            </span>
          )}
        </div>

        <div className={`flex flex-col ${compact ? 'p-2.5 gap-1' : 'p-3 gap-1.5'}`}>
          {!compact && (
            <p className="text-[9px] text-orange-500 font-black uppercase tracking-widest truncate">
              {translated.subcategory || translated.category}
            </p>
          )}

          <h3
            className={`text-gray-900 font-black leading-snug line-clamp-2 ${
              compact ? 'text-[13px]' : 'text-[14px]'
            }`}
            title={language === 'es' ? product.name : `${translated.name} · ${product.name}`}
          >
            {translated.name}
          </h3>

          {!compact && (
            <p className="text-gray-400 text-[11px] leading-relaxed mt-0.5 line-clamp-2">
              {translated.description}
            </p>
          )}

          <div className="pt-2.5">
            <div className="flex items-center mb-2.5 min-h-[28px]">
              {product.is_variable ? (
                <div className="flex flex-col">
                  <span className={`text-orange-600 font-black ${compact ? 'text-[14px]' : 'text-[15px] leading-none'}`}>
                    {productUi('product.chooseValue', language)}
                  </span>

                  {!compact && (
                    <span className="text-[9px] font-bold text-gray-400 uppercase mt-1">
                      {productUi('product.minimum', language, { min: minText })}
                    </span>
                  )}
                </div>
              ) : consult ? (
                <span className={`${compact ? 'text-[11px]' : 'text-xs'} text-gray-400 font-bold flex items-center gap-1`}>
                  {!compact && <MessageCircle size={12} className="text-orange-400" />}
                  {productUi('product.consult', language)}
                </span>
              ) : (
                <div className="flex items-baseline gap-1">
                  <span className={`text-orange-600 font-black ${compact ? 'text-[15px]' : 'text-[18px] leading-none'}`}>
                    {displayPrice}
                  </span>

                  {product.unit && !compact && (
                    <span className="text-gray-400 text-[11px]">
                      / {translated.unit || product.unit}
                    </span>
                  )}
                </div>
              )}
            </div>

            {available && !product.is_variable && cartQuantity > 0 ? (
              <div className="w-full h-[48px] bg-white border border-orange-100 rounded-[20px] flex items-center justify-between p-1.5 shadow-[0_10px_22px_rgba(249,115,22,0.09)]">
                <button
                  type="button"
                  onClick={handleDecrease}
                  className="h-9 w-9 rounded-[14px] bg-white border border-orange-100 text-slate-500 flex items-center justify-center shadow-sm active:scale-90 transition-transform"
                  aria-label="Quitar una unidad"
                >
                  <Minus size={compact ? 15 : 16} strokeWidth={3} />
                </button>

                <div className="min-w-[36px] flex items-center justify-center leading-none">
                  <span className="text-[21px] font-black text-slate-950 tabular-nums">{cartQuantity}</span>
                </div>

                <button
                  ref={btnRef}
                  type="button"
                  onClick={handleIncrease}
                  className="h-9 w-9 rounded-[14px] bg-gradient-to-br from-orange-500 to-yellow-400 text-white flex items-center justify-center shadow-lg shadow-orange-200/70 active:scale-90 transition-transform"
                  aria-label="Agregar una unidad"
                >
                  <Plus size={compact ? 15 : 16} strokeWidth={3} />
                </button>
              </div>
            ) : (
              <button
                ref={btnRef}
                type="button"
                onClick={handleAdd}
                disabled={!available}
                className={`w-full min-h-[42px] flex items-center justify-center gap-1.5 font-black rounded-2xl transition-all duration-300 ${
                  compact ? 'text-[12px] py-2.5' : 'text-[13px] py-2.5'
                } ${
                  !available
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : added
                      ? 'bg-green-500 text-white'
                      : 'bg-gradient-to-r from-orange-500 to-yellow-400 text-white active:scale-95 shadow-sm shadow-orange-200'
                }`}
              >
                {!available ? (
                  <>{compact ? productUi('product.soldOut', language) : productUi('product.noStock', language)}</>
                ) : added ? (
                  <>
                    <Check size={compact ? 13 : 14} strokeWidth={3} />
                    {productUi('product.added', language)}
                  </>
                ) : (
                  <>
                    <Plus size={compact ? 13 : 14} />
                    {product.is_variable ? productUi('product.choose', language) : productUi('product.add', language)}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {showPriceModal && (
        <div className="fixed inset-0 z-[11000] flex items-end sm:items-center justify-center p-4">
          <button
            type="button"
            aria-label={productUi('common.close', language)}
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            onClick={handleCloseModal}
          />

          <div className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 border border-white">
            <div className="absolute -top-20 -right-20 w-44 h-44 bg-orange-300/20 blur-3xl rounded-full" />
            <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-yellow-300/20 blur-3xl rounded-full" />

            <div className="relative p-6">
              <div className="flex justify-between items-start mb-4 gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-100 px-3 py-1 rounded-full mb-2">
                    <Sparkles size={11} className="text-orange-500" />
                    <span className="text-[8px] font-black text-orange-600 uppercase tracking-widest">
                      {productUi('product.variableKicker', language)}
                    </span>
                  </div>

                  <h4 className="font-black text-slate-800 uppercase italic leading-tight">
                    {productUi('product.variableTitle', language)}
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="p-2 bg-slate-100 rounded-full text-slate-400 active:scale-90 transition-all"
                  aria-label={productUi('common.close', language)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-2xl mb-5 border border-orange-100">
                <img
                  src={productImage}
                  className="w-12 h-12 object-contain rounded-lg bg-white border border-orange-100 p-1"
                  alt={translated.name}
                />

                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-800 truncate">
                    {translated.name}
                  </p>
                  <p className="text-[10px] text-orange-600 font-bold uppercase tracking-tighter">
                    {productUi('product.range', language, { min: minText, max: maxText })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-5">
                {config.presets.map(value => {
                  const active = customValue === value.toString() || currentNum === value;

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCustomValue(value.toString())}
                      className={`py-3 rounded-2xl border-2 font-black transition-all active:scale-95 ${
                        active
                          ? 'border-orange-500 bg-orange-50 text-orange-600 shadow-md scale-105'
                          : 'border-slate-100 bg-white text-slate-600 hover:border-orange-200'
                      }`}
                    >
                      ${value.toFixed(2)}
                    </button>
                  );
                })}
              </div>

              <div className="relative mb-3">
                <DollarSign
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                  size={20}
                />

                <input
                  type="text"
                  inputMode="decimal"
                  value={customValue}
                  onChange={event => handleCustomChange(event.target.value)}
                  placeholder={productUi('product.minimum', language, { min: minText })}
                  className={`w-full h-14 pl-12 pr-4 bg-slate-50 border rounded-2xl outline-none font-bold text-slate-700 transition-all ${
                    customValue !== '' && !isValidCustomValue
                      ? 'border-red-400 bg-red-50'
                      : 'border-slate-100 focus:border-orange-500'
                  }`}
                />
              </div>

              {customValue !== '' && !isValidCustomValue && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-2xl p-3 mb-4">
                  <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-red-500 font-black uppercase leading-relaxed">
                    {productUi('product.rangeError', language, { min: minText, max: maxText })}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => executeAddVariable()}
                disabled={!isValidCustomValue || added}
                className="w-full h-14 bg-orange-500 rounded-2xl font-black text-white shadow-lg shadow-orange-200 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all uppercase tracking-widest"
              >
                {productUi('product.addToCart', language)}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
