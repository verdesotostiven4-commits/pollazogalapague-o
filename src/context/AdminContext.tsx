import { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { products as seedProducts, categories as seedCategories } from '../data/products';
import { Customer, Order, Product } from '../types';

export interface ProductOverride {
  id: string;
  price: string | null;
  available: boolean;
}

export interface AppSettings {
  announcement: string;
  primary_color: string;
  banner_link: string;
}

// NUEVA INTERFAZ PARA EL BRANDING Y RANKING
export interface ExtraSettings {
  logo_url: string;
  ranking_title: string;
  prize_description: string;
  ranking_end_date: string;
}

interface AdminContextValue {
  products: Product[];
  categories: string[];
  overrides: Record<string, ProductOverride>;
  settings: AppSettings;
  extraSettings: ExtraSettings; // <--- Agregado
  announcement: string;
  customers: Customer[];
  orders: Order[];
  loading: boolean;
  setAnnouncement: (text: string) => Promise<void>;
  updateSetting: (key: keyof AppSettings, value: string) => Promise<void>;
  updateExtraSettings: (patch: Partial<ExtraSettings>) => Promise<void>; // <--- Agregado
  setOverride: (id: string, patch: Partial<Omit<ProductOverride, 'id'>>) => Promise<void>;
  addProduct: (product: Omit<Product, 'id'> & { id?: string }) => Promise<void>;
  updateProduct: (id: string, patch: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  upsertCustomer: (phone: string, name?: string | null) => Promise<Customer | null>;
  addCustomerPoints: (customerId: string, points: number) => Promise<void>;
  createOrder: (order: Omit<Order, 'created_at'>) => Promise<void>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
  announcement: '',
  primary_color: '#E67E22',
  banner_link: '',
};

const DEFAULT_EXTRA: ExtraSettings = {
  logo_url: '/logo-final.png',
  ranking_title: 'Ranking de Clientes',
  prize_description: '¡Gana un Combo Familiar!',
  ranking_end_date: '',
};

const AdminContext = createContext<AdminContextValue>({
  products: seedProducts,
  categories: [...seedCategories],
  overrides: {},
  settings: DEFAULT_SETTINGS,
  extraSettings: DEFAULT_EXTRA,
  announcement: '',
  customers: [],
  orders: [],
  loading: true,
  setAnnouncement: async () => {},
  updateSetting: async () => {},
  updateExtraSettings: async () => {},
  setOverride: async () => {},
  addProduct: async () => {},
  updateProduct: async () => {},
  deleteProduct: async () => {},
  upsertCustomer: async () => null,
  addCustomerPoints: async () => {},
  createOrder: async () => {},
  updateOrderStatus: async () => {},
});

export function useAdmin() { return useContext(AdminContext); }

const normalizeProduct = (p: Product): Product => ({ ...p, available: p.available !== false });
const slug = (text: string) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `prod-${Date.now()}`;

export function AdminProvider({ children }: { children: ReactNode }) {
  const [remoteProducts, setRemoteProducts] = useState<Product[]>([]);
  const [overrides, setOverrides] = useState<Record<string, ProductOverride>>({});
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [extraSettings, setExtraSettings] = useState<ExtraSettings>(DEFAULT_EXTRA);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const products = useMemo(() => {
    const map = new Map<string, Product>();
    seedProducts.forEach(p => map.set(p.id, normalizeProduct(p)));
    remoteProducts.forEach(p => map.set(p.id, normalizeProduct(p)));
    return Array.from(map.values()).filter(p => p.available !== false);
  }, [remoteProducts]);

  const categories = useMemo(() => Array.from(new Set([...seedCategories, ...products.map(p => p.category)])).sort(), [products]);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    setLoading(true);
    const [prodRes, ovRes, settingsRes, extraRes, custRes, orderRes] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: true }),
      supabase.from('product_overrides').select('id, price, available'),
      supabase.from('app_settings').select('key, value'),
      supabase.from('settings').select('*').single(), // Cargamos la tabla de branding
      supabase.from('customers').select('*').order('points', { ascending: false }).limit(200),
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
      document.documentElement.style.setProperty('--pollazo-primary', next.primary_color);
    }
    if (extraRes.data) {
      setExtraSettings(extraRes.data as ExtraSettings);
    }
    if (custRes.data) setCustomers(custRes.data as Customer[]);
    if (orderRes.data) setOrders(orderRes.data as Order[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const channel = supabase.channel('pollazo_admin_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_overrides' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const updateSetting = useCallback(async (key: keyof AppSettings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    if (key === 'primary_color') document.documentElement.style.setProperty('--pollazo-primary', value);
    if (isSupabaseConfigured) await supabase.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() });
  }, []);

  const updateExtraSettings = useCallback(async (patch: Partial<ExtraSettings>) => {
    const next = { ...extraSettings, ...patch };
    setExtraSettings(next);
    if (isSupabaseConfigured) {
        await supabase.from('settings').upsert({ id: 'global', ...next });
    }
  }, [extraSettings]);

  const setAnnouncement = useCallback((text: string) => updateSetting('announcement', text), [updateSetting]);

  const setOverride = useCallback(async (id: string, patch: Partial<Omit<ProductOverride, 'id'>>) => {
    const current = overrides[id] ?? { id, price: null, available: true };
    const updated = { ...current, ...patch, id };
    setOverrides(prev => ({ ...prev, [id]: updated }));
    if (isSupabaseConfigured) await supabase.from('product_overrides').upsert({ ...updated, updated_at: new Date().toISOString() });
  }, [overrides]);

  const addProduct = useCallback(async (product: Omit<Product, 'id'> & { id?: string }) => {
    const newProduct = normalizeProduct({ ...product, id: product.id || slug(product.name) } as Product);
    setRemoteProducts(prev => [newProduct, ...prev.filter(p => p.id !== newProduct.id)]);
    if (isSupabaseConfigured) await supabase.from('products').upsert(newProduct);
  }, []);

  const updateProduct = useCallback(async (id: string, patch: Partial<Product>) => {
    setRemoteProducts(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
    if (isSupabaseConfigured) await supabase.from('products').upsert({ id, ...patch, updated_at: new Date().toISOString() });
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    setRemoteProducts(prev => prev.filter(p => p.id !== id));
    setOverrides(prev => ({ ...prev, [id]: { id, price: null, available: false } }));
    if (isSupabaseConfigured) {
      await supabase.from('products').delete().eq('id', id);
      await supabase.from('product_overrides').upsert({ id, price: null, available: false, updated_at: new Date().toISOString() });
    }
  }, []);

  const upsertCustomer = useCallback(async (phone: string, name?: string | null) => {
    const clean = phone.replace(/\D/g, '');
    const existing = customers.find(c => c.phone === clean);
    if (existing) return existing;
    const customer: Customer = { id: crypto.randomUUID(), phone: clean, name: name ?? null, points: 0 };
    setCustomers(prev => [customer, ...prev]);
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('customers').upsert(customer, { onConflict: 'phone' }).select().single();
      return data as Customer;
    }
    return customer;
  }, [customers]);

  const addCustomerPoints = useCallback(async (customerId: string, points: number) => {
    const current = customers.find(c => c.id === customerId);
    const nextPoints = Math.max(0, (current?.points ?? 0) + points);
    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, points: nextPoints } : c));
    if (isSupabaseConfigured) await supabase.from('customers').update({ points: nextPoints }).eq('id', customerId);
  }, [customers]);

  const createOrder = useCallback(async (order: Omit<Order, 'created_at'>) => {
    setOrders(prev => [{ ...order, created_at: new Date().toISOString() }, ...prev]);
    if (isSupabaseConfigured) await supabase.from('orders').insert(order);
  }, []);

  const updateOrderStatus = useCallback(async (orderId: string, status: Order['status']) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    if (isSupabaseConfigured) await supabase.from('orders').update({ status }).eq('id', orderId);
  }, []);

  return <AdminContext.Provider value={{ 
      products, categories, overrides, settings, extraSettings, announcement: settings.announcement, 
      customers, orders, loading, setAnnouncement, updateSetting, updateExtraSettings, // <--- Funciones añadidas
      setOverride, addProduct, updateProduct, deleteProduct, upsertCustomer, 
      addCustomerPoints, createOrder, updateOrderStatus 
    }}>{children}</AdminContext.Provider>;
}
