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

// ✅ FUNCIÓN DE PRECISIÓN: Convierte cualquier origen de precio en un número real
const parsePrice = (product: Product): number => {
  // Si es un producto del modal naranja (Pollo por valor)
  if (product.custom_price && product.custom_price > 0) {
    return product.custom_price;
  }
  // Si es un producto normal ($1.25)
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
      const existing = prev.find(i => i.product.id === product.id);

      if (existing) {
        return prev.map(i => {
          if (i.product.id === product.id) {
            // ✅ CASO A: Es un Pollo con valor variable
            if (product.custom_price) {
              const nuevoPrecio = (i.product.custom_price || 0) + product.custom_price;
              return { 
                ...i, 
                product: { ...i.product, custom_price: nuevoPrecio },
                quantity: 1 // Forzamos 1 unidad para que la burbuja no marque 15
              };
            }
            // ✅ CASO B: Es un producto normal (Leche, etc.)
            return { ...i, quantity: i.quantity + 1 };
          }
          return i;
        });
      }
      
      // Producto nuevo en el carrito
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

  // ✅ DINERO TOTAL ($): Multiplica el precio real por la cantidad
  const total = items.reduce((sum, item) => {
    return sum + (parsePrice(item.product) * item.quantity);
  }, 0);

  // ✅ CANTIDAD DE PAQUETES: Suma las unidades reales para la burbuja roja
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
