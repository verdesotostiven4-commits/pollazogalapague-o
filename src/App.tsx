import { useState, useRef, Component, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { PackageSearch, RefreshCw } from 'lucide-react';
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
import DeliveryDashboard from './components/DeliveryDashboard';
import LoginModal from './components/LoginModal';
import OrderTracking from './components/OrderTracking';
import LegalModal from './components/LegalModal';
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

type TrackingLaunchSource = 'notification' | null;

type PollazoServiceWorkerMessage = {
  type?: string;
  url?: string;
  orderCode?: string | null;
  status?: string | null;
};

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: unknown }
> {
  constructor(props: { children: ReactNode }) {
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

const LEGAL_ACCEPTED_KEY = 'pollazo_legal_accepted';
const FINAL_TRACKING_MINUTES = 20;
const FINAL_TRACKING_AUTO_CLOSE_MS = 12000;
const TRACKING_DEEP_LINK_WAIT_MS = 8500;

const ACTIVE_TRACKING_STATUSES: OrderStatus[] = [
  'Por Confirmar',
  'Recibido',
  'Preparando',
  'Enviado',
];

const FINAL_TRACKING_STATUSES: OrderStatus[] = [
  'Entregado',
  'Cancelado',
];

const toMoney = (value: number): number => {
  if (!Number.isFinite(value)) return 0;

  return Number(value.toFixed(2));
};

const isPaymentMethod = (value: string | null): value is PaymentMethod => {
  return (
    value === 'efectivo' ||
    value === 'deuna' ||
    value === 'transferencia' ||
    value === 'tarjeta'
  );
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

  if (paymentMethod === 'tarjeta') {
    return 'validando';
  }

  return 'pendiente';
};

const cleanPhoneTail = (phone?: string | null): string => {
  return (phone || '').replace(/\D/g, '').slice(-9);
};

const isRecentTrackableOrder = (createdAt?: string | null): boolean => {
  const createdTime = createdAt ? new Date(createdAt).getTime() : 0;

  if (!createdTime || Number.isNaN(createdTime)) {
    return false;
  }

  return createdTime > Date.now() - 24 * 60 * 60 * 1000;
};

const isRecentlyFinalizedOrder = (
  updatedAt?: string | null,
  createdAt?: string | null
): boolean => {
  const referenceTime = updatedAt || createdAt;
  const time = referenceTime ? new Date(referenceTime).getTime() : 0;

  if (!time || Number.isNaN(time)) {
    return false;
  }

  return time > Date.now() - FINAL_TRACKING_MINUTES * 60 * 1000;
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

function TrackingWakeOverlay({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />

      <div className="relative z-10 w-full max-w-md bg-white rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95 duration-300 border border-white/20">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Cerrar búsqueda de rastreo"
        >
          ×
        </button>

        <div className="text-center">
          <div className="w-20 h-20 rounded-[28px] bg-orange-100 text-orange-500 flex items-center justify-center mx-auto mb-5 shadow-inner">
            <RefreshCw size={36} className="animate-spin" />
          </div>

          <h2 className="text-2xl font-black text-gray-900 uppercase italic leading-none">
            Buscando tu pedido
          </h2>

          <p className="text-sm font-bold text-gray-400 mt-3 leading-relaxed">
            Estamos abriendo el rastreo actualizado. Esto puede tardar unos segundos si la app estaba cerrada.
          </p>

          <div className="mt-6 rounded-[28px] bg-orange-50 border border-orange-100 p-4">
            <p className="text-[10px] font-black text-orange-700 uppercase leading-relaxed">
              No cierres esta pantalla. Apenas encontremos tu pedido, aparecerá el estado real automáticamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppShell() {
  const [screen, setScreen] = useState<Screen>('home');
  const [activeCategory, setActiveCategory] = useState<Category | 'Todos'>('Todos');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [pendingOrder, setPendingOrder] = useState(false);
  const [activeOrderCode, setActiveOrderCode] = useState<string | null>(null);
  const [isChangingLocation, setIsChangingLocation] = useState(false);
  const [trackingLaunchSource, setTrackingLaunchSource] = useState<TrackingLaunchSource>(null);
  const [showLegalModal, setShowLegalModal] = useState(() => {
    return localStorage.getItem(LEGAL_ACCEPTED_KEY) !== '1';
  });

  const { items, clearCart } = useCart();
  const { createOrder, upsertCustomer, orders, products, loading, refreshData } = useAdmin();
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

  const acceptLegalTerms = () => {
    localStorage.setItem(LEGAL_ACCEPTED_KEY, '1');
    setShowLegalModal(false);
  };

  const hasCustomerIdentity = useMemo(() => {
    return Boolean(customerName.trim() && customerPhone.trim());
  }, [customerName, customerPhone]);

  const hasDeliveryData = useMemo(() => {
    return hasValidDeliveryLocation(customerLat, customerLng, customerReference);
  }, [customerLat, customerLng, customerReference]);

  const latestTrackableOrder = useMemo(() => {
    const cleanUserPhone = cleanPhoneTail(customerPhone);

    if (!cleanUserPhone) return null;

    const matches =
      orders
        ?.filter(order => {
          const cleanOrderPhone = cleanPhoneTail(order.customer_phone);
          const isSameCustomer = cleanOrderPhone === cleanUserPhone;
          const isRecent = isRecentTrackableOrder(order.created_at);
          const isActiveStatus = ACTIVE_TRACKING_STATUSES.includes(order.status);
          const isFinalStatus = FINAL_TRACKING_STATUSES.includes(order.status);
          const isFreshFinalStatus = isFinalStatus
            ? isRecentlyFinalizedOrder(order.updated_at, order.created_at)
            : false;

          return isSameCustomer && isRecent && (isActiveStatus || isFreshFinalStatus);
        })
        .sort((a, b) => {
          const dateA = new Date(a.updated_at || a.created_at || '').getTime();
          const dateB = new Date(b.updated_at || b.created_at || '').getTime();

          return dateB - dateA;
        }) || [];

    return matches[0] || null;
  }, [customerPhone, orders]);

  const hasTrackableOrder = Boolean(latestTrackableOrder);
  const shouldShowTrackingWake = showTracking && trackingLaunchSource === 'notification' && !hasTrackableOrder;

  const openTrackingFromNotification = useCallback(() => {
    setScreen('home');
    setShowTracking(true);
    setShowLoginModal(false);
    setIsChangingLocation(false);
    setPendingOrder(false);
    setShowConfirmation(false);
    setTrackingLaunchSource('notification');

    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }

    void refreshData().catch(error => {
      console.error('No se pudo refrescar rastreo desde notificación:', error);
    });
  }, [refreshData]);

  const closeTracking = useCallback(() => {
    setShowTracking(false);
    setTrackingLaunchSource(null);
  }, []);

  useEffect(() => {
    if (!loading && !hasTrackableOrder && showTracking && !trackingLaunchSource) {
      setShowTracking(false);
    }
  }, [hasTrackableOrder, loading, showTracking, trackingLaunchSource]);

  useEffect(() => {
    if (latestTrackableOrder && trackingLaunchSource) {
      setTrackingLaunchSource(null);
    }
  }, [latestTrackableOrder, trackingLaunchSource]);

  useEffect(() => {
    if (!showTracking || trackingLaunchSource !== 'notification' || hasTrackableOrder) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setTrackingLaunchSource(null);
    }, TRACKING_DEEP_LINK_WAIT_MS);

    return () => window.clearTimeout(timer);
  }, [hasTrackableOrder, showTracking, trackingLaunchSource]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shouldOpenTracking = params.get('tracking') === '1';

    if (!shouldOpenTracking) return;

    openTrackingFromNotification();

    params.delete('tracking');
    params.delete('orderCode');
    params.delete('status');

    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}`;

    window.history.replaceState({}, '', nextUrl);
  }, [openTrackingFromNotification]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return undefined;
    }

    const handleServiceWorkerMessage = (event: MessageEvent<PollazoServiceWorkerMessage>) => {
      const data = event.data;

      if (data?.type === 'POLLAZO_OPEN_TRACKING') {
        openTrackingFromNotification();
      }
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [openTrackingFromNotification]);

  useEffect(() => {
    if (!showTracking || !latestTrackableOrder) return undefined;

    const isFinalStatus = FINAL_TRACKING_STATUSES.includes(latestTrackableOrder.status);

    if (!isFinalStatus) return undefined;

    const timer = window.setTimeout(() => {
      setShowTracking(false);
      setTrackingLaunchSource(null);
    }, FINAL_TRACKING_AUTO_CLOSE_MS);

    return () => window.clearTimeout(timer);
  }, [latestTrackableOrder, showTracking]);

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

  const handleNavigate = (nextScreen: Screen) => {
    if (nextScreen !== 'catalog') {
      setActiveCategory('Todos');
    }

    setScreen(nextScreen);
    setShowLoginModal(false);
    setShowTracking(false);
    setIsChangingLocation(false);
    setTrackingLaunchSource(null);

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

  const handleOpenDeliveryLocation = () => {
    setShowConfirmation(false);
    setPendingOrder(false);
    setShowTracking(false);
    setTrackingLaunchSource(null);

    if (hasCustomerIdentity) {
      setIsChangingLocation(true);
    } else {
      setIsChangingLocation(false);
    }

    setShowLoginModal(true);
  };

  const handleLogin = (u: {
    name: string;
    whatsapp: string;
    avatarUrl: string;
    lat?: number | null;
    lng?: number | null;
    reference?: string;
  }) => {
    const wasPendingOrder = pendingOrder;

    setUserData({
      phone: u.whatsapp,
      name: u.name,
      avatar: u.avatarUrl,
      lat: u.lat,
      lng: u.lng,
      reference: u.reference,
    });

    setShowLoginModal(false);
    setIsChangingLocation(false);
    setPendingOrder(false);

    if (wasPendingOrder) {
      setShowConfirmation(true);
    }

    void (async () => {
      try {
        await upsertCustomer(u.whatsapp, u.name, u.avatarUrl, {
          lat: u.lat,
          lng: u.lng,
          reference: u.reference || null,
        });
      } catch (error) {
        console.error('Error perfil:', error);
      }
    })();
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

  const saveOrderIfNeeded = async () => {
    if (!hasCustomerIdentity || !hasDeliveryData || items.length === 0) {
      return null;
    }

    const code = activeOrderCode || orderCode();

    if (!activeOrderCode) {
      setActiveOrderCode(code);

      try {
        await createOrder(buildOrderPayload(code, 'Por Confirmar'));
      } catch (error) {
        console.error('Error crítico al guardar orden:', error);
        setActiveOrderCode(null);
        return null;
      }
    }

    return code;
  };

  const handleEarlySave = async () => {
    if (!hasCustomerIdentity || !hasDeliveryData || items.length === 0) {
      throw new Error('Faltan datos del cliente, ubicación o productos para registrar el pedido.');
    }

    if (!getStoredPaymentMethod()) {
      throw new Error('Selecciona un método de pago antes de registrar el pedido.');
    }

    if (activeOrderCode) {
      return;
    }

    const code = orderCode();
    setActiveOrderCode(code);

    try {
      await createOrder(buildOrderPayload(code, 'Por Confirmar'));
    } catch (error) {
      console.error('Error crítico al guardar orden anticipada:', error);
      setActiveOrderCode(null);
      throw error;
    }
  };

  const finishOrderInsideApp = async () => {
    if (items.length === 0) {
      setShowConfirmation(false);
      setScreen('home');
      setShowTracking(true);
      setTrackingLaunchSource(null);
      setActiveOrderCode(null);
      return;
    }

    if (!hasCustomerIdentity || !hasDeliveryData) {
      requireCustomerBeforeOrder();
      return;
    }

    const savedCode = await saveOrderIfNeeded();

    if (!savedCode) {
      return;
    }

    clearCart();
    clearStoredPaymentMethod();

    setShowConfirmation(false);
    setScreen('home');
    setShowTracking(true);
    setTrackingLaunchSource(null);
    setActiveOrderCode(null);

    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
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

    const code = await saveOrderIfNeeded();

    if (!code) {
      return;
    }

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

    window.location.href = whatsappUrl;

    window.setTimeout(() => {
      clearCart();
      clearStoredPaymentMethod();
      setShowConfirmation(false);
      setScreen('home');
      setShowTracking(true);
      setTrackingLaunchSource(null);
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

      <main
        ref={mainRef}
        className="flex-1 overflow-y-auto pb-20 relative scroll-smooth shadow-inner"
      >
        {shouldShowTrackingWake ? (
          <TrackingWakeOverlay onClose={closeTracking} />
        ) : (
          <OrderTracking
            isOpen={showTracking}
            onClose={closeTracking}
          />
        )}

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
            onChangeLocation={handleOpenDeliveryLocation}
          />
        )}

        {screen === 'ranking' && <Ranking />}
      </main>

      {screen !== 'ranking' && hasTrackableOrder && (
        <button
          type="button"
          onClick={() => {
            setShowTracking(true);
            setTrackingLaunchSource(null);
          }}
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
        onContinueInApp={finishOrderInsideApp}
      />

      <LegalModal
        isOpen={showLegalModal}
        onClose={acceptLegalTerms}
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

    const shouldOpenTracking =
      new URLSearchParams(window.location.search).get('tracking') === '1';

    return isPWA || isDismissed || shouldOpenTracking;
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

  if (window.location.pathname === '/repartidor') {
    return (
      <ErrorBoundary>
        <AdminProvider>
          <DeliveryDashboard />
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
