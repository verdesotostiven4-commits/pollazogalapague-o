import { useState, useRef, Component, useEffect } from 'react';
import { AdminProvider, useAdmin } from './context/AdminContext';
import { UserProvider, useUser } from './context/UserContext'; 
import { CartProvider, useCart } from './context/CartContext';
import { FlyToCartProvider } from './context/FlyToCartContext';
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
import { buildWhatsAppUrl, deliveryFeeOf, isStoreOpen, orderCode } from './utils/whatsapp';

class ErrorBoundary extends Component<{children: any}, {hasError: boolean}> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return (
      <div className="p-10 bg-gray-950 min-h-screen text-center flex flex-col items-center justify-center">
        <h1 className="text-orange-500 font-black text-xl italic uppercase tracking-widest">Error de Sincronización</h1>
        <p className="text-white/50 text-xs mt-2 uppercase">Limpiando datos corruptos...</p>
        <button onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); }} className="mt-8 bg-orange-500 text-white px-8 py-4 rounded-full font-black shadow-lg active:scale-95 transition-all">LIMPIAR CACHÉ Y REINTENTAR</button>
      </div>
    );
    return this.props.children;
  }
}

function AppShell() {
  const [screen, setScreen] = useState('home');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { items, clearCart } = useCart();
  const { createOrder, products, upsertCustomer, loading: adminLoading } = useAdmin();
  const { customerPhone, customerAvatar, customerName, setUserData } = useUser();
  const mainRef = useRef<HTMLElement>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingOrder, setPendingOrder] = useState(false);

  useEffect(() => { if (!customerName && !adminLoading) { const t = setTimeout(() => setShowLoginModal(true), 3000); return () => clearTimeout(t); } }, [customerName, adminLoading]);

  const handleNavigate = (s: any) => { if (s !== 'catalog') setActiveCategory('Todos'); setScreen(s); if (mainRef.current) mainRef.current.scrollTop = 0; };
  
  const handleWhatsApp = async () => {
    if (!customerName || !customerPhone) { setPendingOrder(true); setShowLoginModal(true); return; }
    const code = orderCode();
    const fullItems = items.map(i => { 
        const p = products.find(x => x.id === i.id); 
        return { ...i, name: p?.name || 'Producto', price: parseFloat(p?.price || '0') }; 
    });
    const subtotal = fullItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const total = subtotal + deliveryFeeOf(subtotal);
    const whatsappUrl = buildWhatsAppUrl(items, customerPhone, customerName, code, !isStoreOpen());
    try { await createOrder({ order_code: code, customer_phone: customerPhone, items: fullItems, subtotal, total, status: 'Recibido', preorder: !isStoreOpen(), created_at: new Date().toISOString() }); } catch (e) {}
    window.location.href = whatsappUrl;
    setTimeout(() => { clearCart(); setShowConfirmation(false); setScreen('home'); }, 100);
  };

  const [landingDone, setLandingDone] = useState(() => !!localStorage.getItem('pollazo_landing_dismissed'));

  if (window.location.pathname === '/admin') return <AdminDashboard />;

  if (!landingDone) return <LandingPage onInstall={() => {}} canInstall={false} onContinueWeb={() => { localStorage.setItem('pollazo_landing_dismissed', '1'); setLandingDone(true); }} />;

  return (
    <div className="flex flex-col bg-gray-50 h-[100dvh]">
      <AppHeader screen={screen} onNavigate={handleNavigate} onOpenProfile={() => setShowLoginModal(true)} customerAvatar={customerAvatar} />
      <main ref={mainRef} className="flex-1 overflow-y-auto pb-20 relative">
        <OrderTracking />
        {screen === 'home' && <HomeScreen onNavigate={handleNavigate} onNavigateToCategory={(c) => { setActiveCategory(c); setScreen('catalog'); }} />}
        {screen === 'catalog' && <CatalogScreen initialCategory={activeCategory as any} onCategoryChange={setActiveCategory} />}
        {screen === 'cart' && <CartScreen onCheckout={() => setShowConfirmation(true)} onNavigate={handleNavigate} />}
        {screen === 'info' && <InfoScreen onInstall={() => {}} canInstall={false} onNavigate={handleNavigate} />}
        {screen === 'ranking' && <Ranking />}
      </main>
      {screen !== 'ranking' && <BottomNav current={screen as any} onNavigate={handleNavigate} />}
      <FlyParticleLayer />
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onLogin={async (u) => { setUserData(u.whatsapp, u.name, u.avatarUrl); await upsertCustomer(u.whatsapp, u.name, u.avatarUrl); setShowLoginModal(false); if (pendingOrder) setShowConfirmation(true); }} title={pendingOrder ? "¡Ya casi!" : "Únete al Club"} subtitle="Acumula puntos y gana" />
      <OrderConfirmation visible={showConfirmation} onWhatsApp={handleWhatsApp} />
    </div>
  );
}

export default function App() {
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
