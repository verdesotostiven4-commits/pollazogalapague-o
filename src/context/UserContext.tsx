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
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerAvatar, setCustomerAvatar] = useState<string>('');

  useEffect(() => {
    // LLAVES UNIFICADAS
    const p = localStorage.getItem('pollazo_customer_phone');
    const n = localStorage.getItem('pollazo_customer_name');
    const a = localStorage.getItem('pollazo_customer_avatar');
    if (p) setCustomerPhone(p);
    if (n) setCustomerName(n);
    if (a) setCustomerAvatar(a);
  }, []);

  const setUserData = (phone: string, name: string, avatar: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    setCustomerPhone(cleanPhone);
    setCustomerName(name);
    setCustomerAvatar(avatar);
    
    localStorage.setItem('pollazo_customer_phone', cleanPhone);
    localStorage.setItem('pollazo_customer_name', name);
    localStorage.setItem('pollazo_customer_avatar', avatar);
  };

  const logout = () => {
    setCustomerPhone(''); setCustomerName(''); setCustomerAvatar('');
    localStorage.clear();
  };

  return (
    <UserContext.Provider value={{ customerPhone, customerName, customerAvatar, setUserData, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
};
