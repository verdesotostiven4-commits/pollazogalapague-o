import { useState, useCallback, useEffect, useRef } from 'react';
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
import { buildWhatsAppUrl, deliveryFeeOf, isStoreOpen, orderCode, subtotalOf } from './utils/whatsapp';
import { Screen } from './types';

function AppShell() {
  const [screen, setScreen] = useState<Screen>('home');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { items, clearCart } = useCart();
  const { upsertCustomer, createOrder, loading } = useAdmin();
  const { customerPhone, customerName, customerAvatar, setUserData } = useUser();
  const mainRef = useRef<HTMLElement>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    if (!customerPhone) {
      const timer = setTimeout(() => setShowLoginModal(true), 2500);
      return () => clearTimeout(timer);
    }
  }, [customerPhone]);

  const handleNavigate = useCallback((s: Screen) => {
    setScreen(s);
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, []);

  const handleWhatsApp = async () => {
    const code = orderCode();
    const subtotal = subtotalOf(items);
    await createOrder({
      id: crypto.randomUUID(),
      order_code: code,
      customer_phone: customerPhone,
      items,
      subtotal,
      delivery_fee: deliveryFeeOf(subtotal),
      total: subtotal + deliveryFeeOf(subtotal),
      status: 'Recibido',
      preorder: !isStoreOpen(),
    });
    window.open(buildWhatsAppUrl(items, customerPhone, customerName, code, !isStoreOpen()), '_blank');
    clearCart();
    setShowConfirmation(false);
    setScreen('home');
  };

  if (loading) return <div className="h-screen bg-orange-500 flex items-center justify-center text-white font-black italic animate-pulse text-xl">CARGANDO POLLAZO...</div>;

  return (
    <div className="flex flex-col bg-gray-50 h-[100dvh]">
      <AppHeader screen={screen as any} onNavigate={handleNavigate} scrolled={false} onOpenProfile={() => setShowLoginModal(true)} customerAvatar={customerAvatar} />
      
      <main ref={mainRef} className="flex-1 overflow-y-auto pb-20 relative">
        <OrderTracking />
        
        {screen === 'home' && (
           <div className="animate-in fade-in duration-500">
             <div className="px-6 pt-6 mb-4">
                <div className="bg-white p-6 rounded-[32px] shadow-sm border border-orange-100">
                  <h2 className="font-black text-2xl text-gray-900 italic">Hola, {customerName || 'Cliente'}</h2>
                  <button onClick={() => handleNavigate('ranking')} className="mt-4 w-full bg-orange-500 text-white py-3 rounded-2xl font-black text-xs uppercase shadow-lg shadow-orange-200">
                    🏆 Ver Ranking de Clientes
                  </button>
                </div>
             </div>
             <HomeScreen onNavigate={handleNavigate} onNavigateToCategory={() => handleNavigate('catalog')} />
           </div>
        )}

        {screen === 'catalog' && <CatalogScreen initialCategory="Todos" onCategoryChange={() => {}} />}
        {screen === 'cart' && <CartScreen onCheckout={() => setShowConfirmation(true)} onNavigate={handleNavigate} />}
        {screen === 'info' && <InfoScreen onInstall={() => {}} canInstall={false} />}
        {screen === 'ranking' && <Ranking />}
      </main>

      <BottomNav current={screen as any} onNavigate={handleNavigate} />
      <FlyParticleLayer />
      
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
        onLogin={(u) => { 
          setUserData(u.whatsapp, u.name, u.avatarUrl); 
          setShowLoginModal(false); 
          upsertCustomer(u.whatsapp, u.name, u.avatarUrl); 
        }} 
      />
      
      <OrderConfirmation visible={showConfirmation} onWhatsApp={handleWhatsApp} />
    </div>
  );
}

export default function App() {
  const [landingDone, setLandingDone] = useState(() => !!sessionStorage.getItem('pollazo_landing_dismissed'));

  if (window.location.pathname === '/admin') return <AdminProvider><AdminDashboard /></AdminProvider>;

  if (!landingDone) {
    return <AdminProvider><LandingPage onInstall={() => {}} canInstall={false} onContinueWeb={() => { 
      sessionStorage.setItem('pollazo_landing_dismissed', '1'); 
      setLandingDone(true); 
    }} /></AdminProvider>;
  }

  return (
    <AdminProvider>
      <UserProvider> 
        <CartProvider>
          <FlyToCartProvider>
            <AppShell />
          </FlyToCartProvider>
        </CartProvider>
      </UserProvider>
    </AdminProvider>
  );
}
