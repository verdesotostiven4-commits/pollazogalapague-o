import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Definimos la interfaz exacta que tus componentes esperan para que no haya errores
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
  // Inicializamos todo con valores vacíos o en 0 para que nada "explote"
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAvatar, setCustomerAvatar] = useState('');
  const [points, setPoints] = useState(0);
  const [lastSpin, setLastSpin] = useState<string | null>(null);

  // Intentamos cargar lo básico del localStorage (sin tocar Supabase por ahora)
  useEffect(() => {
    try {
      const p = localStorage.getItem('pollazo_customer_phone');
      const n = localStorage.getItem('pollazo_customer_name');
      const a = localStorage.getItem('pollazo_customer_avatar');
      
      if (p) setCustomerPhone(p);
      if (n) setCustomerName(n);
      if (a) setCustomerAvatar(a);
      
      // Aquí podrías tener el fetchDatabaseData, pero lo dejamos vacío 
      // en el reset maestro para asegurar que la app abra.
    } catch (e) {
      console.error("Error cargando localStorage", e);
    }
  }, []);

  const setUserData = (phone: string, name: string, avatar: string) => {
    const clean = phone.replace(/\D/g, '');
    setCustomerPhone(clean);
    setCustomerName(name);
    setCustomerAvatar(avatar);
    
    localStorage.setItem('pollazo_customer_phone', clean);
    localStorage.setItem('pollazo_customer_name', name);
    localStorage.setItem('pollazo_customer_avatar', avatar);
  };

  // Funciones seguras: No hacen nada todavía, pero evitan que la App se caiga
  const addPollazoPuntos = async (amount: number) => {
    setPoints(prev => prev + amount);
    return true;
  };

  const refreshUserData = async () => {
    console.log("Refrescando datos (Modo Reset Maestro)");
  };

  const logout = () => {
    localStorage.clear();
    setCustomerPhone('');
    setCustomerName('');
    setCustomerAvatar('');
    setPoints(0);
    setLastSpin(null);
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

// 🛡️ HOOK PROTEGIDO: Si el contexto falla, devuelve un objeto vacío en lugar de crash
export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    return {
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
  }
  return context;
};
