import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import type { CartItem, Product } from '../types';

interface CartContextType {
  items: CartItem[];
  total: number;

  // Compatibilidad nueva y vieja
  itemCount: number;
  cartCount: number;

  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;

  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;

  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = 'pollazo_cart_items';

function safeNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? Number(value.toFixed(2)) : 0;
  }

  const parsed = Number.parseFloat(
    String(value || '')
      .replace(',', '.')
      .replace(/[^0-9.]/g, '')
  );

  return Number.isFinite(parsed) && parsed > 0 ? Number(parsed.toFixed(2)) : 0;
}

function getProductUnitPrice(product: Product): number {
  if (typeof product.custom_price === 'number' && product.custom_price > 0) {
    return Number(product.custom_price.toFixed(2));
  }

  return safeNumber(product.price);
}

function buildCartItemId(product: Product): string {
  if (typeof product.custom_price === 'number' && product.custom_price > 0) {
    return `${product.id}-${Number(product.custom_price).toFixed(2)}`;
  }

  return String(product.id);
}

function normalizeProduct(product: Product): Product {
  const cartItemId = buildCartItemId(product);
  const unitPrice = getProductUnitPrice(product);

  return {
    ...product,
    id: cartItemId,
    name: product.name || 'Producto',
    category: product.category || 'Abarrotes y básicos',
    price: unitPrice > 0 ? `$${unitPrice.toFixed(2)}` : product.price || 'Consultar precio',
    custom_price:
      typeof product.custom_price === 'number' && product.custom_price > 0
        ? Number(product.custom_price.toFixed(2))
        : undefined,
    available: product.available !== false,
  };
}

function normalizeCartItem(item: unknown): CartItem | null {
  const raw = item as Partial<CartItem>;

  if (!raw || typeof raw !== 'object') return null;

  const product = raw.product as Product | undefined;

  if (!product?.id || !product?.name) return null;

  const quantity = Number(raw.quantity || 1);

  if (!Number.isFinite(quantity) || quantity <= 0) return null;

  const normalizedProduct = normalizeProduct(product);
  const unitPrice = getProductUnitPrice(normalizedProduct);

  return {
    product: normalizedProduct,
    quantity: Math.max(1, Math.floor(quantity)),
    id: raw.id || normalizedProduct.id,
    name: raw.name || normalizedProduct.name,
    price:
      typeof raw.price === 'number' && raw.price > 0
        ? Number(raw.price.toFixed(2))
        : unitPrice,
    custom_price:
      typeof raw.custom_price === 'number' && raw.custom_price > 0
        ? Number(raw.custom_price.toFixed(2))
        : normalizedProduct.custom_price,
  };
}

function loadStoredItems(): CartItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) return [];

    const parsed = JSON.parse(stored);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normalizeCartItem)
      .filter((item): item is CartItem => Boolean(item));
  } catch {
    return [];
  }
}

function saveStoredItems(items: CartItem[]) {
  if (typeof window === 'undefined') return;

  try {
    if (items.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Si localStorage falla, el carrito sigue funcionando en memoria.
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => loadStoredItems());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    saveStoredItems(items);
  }, [items]);

  const addItem = (product: Product, quantity = 1) => {
    const normalizedProduct = normalizeProduct(product);
    const safeQuantity = Math.max(1, Math.floor(Number(quantity || 1)));
    const unitPrice = getProductUnitPrice(normalizedProduct);

    setItems(currentItems => {
      const existingIndex = currentItems.findIndex(
        item => item.product.id === normalizedProduct.id
      );

      if (existingIndex >= 0) {
        return currentItems.map((item, index) => {
          if (index !== existingIndex) return item;

          return {
            ...item,
            product: {
              ...item.product,
              ...normalizedProduct,
            },
            quantity: item.quantity + safeQuantity,
            id: item.id || normalizedProduct.id,
            name: normalizedProduct.name,
            price: unitPrice,
            custom_price: normalizedProduct.custom_price,
          };
        });
      }

      const newItem: CartItem = {
        product: normalizedProduct,
        quantity: safeQuantity,
        id: normalizedProduct.id,
        name: normalizedProduct.name,
        price: unitPrice,
        custom_price: normalizedProduct.custom_price,
      };

      return [...currentItems, newItem];
    });
  };

  const removeItem = (productId: string) => {
    const cleanId = String(productId);

    setItems(currentItems =>
      currentItems.filter(item => item.product.id !== cleanId && item.id !== cleanId)
    );
  };

  const updateQuantity = (productId: string, quantity: number) => {
    const cleanId = String(productId);
    const safeQuantity = Math.floor(Number(quantity));

    if (!Number.isFinite(safeQuantity) || safeQuantity <= 0) {
      removeItem(cleanId);
      return;
    }

    setItems(currentItems =>
      currentItems.map(item => {
        if (item.product.id !== cleanId && item.id !== cleanId) return item;

        return {
          ...item,
          quantity: safeQuantity,
        };
      })
    );
  };

  const clearCart = () => {
    setItems([]);
    setIsOpen(false);
  };

  const openCart = () => {
    setIsOpen(true);
  };

  const closeCart = () => {
    setIsOpen(false);
  };

  const total = useMemo(() => {
    const sum = items.reduce((acc, item) => {
      const unitPrice =
        typeof item.product.custom_price === 'number' && item.product.custom_price > 0
          ? item.product.custom_price
          : typeof item.custom_price === 'number' && item.custom_price > 0
            ? item.custom_price
            : typeof item.price === 'number' && item.price > 0
              ? item.price
              : safeNumber(item.product.price);

      return acc + unitPrice * item.quantity;
    }, 0);

    return Number(sum.toFixed(2));
  }, [items]);

  const itemCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const cartCount = itemCount;

  return (
    <CartContext.Provider
      value={{
        items,
        total,
        itemCount,
        cartCount,
        isOpen,
        setIsOpen,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        openCart,
        closeCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart debe usarse dentro de CartProvider');
  }

  return context;
}
