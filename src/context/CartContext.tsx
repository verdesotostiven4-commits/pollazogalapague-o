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
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(2));
};

const formatMoneyText = (value: number): string => {
  return `$${toMoneyNumber(value).toFixed(2)}`;
};

// ✅ Lee precios escritos como "$1.50", "1.50", "1,50", "USD 1.50", etc.
const parseRawPrice = (price?: string | number | null): number => {
  if (typeof price === 'number') {
    return price > 0 ? toMoneyNumber(price) : 0;
  }

  const raw = String(price || '').trim();

  if (!raw) return 0;

  const normalized = raw
    .replace(',', '.')
    .replace(/[^0-9.]/g, '');

  const numeric = Number.parseFloat(normalized);

  return Number.isNaN(numeric) ? 0 : toMoneyNumber(numeric);
};

// ✅ FUNCIÓN DE PRECISIÓN: Extrae el número real del precio
const parsePrice = (product: Product): number => {
  if (typeof product.custom_price === 'number' && product.custom_price > 0) {
    return toMoneyNumber(product.custom_price);
  }

  return parseRawPrice(product.price);
};

// ✅ ID único del carrito.
// Producto normal: usa su id real.
// Producto variable: usa id + precio, así "$10" y "$15" quedan separados.
const buildCartItemId = (product: Product): string => {
  if (typeof product.custom_price === 'number' && product.custom_price > 0) {
    return `${product.id}-${toMoneyNumber(product.custom_price).toFixed(2)}`;
  }

  return product.id;
};

const normalizeProductForCart = (product: Product): Product => {
  const unitPrice = parsePrice(product);
  const cartItemId = buildCartItemId(product);
  const hasCustomPrice = typeof product.custom_price === 'number' && product.custom_price > 0;

  return {
    ...product,

    // Este ID es el ID de la fila en carrito.
    id: cartItemId,

    // Aseguramos nombre real siempre.
    name: product.name || 'Producto',

    // Si tiene precio real, lo dejamos formateado para WhatsApp/Admin.
    // Si era "Consultar", lo respetamos.
    price:
      unitPrice > 0
        ? formatMoneyText(unitPrice)
        : product.price || 'Consultar precio',

    custom_price: hasCustomPrice ? unitPrice : undefined,
    available: product.available !== false,
  };
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = (product: Product) => {
    if (!product || !product.id) return;

    const unitPrice = parsePrice(product);
    const productForCart = normalizeProductForCart(product);
    const cartItemId = productForCart.id;

    setItems(prev => {
      const existingIndex = prev.findIndex(item => item.product.id === cartItemId);

      if (existingIndex > -1) {
        const nextItems = [...prev];

        nextItems[existingIndex] = {
          ...nextItems[existingIndex],
          quantity: nextItems[existingIndex].quantity + 1,

          // Reforzamos que no se pierdan datos al sumar cantidad.
          product: {
            ...nextItems[existingIndex].product,
            ...productForCart,
          },
          name: product.name || nextItems[existingIndex].name,
          price: unitPrice,
          custom_price: productForCart.custom_price,
        };

        return nextItems;
      }

      const newItem: CartItem = {
        product: productForCart,
        quantity: 1,

        // Compatibilidad con código anterior.
        // id queda como ID original del producto base, NO como id variable.
        id: product.id,
        name: product.name || 'Producto',
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
          ? {
              ...item,
              quantity,
            }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const total = useMemo(() => {
    return items.reduce((sum, item) => {
      const unitPrice =
        typeof item.price === 'number' && item.price > 0
          ? item.price
          : parsePrice(item.product);

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
