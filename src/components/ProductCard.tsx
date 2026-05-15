import { useState, useRef } from 'react';
import { ShoppingCart, Check, MessageCircle, DollarSign, X, Plus } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useFlyToCart } from '../context/FlyToCartContext';
import { useAdmin } from '../context/AdminContext';

// ✅ CONFIGURACIÓN DE LÍMITES Y SUGERENCIAS POR PRODUCTO
const BUDGET_CONFIG: Record<string, { min: number, max: number, presets: number[] }> = {
  'pollo-entero': { min: 7.00, max: 50.00, presets: [8, 10, 15] },
  'pechuga': { min: 3.50, max: 30.00, presets: [4, 6, 10] },
  'alas': { min: 2.50, max: 20.00, presets: [3, 5, 8] },
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
  const [selectedValue, setSelectedValue] = useState<string>(''); // Valor en espera de confirmación
  
  const btnRef = useRef<HTMLButtonElement>(null);

  const config = BUDGET_CONFIG[product.id] || BUDGET_CONFIG['default'];
  const override = overrides[product.id];
  const available = override ? override.available : true;
  const displayPrice = override?.price ?? product.price;
  const effectiveProduct = { ...product, price: displayPrice };

  // ✅ Función para agregar finalmente al carrito
  const executeAdd = () => {
    const finalValue = parseFloat(selectedValue);
    
    // Validamos que esté dentro del rango permitido
    if (isNaN(finalValue) || finalValue < config.min || finalValue > config.max) return;

    triggerHaptic();
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      triggerFly(rect.left + rect.width / 2, rect.top + rect.height / 2, product.image ?? '');
    }
    
    // Mandamos el precio como custom_price al carrito
    addItem({ ...effectiveProduct, custom_price: finalValue });

    setAdded(true);
    setShowPriceModal(false);
    setSelectedValue('');
    setTimeout(() => setAdded(false), 1200);
  };

  const handleAdd = () => {
    if (added || !available) return;

    if (product.is_variable) {
      setShowPriceModal(true);
      return;
    }

    // Proceso normal para productos fijos
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
  const isValid = selectedValue !== '' && parseFloat(selectedValue) >= config.min && parseFloat(selectedValue) <= config.max;

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
        </div>

        {/* CONTENIDO */}
        <div className={`flex flex-col flex-1 ${compact ? 'p-3 gap-1.5' : 'p-3.5'}`}>
          {!compact && <p className="text-[10px] text-orange-500 font-semibold uppercase tracking-widest mb-1 truncate">{product.category}</p>}
          <h3 className={`text-gray-900 font-bold leading-snug line-clamp-2 ${compact ? 'text-[13px] flex-1' : 'text-[15px] mb-1'}`}>{product.name}</h3>
          
          <div className={`flex items-center ${compact ? '' : 'mb-3 mt-auto'}`} style={{ minHeight: compact ? 28 : 32 }}>
            <div className="flex items-baseline gap-1">
              <span className={`text-orange-600 font-black ${compact ? 'text-base' : 'text-lg leading-none'}`}>
                {product.is_variable ? `Desde $${config.min.toFixed(2)}` : displayPrice}
              </span>
              {product.unit && !compact && <span className="text-gray-400 text-[11px]">/ {product.unit}</span>}
            </div>
          </div>

          <button
            ref={btnRef}
            onClick={handleAdd}
            disabled={!available}
            className={`w-full flex items-center justify-center gap-1.5 font-bold rounded-xl transition-all duration-300 ${
              compact ? 'text-[13px] py-2.5' : 'text-sm py-2.5'
            } ${
              !available ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : added ? 'bg-green-500 text-white' : 'bg-gradient-to-r from-orange-500 to-yellow-400 text-white active:scale-95 shadow-sm shadow-orange-200'
            }`}
          >
            {added ? <><Check size={compact ? 13 : 14} strokeWidth={3} /> Agregado</> : <><Plus size={compact ? 13 : 14} /> {product.is_variable ? 'Elegir valor' : 'Agregar'}</>}
          </button>
        </div>
      </div>

      {/* ✅ MODAL DE PRESUPUESTO MEJORADO */}
      {showPriceModal && (
        <div className="fixed inset-0 z-[11000] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowPriceModal(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-400">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="font-black text-slate-800 uppercase italic text-lg leading-none">¿De cuánto quieres comprar?</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Selecciona o escribe el precio</p>
                </div>
                <button onClick={() => setShowPriceModal(false)} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-orange-100 transition-colors"><X size={18}/></button>
              </div>
              
              {/* Botones rápidos dinámicos */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {config.presets.map((val) => (
                  <button 
                    key={val} 
                    onClick={() => setSelectedValue(val.toString())}
                    className={`py-4 rounded-2xl border-2 font-black transition-all ${
                      selectedValue === val.toString() 
                      ? 'border-orange-500 bg-orange-50 text-orange-600 scale-105 shadow-md' 
                      : 'border-slate-100 text-slate-500 bg-slate-50'
                    }`}
                  >
                    ${val.toFixed(2)}
                  </button>
                ))}
              </div>

              {/* Input manual con validación visual */}
              <div className="relative mb-6">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400">
                  <DollarSign size={20} />
                </div>
                <input 
                  type="number" 
                  inputMode="decimal"
                  value={selectedValue}
                  onChange={(e) => setSelectedValue(e.target.value)}
                  placeholder={`Ej: ${config.min.toFixed(2)} a ${config.max.toFixed(2)}`}
                  className={`w-full h-16 pl-10 pr-4 bg-slate-50 border-2 rounded-2xl outline-none font-bold text-lg transition-all ${
                    selectedValue !== '' && !isValid ? 'border-red-300 bg-red-50 text-red-600' : 'border-slate-100 focus:border-orange-500 text-slate-800'
                  }`}
                />
              </div>

              {/* Mensaje de ayuda si el valor es bajo */}
              {selectedValue !== '' && parseFloat(selectedValue) < config.min && (
                <p className="text-center text-[10px] font-bold text-red-500 uppercase mb-4 animate-bounce">⚠️ El valor mínimo es ${config.min.toFixed(2)}</p>
              )}

              <button 
                onClick={executeAdd}
                disabled={!isValid}
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
