import { createContext, useContext, useState, ReactNode } from 'react';
import { CartItem, Product } from '../types';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;      // 💵 DINERO REAL ($)
  cartCount: number;  // 📦 CANTIDAD DE PAQUETES (Burbuja roja)
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | null>(null);

// ✅ FUNCIÓN DE PRECISIÓN: Extrae el número de cualquier precio
const parsePrice = (product: Product): number => {
  // Caso 1: Precio personalizado del modal ($8, $10, etc.)
  if (product.custom_price && product.custom_price > 0) {
    return product.custom_price;
  }
  // Caso 2: Precio fijo del archivo products.ts ($1.25)
  if (typeof product.price === 'string') {
    const numeric = parseFloat(product.price.replace(/[^0-9.]/g, ''));
    return isNaN(numeric) ? 0 : numeric;
  }
  return 0;
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = (product: Product) => {
    setItems(prev => {
      const existingIndex = prev.findIndex(i => i.product.id === product.id);

      if (existingIndex > -1) {
        const newItems = [...prev];
        const item = newItems[existingIndex];

        // ✅ SI ES UN POLLO (Precio Variable)
        if (product.custom_price) {
          const currentPrice = item.product.custom_price || 0;
          newItems[existingIndex] = {
            ...item,
            product: { 
              ...item.product, 
              custom_price: currentPrice + product.custom_price 
            },
            quantity: 1 // Los pollos siempre cuentan como 1 bulto/paquete
          };
        } 
        // ✅ SI ES PRODUCTO NORMAL (Leche, etc.)
        else {
          newItems[existingIndex] = {
            ...item,
            quantity: item.quantity + 1
          };
        }
        return newItems;
      }

      // ✅ SI EL PRODUCTO ES NUEVO EN EL CARRITO
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

  // ✅ CÁLCULO DE DINERO TOTAL ($)
  const total = items.reduce((sum, item) => {
    const price = parsePrice(item.product);
    return sum + (price * item.quantity);
  }, 0);

  // ✅ CÁLCULO DE UNIDADES REALES (Burbuja roja)
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
