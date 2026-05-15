import { createContext, useContext, useState, ReactNode } from 'react';
import { CartItem, Product } from '../types';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;      // 💵 DINERO REAL ($)
  cartCount: number;  // 📦 CANTIDAD DE PRODUCTOS (Burbuja roja)
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | null>(null);

// ✅ FUNCIÓN DE PRECISIÓN: Extrae el número de cualquier precio
const parsePrice = (product: Product): number => {
  // 1. Si el producto ya tiene el precio guardado del modal naranja
  if (product.custom_price && product.custom_price > 0) {
    return product.custom_price;
  }
  // 2. Si es un producto normal, limpiamos el texto "$1.25" para que sea 1.25
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

        // ✅ CASO A: SI ES UN POLLO (Suma el dinero al mismo paquete)
        if (product.custom_price) {
          const currentPrice = item.product.custom_price || 0;
          newItems[existingIndex] = {
            ...item,
            product: { 
              ...item.product, 
              custom_price: currentPrice + product.custom_price 
            },
            quantity: 1 // Forzamos a que sea 1 solo producto en la burbuja
          };
        } 
        // ✅ CASO B: PRODUCTO NORMAL (Suma la cantidad 1, 2, 3...)
        else {
          newItems[existingIndex] = {
            ...item,
            quantity: item.quantity + 1
          };
        }
        return newItems;
      }

      // ✅ PRODUCTO NUEVO: Se agrega por primera vez con cantidad 1
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

  // ✅ DINERO TOTAL ($): Suma (Precio x Cantidad) de cada cosa
  const total = items.reduce((sum, item) => {
    const price = parsePrice(item.product);
    return sum + (price * item.quantity);
  }, 0);

  // ✅ CANTIDAD DE PRODUCTOS: Suma cuántos bultos hay (Para la burbuja roja)
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
