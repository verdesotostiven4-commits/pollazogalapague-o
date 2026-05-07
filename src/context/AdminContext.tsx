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
  settings: any;
  extraSettings: any;
  upsertCustomer: (phone: string, name?: string | null, avatar_url?: string | null) => Promise<any>;
  createOrder: (order: any) => Promise<void>;
  updateOrderStatus: (orderId: string, status: string) => Promise<void>;
  updateExtraSettings: (patch: any) => Promise<void>;
  addCustomerPoints: (customerId: string, points: number) => Promise<void>;
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

  // 🛡️ SEGURIDAD: Valores que nunca pueden ser "undefined"
  const settings = useMemo(() => ({ announcement: '', primary_color: '#E67E22' }), []);
  const extraSettings = useMemo(() => ({ 
    ranking_title: 'Ranking', 
    prize_description: '', 
    ranking_end_date: new Date().toISOString() 
  }), []);

  // 🍗 PRODUCTOS: Siempre cargamos los seedProducts primero para evitar el error de "pollo-entero"
  const products = useMemo(() => {
    const map = new Map<string, Product>();
    // Primero metemos los básicos del archivo
    seedProducts.forEach(p => map.set(p.id, { ...p, available: true }));
    // Luego encima los que vengan de internet (si hay)
    remoteProducts.forEach(p => map.set(p.id, { ...p, available: p.available !== false }));
    return Array.from(map.values());
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
    } catch (e) {
      console.error("Error cargando datos:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const upsertCustomer = async (phone: string, name?: string | null, avatar_url?: string | null) => {
    const clean = (phone || '').replace(/\D/g, '');
    if (!clean) return null;
    const { data } = await supabase.from('customers').upsert({ 
      phone: clean, 
      name: name || 'Cliente', 
      avatar_url 
    }, { onConflict: 'phone' }).select().single();
    load();
    return data;
  };

  const createOrder = async (order: any) => {
    await supabase.from('orders').insert(order);
    load();
  };

  const updateOrderStatus = async (id: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', id);
    load();
  };

  const updateExtraSettings = async () => {};
  const addCustomerPoints = async () => {};

  return (
    <AdminContext.Provider value={{ 
      products, categories, customers, orders, loading, settings, extraSettings,
      upsertCustomer, createOrder, updateOrderStatus, updateExtraSettings, addCustomerPoints 
    }}>
      {children}
    </AdminContext.Provider>
  );
}
