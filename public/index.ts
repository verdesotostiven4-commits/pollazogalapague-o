import { useState, useRef, Suspense } from 'react';
import { CartProvider } from './context/CartContext';
import { FlyToCartProvider } from './context/FlyToCartContext';
import { AdminProvider, useAdmin } from './context/AdminContext';
import { UserProvider, useUser } from './context/UserContext'; 
import OrderTracking from './components/OrderTracking'; 
import Ranking from './pages/Ranking';
import { Category } from './types';

// Pantalla de error simple por si algo falla
function ErrorFallback({ error }: { error: any }) {
  return (
    <div className="p-10 text-center">
      <h1 className="text-red-600 font-black">¡ALGO SALIÓ MAL!</h1>
      <pre className="text-xs bg-gray-100 p-4 mt-4 overflow-auto">{error.message}</pre>
      <button onClick={() => window.location.reload()} className="mt-4 bg-orange-500 text-white p-2 rounded">Reintentar</button>
    </div>
  );
}

function AppShell() {
  const [screen, setScreen] = useState('home');
  const admin = useAdmin();
  const user = useUser();

  // Si el AdminContext se queda cargando, mostramos esto:
  if (admin.loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-orange-500 text-white font-black italic">
        PREPARANDO EL POLLAZO...
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-gray-50 h-[100dvh]">
      <header className="p-4 bg-white border-b flex justify-between items-center">
        <span className="font-black text-orange-500">POLLAZO</span>
        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
          {user.customerAvatar && <img src={user.customerAvatar} alt="avatar" className="w-full h-full object-cover" />}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto relative p-4">
        <OrderTracking />
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
           <h2 className="font-black text-xl text-gray-800">¡Hola, {user.customerName || 'Cliente'}!</h2>
           <p className="text-gray-500 text-sm">Bienvenido a tu tienda de confianza.</p>
           <button 
             onClick={() => setScreen(screen === 'ranking' ? 'home' : 'ranking')}
             className="mt-4 bg-orange-500 text-white px-6 py-2 rounded-full font-bold shadow-lg shadow-orange-200"
           >
             {screen === 'ranking' ? 'Ir al Inicio' : 'Ver Ranking 🏆'}
           </button>
        </div>

        {screen === 'ranking' && (
          <div className="mt-6">
            <Ranking />
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-around">
         <span className="text-orange-500 font-black">INICIO</span>
         <span className="text-gray-300">TIENDA</span>
         <span className="text-gray-300">CARRITO</span>
      </nav>
    </div>
  );
}

export default function App() {
  // Si estamos en la ruta de admin, no cargamos lo demás
  if (window.location.pathname === '/admin') {
    return <div className="p-10">Panel Admin (Próximamente corregido)</div>;
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
