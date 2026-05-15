import { createContext, useContext, useState, ReactNode } from 'react';
import { CartItem, Product } from '../types';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: number; // Ahora representa el total en $
  cartCount: number; // Nueva: representa la cantidad de productos
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | null>(null);

// Función auxiliar para convertir "$1.25" o "Consultar" en número usable
const parsePrice = (product: Product): number => {
  if (product.custom_price) return product.custom_price; // Si viene del modal naranja
  if (!product.price || typeof product.price !== 'string') return 0;
  const numeric = parseFloat(product.price.replace(/[^0-9.]/g, ''));
  return isNaN(numeric) ? 0 : numeric;
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = (product: Product) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);

      if (existing) {
        return prev.map(i => {
          if (i.product.id === product.id) {
            // ✅ LÓGICA VIP: Si es pollo por valor, sumamos el presupuesto al existente
            if (product.custom_price) {
              const currentCustomPrice = i.product.custom_price || 0;
              return { 
                ...i, 
                product: { ...i.product, custom_price: currentCustomPrice + product.custom_price } 
              };
            }
            // Si es producto normal, solo subimos cantidad
            return { ...i, quantity: i.quantity + 1 };
          }
          return i;
        });
      }
      // Si es producto nuevo
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(i => i.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems(prev =>
      prev.map(i => (i.product.id === productId ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => setItems([]);

  // ✅ MATEMÁTICA PRO: Sumar dólares reales
  const total = items.reduce((sum, item) => {
    const price = parsePrice(item.product);
    return sum + (price * item.quantity);
  }, 0);

  // ✅ CANTIDAD TOTAL DE ITEMS (Para la burbuja del carrito)
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ 
      items, addItem, removeItem, updateQuantity, clearCart, 
      total, cartCount, isOpen, setIsOpen 
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
