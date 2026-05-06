import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UserContextType {
  customerPhone: string;
  setPhone: (phone: string) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [customerPhone, setCustomerPhone] = useState<string>('');

  // 💾 Al cargar la App: Mira si ya teníamos el teléfono guardado en el celular
  useEffect(() => {
    const savedPhone = localStorage.getItem('pollazo_customer_phone');
    if (savedPhone) {
      setCustomerPhone(savedPhone);
    }
  }, []);

  // 📝 Al guardar: Guarda el teléfono en la memoria del celular (localStorage)
  const setPhone = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, ''); // Limpia letras o espacios
    setCustomerPhone(cleanPhone);
    localStorage.setItem('pollazo_customer_phone', cleanPhone);
  };

  const logout = () => {
    setCustomerPhone('');
    localStorage.removeItem('pollazo_customer_phone');
  };

  return (
    <UserContext.Provider value={{ customerPhone, setPhone, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser debe usarse dentro de UserProvider');
  return context;
};
