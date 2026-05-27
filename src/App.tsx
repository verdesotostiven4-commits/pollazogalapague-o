import { useState, useRef, Component, useEffect, useMemo } from 'react';
import { PackageSearch } from 'lucide-react';
import { CartProvider, useCart } from './context/CartContext';
import { FlyToCartProvider } from './context/FlyToCartContext';
import { AdminProvider, useAdmin } from './context/AdminContext';
import { UserProvider, useUser } from './context/UserContext';
import FlyParticleLayer from './components/FlyParticleLayer';
import HomeScreen from './components/HomeScreen';
import CatalogScreen from './components/CatalogScreen';
import CartScreen from './components/CartScreen';
import InfoScreen from './components/InfoScreen';
import BottomNav from './components/BottomNav';
import AppHeader from './components/AppHeader';
import OrderConfirmation from './components/OrderConfirmation';
import LandingPage from './components/LandingPage';
import AdminDashboard from './components/AdminDashboard';
import LoginModal from './components/LoginModal';
import OrderTracking from './components/OrderTracking';
import Ranking from './pages/Ranking';
import {
  buildWhatsAppUrl,
  deliveryFeeOf,
  isStoreOpen,
  numericPrice,
  orderCode,
} from './utils/whatsapp';
import type {
  CartItem,
  Category,
  OrderStatus,
  PaymentMethod,
  Product,
  Screen,
} from './types';

type AppPaymentStatus =
  | 'pendiente'
  | 'validando'
  | 'confirmado'
  | 'rechazado'
  | 'contra_entrega';

class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: unknown }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 bg-orange-50 min-h-screen text-center flex flex-col items-center justify-center">
          <h1 className="text-orange-600 font-black text-2xl">
            🚨 REINICIO NECESARIO
          </h1>
          <p className="text-gray-600 mt-2 italic font-bold">
            Recuperando el Imperio...
          </p>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="mt-6 bg-orange-500 text-white px-8 py-3 rounded-full font-black shadow-lg active:scale-95 transition-transform"
          >
            LIMPIAR Y REINTENTAR
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const toMoney = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(2));
};

const isPaymentMethod = (value: string | null): value is PaymentMethod => {
  return value === 'efectivo' || value === 'deuna' || value === 'transferencia';
};

const getStoredPaymentMethod = (): PaymentMethod | undefined => {
  const value = localStorage.getItem('selectedPaymentMethod');
  return isPaymentMethod(value) ? value : undefined;
};

const clearStoredPaymentMethod = () => {
  localStorage.removeItem('selectedPaymentMethod');
  localStorage.removeItem('selectedBank');
};

const getInitialPaymentStatus = (paymentMethod?: PaymentMethod): AppPaymentStatus => {
  if (paymentMethod === 'efectivo') {
    return 'contra_entrega';
  }

  if (paymentMethod === 'deuna' || paymentMethod === 'transferencia') {
    return 'validando';
  }

  return 'pendiente';
};

const cleanPhoneTail = (phone?: string | null): string => {
  return (phone || '').replace(/\D/g, '').slice(-8);
};

const isRecentTrackableOrder = (createdAt?: string | null): boolean => {
  const createdTime = createdAt ? new Date(createdAt).getTime() : 0;

  if (!createdTime || Number.isNaN(createdTime)) {
    return false;
  }

  return createdTime > Date.now() - 24 * 60 * 60 * 1000;
};

const hasValidDeliveryLocation = (
  lat: number | null,
  lng: number | null,
  reference: string
): boolean => {
  return (
    typeof lat === 'number' &&
    Number.isFinite(lat) &&
    typeof lng === 'number' &&
    Number.isFinite(lng) &&
    reference.trim().length > 0
  );
};

const findCatalogProduct = (
  item: unknown,
  catalogProducts: Product[]
): Product | null => {
  const safeItem = item as any;

  const possibleIds = [
    safeItem?.id,
    safeItem?.product_id,
    safeItem?.cart_item_id,
    safeItem?.product?.id,
  ]
    .filter(Boolean)
    .map(value => String(value));

  for (const id of possibleIds) {
    const direct = catalogProducts.find(product => product.id === id);

    if (direct) return direct;

    const byPrefix = catalogProducts.find(product => id.startsWith(`${product.id}-`));

    if (byPrefix) return byPrefix;
  }

  const possibleName = String(safeItem?.name || safeItem?.product?.name || '')
    .trim()
    .toLowerCase();

  if (possibleName) {
    return (
      catalogProducts.find(product => product.name.trim().toLowerCase() === possibleName) ||
      null
    );
  }

  return null;
};

