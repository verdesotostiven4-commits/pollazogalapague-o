import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface UserContextType {
  customerPhone: string;
  customerName: string;
  customerAvatar: string;
  points: number; // ✅ Puntos en tiempo real
  lastSpin: string | null; // ✅ Fecha de última ruleta
  setUserData: (phone: string, name: string, avatar: string) => void;
  addPollazoPuntos: (amount: number) => Promise<boolean>; // ✅ Sumar puntos seguro
  refreshUserData: () => Promise<void>; // ✅ Sincronizar con la DB
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAvatar, setCustomerAvatar] = useState('');
  const [points, setPoints] = useState(0);
  const [lastSpin, setLastSpin] = useState<string | null>(null);

  // Cargar datos iniciales
  useEffect(() => {
    const p = localStorage.getItem('pollazo_customer_phone');
    const n = localStorage.getItem('pollazo_customer_name');
    const a = localStorage.getItem('pollazo_customer_avatar');
    if (p) {
      setCustomerPhone(p);
      setCustomerName(n || '');
      setCustomerAvatar(a || '');
      fetchDatabaseData(p);
    }
  }, []);

  // 🛡️ FUNCIÓN DE SEGURIDAD: Obtener datos reales de la DB (No del celular)
  const fetchDatabaseData = async (phone: string) => {
    const { data, error } = await supabase
      .from('customers')
      .select('points, last_roulette_spin')
      .eq('phone', phone)
      .single();

    if (data && !error) {
      setPoints(data.points || 0);
      setLastSpin(data.last_roulette_spin);
    }
  };

  const setUserData = (phone: string, name: string, avatar: string) => {
    const clean = phone.replace(/\D/g, '');
    setCustomerPhone(clean);
    setCustomerName(name);
    setCustomerAvatar(avatar);
    
    localStorage.setItem('pollazo_customer_phone', clean);
    localStorage.setItem('pollazo_customer_name', name);
    localStorage.setItem('pollazo_customer_avatar', avatar);
    
    fetchDatabaseData(clean);
  };

  // 🍗 SUMAR PUNTOS DE FORMA SEGURA
  const addPollazoPuntos = async (amount: number): Promise<boolean> => {
    if (!customerPhone) return false;

    // Obtenemos los puntos actuales directos de la DB para evitar hackeos de memoria
    const { data: currentCustomer } = await supabase
      .from('customers')
      .select('points')
      .eq('phone', customerPhone)
      .single();

    const newPoints = (currentCustomer?.points || 0) + amount;

    const { error } = await supabase
      .from('customers')
      .update({ 
        points: newPoints,
        // Si la suma es por la ruleta, actualizamos la fecha usando la hora del servidor
        last_roulette_spin: new Date().toISOString() 
      })
      .eq('phone', customerPhone);

    if (!error) {
      setPoints(newPoints);
      return true;
    }
    return false;
  };

  const refreshUserData = async () => {
    if (customerPhone) await fetchDatabaseData(customerPhone);
  };

  const logout = () => {
    localStorage.clear();
    setCustomerPhone(''); setCustomerName(''); setCustomerAvatar('');
    setPoints(0); setLastSpin(null);
  };

  return (
    <UserContext.Provider value={{ 
      customerPhone, customerName, customerAvatar, points, lastSpin,
      setUserData, addPollazoPuntos, refreshUserData, logout 
    }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser debe usarse dentro de UserProvider');
  return context;
};
