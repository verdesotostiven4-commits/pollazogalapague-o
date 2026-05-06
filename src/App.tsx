import { useState, useRef, Component } from 'react';
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

class ErrorBoundary extends Component<{children: any}, {hasError: boolean}> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 bg-orange-50 min-h-screen text-center flex flex-col items-center justify-center">
          <h1 className="text-orange-600 font-black text-2xl uppercase italic">🚨 Reinicio Necesario</h1>
          <p className="text-gray-500 mt-3 max-w-xs font-medium">Estamos refrescando el inventario de Pollazo El Mirador.</p>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="mt-8 bg-orange-500 text-white px-10 py-4 rounded-[24px] font-black shadow-xl shadow-orange-200 active:scale-95 transition-all">
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
  const { upsertCustomer, createOrder, loading, products } = useAdmin();
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

  const handleNavigate = (s: any) => {
    setScreen(s);
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
      <AppHeader screen={screen} onNavigate={handleNavigate} onOpenProfile={() => setShowLoginModal(true)} customerAvatar={customerAvatar} />
      <main ref={mainRef} className="flex-1 overflow-y-auto pb-20 relative">
        <OrderTracking />
        {screen === 'home' && (
          <div className="px-6 pt-6">
            <div className="bg-white p-7 rounded-[32px] shadow-xl shadow-orange-100 border-2 border-orange-50 mb-6 text-center">
               <h2 className="font-black text-2xl text-gray-900 italic">Hola, {customerName || 'Cliente'}</h2>
               <button onClick={() => handleNavigate('ranking')} className="mt-4 w-full bg-orange-500 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-lg shadow-orange-200">
                 🏆 Ver Ranking de Clientes
               </button>
            </div>
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
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onLogin={(u) => setUserData(u.whatsapp, u.name, u.avatarUrl)} />
      <OrderConfirmation visible={showConfirmation} onWhatsApp={handleWhatsApp} />
    </div>
  );
}

export default function App() {
  const [landingDone, setLandingDone] = useState(() => !!sessionStorage.getItem('pollazo_landing_dismissed'));
  if (window.location.pathname === '/admin') return <AdminProvider><AdminDashboard /></AdminProvider>;
  
  if (!landingDone) {
    return (
      <AdminProvider>
        <LandingPage onInstall={() => {}} canInstall={false} onContinueWeb={() => {
          sessionStorage.setItem('pollazo_landing_dismissed', '1');
          setLandingDone(true);
        }} />
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
