import { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { products as seedProducts, categories as seedCategories } from '../data/products';
import { Customer, Order, Product } from '../types';

export interface ProductOverride { id: string; price: string | null; available: boolean; }
export interface AppSettings { announcement: string; primary_color: string; banner_link: string; }

export interface ExtraSettings {
  logo_url: string;
  ranking_title: string;
  prize_description: string;
  ranking_end_date: string;
  raffle_min_amount: number;
  winners_gallery: Array<{id: string, name: string, photo: string, prize: string}>;
}

export interface ExtendedCustomer extends Customer { avatar_url?: string | null; }

interface AdminContextValue {
  products: Product[];
  categories: string[];
  overrides: Record<string, ProductOverride>;
  settings: AppSettings;
  extraSettings: ExtraSettings; 
  customers: ExtendedCustomer[];
  orders: Order[];
  loading: boolean;
  updateExtraSettings: (patch: Partial<ExtraSettings>) => Promise<void>; 
  addCustomerPoints: (customerId: string, points: number) => Promise<void>;
  upsertCustomer: (phone: string, name?: string | null, avatar_url?: string | null) => Promise<ExtendedCustomer | null>;
  createOrder: (order: Omit<Order, 'created_at'>) => Promise<void>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = { announcement: '', primary_color: '#E67E22', banner_link: '' };
const DEFAULT_EXTRA: ExtraSettings = {
  logo_url: '/logo-final.png',
  ranking_title: '🏆 Gran Ranking Pollazo',
  prize_description: '¡Gana un Pollo Enfundado Familiar!',
  ranking_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  raffle_min_amount: 10,
  winners_gallery: []
};

const AdminContext = createContext<AdminContextValue | undefined>(undefined);

export function useAdmin() { 
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin debe usarse dentro de AdminProvider');
  return context; 
}

const normalizeProduct = (p: Product): Product => ({ ...p, available: p.available !== false });

export function AdminProvider({ children }: { children: ReactNode }) {
  const [remoteProducts, setRemoteProducts] = useState<Product[]>([]);
  const [overrides, setOverrides] = useState<Record<string, ProductOverride>>({});
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [extraSettings, setExtraSettings] = useState<ExtraSettings>(DEFAULT_EXTRA);
  const [customers, setCustomers] = useState<ExtendedCustomer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const products = useMemo(() => {
    const map = new Map<string, Product>();
    seedProducts.forEach(p => map.set(p.id, normalizeProduct(p)));
    remoteProducts.forEach(p => map.set(p.id, normalizeProduct(p)));
    return Array.from(map.values()).filter(p => p.available !== false);
  }, [remoteProducts]);

  const categories = useMemo(() => 
    Array.from(new Set([...seedCategories, ...products.map(p => p.category)])).sort()
  , [products]);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    
    try {
      const [prodRes, ovRes, settingsRes, extraRes, custRes, orderRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: true }),
        supabase.from('product_overrides').select('*'),
        supabase.from('app_settings').select('key, value'),
        supabase.from('settings').select('*').limit(1), // Cambiado .single() por .limit(1) para evitar errores
        supabase.from('customers').select('*').order('points', { ascending: false }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(100),
      ]);
      
      if (prodRes.data) setRemoteProducts(prodRes.data as Product[]);
      if (ovRes.data) {
        const map: Record<string, ProductOverride> = {};
        ovRes.data.forEach(row => { map[row.id] = row as ProductOverride; });
        setOverrides(map);
      }
      if (settingsRes.data) {
        const next = { ...DEFAULT_SETTINGS };
        settingsRes.data.forEach((s: { key: string; value: string }) => {
          if (s.key in next) (next as Record<string, string>)[s.key] = s.value;
        });
        setSettings(next);
      }
      if (extraRes.data && extraRes.data.length > 0) setExtraSettings(extraRes.data as ExtraSettings);
      if (custRes.data) setCustomers(custRes.data as ExtendedCustomer[]);
      if (orderRes.data) setOrders(orderRes.data as Order[]);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime seguro
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const channel = supabase.channel('pollazo_realtime_global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const updateExtraSettings = async (patch: Partial<ExtraSettings>) => {
    const next = { ...extraSettings, ...patch };
    setExtraSettings(next);
    if (isSupabaseConfigured) await supabase.from('settings').upsert({ id: 'global', ...next });
  };

  const addCustomerPoints = async (customerId: string, pointsToAdd: number) => {
    const current = customers.find(c => c.id === customerId);
    const nextPoints = (current?.points ?? 0) + pointsToAdd;
    if (isSupabaseConfigured) {
      await supabase.from('customers').update({ points: nextPoints }).eq('id', customerId);
      load();
    }
  };

  const upsertCustomer = async (phone: string, name?: string | null, avatar_url?: string | null) => {
    const clean = phone.replace(/\D/g, '');
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('customers').upsert({ phone: clean, name, avatar_url }, { onConflict: 'phone' }).select().single();
      if (data) load();
      return data as ExtendedCustomer;
    }
    return null;
  };

  const createOrder = async (order: Omit<Order, 'created_at'>) => {
    if (isSupabaseConfigured) {
      await supabase.from('orders').insert(order);
      load();
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    if (isSupabaseConfigured) {
      await supabase.from('orders').update({ status }).eq('id', orderId);
      load();
    }
  };

  return (
    <AdminContext.Provider value={{ 
      products, categories, overrides, settings, extraSettings, 
      customers, orders, loading, updateExtraSettings, addCustomerPoints, 
      upsertCustomer, createOrder, updateOrderStatus 
    }}>
      {children}
    </AdminContext.Provider>
  );
}
