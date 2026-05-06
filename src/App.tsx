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
import { useCart } from './context/CartContext';
import { buildWhatsAppUrl, deliveryFeeOf, isStoreOpen, orderCode, subtotalOf } from './utils/whatsapp';
import { supabase } from './lib/supabase';
import { Category } from './types';

type Screen = 'home' | 'catalog' | 'cart' | 'info';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const LANDING_DISMISSED_KEY = 'pollazo_landing_dismissed';

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone === true)
  );
}

function isAdminRoute(): boolean {
  return window.location.pathname === '/admin';
}

// --- CUERPO DE LA APP ---
function AppShell({ initialCategory, onClearCategory }: { initialCategory: Category | null; onClearCategory: () => void }) {
  const [screen, setScreen] = useState<Screen>('home');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category | 'Todos'>(initialCategory ?? 'Todos');
  const { items, clearCart } = useCart();
  const { upsertCustomer, createOrder } = useAdmin();
  
  // 🔑 AQUÍ ESTÁ EL CAMBIO: Usamos el UserContext para que no se borre el login
  const { customerPhone, customerAvatar, customerName, setUserData } = useUser();
  
  const mainRef = useRef<HTMLElement>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'checkout' | null>(null);

  // Abrir login si no hay datos guardados
  useEffect(() => {
    if (!customerPhone) {
      const timer = setTimeout(() => setShowLoginModal(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [customerPhone]);

  useEffect(() => {
    if (initialCategory) {
      setScreen('catalog');
      onClearCategory();
    }
  }, [initialCategory, onClearCategory]);

  const handleCheckout = () => {
    if (items.length === 0) return;
    if (!customerPhone) {
      setPendingAction('checkout');
      setShowLoginModal(true);
      return;
    }
    setShowConfirmation(true);
  };

  // 🔥 ESTA ES LA FUNCIÓN QUE PREGUNTABAS: Guarda todo en el "Cerebro" de la App
  const handleLoginDone = async (userData: { name: string; whatsapp: string; avatarUrl: string }) => {
    // 1. Guardamos en el Contexto (esto lo graba en localStorage automáticamente)
    setUserData(userData.whatsapp, userData.name, userData.avatarUrl);
    setShowLoginModal(false);

    // 2. Sincronizamos con la base de datos
    await upsertCustomer(userData.whatsapp, userData.name, userData.avatarUrl);

    if (pendingAction === 'checkout') {
      setShowConfirmation(true);
    }
    setPendingAction(null);
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
    
    supabase.rpc('increment_metric', { metric_id: 'total_orders' }).then(() => {});
    window.open(buildWhatsAppUrl(items, customerPhone, customerName, code, !isStoreOpen()), '_blank');
    
    clearCart();
    setShowConfirmation(false);
    setScreen('home');
  };

  const handleNavigate = useCallback((s: Screen) => {
    setScreen(s);
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, []);

  const handleNavigateToCategory = useCallback((cat: Category) => {
    setActiveCategory(cat);
    setScreen('catalog');
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, []);

  return (
    <div className="flex flex-col bg-gray-50" style={{ minHeight: '100dvh', maxHeight: '100dvh' }}>
      {/* Header ahora usa el avatar del contexto */}
      <AppHeader 
        screen={screen} 
        onNavigate={handleNavigate} 
        scrolled={false} 
        onOpenProfile={() => setShowLoginModal(true)}
        customerAvatar={customerAvatar}
      />

      <main ref={mainRef} className="flex-1 overflow-y-auto pb-20 relative">
        {/* EL BOTÓN FLOTANTE: No estorba porque es 'fixed' */}
        <OrderTracking />

        {screen === 'home' && <HomeScreen onNavigate={handleNavigate} onNavigateToCategory={handleNavigateToCategory} />}
        {screen === 'catalog' && <CatalogScreen initialCategory={activeCategory} onCategoryChange={setActiveCategory} />}
        {screen === 'cart' && <CartScreen onCheckout={handleCheckout} onNavigate={handleNavigate} />}
        {screen === 'info' && <InfoScreen onInstall={() => {}} canInstall={false} />}
      </main>

      <BottomNav current={screen} onNavigate={handleNavigate} />
      <FlyParticleLayer />
      
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
        onLogin={handleLoginDone} 
      />

      <OrderConfirmation visible={showConfirmation} onWhatsApp={handleWhatsApp} />
    </div>
  );
}

// --- EXPORT PRINCIPAL ---
export default function App() {
  const [isAdmin] = useState(isAdminRoute);
  const [landingDone, setLandingDone] = useState(() => isStandalone() || !!sessionStorage.getItem(LANDING_DISMISSED_KEY));

  if (isAdmin) {
    return <AdminProvider><AdminDashboard /></AdminProvider>;
  }

  if (!landingDone) {
    return (
      <AdminProvider>
        <LandingPage onInstall={() => {}} canInstall={false} onContinueWeb={() => {
          sessionStorage.setItem(LANDING_DISMISSED_KEY, '1');
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
            <AppShell initialCategory={null} onClearCategory={() => {}} />
          </FlyToCartProvider>
        </CartProvider>
      </UserProvider>
    </AdminProvider>
  );
}
