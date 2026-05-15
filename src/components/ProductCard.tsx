import { useState, useRef } from 'react';
import { ShoppingCart, Check, MessageCircle, DollarSign, X, Plus } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useFlyToCart } from '../context/FlyToCartContext';
import { useAdmin } from '../context/AdminContext';

// ✅ CONFIGURACIÓN DE PRECIOS POR PRODUCTO
const BUDGET_CONFIG: Record<string, { min: number, max: number, presets: number[] }> = {
  'pollo-entero': { min: 7.00, max: 60.00, presets: [8, 10, 15] },
  'pechuga': { min: 3.50, max: 30.00, presets: [4, 6, 10] },
  'alas': { min: 2.50, max: 25.00, presets: [3, 5, 8] },
  'cuartos': { min: 2.00, max: 15.00, presets: [2.50, 3.50, 5.00] },
  'menudencia': { min: 1.00, max: 10.00, presets: [1, 2, 3] },
  'default': { min: 1.00, max: 100.00, presets: [5, 10, 15] }
};

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
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [tempSelection, setTempSelection] = useState<string>(''); // Valor seleccionado antes de confirmar
  
  const btnRef = useRef<HTMLButtonElement>(null);

  const config = BUDGET_CONFIG[product.id] || BUDGET_CONFIG['default'];
  const override = overrides[product.id];
  const available = override ? override.available : true;
  const displayPrice = override?.price ?? product.price;
  const effectiveProduct = { ...product, price: displayPrice };

  const executeAdd = () => {
    const finalPrice = parseFloat(tempSelection);
    if (isNaN(finalPrice) || finalPrice < config.min) return;

    triggerHaptic();
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      triggerFly(rect.left + rect.width / 2, rect.top + rect.height / 2, product.image ?? '');
    }
    
    // ✅ Mandamos el precio y cantidad 1 para evitar error de "8 productos"
    addItem({ ...effectiveProduct, custom_price: finalPrice });

    setAdded(true);
    setShowPriceModal(false);
    setTempSelection('');
    setTimeout(() => setAdded(false), 1200);
  };

  const handleAdd = () => {
    if (added || !available) return;
    if (product.is_variable) {
      setShowPriceModal(true);
      return;
    }
    
    // Proceso normal
    triggerHaptic();
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      triggerFly(rect.left + rect.width / 2, rect.top + rect.height / 2, product.image ?? '');
    }
    addItem(effectiveProduct);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  const consult = isConsultPrice(displayPrice);
  const isReadyToConfirm = tempSelection !== '' && parseFloat(tempSelection) >= config.min;

  return (
    <>
      <div
        style={style}
        className={`group relative flex flex-col bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm transition-all duration-300 ${className} ${!available ? 'opacity-60' : ''}`}
      >
        <div className="relative w-full aspect-square overflow-hidden bg-gray-50">
          {product.image ? (
            <img src={product.image} alt={product.name} className="w-full h-full object-contain p-2.5 group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-200"><ShoppingCart size={compact ? 28 : 40} /></div>
          )}
          {!available && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">Agotado</span>
            </div>
          )}
        </div>

        <div className={`flex flex-col flex-1 ${compact ? 'p-3 gap-1.5' : 'p-3.5'}`}>
          <h3 className={`text-gray-900 font-bold leading-snug line-clamp-2 ${compact ? 'text-[13px] flex-1' : 'text-[15px] mb-1'}`}>{product.name}</h3>
          
          <div className={`flex items-center ${compact ? '' : 'mb-3 mt-auto'}`} style={{ minHeight: compact ? 28 : 32 }}>
            <span className={`text-orange-600 font-black ${compact ? 'text-base' : 'text-lg leading-none'}`}>
              {displayPrice}
            </span>
          </div>

          <button
            ref={btnRef}
            onClick={handleAdd}
            disabled={!available}
            className={`w-full flex items-center justify-center gap-1.5 font-bold rounded-xl transition-all duration-300 py-2.5 ${
              !available ? 'bg-gray-200 text-gray-400' : added ? 'bg-green-500 text-white' : 'bg-gradient-to-r from-orange-500 to-yellow-400 text-white active:scale-95'
            }`}
          >
            {added ? <><Check size={14} strokeWidth={3} /> Agregado</> : <><Plus size={14} /> {product.is_variable ? 'Elegir valor' : 'Agregar'}</>}
          </button>
        </div>
      </div>

      {/* ✅ MODAL DE PRESUPUESTO - LIMPIO Y PROFESIONAL */}
      {showPriceModal && (
        <div className="fixed inset-0 z-[11000] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowPriceModal(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="font-black text-slate-800 uppercase italic text-lg leading-none">¿De cuánto quieres comprar?</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Personaliza el precio de tu pedido</p>
                </div>
                <button onClick={() => setShowPriceModal(false)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={18}/></button>
              </div>

              {/* INFO PRODUCTO DENTRO DEL MODAL */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl mb-6 border border-slate-100">
                <img src={product.image} className="w-14 h-14 object-contain bg-white rounded-xl p-1 shadow-sm" alt="" />
                <p className="font-black text-slate-700 text-sm">{product.name}</p>
              </div>
              
              {/* VALORES RÁPIDOS (BLANCOS) */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {config.presets.map((val) => (
                  <button 
                    key={val} 
                    onClick={() => setTempSelection(val.toString())}
                    className={`py-4 rounded-2xl border-2 font-black transition-all ${
                      tempSelection === val.toString() 
                      ? 'border-orange-500 bg-orange-50 text-orange-600 scale-105 shadow-md shadow-orange-100' 
                      : 'border-slate-100 bg-white text-slate-500 hover:border-orange-200'
                    }`}
                  >
                    ${val.toFixed(2)}
                  </button>
                ))}
              </div>

              {/* INPUT MANUAL */}
              <div className="relative mb-6">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input 
                  type="number" 
                  inputMode="decimal"
                  value={tempSelection}
                  onChange={(e) => setTempSelection(e.target.value)}
                  placeholder={`Ej: ${config.min.toFixed(2)} o más`}
                  className={`w-full h-16 pl-12 pr-4 bg-white border-2 rounded-2xl outline-none font-bold text-lg transition-all ${
                    tempSelection !== '' && !isReadyToConfirm ? 'border-red-200 bg-red-50' : 'border-slate-100 focus:border-orange-500'
                  }`}
                />
              </div>

              {tempSelection !== '' && parseFloat(tempSelection) < config.min && (
                <p className="text-center text-[10px] font-black text-red-500 uppercase mb-4 animate-bounce">⚠️ El valor mínimo es ${config.min.toFixed(2)}</p>
              )}

              <button 
                onClick={executeAdd}
                disabled={!isReadyToConfirm}
                className="w-full h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-3xl font-black text-white shadow-xl shadow-orange-500/40 active:scale-95 disabled:opacity-30 disabled:grayscale transition-all uppercase tracking-widest"
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
