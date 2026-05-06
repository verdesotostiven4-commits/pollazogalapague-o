import { useState, useCallback, useEffect, useRef } from 'react';
import { CartProvider } from './context/CartContext';
import { FlyToCartProvider } from './context/FlyToCartContext';
import { AdminProvider, useAdmin } from './context/AdminContext';
import { UserProvider, useUser } from './context/UserContext'; // Importamos el nuevo cerebro
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
import OrderTracking from './components/OrderTracking'; // Importamos el rastreador
import { useCart } from './context/CartContext';
import { buildWhatsAppUrl, deliveryFeeOf, isStoreOpen, orderCode, subtotalOf } from './utils/whatsapp';
import { supabase } from './lib/supabase';
import { Category } from './types';
import { Toaster } from 'react-hot-toast';

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

// --- APP SHELL (El cuerpo de tu App) ---
function AppShell({ initialCategory, onClearCategory }: { initialCategory: Category | null; onClearCategory: () => void }) {
  const [screen, setScreen] = useState<Screen>('home');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category | 'Todos'>(initialCategory ?? 'Todos');
  const { items, clearCart } = useCart();
  const { upsertCustomer, createOrder } = useAdmin();
  const { customerPhone, setPhone } = useUser(); // Usamos el Contexto Global
  const mainRef = useRef<HTMLElement>(null);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'checkout' | null>(null);

  // Si no hay teléfono, abrimos el login después de 2 segundos
  useEffect(() => {
    if (!customerPhone) {
      const timer = setTimeout(() => {
        setShowLoginModal(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [customerPhone]);

  useEffect(() => {
    if (initialCategory) {
      setScreen('catalog');
      onClearCategory();
    }
  }, [initialCategory, onClearCategory]);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'dismissed') sessionStorage.setItem('pwa_install_dismissed', '1');
    setDeferredPrompt(null);
    setCanInstall(false);
  };

  const handleCheckout = () => {
    if (items.length === 0) return;
    if (!customerPhone) {
      setPendingAction('checkout');
      setShowLoginModal(true);
      return;
    }
    setShowConfirmation(true);
  };

  const handleLoginDone = async (userData: { name: string; whatsapp: string; avatarUrl: string }) => {
    const cleanPhone = userData.whatsapp.replace(/\D/g, ''); 
    
    // Guardamos en el contexto (esto ya guarda en localStorage automáticamente)
    setPhone(cleanPhone);
    localStorage.setItem('pollazo_customer_name', userData.name);
    localStorage.setItem('pollazo_customer_avatar', userData.avatarUrl);

    setShowLoginModal(false);

    // Sincronizamos con Supabase
    await upsertCustomer(cleanPhone, userData.name, userData.avatarUrl);

    if (pendingAction === 'checkout') {
      setShowConfirmation(true);
    }
    setPendingAction(null);
  };

  const handleCloseLogin = () => {
    setShowLoginModal(false);
    setPendingAction(null);
  };

  const handleWhatsApp = async () => {
    const phone = customerPhone;
    const name = localStorage.getItem('pollazo_customer_name') || 'Cliente';
    const avatarUrl = localStorage.getItem('pollazo_customer_avatar') || '';
    
    const code = orderCode();
    const subtotal = subtotalOf(items);
    const delivery_fee = deliveryFeeOf(subtotal);
    const total = subtotal + delivery_fee;
    
    const customer = await upsertCustomer(phone, name, avatarUrl);
    
    await createOrder({
      id: crypto.randomUUID(),
      order_code: code,
      customer_id: customer?.id ?? null,
      customer_phone: phone,
      items,
      subtotal,
      delivery_fee,
      total,
      status: 'Recibido',
      preorder: !isStoreOpen(),
    });
    
    supabase.rpc('increment_metric', { metric_id: 'total_orders' }).then(() => {});
    window.open(buildWhatsAppUrl(items, phone, name, code, !isStoreOpen()), '_blank');
    
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
    <div
      className="flex flex-col bg-gray-50"
      style={{ minHeight: '100dvh', maxHeight: '100dvh', fontFamily: 'Inter, sans-serif' }}
    >
      <Toaster position="top-center" />
      
      <AppHeader 
        screen={screen} 
        onNavigate={handleNavigate} 
        scrolled={false} 
        onOpenProfile={() => setShowLoginModal(true)}
        customerAvatar={localStorage.getItem('pollazo_customer_avatar') || undefined}
      />

      <main
        ref={mainRef}
        className="flex-1 overflow-y-auto pb-20 relative"
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
      >
        {/* LA BARRITA NARANJA: Aparece sobre cualquier pantalla si hay pedido */}
        <OrderTracking />

        {screen === 'home' && <HomeScreen onNavigate={handleNavigate} onNavigateToCategory={handleNavigateToCategory} />}
        {screen === 'catalog' && <CatalogScreen initialCategory={activeCategory} onCategoryChange={setActiveCategory} />}
        {screen === 'cart' && <CartScreen onCheckout={handleCheckout} onNavigate={handleNavigate} />}
        {screen === 'info' && <InfoScreen onInstall={handleInstall} canInstall={canInstall} />}
      </main>

      <BottomNav current={screen} onNavigate={handleNavigate} />
      <FlyParticleLayer />
      
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={handleCloseLogin} 
        onLogin={handleLoginDone} 
      />

      <OrderConfirmation visible={showConfirmation} onWhatsApp={handleWhatsApp} />
    </div>
  );
}

// --- COMPONENTE PRINCIPAL (Configuración de Proveedores) ---
export default function App() {
  const [isAdmin] = useState(isAdminRoute);
  const [landingDone, setLandingDone] = useState(() => {
    return isStandalone() || !!sessionStorage.getItem(LANDING_DISMISSED_KEY);
  });
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [pendingCategory, setPendingCategory] = useState<Category | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setCanInstall(false);
  };

  const handleContinueWeb = () => {
    sessionStorage.setItem(LANDING_DISMISSED_KEY, '1');
    setLandingDone(true);
  };

  // Si es Admin, mostramos solo el dashboard
  if (isAdmin) {
    return (
      <AdminProvider>
        <AdminDashboard />
      </AdminProvider>
    );
  }

  // Si no ha pasado la landing, la mostramos
  if (!landingDone) {
    return (
      <AdminProvider>
        <LandingPage
          onInstall={handleInstall}
          canInstall={canInstall}
          onContinueWeb={handleContinueWeb}
        />
      </AdminProvider>
    );
  }

  // APP NORMAL: Envuelta en todos los proveedores necesarios
  return (
    <AdminProvider>
      <UserProvider> 
        <CartProvider>
          <FlyToCartProvider>
            <AppShell
              initialCategory={pendingCategory}
              onClearCategory={() => setPendingCategory(null)}
            />
          </FlyToCartProvider>
        </CartProvider>
      </UserProvider>
    </AdminProvider>
  );
}
