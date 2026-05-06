import { useState, useCallback, useEffect, useRef } from 'react';
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
import Ranking from './pages/Ranking'; // Asegúrate de que este archivo existe en src/pages/Ranking.tsx
import { useCart } from './context/CartContext';
import { buildWhatsAppUrl, deliveryFeeOf, isStoreOpen, orderCode, subtotalOf } from './utils/whatsapp';
import { supabase } from './lib/supabase';
import { Category } from './types';

type Screen = 'home' | 'catalog' | 'cart' | 'info' | 'ranking';

const LANDING_DISMISSED_KEY = 'pollazo_landing_dismissed';

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
}

function isAdminRoute(): boolean {
  return window.location.pathname === '/admin';
}

function AppShell() {
  const [screen, setScreen] = useState<Screen>('home');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { items, clearCart } = useCart();
  const { upsertCustomer, createOrder, loading } = useAdmin();
  const { customerPhone, customerAvatar, customerName, setUserData } = useUser();
  const mainRef = useRef<HTMLElement>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Pantalla de carga para evitar el blanco
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-orange-500">
        <div className="text-center text-white">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-black uppercase tracking-widest text-sm">Cargando Pollazo...</p>
        </div>
      </div>
    );
  }

  const handleLoginDone = async (userData: { name: string; whatsapp: string; avatarUrl: string }) => {
    setUserData(userData.whatsapp, userData.name, userData.avatarUrl);
    setShowLoginModal(false);
    await upsertCustomer(userData.whatsapp, userData.name, userData.avatarUrl);
  };

  const handleWhatsApp = async () => {
    const code = orderCode();
    const subtotal = subtotalOf(items);
    const delivery_fee = deliveryFeeOf(subtotal);
    const total = subtotal + delivery_fee;
    const customer = await upsertCustomer(customerPhone, customerName, customerAvatar);
    await createOrder({
      id: crypto.randomUUID(),
      order_code: code,
      customer_id: customer?.id ?? null,
      customer_phone: customerPhone,
      items,
      subtotal,
      delivery_fee,
      total,
      status: 'Recibido',
      preorder: !isStoreOpen(),
    });
    window.open(buildWhatsAppUrl(items, customerPhone, customerName, code, !isStoreOpen()), '_blank');
    clearCart();
    setShowConfirmation(false);
    setScreen('home');
  };

  const handleNavigate = (s: Screen) => {
    setScreen(s);
    if (mainRef.current) mainRef.current.scrollTop = 0;
  };

  return (
    <div className="flex flex-col bg-gray-50 h-[100dvh]">
      <AppHeader 
        screen={screen} 
        onNavigate={handleNavigate} 
        scrolled={false} 
        onOpenProfile={() => setShowLoginModal(true)}
        customerAvatar={customerAvatar}
      />

      <main ref={mainRef} className="flex-1 overflow-y-auto pb-20 relative">
        <OrderTracking />
        {screen === 'home' && <HomeScreen onNavigate={handleNavigate} onNavigateToCategory={() => handleNavigate('catalog')} />}
        {screen === 'catalog' && <CatalogScreen initialCategory="Todos" onCategoryChange={() => {}} />}
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
  const [isAdmin] = useState(isAdminRoute);
  const [landingDone, setLandingDone] = useState(() => isStandalone() || !!sessionStorage.getItem(LANDING_DISMISSED_KEY));

  if (isAdmin) return <AdminProvider><AdminDashboard /></AdminProvider>;
  if (!landingDone) return <AdminProvider><LandingPage onInstall={() => {}} canInstall={false} onContinueWeb={() => {
    sessionStorage.setItem(LANDING_DISMISSED_KEY, '1');
    setLandingDone(true);
  }} /></AdminProvider>;

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
