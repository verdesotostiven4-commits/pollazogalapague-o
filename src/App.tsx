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
import { BarChart2, Star } from 'lucide-react';

function AppShell() {
  const [screen, setScreen] = useState<Screen>('home');
  const [activeCategory, setActiveCategory] = useState<Category | 'Todos'>('Todos');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [pointNotification, setPointNotification] = useState<{show: boolean, pts: number}>({show: false, pts: 0});
  
  const { items, clearCart } = useCart();
  const { upsertCustomer, createOrder, loading, fetchOrders } = useAdmin();
  const { customerPhone, customerName, customerAvatar, customerPoints, setUserData } = useUser();
  const mainRef = useRef<HTMLElement>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const prevPoints = useRef(customerPoints);

  // 🔔 NOTIFICACIÓN DE PUNTOS
  useEffect(() => {
    if (customerPoints > prevPoints.current) {
      const diff = customerPoints - prevPoints.current;
      setPointNotification({ show: true, pts: diff });
      setTimeout(() => setPointNotification({ show: false, pts: 0 }), 8000);
    }
    prevPoints.current = customerPoints;
  }, [customerPoints]);

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
    setTimeout(() => { fetchOrders(); setShowTracking(true); }, 2000);
  };

  if (loading) return <div className="h-screen bg-orange-500 flex items-center justify-center text-white font-black italic animate-pulse text-xl">CARGANDO EL POLLAZO...</div>;

  return (
    <div className="flex flex-col bg-gray-50 h-[100dvh] overflow-hidden relative">
      
      {/* 🎊 AVISO DE PUNTOS */}
      {pointNotification.show && (
        <div className="fixed top-20 left-4 right-4 z- bg-gray-900 text-white p-6 rounded-[32px] shadow-2xl border-2 border-orange-500 animate-in slide-in-from-top-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg animate-bounce">
              <Star size={30} fill="currentColor" />
            </div>
            <div className="flex-1">
              <h4 className="font-black text-lg uppercase italic leading-none">¡Puntos Recibidos!</h4>
              <p className="text-[11px] font-bold text-gray-400 mt-1 uppercase">Has ganado <span className="text-orange-500">{pointNotification.pts}</span> puntos.</p>
            </div>
          </div>
          <button onClick={() => { setScreen('ranking'); setPointNotification({show: false, pts: 0}); }} className="w-full mt-4 py-3 bg-white text-gray-900 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2">
            <BarChart2 size={14}/> Ver mi lugar en el Ranking
          </button>
        </div>
      )}

      <AppHeader screen={screen} onNavigate={handleNavigate} onOpenProfile={() => setShowLoginModal(true)} customerAvatar={customerAvatar} onOpenTracking={() => setShowTracking(true)} />
      
      <main ref={mainRef} className="flex-1 overflow-y-auto pb-20 relative z-0">
        {screen === 'home' && <HomeScreen onNavigate={handleNavigate} onNavigateToCategory={handleNavigateToCategory} />}
        {screen === 'catalog' && <CatalogScreen initialCategory={activeCategory} onCategoryChange={setActiveCategory} />}
        {screen === 'cart' && <CartScreen onCheckout={() => setShowConfirmation(true)} onNavigate={handleNavigate} />}
        {screen === 'info' && <InfoScreen onInstall={() => {}} canInstall={false} />}
        {screen === 'ranking' && <Ranking />}
      </main>

      <BottomNav current={screen} onNavigate={handleNavigate} />

      <OrderTracking isOpen={showTracking} onClose={() => setShowTracking(false)} />
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onLogin={(data) => {
          setUserData(data.whatsapp, data.name, data.avatarUrl);
          setShowLoginModal(false);
          upsertCustomer(data.whatsapp, data.name, data.avatarUrl);
      }} />
      <OrderConfirmation visible={showConfirmation} onClose={() => setShowConfirmation(false)} onWhatsApp={handleWhatsApp} />
      <FlyParticleLayer />
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

  // ✅ CORRECCIÓN ADMIN: Si la ruta es /admin, forzamos el Dashboard
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
