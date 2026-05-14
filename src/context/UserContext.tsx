import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UserContextType {
  customerPhone: string;
  customerName: string;
  customerAvatar: string;
  // ✅ NUEVOS CAMPOS EN EL CONTEXTO
  customerLat: number | null;
  customerLng: number | null;
  customerReference: string;
  customerPoints: number;
  customerExp: number;
  isVip: boolean;
  // ✅ FUNCIÓN ACTUALIZADA PARA GUARDAR TODO
  setUserData: (data: {
    phone: string;
    name: string;
    avatar: string;
    lat?: number | null;
    lng?: number | null;
    reference?: string;
    points?: number;
    exp?: number;
    isVip?: boolean;
  }) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAvatar, setCustomerAvatar] = useState('');
  // ✅ NUEVOS ESTADOS
  const [customerLat, setCustomerLat] = useState<number | null>(null);
  const [customerLng, setCustomerLng] = useState<number | null>(null);
  const [customerReference, setCustomerReference] = useState('');
  const [customerPoints, setCustomerPoints] = useState(0);
  const [customerExp, setCustomerExp] = useState(0);
  const [isVip, setIsVip] = useState(false);

  useEffect(() => {
    // Carga de datos existentes
    const p = localStorage.getItem('pollazo_customer_phone');
    const n = localStorage.getItem('pollazo_customer_name');
    const a = localStorage.getItem('pollazo_customer_avatar');
    // ✅ CARGA DE DATOS NUEVOS
    const lat = localStorage.getItem('pollazo_customer_lat');
    const lng = localStorage.getItem('pollazo_customer_lng');
    const ref = localStorage.getItem('pollazo_customer_reference');
    const pts = localStorage.getItem('pollazo_customer_points');
    const exp = localStorage.getItem('pollazo_customer_exp');
    const vip = localStorage.getItem('pollazo_customer_is_vip');

    if (p) setCustomerPhone(p);
    if (n) setCustomerName(n);
    if (a) setCustomerAvatar(a);
    if (lat) setCustomerLat(parseFloat(lat));
    if (lng) setCustomerLng(parseFloat(lng));
    if (ref) setCustomerReference(ref);
    if (pts) setCustomerPoints(parseInt(pts));
    if (exp) setCustomerExp(parseInt(exp));
    if (vip) setIsVip(vip === 'true');
  }, []);

  const setUserData = (data: {
    phone: string;
    name: string;
    avatar: string;
    lat?: number | null;
    lng?: number | null;
    reference?: string;
    points?: number;
    exp?: number;
    isVip?: boolean;
  }) => {
    const cleanPhone = data.phone.replace(/\D/g, '');
    
    // Actualizar Estados
    setCustomerPhone(cleanPhone);
    setCustomerName(data.name);
    setCustomerAvatar(data.avatar);
    if (data.lat !== undefined) setCustomerLat(data.lat);
    if (data.lng !== undefined) setCustomerLng(data.lng);
    if (data.reference !== undefined) setCustomerReference(data.reference);
    if (data.points !== undefined) setCustomerPoints(data.points);
    if (data.exp !== undefined) setCustomerExp(data.exp);
    if (data.isVip !== undefined) setIsVip(data.isVip);
    
    // Persistencia real en LocalStorage
    localStorage.setItem('pollazo_customer_phone', cleanPhone);
    localStorage.setItem('pollazo_customer_name', data.name);
    localStorage.setItem('pollazo_customer_avatar', data.avatar);
    
    if (data.lat) localStorage.setItem('pollazo_customer_lat', data.lat.toString());
    if (data.lng) localStorage.setItem('pollazo_customer_lng', data.lng.toString());
    if (data.reference) localStorage.setItem('pollazo_customer_reference', data.reference);
    if (data.points !== undefined) localStorage.setItem('pollazo_customer_points', data.points.toString());
    if (data.exp !== undefined) localStorage.setItem('pollazo_customer_exp', data.exp.toString());
    if (data.isVip !== undefined) localStorage.setItem('pollazo_customer_is_vip', data.isVip.toString());
  };

  const logout = () => {
    // Limpiar TODO el rastro
    const keys = [
      'pollazo_customer_phone', 'pollazo_customer_name', 'pollazo_customer_avatar',
      'pollazo_customer_lat', 'pollazo_customer_lng', 'pollazo_customer_reference',
      'pollazo_customer_points', 'pollazo_customer_exp', 'pollazo_customer_is_vip'
    ];
    keys.forEach(k => localStorage.removeItem(k));

    setCustomerPhone(''); setCustomerName(''); setCustomerAvatar('');
    setCustomerLat(null); setCustomerLng(null); setCustomerReference('');
    setCustomerPoints(0); setCustomerExp(0); setIsVip(false);
  };

  return (
    <UserContext.Provider value={{ 
      customerPhone, customerName, customerAvatar, 
      customerLat, customerLng, customerReference,
      customerPoints, customerExp, isVip,
      setUserData, logout 
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
