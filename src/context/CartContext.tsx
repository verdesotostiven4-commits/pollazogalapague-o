import { createContext, useContext, useState, ReactNode } from 'react';
import { CartItem, Product } from '../types';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;      // 💵 Suma total en DINERO ($)
  cartCount: number;  // 📦 Suma total en UNIDADES (Burbuja roja)
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | null>(null);

// Función interna para limpiar precios y convertirlos en números
const parsePrice = (product: Product): number => {
  if (product.custom_price) return product.custom_price;
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
            // ✅ FIX: Si es pollo por valor, sumamos el dinero, NO la cantidad
            if (product.custom_price) {
              return { 
                ...i, 
                product: { 
                  ...i.product, 
                  custom_price: (i.product.custom_price || 0) + product.custom_price 
                },
                quantity: 1 // El pollo por valor siempre cuenta como 1 item
              };
            }
            // Si es producto normal (leche, aceite), sumamos cantidad
            return { ...i, quantity: i.quantity + 1 };
          }
          return i;
        });
      }
      
      // Si es producto nuevo, lo agregamos con cantidad 1
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

  // ✅ CÁLCULO DE DINERO (Ej: 1 pollo de $8 + 2 leches de $2 = $12)
  const total = items.reduce((sum, item) => {
    const price = parsePrice(item.product);
    return sum + (price * item.quantity);
  }, 0);

  // ✅ CÁLCULO DE UNIDADES (Ej: 1 pollo + 2 leches = 3 productos)
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
