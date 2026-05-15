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

// ✅ FUNCIÓN DE PRECISIÓN: Extrae el número real del precio
const parsePrice = (product: Product): number => {
  if (product.custom_price && product.custom_price > 0) {
    return product.custom_price;
  }
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
    // 1. Identificamos el precio unitario que se está agregando
    const unitPrice = product.custom_price || parsePrice(product);
    
    // 2. Creamos un ID ÚNICO para el carrito que combine ID + PRECIO
    // Esto hace que un pollo de $10 y uno de $15 sean "productos diferentes"
    const cartItemId = product.custom_price ? `${product.id}-${unitPrice}` : product.id;

    setItems(prev => {
      const existingIndex = prev.findIndex(i => i.product.id === cartItemId);

      if (existingIndex > -1) {
        // ✅ SI YA EXISTE (Mismo ID y mismo Precio): Solo aumentamos cantidad
        const newItems = [...prev];
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: newItems[existingIndex].quantity + 1
        };
        return newItems;
      }

      // ✅ SI ES NUEVO O PRECIO DIFERENTE: Lo agregamos como fila nueva
      // Clonamos el producto para ponerle el ID único del carrito
      return [...prev, { 
        product: { ...product, id: cartItemId }, 
        quantity: 1 
      }];
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

  // ✅ TOTAL EN DINERO ($): Cálculo limpio (Precio Unitario * Cantidad)
  const total = items.reduce((sum, item) => {
    const unitPrice = parsePrice(item.product);
    return sum + (unitPrice * item.quantity);
  }, 0);

  // ✅ CANTIDAD DE PAQUETES: Suma de unidades reales
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
