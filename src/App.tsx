import { useState, useCallback, useEffect, useRef } from 'react';
import { AdminProvider, useAdmin } from './context/AdminContext';
import { UserProvider, useUser } from './context/UserContext'; 
import { CartProvider, useCart } from './context/CartContext';
import { FlyToCartProvider } from './context/FlyToCartContext';
import AppHeader from './components/AppHeader';
import HomeScreen from './components/HomeScreen';
import CatalogScreen from './components/CatalogScreen';
import CartScreen from './components/CartScreen';
import BottomNav from './components/BottomNav';
import OrderTracking from './components/OrderTracking';
import LoginModal from './components/LoginModal';
import Ranking from './pages/Ranking';
import { BarChart2, Star, X } from 'lucide-react';
import { Screen } from './types';

function AppShell() {
  const [screen, setScreen] = useState<Screen>('home');
  const [showTracking, setShowTracking] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pointNotification, setPointNotification] = useState<{show: boolean, pts: number}>({show: false, pts: 0});
  
  const { customerPhone, customerAvatar, customerPoints, setUserData } = useUser();
  const { fetchOrders } = useAdmin();
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

  // Refrescar órdenes cada minuto
  useEffect(() => {
    const interval = setInterval(() => fetchOrders(), 60000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  return (
    <div className="flex flex-col bg-gray-50 h-[100dvh] overflow-hidden relative">
      
      {/* 🎊 AVISO DE PUNTOS (MODAL FLOTANTE) */}
      {pointNotification.show && (
        <div className="fixed top-20 left-4 right-4 z- bg-gray-900 text-white p-6 rounded-[32px] shadow-2xl border-2 border-orange-500 animate-in slide-in-from-top-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg animate-bounce">
              <Star size={30} fill="currentColor" />
            </div>
            <div className="flex-1">
              <h4 className="font-black text-lg uppercase italic leading-none">¡Puntos Recibidos!</h4>
              <p className="text-[11px] font-bold text-gray-400 mt-1 uppercase">Has ganado <span className="text-orange-500">{pointNotification.pts}</span> puntos por tu compra.</p>
            </div>
          </div>
          <button 
            onClick={() => { setScreen('ranking'); setPointNotification({show: false, pts: 0}); }}
            className="w-full mt-4 py-3 bg-white text-gray-900 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2"
          >
            <BarChart2 size={14}/> Ver mi lugar en el Ranking
          </button>
        </div>
      )}

      <AppHeader screen={screen} onNavigate={setScreen} onOpenProfile={() => setShowLoginModal(true)} customerAvatar={customerAvatar} onOpenTracking={() => setShowTracking(true)} />
      
      <main className="flex-1 overflow-y-auto pb-20 relative">
        {screen === 'home' && <HomeScreen onNavigate={setScreen} onNavigateToCategory={() => {}} />}
        {screen === 'catalog' && <CatalogScreen initialCategory="Todos" onCategoryChange={() => {}} />}
        {screen === 'ranking' && <Ranking />}
        {screen === 'cart' && <CartScreen onCheckout={() => {}} onNavigate={setScreen} />}
      </main>

      <BottomNav current={screen} onNavigate={setScreen} />
      <OrderTracking isOpen={showTracking} onClose={() => setShowTracking(false)} />
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onLogin={() => {}} />
    </div>
  );
}

export default function App() {
  return <AdminProvider><UserProvider><CartProvider><FlyToCartProvider><AppShell /></FlyToCartProvider></CartProvider></UserProvider></AdminProvider>;
}
