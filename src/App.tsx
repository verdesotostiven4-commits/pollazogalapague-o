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
import { Category } from './types';

class ErrorBoundary extends Component<{children: any}, {hasError: boolean, error: any}> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 bg-orange-50 min-h-screen text-center flex flex-col items-center justify-center">
          <h1 className="text-orange-600 font-black text-2xl">🚨 REINICIO NECESARIO</h1>
          <p className="text-gray-600 mt-2 italic font-bold">Recuperando el Imperio...</p>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="mt-6 bg-orange-500 text-white px-8 py-3 rounded-full font-black shadow-lg active:scale-95 transition-transform">
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
  const [activeCategory, setActiveCategory] = useState<Category | 'Todos'>('Todos');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { items, clearCart } = useCart();
  const { createOrder, products, upsertCustomer, loading } = useAdmin();
  const { customerPhone, customerAvatar, customerName, setUserData } = useUser();
  const mainRef = useRef<HTMLElement>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingOrder, setPendingOrder] = useState(false);

  useEffect(() => {
    const handlePopState = () => { if (screen !== 'home') setScreen('home'); };
    window.addEventListener('popstate', handlePopState);
    if (screen !== 'home') window.history.pushState({ screen }, '');
    return () => window.removeEventListener('popstate', handlePopState);
  }, [screen]);

  useEffect(() => {
    if (!customerName && !loading) {
      const timer = setTimeout(() => { setShowLoginModal(true); }, 3000);
      return () => clearTimeout(timer);
    }
  }, [customerName, loading]);

  const handleNavigate = (s: any) => {
    if (s !== 'catalog') setActiveCategory('Todos');
    setScreen(s);
    setShowLoginModal(false); 
    if (mainRef.current) mainRef.current.scrollTop = 0;
  };

  const handleCategoryClick = (cat: Category) => {
    setActiveCategory(cat);
    setScreen('catalog');
    if (mainRef.current) mainRef.current.scrollTop = 0;
  };

  const handleLogin = async (u: { name: string; whatsapp: string; avatarUrl: string }) => {
    setUserData(u.whatsapp, u.name, u.avatarUrl); 
    try { await upsertCustomer(u.whatsapp, u.name, u.avatarUrl); } catch (e) { console.error("Error perfil:", e); }
    setShowLoginModal(false);
    if (pendingOrder) { setPendingOrder(false); setShowConfirmation(true); }
  };

  const handleWhatsApp = async () => {
    if (!customerName || !customerPhone) {
      setPendingOrder(true);
      setShowConfirmation(false);
      setShowLoginModal(true);
      return;
    }
    
    const code = orderCode();
    
    // ✅ MOTOR DE PRECIOS MEJORADO: Asegurar que Number() y parseFloat() limpien los datos
    const detailedItems = items.map(item => {
        const p = products.find(prod => prod.id === item.id);
        const cleanPrice = parseFloat(p?.price?.toString().replace(/[^0-9.]/g, '') || '0');
        return {
            ...item,
            name: p?.name || 'Producto del Menú',
            price: cleanPrice
        };
    });

    // Calcular totales con precisión numérica
    const subtotal = detailedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const fee = deliveryFeeOf(subtotal);
    const total = subtotal + fee;

    const whatsappUrl = buildWhatsAppUrl(items, customerPhone, customerName, code, !isStoreOpen());

    try {
      await createOrder({
        order_code: code,
        customer_phone: customerPhone,
        items: detailedItems, // Ticket detallado para el Admin
        subtotal: Number(subtotal.toFixed(2)),
        total: Number(total.toFixed(2)), // Total real enviado a la DB
        status: 'Recibido',
        preorder: !isStoreOpen(),
        created_at: new Date().toISOString()
      });
    } catch (err) { 
        console.error("Error crítico al guardar orden:", err); 
    }

    window.location.href = whatsappUrl;
    
    setTimeout(() => {
        clearCart();
        setShowConfirmation(false);
        setScreen('home');
    }, 100);
  };

  return (
    <div className="flex flex-col bg-gray-50 h-[100dvh]">
      <AppHeader screen={screen} onNavigate={handleNavigate} onOpenProfile={() => setShowLoginModal(true)} customerAvatar={customerAvatar} />
      <main ref={mainRef} className="flex-1 overflow-y-auto pb-20 relative">
        <OrderTracking />
        {screen === 'home' && <HomeScreen onNavigate={handleNavigate} onNavigateToCategory={handleCategoryClick} />}
        {screen === 'catalog' && <CatalogScreen initialCategory={activeCategory} onCategoryChange={(cat) => setActiveCategory(cat as any)} />}
        {screen === 'cart' && <CartScreen onCheckout={() => setShowConfirmation(true)} onNavigate={handleNavigate} />}
        {screen === 'info' && <InfoScreen onInstall={() => {}} canInstall={false} onNavigate={handleNavigate} />}
        {screen === 'ranking' && <Ranking />}
      </main>
      {screen !== 'ranking' && <BottomNav current={screen} onNavigate={handleNavigate} />}
      <FlyParticleLayer />
      <LoginModal isOpen={showLoginModal} onClose={() => { setShowLoginModal(false); setPendingOrder(false); }} onLogin={handleLogin} title={pendingOrder ? "¡Ya casi, un último paso!" : "Únete al Club"} subtitle={pendingOrder ? "Regístrate para enviar tu pedido y acumular puntos." : "Acumula puntos y gana con tus compras"} />
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
    if ('serviceWorker' in navigator) { navigator.serviceWorker.ready.then(reg => reg.update()); }
  }, []);

  if (window.location.pathname === '/admin') return <AdminProvider><AdminDashboard /></AdminProvider>;
  
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
