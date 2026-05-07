import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UserContextType {
  customerPhone: string;
  customerName: string;
  customerAvatar: string;
  setUserData: (phone: string, name: string, avatar: string) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAvatar, setCustomerAvatar] = useState('');

  useEffect(() => {
    const p = localStorage.getItem('pollazo_customer_phone');
    const n = localStorage.getItem('pollazo_customer_name');
    const a = localStorage.getItem('pollazo_customer_avatar');
    if (p) setCustomerPhone(p);
    if (n) setCustomerName(n);
    if (a) setCustomerAvatar(a);
  }, []);

  const setUserData = (phone: string, name: string, avatar: string) => {
    const clean = phone.replace(/\D/g, '');
    
    // Guardar en Estado
    setCustomerPhone(clean);
    setCustomerName(name);
    setCustomerAvatar(avatar);
    
    // Guardar en LocalStorage (Persistencia real)
    localStorage.setItem('pollazo_customer_phone', clean);
    localStorage.setItem('pollazo_customer_name', name);
    localStorage.setItem('pollazo_customer_avatar', avatar);
  };

  const logout = () => {
    localStorage.removeItem('pollazo_customer_phone');
    localStorage.removeItem('pollazo_customer_name');
    localStorage.removeItem('pollazo_customer_avatar');
    setCustomerPhone(''); setCustomerName(''); setCustomerAvatar('');
  };

  return (
    <UserContext.Provider value={{ customerPhone, customerName, customerAvatar, setUserData, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser debe usarse dentro de UserProvider');
  return context;
};
