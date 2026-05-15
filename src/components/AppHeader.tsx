import { createContext, useContext, useState, ReactNode } from 'react';
import { CartItem, Product } from '../types';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;      
  cartCount: number;  
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | null>(null);

// ✅ FUNCIÓN DE PRECISIÓN: Extrae el número real del precio
const parsePrice = (product: Product): number => {
  // 1. Si viene del modal (custom_price)
  if (product.custom_price && product.custom_price > 0) {
    return product.custom_price;
  }
  // 2. Si es precio fijo ($1.25) lo limpiamos para que sea número
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

        // ✅ CASO A: ES UN POLLO (VARIABLE)
        if (product.custom_price) {
          const currentPrice = item.product.custom_price || 0;
          newItems[existingIndex] = {
            ...item,
            product: { 
              ...item.product, 
              custom_price: currentPrice + product.custom_price 
            },
            quantity: 1 // SIEMPRE 1 para que la burbuja no marque el precio
          };
        } 
        // ✅ CASO B: PRODUCTO NORMAL (LECHE, ACEITE, ETC)
        else {
          newItems[existingIndex] = {
            ...item,
            quantity: item.quantity + 1
          };
        }
        return newItems;
      }

      // ✅ PRODUCTO NUEVO (Primera vez que se agrega)
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

  // ✅ TOTAL EN DINERO ($)
  const total = items.reduce((sum, item) => {
    const price = parsePrice(item.product);
    return sum + (price * item.quantity);
  }, 0);

  // ✅ CANTIDAD PARA LA BURBUJA ROJA (UNIDADES)
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
