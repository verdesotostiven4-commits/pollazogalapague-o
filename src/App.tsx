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
import { Category, Screen } from './types';

function AppShell() {
  const [screen, setScreen] = useState<Screen>('home');
  const [activeCategory, setActiveCategory] = useState<Category | 'Todos'>('Todos');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isTrackingMinimized, setIsTrackingMinimized] = useState(false); // ✅ Nuevo
  
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
    if (s !== 'catalog') setActiveCategory('Todos');
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, []);

  const handleNavigateToCategory = useCallback((cat: Category) => {
    setActiveCategory(cat);
    setScreen('catalog');
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, []);

  const handleWhatsApp = async () => {
    const code = orderCode();
    const subtotal = subtotalOf(items);
    await createOrder({
      id: crypto.randomUUID(),
      order_code: code,
      customer_phone: customerPhone,
      items, subtotal, 
      delivery_fee: deliveryFeeOf(subtotal),
      total: subtotal + deliveryFeeOf(subtotal),
      status: 'Recibido', preorder: !isStoreOpen(),
    });
    window.open(buildWhatsAppUrl(items, customerPhone, customerName, code, !isStoreOpen()), '_blank');
    clearCart(); setShowConfirmation(false); setScreen('home');
    setIsTrackingMinimized(false); // Reset al pedir
  };

  const handleLoginDone = async (userData: { name: string; whatsapp: string; avatarUrl: string }) => {
    setUserData(userData.whatsapp, userData.name, userData.avatarUrl);
    setShowLoginModal(false);
    await upsertCustomer(userData.whatsapp, userData.name, userData.avatarUrl);
  };

  if (loading) return <div className="h-screen bg-orange-500 flex items-center justify-center text-white font-black italic animate-pulse text-xl">CARGANDO...</div>;

  return (
    <div className="flex flex-col bg-gray-50 h-[100dvh]">
      <AppHeader 
        screen={screen} 
        onNavigate={handleNavigate} 
        onOpenProfile={() => setShowLoginModal(true)} 
        customerAvatar={customerAvatar}
        isTrackingMinimized={isTrackingMinimized} // ✅ Pasamos estado
        onShowTracking={() => setIsTrackingMinimized(false)} // ✅ Para volver a abrirlo
      />
      
      <main ref={mainRef} className="flex-1 overflow-y-auto pb-20 relative">
        <OrderTracking 
          isMinimized={isTrackingMinimized} 
          onMinimize={() => setIsTrackingMinimized(true)} 
        />
        
        {screen === 'home' && <HomeScreen onNavigate={handleNavigate} onNavigateToCategory={handleNavigateToCategory} />}
        {screen === 'catalog' && <CatalogScreen initialCategory={activeCategory} onCategoryChange={setActiveCategory} />}
        {screen === 'cart' && <CartScreen onCheckout={() => setShowConfirmation(true)} onNavigate={handleNavigate} />}
        {screen === 'info' && <InfoScreen onInstall={() => {}} canInstall={false} />}
        {screen === 'ranking' && <Ranking />}
      </main>

      <BottomNav current={screen} onNavigate={handleNavigate} />
      <FlyParticleLayer />
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onLogin={handleLoginDone} />
      <OrderConfirmation visible={showConfirmation} onWhatsApp={handleWhatsApp} />
    </div>
  );
}

export default function App() {
  const isDashboard = window.location.pathname === '/admin';
  const [landingDone, setLandingDone] = useState(() => {
    const skip = localStorage.getItem('pollazo_landing_dismissed');
    const hasUser = localStorage.getItem('pollazo_customer_phone');
    return !!skip || !!hasUser;
  });

  if (isDashboard) return <AdminProvider><AdminDashboard /></AdminProvider>;

  if (!landingDone) {
    return (
      <AdminProvider>
        <LandingPage onInstall={() => {}} canInstall={false} onContinueWeb={() => { 
          localStorage.setItem('pollazo_landing_dismissed', '1'); 
          setLandingDone(true); 
        }} />
      </AdminProvider>
    );
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
