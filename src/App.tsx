import { useState, useRef, Component, useEffect } from 'react';
import { CartProvider } from './context/CartContext';
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
import { useCart } from './context/CartContext';
import { buildWhatsAppUrl, deliveryFeeOf, isStoreOpen, orderCode } from './utils/whatsapp';

class ErrorBoundary extends Component<{children: any}, {hasError: boolean, error: any}> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 bg-orange-50 min-h-screen text-center">
          <h1 className="text-orange-600 font-black text-2xl">🚨 REINICIO NECESARIO</h1>
          <p className="text-gray-600 mt-2">Estamos actualizando los productos de la tienda.</p>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="mt-6 bg-orange-500 text-white px-8 py-3 rounded-full font-black shadow-lg">
            LIMPIAR Y REINTENTAR
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppShell() {
  const [screen, setScreen] = useState<'home' | 'catalog' | 'cart' | 'info' | 'ranking'>('home');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { items, clearCart } = useCart();
  const { createOrder, loading, products } = useAdmin();
  const { customerPhone, customerAvatar, customerName, setUserData } = useUser();
  const mainRef = useRef<HTMLElement>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-orange-500 text-white font-black italic">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
        CARGANDO POLLAZO...
      </div>
    );
  }

  // ✅ CORRECCIÓN: Esta función ahora cierra el perfil al navegar
  const handleNavigate = (s: any) => {
    setScreen(s);
    setShowLoginModal(false); // Cierra el modal automáticamente
    if (mainRef.current) mainRef.current.scrollTop = 0;
  };

  const handleWhatsApp = async () => {
    const code = orderCode();
    const subtotal = items.reduce((acc, item) => {
      const p = products.find(prod => prod.id === item.id);
      return acc + (p ? Number(p.price) * item.quantity : 0);
    }, 0);

    await createOrder({
      order_code: code,
      customer_phone: customerPhone,
      items,
      subtotal,
      total: subtotal + deliveryFeeOf(subtotal),
      status: 'Recibido',
    });
    window.open(buildWhatsAppUrl(items, customerPhone, customerName, code, !isStoreOpen()), '_blank');
    clearCart();
    setShowConfirmation(false);
    setScreen('home');
  };

  return (
    <div className="flex flex-col bg-gray-50 h-[100dvh]">
      <AppHeader 
        screen={screen} 
        onNavigate={handleNavigate} 
        onOpenProfile={() => setShowLoginModal(true)} 
        customerAvatar={customerAvatar} 
      />
      <main ref={mainRef} className="flex-1 overflow-y-auto pb-20 relative">
        <OrderTracking />
        {screen === 'home' && (
          <div className="pt-0">
            <HomeScreen onNavigate={handleNavigate} onNavigateToCategory={() => handleNavigate('catalog')} />
          </div>
        )}
        {screen === 'catalog' && <CatalogScreen initialCategory="Todos" onCategoryChange={() => {}} />}
        {screen === 'cart' && <CartScreen onCheckout={() => setShowConfirmation(true)} onNavigate={handleNavigate} />}
        {screen === 'info' && <InfoScreen onInstall={() => {}} canInstall={false} />}
        {screen === 'ranking' && <Ranking />}
      </main>
      <BottomNav current={screen} onNavigate={handleNavigate} />
      <FlyParticleLayer />
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
        onLogin={(u) => setUserData(u.whatsapp, u.name, u.avatarUrl)} 
      />
      <OrderConfirmation visible={showConfirmation} onWhatsApp={handleWhatsApp} />
    </div>
  );
}

export default function App() {
  const [landingDone, setLandingDone] = useState(() => {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    const isDismissed = !!localStorage.getItem('pollazo_landing_dismissed');
    return isPWA || isDismissed;
  });

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => reg.update());
    }
  }, []);

  if (window.location.pathname === '/admin') return <AdminProvider><AdminDashboard /></AdminProvider>;
  
  if (!landingDone) {
    return (
      <AdminProvider>
        <LandingPage 
          onInstall={() => {}} 
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
