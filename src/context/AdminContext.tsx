import { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { products as seedProducts, categories as seedCategories } from '../data/products';
import { Customer, Order, Product } from '../types';

export interface ExtraSettings {
  logo_url: string;
  ranking_title: string;
  prize_description: string;
  ranking_end_date: string;
  raffle_min_amount: number;
  winners_gallery: Array<{id: string, name: string, photo: string, prize: string}>;
}

interface AdminContextValue {
  products: Product[];
  categories: string[];
  extraSettings: ExtraSettings; 
  customers: Customer[];
  orders: Order[];
  loading: boolean;
  updateExtraSettings: (patch: Partial<ExtraSettings>) => Promise<void>; 
  addCustomerPoints: (customerId: string, points: number) => Promise<void>;
  upsertCustomer: (phone: string, name?: string | null, avatar_url?: string | null) => Promise<any>;
  createOrder: (order: any) => Promise<void>;
  updateOrderStatus: (orderId: string, status: string) => Promise<void>;
}

const DEFAULT_EXTRA: ExtraSettings = {
  logo_url: '/logo-final.png',
  ranking_title: '🏆 Gran Ranking Pollazo',
  prize_description: '¡Gana un Pollo Enfundado Familiar!',
  ranking_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  raffle_min_amount: 10,
  winners_gallery: []
};

const AdminContext = createContext<AdminContextValue | undefined>(undefined);
export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin debe usarse dentro de AdminProvider');
  return context;
};

export function AdminProvider({ children }: { children: ReactNode }) {
  const [remoteProducts, setRemoteProducts] = useState<Product[]>([]);
  const [extraSettings, setExtraSettings] = useState<ExtraSettings>(DEFAULT_EXTRA);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Mezclamos productos de archivo y de base de datos
  const products = useMemo(() => {
    const map = new Map<string, Product>();
    if (seedProducts) seedProducts.forEach(p => map.set(p.id, p));
    if (remoteProducts) remoteProducts.forEach(p => map.set(p.id, p));
    return Array.from(map.values()).filter(p => p.available !== false);
  }, [remoteProducts]);

  const categories = useMemo(() => 
    Array.from(new Set([...seedCategories, ...products.map(p => p.category)])).sort()
  , [products]);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    try {
      const [prodRes, extraRes, custRes, orderRes] = await Promise.allSettled([
        supabase.from('products').select('*'),
        supabase.from('settings').select('*').limit(1),
        supabase.from('customers').select('*').order('points', { ascending: false }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50),
      ]);
      
      if (prodRes.status === 'fulfilled' && prodRes.value.data) setRemoteProducts(prodRes.value.data);
      if (extraRes.status === 'fulfilled' && extraRes.value.data && extraRes.value.data) {
        setExtraSettings(extraRes.value.data as ExtraSettings);
      }
      if (custRes.status === 'fulfilled' && custRes.value.data) setCustomers(custRes.value.data);
      if (orderRes.status === 'fulfilled' && orderRes.value.data) setOrders(orderRes.value.data);
    } catch (e) { console.error("Error cargando Supabase:", e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AdminContext.Provider value={{ 
      products, categories, extraSettings, customers, orders, loading,
      updateExtraSettings: async (p) => { setExtraSettings(prev => ({...prev, ...p})) },
      addCustomerPoints: async () => {},
      upsertCustomer: async (phone, name, avatar_url) => {
        const clean = (phone || '').replace(/\D/g, '');
        const { data } = await supabase.from('customers').upsert({ phone: clean, name, avatar_url }, { onConflict: 'phone' }).select().single();
        return data;
      },
      createOrder: async (order) => { await supabase.from('orders').insert(order); load(); },
      updateOrderStatus: async (id, status) => { await supabase.from('orders').update({ status }).eq('id', id); load(); }
    }}>
      {children}
    </AdminContext.Provider>
  );
}