const getItemUnitPrice = (item: unknown, recoveredProduct: Product | null): number => {
  const safeItem = item as any;

  const customPrice =
    typeof safeItem?.product?.custom_price === 'number' && safeItem.product.custom_price > 0
      ? safeItem.product.custom_price
      : typeof safeItem?.custom_price === 'number' && safeItem.custom_price > 0
        ? safeItem.custom_price
        : undefined;

  if (customPrice) {
    return toMoney(customPrice);
  }

  const directNumberPrice =
    typeof safeItem?.price === 'number' && safeItem.price > 0
      ? safeItem.price
      : typeof safeItem?.product?.price === 'number' && safeItem.product.price > 0
        ? safeItem.product.price
        : undefined;

  if (directNumberPrice) {
    return toMoney(directNumberPrice);
  }

  const stringPrice =
    safeItem?.price_text ||
    safeItem?.product?.price ||
    safeItem?.price ||
    recoveredProduct?.price ||
    '';

  return toMoney(numericPrice(String(stringPrice)));
};

const normalizeItemsForOrder = (items: CartItem[], catalogProducts: Product[]) => {
  return items.map((item: any) => {
    const recoveredProduct = findCatalogProduct(item, catalogProducts);
    const product = item?.product || recoveredProduct || null;

    const originalProductId =
      item?.id ||
      item?.product_id ||
      recoveredProduct?.id ||
      product?.id ||
      `item-${Date.now()}`;

    const cartItemId = item?.product?.id || item?.cart_item_id || originalProductId;
    const quantity = Number(item?.quantity || 1);
    const unitPrice = getItemUnitPrice(item, recoveredProduct);
    const lineSubtotal = toMoney(unitPrice * quantity);

    const customPrice =
      typeof item?.product?.custom_price === 'number' && item.product.custom_price > 0
        ? item.product.custom_price
        : typeof item?.custom_price === 'number' && item.custom_price > 0
          ? item.custom_price
          : undefined;

    const name =
      item?.product?.name ||
      item?.name ||
      recoveredProduct?.name ||
      'Producto sin nombre';

    const category =
      item?.product?.category ||
      recoveredProduct?.category ||
      'Abarrotes y básicos';

    const image =
      item?.product?.image ||
      item?.image ||
      recoveredProduct?.image ||
      null;

    return {
      id: originalProductId,
      product_id: originalProductId,
      cart_item_id: cartItemId,
      name,
      price: unitPrice,
      price_text: customPrice
        ? `$${unitPrice.toFixed(2)}`
        : unitPrice > 0
          ? `$${unitPrice.toFixed(2)}`
          : item?.product?.price || recoveredProduct?.price || 'Consultar precio',
      custom_price: customPrice,
      quantity,
      subtotal: lineSubtotal,
      category,
      image,
      product: {
        ...(recoveredProduct || {}),
        ...(product || {}),
        id: cartItemId,
        name,
        category,
        price: unitPrice > 0 ? `$${unitPrice.toFixed(2)}` : recoveredProduct?.price,
        image: image || undefined,
        custom_price: customPrice,
      },
    };
  });
};

