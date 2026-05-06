import { useState, useRef } from 'react';
import { CartProvider } from './context/CartContext';
import { FlyToCartProvider } from './context/FlyToCartContext';
import { AdminProvider, useAdmin } from './context/AdminContext';
import { UserProvider, useUser } from './context/UserContext'; 
import OrderTracking from './components/OrderTracking'; 
import Ranking from './pages/Ranking';
import { useCart } from './context/CartContext';
import { buildWhatsAppUrl, deliveryFeeOf, isStoreOpen, orderCode, subtotalOf } from './utils/whatsapp';

function AppShell() {
  const [screen, setScreen] = useState('home');
  const admin = useAdmin();
  const user = useUser();

  // Pantalla de carga profesional
  if (admin.loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-orange-500 text-white font-black italic">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
        PREPARANDO EL POLLAZO...
      </div>
    );
  }

  // Evitamos el error de 'trim' usando un valor por defecto
  const safeName = (user.customerName || 'Cliente').trim();

  return (
    <div className="flex flex-col bg-gray-50 h-[100dvh]">
      <header className="p-4 bg-white border-b flex justify-between items-center shadow-sm">
        <span className="font-black text-orange-500 tracking-tighter text-xl">POLLAZO</span>
        <div className="w-10 h-10 rounded-2xl bg-orange-100 overflow-hidden border-2 border-orange-500 p-0.5">
          {user.customerAvatar ? (
            <img src={user.customerAvatar} alt="avatar" className="w-full h-full object-cover rounded-xl" />
          ) : (
            <div className="w-full h-full bg-orange-500 rounded-xl" />
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto relative p-6">
        <OrderTracking />
        
        <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-orange-100 border-2 border-orange-50 animate-in fade-in zoom-in duration-500">
           <span className="text-orange-500 font-black text-[10px] uppercase tracking-widest">¡Bienvenido!</span>
           <h2 className="font-black text-3xl text-gray-900 mt-1 italic">Hola, {safeName}</h2>
           <p className="text-gray-400 text-sm mt-2 font-medium">¿Listo para ver quién manda en el ranking hoy?</p>
           
           <button 
             onClick={() => setScreen(screen === 'ranking' ? 'home' : 'ranking')}
             className="mt-6 w-full bg-orange-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-orange-200 active:scale-95 transition-all uppercase tracking-tight"
           >
             {screen === 'ranking' ? '🏠 Volver al Inicio' : '🏆 Ver Ranking de Clientes'}
           </button>
        </div>

        {screen === 'ranking' && (
          <div className="mt-8">
            <Ranking />
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-around items-center rounded-t-[32px] shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
         <div className="flex flex-col items-center gap-1">
           <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
           <span className="text-orange-500 font-black text-[10px] uppercase">Inicio</span>
         </div>
         <span className="text-gray-300 font-black text-[10px] uppercase">Tienda</span>
         <span className="text-gray-300 font-black text-[10px] uppercase">Carrito</span>
      </nav>
    </div>
  );
}

export default function App() {
  if (window.location.pathname === '/admin') return <div className="p-10 font-black text-orange-500">MODO ADMIN</div>;

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
