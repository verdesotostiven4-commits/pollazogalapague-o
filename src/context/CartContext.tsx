import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { CartItem, Product } from '../types';

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

const toMoneyNumber = (value: number): number => {
  return Number(value.toFixed(2));
};

// ✅ FUNCIÓN DE PRECISIÓN: Extrae el número real del precio
const parsePrice = (product: Product): number => {
  if (typeof product.custom_price === 'number' && product.custom_price > 0) {
    return toMoneyNumber(product.custom_price);
  }

  if (typeof product.price === 'string') {
    const numeric = Number.parseFloat(product.price.replace(/[^0-9.]/g, ''));
    return Number.isNaN(numeric) ? 0 : toMoneyNumber(numeric);
  }

  return 0;
};

const buildCartItemId = (product: Product): string => {
  if (typeof product.custom_price === 'number' && product.custom_price > 0) {
    return `${product.id}-${toMoneyNumber(product.custom_price).toFixed(2)}`;
  }

  return product.id;
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = (product: Product) => {
    const unitPrice = parsePrice(product);
    const cartItemId = buildCartItemId(product);

    setItems(prev => {
      const existingIndex = prev.findIndex(item => item.product.id === cartItemId);

      if (existingIndex > -1) {
        const nextItems = [...prev];
        nextItems[existingIndex] = {
          ...nextItems[existingIndex],
          quantity: nextItems[existingIndex].quantity + 1,
        };

        return nextItems;
      }

      const productForCart: Product = {
        ...product,
        id: cartItemId,
        custom_price:
          typeof product.custom_price === 'number' && product.custom_price > 0
            ? unitPrice
            : undefined,
      };

      const newItem: CartItem = {
        product: productForCart,
        quantity: 1,

        // Compatibilidad temporal con código anterior.
        // item.id conserva el ID original del producto base.
        id: product.id,
        name: product.name,
        price: unitPrice,
        custom_price: productForCart.custom_price,
      };

      return [...prev, newItem];
    });
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    setItems(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const total = useMemo(() => {
    return items.reduce((sum, item) => {
      const unitPrice = parsePrice(item.product);
      return sum + unitPrice * item.quantity;
    }, 0);
  }, [items]);

  const cartCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        total: toMoneyNumber(total),
        cartCount,
        isOpen,
        setIsOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);

  if (!ctx) {
    throw new Error('useCart must be used within CartProvider');
  }

  return ctx;
}
