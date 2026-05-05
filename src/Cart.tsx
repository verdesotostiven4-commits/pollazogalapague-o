import { useState } from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, MessageCircle } from 'lucide-react';
import { useCart } from './context/CartContext';
import OrderConfirmation from './components/OrderConfirmation';

const WHATSAPP = '+593989795628';

export default function Cart() {
  const { items, removeItem, updateQuantity, clearCart, isOpen, setIsOpen } = useCart();
  const [showConfirmation, setShowConfirmation] = useState(false);

  const buildWhatsAppUrl = () => {
    const isFixedPrice = (price: string | undefined) => {
      const p = price ?? '';
      return p.startsWith('$') && !isNaN(parseFloat(p.replace('$', '')));
    };

    const pad = (text: string, total: number) => {
      const dots = Math.max(1, total - text.length);
      return text + ' ' + '.'.repeat(dots) + ' ';
    };

    const fixedItems = items.filter(i => isFixedPrice(i.product.price));
    const consultItems = items.filter(i => !isFixedPrice(i.product.price));
    const allItems = [...fixedItems, ...consultItems];

    const lines: string[] = [];
    lines.push('Hola, deseo realizar el siguiente pedido en Pollazo Galapagueno El Mirador:');
    lines.push('');
    lines.push('Resumen del pedido');
    lines.push('--------------------------------');

    allItems.forEach(i => {
      const label = `${i.product.name} x${i.quantity}`;
      if (isFixedPrice(i.product.price)) {
        const unitPrice = parseFloat((i.product.price ?? '0').replace('$', ''));
        const subtotal = (unitPrice * i.quantity).toFixed(2);
        lines.push(`${pad(label, 32)}$${subtotal}`);
      } else {
        lines.push(`${pad(label, 32)}Consultar precio`);
      }
    });

    lines.push('--------------------------------');

    if (fixedItems.length > 0) {
      const total = fixedItems.reduce((sum, i) => {
        return sum + parseFloat((i.product.price ?? '0').replace('$', '')) * i.quantity;
      }, 0);
      lines.push(`${pad('Total parcial', 32)}$${total.toFixed(2)}`);
    }

    if (consultItems.length > 0) {
      lines.push('');
      lines.push('Nota:');
      lines.push('El total parcial incluye únicamente los productos con precio fijo.');
      lines.push('Los productos con precio por consultar deben confirmarse.');
    }

    lines.push('');
    lines.push('Por favor, confirmar disponibilidad y valor final del pedido.');
    lines.push('Muchas gracias.');

    return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(lines.join('\n'))}`;
  };

  const handleCheckout = () => {
    if (items.length === 0) return;
    setIsOpen(false);
    setTimeout(() => setShowConfirmation(true), 300);
  };

  const handleWhatsApp = () => {
    window.open(buildWhatsAppUrl(), '_blank');
    setShowConfirmation(false);
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      />

      <div className={`fixed right-0 top-0 h-full w-full sm:w-96 bg-white border-r border-orange-100 z-50 flex flex-col transition-transform duration-400 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-orange-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center">
              <ShoppingBag size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-gray-900 font-bold">Mi pedido</h2>
              <p className="text-gray-500 text-xs">{items.length} producto{items.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-orange-50 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="w-20 h-20 bg-orange-50 border border-orange-200 rounded-2xl flex items-center justify-center">
                <ShoppingBag size={32} className="text-orange-300" />
              </div>
              <div>
                <p className="text-gray-500 font-medium">Tu carrito está vacío</p>
                <p className="text-gray-400 text-sm mt-1">Agrega productos del catálogo</p>
              </div>
            </div>
          ) : (
            items.map(item => (
              <div key={item.product.id} className="group flex gap-3 bg-orange-50 border border-orange-200 rounded-2xl p-3 hover:bg-orange-100/50 transition-colors">
                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                  <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 font-semibold text-sm truncate">{item.product.name}</p>
                  <p className="text-orange-500 text-xs mt-0.5">{item.product.price || 'Consultar precio'}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="w-7 h-7 bg-white border border-orange-200 hover:bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-gray-900 font-bold text-sm w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="w-7 h-7 bg-white border border-orange-200 hover:bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => removeItem(item.product.id)}
                  className="self-start p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="px-6 pb-6 pt-4 border-t border-orange-100 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Total de productos</span>
              <span className="text-gray-900 font-bold">{items.reduce((s, i) => s + i.quantity, 0)} unidades</span>
            </div>

            <button
              onClick={handleCheckout}
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-400 hover:to-yellow-400 text-white font-black py-4 rounded-2xl transition-all duration-300 hover:scale-[1.02] shadow-xl shadow-orange-500/30 text-base"
            >
              <MessageCircle size={20} />
              Enviar pedido por WhatsApp
            </button>

            <button
              onClick={clearCart}
              className="w-full text-gray-400 hover:text-red-400 text-sm py-2 transition-colors"
            >
              Vaciar carrito
            </button>
          </div>
        )}
      </div>

      <OrderConfirmation visible={showConfirmation} onWhatsApp={handleWhatsApp} />
    </>
  );
}