function AppShell() {
  const [screen, setScreen] = useState<Screen>('home');
  const [activeCategory, setActiveCategory] = useState<Category | 'Todos'>('Todos');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [pendingOrder, setPendingOrder] = useState(false);
  const [activeOrderCode, setActiveOrderCode] = useState<string | null>(null);
  const [isChangingLocation, setIsChangingLocation] = useState(false);

  const { items, clearCart } = useCart();
  const { createOrder, upsertCustomer, loading, orders, products } = useAdmin();
  const {
    customerPhone,
    customerAvatar,
    customerName,
    customerLat,
    customerLng,
    customerReference,
    setUserData,
  } = useUser();

  const mainRef = useRef<HTMLElement>(null);

  const hasCustomerIdentity = useMemo(() => {
    return Boolean(customerName.trim() && customerPhone.trim());
  }, [customerName, customerPhone]);

  const hasDeliveryData = useMemo(() => {
    return hasValidDeliveryLocation(customerLat, customerLng, customerReference);
  }, [customerLat, customerLng, customerReference]);

  const hasTrackableOrder = useMemo(() => {
    const cleanUserPhone = cleanPhoneTail(customerPhone);

    if (!cleanUserPhone) return false;

    return Boolean(
      orders?.some(order => {
        const cleanOrderPhone = cleanPhoneTail(order.customer_phone);
        const isSameCustomer = cleanOrderPhone === cleanUserPhone;
        const isRecent = isRecentTrackableOrder(order.created_at);
        const isActiveStatus = ['Por Confirmar', 'Recibido', 'Preparando', 'Enviado'].includes(order.status);

        return isSameCustomer && isRecent && isActiveStatus;
      })
    );
  }, [customerPhone, orders]);

  useEffect(() => {
    if (!hasTrackableOrder && showTracking) {
      setShowTracking(false);
    }
  }, [hasTrackableOrder, showTracking]);

  useEffect(() => {
    const handlePopState = () => {
      if (screen !== 'home') setScreen('home');
    };

    window.addEventListener('popstate', handlePopState);

    if (screen !== 'home') {
      window.history.pushState({ screen }, '');
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, [screen]);

  useEffect(() => {
    if (!customerName && !loading) {
      const timer = window.setTimeout(() => {
        setShowLoginModal(true);
      }, 3000);

      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [customerName, loading]);

  const handleNavigate = (nextScreen: Screen) => {
    if (nextScreen !== 'catalog') {
      setActiveCategory('Todos');
    }

    setScreen(nextScreen);
    setShowLoginModal(false);
    setShowTracking(false);
    setIsChangingLocation(false);

    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  };

  const handleCategoryClick = (cat: Category) => {
    setActiveCategory(cat);
    setScreen('catalog');

    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  };

  const handleLogin = async (u: {
    name: string;
    whatsapp: string;
    avatarUrl: string;
    lat?: number | null;
    lng?: number | null;
    reference?: string;
  }) => {
    setUserData({
      phone: u.whatsapp,
      name: u.name,
      avatar: u.avatarUrl,
      lat: u.lat,
      lng: u.lng,
      reference: u.reference,
    });

    try {
      await upsertCustomer(u.whatsapp, u.name, u.avatarUrl, {
        lat: u.lat,
        lng: u.lng,
        reference: u.reference || null,
      });
    } catch (error) {
      console.error('Error perfil:', error);
    }

    setShowLoginModal(false);
    setIsChangingLocation(false);

    if (pendingOrder) {
      setPendingOrder(false);
      setShowConfirmation(true);
    }
  };

  const requireCustomerBeforeOrder = () => {
    setPendingOrder(true);
    setShowConfirmation(false);
    setIsChangingLocation(false);
    setShowLoginModal(true);
  };

  const buildOrderPayload = (code: string, status: OrderStatus = 'Por Confirmar') => {
    const detailedItems = normalizeItemsForOrder(items, products);
    const subtotal = toMoney(
      detailedItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0)
    );
    const deliveryFee = deliveryFeeOf(subtotal);
    const serviceFee = 0;
    const cardFee = 0;
    const total = toMoney(subtotal + deliveryFee + serviceFee + cardFee);
    const paymentMethod = getStoredPaymentMethod();
    const paymentStatus = getInitialPaymentStatus(paymentMethod);

    return {
      order_code: code,
      customer_phone: customerPhone,
      items: detailedItems,
      subtotal,
      delivery_fee: toMoney(deliveryFee),
      service_fee: toMoney(serviceFee),
      card_fee: toMoney(cardFee),
      total,
      status,
      payment_status: paymentStatus,
      preorder: !isStoreOpen(),
      payment_method: paymentMethod,
      delivery_type: 'domicilio' as const,
      lat: customerLat,
      lng: customerLng,
      reference: customerReference.trim(),
      counted_in_metrics: false,
      is_test_order: false,
      created_at: new Date().toISOString(),
    };
  };

  const handleEarlySave = async () => {
    if (!hasCustomerIdentity || !hasDeliveryData || items.length === 0) return;
    if (!getStoredPaymentMethod()) return;
    if (activeOrderCode) return;

    const code = orderCode();
    setActiveOrderCode(code);

    try {
      await createOrder(buildOrderPayload(code, 'Por Confirmar'));
    } catch (error) {
      console.error('Error crítico al guardar orden anticipada:', error);
      setActiveOrderCode(null);
    }
  };

  const handleWhatsApp = async () => {
    if (items.length === 0) {
      setShowConfirmation(false);
      setScreen('home');
      setActiveOrderCode(null);
      return;
    }

    if (!hasCustomerIdentity || !hasDeliveryData) {
      requireCustomerBeforeOrder();
      return;
    }

    const code = activeOrderCode || orderCode();
    const whatsappUrl = buildWhatsAppUrl(
  items,
  customerPhone,
  customerName,
  code,
  !isStoreOpen(),
  {
    paymentMethod: getStoredPaymentMethod(),
    selectedBank: localStorage.getItem('selectedBank'),
    customerReference: customerReference.trim(),
    customerLat,
    customerLng,
    deliveryType: 'domicilio',
  }
);

    if (!activeOrderCode) {
      try {
        await createOrder(buildOrderPayload(code, 'Por Confirmar'));
      } catch (error) {
        console.error('Error crítico al guardar orden:', error);
      }
    }

    window.location.href = whatsappUrl;

    window.setTimeout(() => {
      clearCart();
      clearStoredPaymentMethod();
      setShowConfirmation(false);
      setScreen('home');
      setShowTracking(true);
      setActiveOrderCode(null);
    }, 100);
  };

  return (
    <div className="flex flex-col bg-gray-50 h-[100dvh] selection:bg-orange-200">
      <AppHeader
        screen={screen}
        onNavigate={handleNavigate}
        onOpenProfile={() => setShowLoginModal(true)}
        customerAvatar={customerAvatar}
      />

      <main ref={mainRef} className="flex-1 overflow-y-auto pb-20 relative scroll-smooth shadow-inner">
        <OrderTracking
          isOpen={showTracking}
          onClose={() => setShowTracking(false)}
        />

        {screen === 'home' && (
          <HomeScreen
            onNavigate={handleNavigate}
            onNavigateToCategory={handleCategoryClick}
          />
        )}

        {screen === 'catalog' && (
          <CatalogScreen
            initialCategory={activeCategory}
            onCategoryChange={cat => setActiveCategory(cat as Category | 'Todos')}
            onNavigate={handleNavigate}
          />
        )}

        {screen === 'cart' && (
          <CartScreen
            onCheckout={() => setShowConfirmation(true)}
            onNavigate={handleNavigate}
            onRequireLogin={mode => {
              if (mode === 'change_location') {
                setIsChangingLocation(true);
                setPendingOrder(false);
              } else {
                setIsChangingLocation(false);
                setPendingOrder(true);
              }

              setShowLoginModal(true);
            }}
            onEarlySave={handleEarlySave}
          />
        )}

        {screen === 'info' && (
          <InfoScreen
            onInstall={() => undefined}
            canInstall={false}
            onNavigate={handleNavigate}
          />
        )}

        {screen === 'ranking' && <Ranking />}
      </main>

      {screen !== 'ranking' && hasTrackableOrder && (
        <button
          type="button"
          onClick={() => setShowTracking(true)}
          className="fixed right-4 bottom-[88px] z-40 flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-md border border-orange-100 px-4 py-3 shadow-xl shadow-orange-100 text-orange-600 active:scale-95 transition-all"
          aria-label="Abrir rastreo de pedido"
        >
          <PackageSearch size={18} />
          <span className="text-[10px] font-black uppercase tracking-widest">
            Rastrear
          </span>
        </button>
      )}

      {screen !== 'ranking' && (
        <BottomNav
          current={screen}
          onNavigate={handleNavigate}
        />
      )}

      <FlyParticleLayer />

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => {
          setShowLoginModal(false);
          setPendingOrder(false);
          setIsChangingLocation(false);
        }}
        onLogin={handleLogin}
        isMandatory={pendingOrder}
        isChangingLocation={isChangingLocation}
      />

      <OrderConfirmation
        visible={showConfirmation}
        onWhatsApp={handleWhatsApp}
      />
    </div>
  );
}

export default function App() {
  const [landingDone, setLandingDone] = useState(() => {
    const isPWA =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;

    const isDismissed = Boolean(localStorage.getItem('pollazo_landing_dismissed'));

    return isPWA || isDismissed;
  });

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;

    const updateRegistration = () => {
      navigator.serviceWorker.ready
        .then(registration => registration.update())
        .catch(() => undefined);
    };

    updateRegistration();

    window.addEventListener('load', updateRegistration);

    return () => {
      window.removeEventListener('load', updateRegistration);
    };
  }, []);

  if (window.location.pathname === '/admin') {
    return (
      <ErrorBoundary>
        <AdminProvider>
          <AdminDashboard />
        </AdminProvider>
      </ErrorBoundary>
    );
  }

  if (!landingDone) {
    return (
      <ErrorBoundary>
        <AdminProvider>
          <LandingPage
            onInstall={() => undefined}
            canInstall={false}
            onContinueWeb={() => {
              localStorage.setItem('pollazo_landing_dismissed', '1');
              setLandingDone(true);
            }}
          />
        </AdminProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <AdminProvider>
        <UserProvider>
          <CartProvider>
            <FlyToCartProvider>
              <AppShell />
            </FlyToCartProvider>
          </CartProvider>
        </UserProvider>
      </AdminProvider>
    </ErrorBoundary>
  );
}
