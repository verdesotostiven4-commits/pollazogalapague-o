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

// ✅ FUNCIÓN DE PRECISIÓN: Extrae el número real del precio sin errores
const parsePrice = (product: Product): number => {
  // 1. Prioridad absoluta al precio del modal naranja
  if (product.custom_price && product.custom_price > 0) {
    return product.custom_price;
  }
  // 2. Si es precio de catálogo (ej: "$1.25"), limpiamos el texto
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

        // ✅ CASO A: EL PRODUCTO YA EXISTE Y ES UN POLLO (VARIABLE)
        if (product.custom_price) {
          const currentCustomPrice = item.product.custom_price || 0;
          newItems[existingIndex] = {
            ...item,
            product: { 
              ...item.product, 
              custom_price: currentCustomPrice + product.custom_price 
            },
            quantity: 1 // Los pollos por valor siempre cuentan como 1 paquete
          };
        } 
        // ✅ CASO B: EL PRODUCTO YA EXISTE Y ES NORMAL (LECHE, ETC)
        else {
          newItems[existingIndex] = {
            ...item,
            quantity: item.quantity + 1
          };
        }
        return newItems;
      }

      // ✅ CASO C: PRODUCTO NUEVO EN EL CARRITO
      // Si es un pollo con precio de modal, entra con cantidad 1
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

  // ✅ TOTAL EN DINERO ($): Suma el precio real de cada item
  const total = items.reduce((sum, item) => {
    const price = parsePrice(item.product);
    return sum + (price * item.quantity);
  }, 0);

  // ✅ CANTIDAD DE PAQUETES: Suma las unidades para la burbuja del Header
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
