import { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { products as seedProducts, categories as seedCategories } from '../data/products';
import { Customer, Order, Product } from '../types';

interface AdminContextValue {
  products: Product[];
  categories: string[];
  customers: Customer[];
  orders: Order[];
  loading: boolean;
  settings: { announcement: string; primary_color: string }; // Pieza de seguridad
  extraSettings: any; // Pieza de seguridad
  upsertCustomer: (phone: string, name?: string | null, avatar_url?: string | null) => Promise<any>;
  createOrder: (order: any) => Promise<void>;
  updateOrderStatus: (orderId: string, status: string) => Promise<void>;
}

const AdminContext = createContext<AdminContextValue | undefined>(undefined);

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin debe usarse dentro de AdminProvider');
  return context;
};

export function AdminProvider({ children }: { children: ReactNode }) {
  const [remoteProducts, setRemoteProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Valores por defecto para que la App no explote si los busca
  const settings = { announcement: '', primary_color: '#E67E22' };
  const extraSettings = { ranking_title: '', prize_description: '', ranking_end_date: '' };

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
      const [prodRes, custRes, orderRes] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('customers').select('*').order('points', { ascending: false }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50),
      ]);
      if (prodRes.data) setRemoteProducts(prodRes.data);
      if (custRes.data) setCustomers(custRes.data);
      if (orderRes.data) setOrders(orderRes.data);
    } catch (e) { console.error("Error cargando datos:", e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const upsertCustomer = async (phone: string, name?: string | null, avatar_url?: string | null) => {
    if (!isSupabaseConfigured) return null;
    const cleanPhone = phone.replace(/\D/g, '');
    const { data } = await supabase
      .from('customers')
      .upsert({ phone: cleanPhone, name, avatar_url }, { onConflict: 'phone' })
      .select()
      .single();
    load();
    return data;
  };

  const createOrder = async (order: any) => {
    if (!isSupabaseConfigured) return;
    await supabase.from('orders').insert(order);
    load();
  };

  const updateOrderStatus = async (id: string, status: string) => {
    if (!isSupabaseConfigured) return;
    await supabase.from('orders').update({ status }).eq('id', id);
    load();
  };

  return (
    <AdminContext.Provider value={{ 
      products, categories, customers, orders, loading, settings, extraSettings,
      upsertCustomer, createOrder, updateOrderStatus 
    }}>
      {children}
    </AdminContext.Provider>
  );
}
