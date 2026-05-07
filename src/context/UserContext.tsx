import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UserContextType {
  customerPhone: string;
  customerName: string;
  customerAvatar: string;
  points: number;
  lastSpin: string | null;
  setUserData: (phone: string, name: string, avatar: string) => void;
  addPollazoPuntos: (amount: number) => Promise<boolean>;
  refreshUserData: () => Promise<void>;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAvatar, setCustomerAvatar] = useState('');
  const [points, setPoints] = useState(0);

  useEffect(() => {
    try {
      const p = localStorage.getItem('pollazo_customer_phone') || '';
      const n = localStorage.getItem('pollazo_customer_name') || '';
      const a = localStorage.getItem('pollazo_customer_avatar') || '';
      setCustomerPhone(p);
      setCustomerName(n);
      setCustomerAvatar(a);
    } catch (e) {
      console.error("Error en LocalStorage:", e);
    }
  }, []);

  const setUserData = (phone: string, name: string, avatar: string) => {
    const clean = (phone || '').replace(/\D/g, '');
    setCustomerPhone(clean);
    setCustomerName(name || '');
    setCustomerAvatar(avatar || '');
    localStorage.setItem('pollazo_customer_phone', clean);
    localStorage.setItem('pollazo_customer_name', name || '');
    localStorage.setItem('pollazo_customer_avatar', avatar || '');
  };

  const addPollazoPuntos = async (amount: number) => {
    setPoints(prev => prev + amount);
    return true;
  };

  const refreshUserData = async () => {};

  const logout = () => {
    localStorage.clear();
    setCustomerPhone(''); setCustomerName(''); setCustomerAvatar(''); setPoints(0);
  };

  return (
    <UserContext.Provider value={{ 
      customerPhone, customerName, customerAvatar, points, lastSpin: null,
      setUserData, addPollazoPuntos, refreshUserData, logout 
    }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);
  // 🛡️ Fallback total si el provider no está listo
  return context || {
    customerPhone: '',
    customerName: 'Guerrero',
    customerAvatar: '',
    points: 0,
    lastSpin: null,
    setUserData: () => {},
    addPollazoPuntos: async () => false,
    refreshUserData: async () => {},
    logout: () => {}
  } as UserContextType;
};
