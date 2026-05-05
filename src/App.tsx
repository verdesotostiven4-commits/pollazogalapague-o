import { useState, useCallback, useEffect, useRef } from 'react';
import { CartProvider } from './context/CartContext';
import { FlyToCartProvider } from './context/FlyToCartContext';
import { AdminProvider } from './context/AdminContext';
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
import { useCart } from './context/CartContext';
import { buildWhatsAppUrl, deliveryFeeOf, isStoreOpen, orderCode, subtotalOf } from './utils/whatsapp';
import { supabase } from './lib/supabase';
import { Category } from './types';
import { useAdmin } from './context/AdminContext';

type Screen = 'home' | 'catalog' | 'cart' | 'info';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const LANDING_DISMISSED_KEY = 'pollazo_landing_dismissed';

function PhoneLogin({ onDone }: { onDone: (phone: string) => void }) {
  const [phone, setPhone] = useState(localStorage.getItem('pollazo_customer_phone') || '');
  const [error, setError] = useState('');
  const save = () => {
    const clean = phone.replace(/\D/g, '');
    if (clean.length < 8) { setError('Ingresa un número válido.'); return; }
    localStorage.setItem('pollazo_customer_phone', clean);
    onDone(clean);
  };
  return (
    <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center px-5">
      <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm text-center">
        <img src="/logo-final.png" className="w-20 h-20 object-contain mx-auto mb-3" />
        <h2 className="text-gray-900 font-black text-xl">Ingresa con tu celular</h2>
        <p className="text-gray-400 text-sm mt-1 mb-5">Tu sesión quedará guardada para tus próximos pedidos.</p>
        <input
          value={phone}
          onChange={e => { setPhone(e.target.value); setError(''); }}
          inputMode="tel"
          placeholder="Ej: 0989795628"
          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-center text-lg font-black outline-none focus:ring-2 focus:ring-orange-300"
        />
        {error && <p className="text-red-500 text-xs font-bold mt-2">{error}</p>}
        <button onClick={save} className="w-full mt-4 bg-gradient-to-r from-orange-500 to-yellow-400 text-white rounded-2xl py-4 font-black active:scale-95 transition-transform">Continuar</button>
      </div>
    </div>
  );
}


function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone === true)
  );
}

function isAdminRoute(): boolean {
  return window.location.pathname === '/admin';
}

function AppShell({ initialCategory, onClearCategory }: { initialCategory: Category | null; onClearCategory: () => void }) {
  const [screen, setScreen] = useState<Screen>('home');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category | 'Todos'>(initialCategory ?? 'Todos');
  const { items, clearCart } = useCart();
  const { upsertCustomer, createOrder, addCustomerPoints } = useAdmin();
  const [customerPhone, setCustomerPhone] = useState(() => localStorage.getItem('pollazo_customer_phone') || '');
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (initialCategory) {
      setScreen('catalog');
      onClearCategory();
    }
  }, []);

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
      setShowConfirmation(false);
      return;
    }
    setShowConfirmation(true);
  };

  const handleWhatsApp = async () => {
    const phone = customerPhone || localStorage.getItem('pollazo_customer_phone') || '';
    const code = orderCode();
    const subtotal = subtotalOf(items);
    const delivery_fee = deliveryFeeOf(subtotal);
    const total = subtotal + delivery_fee;
    const customer = phone ? await upsertCustomer(phone) : null;
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
    if (customer?.id && subtotal > 0) await addCustomerPoints(customer.id, Math.floor(subtotal));
    supabase.rpc('increment_metric', { metric_id: 'total_orders' }).then(() => {});
    window.open(buildWhatsAppUrl(items, phone, code, !isStoreOpen()), '_blank');
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
      <AppHeader screen={screen} onNavigate={handleNavigate} scrolled={false} />

      <main
        ref={mainRef}
        className="flex-1 overflow-y-auto pb-20"
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
      >
        {screen === 'home' && <HomeScreen onNavigate={handleNavigate} onNavigateToCategory={handleNavigateToCategory} />}
        {screen === 'catalog' && <CatalogScreen initialCategory={activeCategory} onCategoryChange={setActiveCategory} />}
        {screen === 'cart' && <CartScreen onCheckout={handleCheckout} onNavigate={handleNavigate} />}
        {screen === 'info' && <InfoScreen onInstall={handleInstall} canInstall={canInstall} />}
      </main>

      <BottomNav current={screen} onNavigate={handleNavigate} />
      <FlyParticleLayer />
      {!customerPhone && <PhoneLogin onDone={setCustomerPhone} />}
      <OrderConfirmation visible={showConfirmation} onWhatsApp={handleWhatsApp} />
    </div>
  );
}

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

  // Admin route — wrap in AdminProvider only
  if (isAdmin) {
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
          onInstall={handleInstall}
          canInstall={canInstall}
          onContinueWeb={handleContinueWeb}
        />
      </AdminProvider>
    );
  }

  return (
    <AdminProvider>
      <CartProvider>
        <FlyToCartProvider>
          <AppShell
            initialCategory={pendingCategory}
            onClearCategory={() => setPendingCategory(null)}
          />
        </FlyToCartProvider>
      </CartProvider>
    </AdminProvider>
  );
}
