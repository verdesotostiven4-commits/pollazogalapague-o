import { useState, useRef } from 'react';
import { ShoppingCart, Check, MessageCircle, DollarSign, X, Plus } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useFlyToCart } from '../context/FlyToCartContext';
import { useAdmin } from '../context/AdminContext';

interface Props {
  product: Product;
  style?: React.CSSProperties;
  className?: string;
  compact?: boolean;
}

const isConsultPrice = (price?: string) =>
  !price || price.toLowerCase().includes('consultar');

function triggerHaptic() {
  try { if ('vibrate' in navigator) navigator.vibrate(25); } catch {}
}

export default function ProductCard({ product, style, className = '', compact = false }: Props) {
  const { addItem } = useCart();
  const { triggerFly } = useFlyToCart();
  const { overrides } = useAdmin();
  const [added, setAdded] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false); // ✅ Control del modal de presupuesto
  const [customValue, setCustomValue] = useState<string>(''); // ✅ Valor escrito por el cliente
  const btnRef = useRef<HTMLButtonElement>(null);

  const override = overrides[product.id];
  const available = override ? override.available : true;
  const displayPrice = override?.price ?? product.price;
  const effectiveProduct = { ...product, price: displayPrice };

  // ✅ Función para procesar el agregado al carrito
  const executeAdd = (priceOverride?: number) => {
    triggerHaptic();
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      triggerFly(rect.left + rect.width / 2, rect.top + rect.height / 2, product.image ?? '');
    }
    
    // Si hay un precio personalizado (pollo por valor), lo mandamos
    if (priceOverride) {
      addItem({ ...effectiveProduct, custom_price: priceOverride });
    } else {
      addItem(effectiveProduct);
    }

    setAdded(true);
    setShowPriceModal(false);
    setCustomValue('');
    setTimeout(() => setAdded(false), 1200);
  };

  const handleAdd = () => {
    if (added || !available) return;

    // ✅ Si el producto es de precio variable (pollo/carne), abrimos el modal
    if (product.is_variable) {
      setShowPriceModal(true);
      return;
    }

    executeAdd();
  };

  const consult = isConsultPrice(displayPrice);

  return (
    <>
      <div
        style={style}
        className={`group relative flex flex-col bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm ${
          compact ? 'active:shadow-md h-full' : 'hover:shadow-lg hover:shadow-orange-100/60 hover:-translate-y-1'
        } transition-all duration-300 ${className} ${!available ? 'opacity-60' : ''}`}
      >
        {/* IMAGEN Y BADGES */}
        <div className="relative w-full aspect-square overflow-hidden bg-gray-50">
          {product.image ? (
            <img src={product.image} alt={product.name} className="w-full h-full object-contain p-2.5 group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-200">
              <ShoppingCart size={compact ? 28 : 40} />
            </div>
          )}
          {!available && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">Agotado</span>
            </div>
          )}
          {available && product.badge && (
            <span className="absolute top-2 left-2 bg-gradient-to-r from-orange-500 to-yellow-400 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">
              {product.badge}
            </span>
          )}
          {available && consult && !compact && (
            <span className="absolute top-2.5 right-2.5 bg-white/90 border border-orange-200 text-orange-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
              A consultar
            </span>
          )}
        </div>

        {/* CONTENIDO */}
        <div className={`flex flex-col flex-1 ${compact ? 'p-3 gap-1.5' : 'p-3.5'}`}>
          {!compact && <p className="text-[10px] text-orange-500 font-semibold uppercase tracking-widest mb-1 truncate">{product.category}</p>}
          <h3 className={`text-gray-900 font-bold leading-snug line-clamp-2 ${compact ? 'text-[13px] flex-1' : 'text-[15px] mb-1'}`}>{product.name}</h3>
          
          {!compact && product.description && (
            <p className="text-gray-400 text-xs leading-relaxed mb-3 line-clamp-2 flex-1">{product.description}</p>
          )}

          <div className={`flex items-center ${compact ? '' : 'mb-3 mt-auto'}`} style={{ minHeight: compact ? 28 : 32 }}>
            {consult ? (
              <span className={`${compact ? 'text-[11px]' : 'text-xs'} text-gray-400 font-medium flex items-center gap-1`}>
                {!compact && <MessageCircle size={12} className="text-orange-400" />} A consultar
              </span>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className={`text-orange-600 font-black ${compact ? 'text-base' : 'text-lg leading-none'}`}>
                  {product.is_variable ? 'Desde $1.00' : displayPrice}
                </span>
                {product.unit && !compact && <span className="text-gray-400 text-[11px]">/ {product.unit}</span>}
              </div>
            )}
          </div>

          <button
            ref={btnRef}
            onClick={handleAdd}
            disabled={!available}
            className={`w-full flex items-center justify-center gap-1.5 font-bold rounded-xl transition-all duration-300 ${
              compact ? 'text-[13px] py-2.5' : 'text-sm py-2.5'
            } ${
              !available
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : added
                  ? 'bg-green-500 text-white'
                  : 'bg-gradient-to-r from-orange-500 to-yellow-400 text-white active:scale-95 shadow-sm shadow-orange-200'
            }`}
          >
            {!available ? (
              <>{compact ? 'Agotado' : 'Sin stock'}</>
            ) : added ? (
              <><Check size={compact ? 13 : 14} strokeWidth={3} /> Agregado</>
            ) : (
              <><Plus size={compact ? 13 : 14} /> {product.is_variable ? 'Elegir valor' : 'Agregar'}</>
            )}
          </button>
        </div>
      </div>

      {/* ✅ MODAL DE PRESUPUESTO PARA PRODUCTOS VARIABLES */}
      {showPriceModal && (
        <div className="fixed inset-0 z-[11000] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPriceModal(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-black text-slate-800 uppercase italic">¿Cuánto quieres llevar?</h4>
                <button onClick={() => setShowPriceModal(false)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={18}/></button>
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-2xl mb-6">
                <img src={product.image} className="w-12 h-12 object-contain rounded-lg bg-white" alt="" />
                <div>
                  <p className="text-xs font-black text-slate-800">{product.name}</p>
                  <p className="text-[10px] text-orange-600 font-bold uppercase tracking-tighter">Precio según tu presupuesto</p>
                </div>
              </div>

              {/* Botones rápidos */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[8, 10, 15].map((val) => (
                  <button 
                    key={val} 
                    onClick={() => executeAdd(val)}
                    className="py-3 rounded-2xl border-2 border-orange-100 hover:border-orange-500 hover:bg-orange-50 text-orange-600 font-black transition-all"
                  >
                    ${val}.00
                  </button>
                ))}
              </div>

              {/* Input manual */}
              <div className="relative mb-6">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input 
                  type="number" 
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  placeholder="Otro valor (Ej: 12.50)"
                  className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-orange-500 font-bold text-slate-700 transition-all"
                />
              </div>

              <button 
                onClick={() => customValue && executeAdd(parseFloat(customValue))}
                disabled={!customValue}
                className="w-full h-14 bg-orange-500 rounded-2xl font-black text-white shadow-lg shadow-orange-200 active:scale-95 disabled:opacity-50 transition-all"
              >
                CONFIRMAR VALOR 🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
