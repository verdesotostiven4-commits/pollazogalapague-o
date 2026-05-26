import { useState, useRef, Component, useEffect } from 'react';
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
  itemUnitPrice,
  orderCode,
  subtotalOf,
} from './utils/whatsapp';
import type { CartItem, Category, PaymentMethod, Screen } from './types';

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
          <h1 className="text-orange-600 font-black text-2xl">🚨 REINICIO NECESARIO</h1>
          <p className="text-gray-600 mt-2 italic font-bold">Recuperando el Imperio...</p>
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

const toMoney = (value: number): number => Number(value.toFixed(2));

const isPaymentMethod = (value: string | null): value is PaymentMethod => {
  return value === 'efectivo' || value === 'deuna' || value === 'transferencia';
};

const getStoredPaymentMethod = (): PaymentMethod | undefined => {
  const value = localStorage.getItem('selectedPaymentMethod');
  return isPaymentMethod(value) ? value : undefined;
};

const normalizeItemsForOrder = (items: CartItem[]) => {
  return items.map(item => {
    const product = item.product;
    const unitPrice = itemUnitPrice(item);
    const originalProductId = item.id || product.id;
    const lineSubtotal = toMoney(unitPrice * item.quantity);
    const customPrice =
      typeof product.custom_price === 'number' && product.custom_price > 0
        ? product.custom_price
        : item.custom_price;

    return {
      ...item,
      id: originalProductId,
      product_id: originalProductId,
      cart_item_id: product.id,
      name: product.name || item.name || 'Producto del Menú',
      price: unitPrice,
      price_text: customPrice
        ? `$${unitPrice.toFixed(2)}`
        : product.price || (unitPrice > 0 ? `$${unitPrice.toFixed(2)}` : 'Consultar precio'),
      custom_price: customPrice,
      quantity: item.quantity,
      subtotal: lineSubtotal,
      category: product.category,
      image: product.image || null,
      product,
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
  const { createOrder, upsertCustomer, loading } = useAdmin();
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
      await upsertCustomer(u.whatsapp, u.name, u.avatarUrl);
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

  const buildOrderPayload = (code: string, status: 'Por Confirmar' | 'Recibido') => {
    const detailedItems = normalizeItemsForOrder(items);
    const subtotal = subtotalOf(items);
    const deliveryFee = deliveryFeeOf(subtotal);
    const total = toMoney(subtotal + deliveryFee);
    const paymentMethod = getStoredPaymentMethod();

    return {
      order_code: code,
      customer_phone: customerPhone,
      items: detailedItems,
      subtotal: toMoney(subtotal),
      delivery_fee: toMoney(deliveryFee),
      total,
      status,
      preorder: !isStoreOpen(),
      payment_method: paymentMethod,
      delivery_type: 'domicilio' as const,
      lat: customerLat,
      lng: customerLng,
      reference: customerReference || undefined,
      created_at: new Date().toISOString(),
    };
  };

  const handleEarlySave = async () => {
    if (!customerName || !customerPhone || items.length === 0) return;

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
    if (!customerName || !customerPhone) {
      setPendingOrder(true);
      setShowConfirmation(false);
      setShowLoginModal(true);
      return;
    }

    if (items.length === 0) {
      setShowConfirmation(false);
      setScreen('home');
      setActiveOrderCode(null);
      return;
    }

    const code = activeOrderCode || orderCode();
    const whatsappUrl = buildWhatsAppUrl(items, customerPhone, customerName, code, !isStoreOpen());

    if (!activeOrderCode) {
      try {
        await createOrder(buildOrderPayload(code, 'Recibido'));
      } catch (error) {
        console.error('Error crítico al guardar orden:', error);
      }
    }

    window.location.href = whatsappUrl;

    window.setTimeout(() => {
      clearCart();
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

      {screen !== 'ranking' && (
        <button
          type="button"
          onClick={() => setShowTracking(true)}
          className="fixed right-4 bottom-[88px] z-40 flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-md border border-orange-100 px-4 py-3 shadow-xl shadow-orange-100 text-orange-600 active:scale-95 transition-all"
          aria-label="Abrir rastreo de pedido"
        >
          <PackageSearch size={18} />
          <span className="text-[10px] font-black uppercase tracking-widest">Rastrear</span>
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
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(registration => registration.update())
        .catch(() => undefined);
    }
  }, []);

  if (window.location.pathname === '/admin') {
    return (
      <AdminProvider>
        <AdminDashboard />
      </AdminProvider>
    );
  }

  if (!landingDone) {
    return (
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
