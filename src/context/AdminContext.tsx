import { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { products as seedProducts, categories as seedCategories } from '../data/products';
import { Customer, Order, Product, ExtraSettings } from '../types';

export interface ProductOverride { id: string; price: string | null; available: boolean; }
export interface AppSettings { announcement: string; primary_color: string; banner_link: string; }
export interface ExtendedCustomer extends Customer { avatar_url?: string | null; }
export interface Season { id: string; name: string; prize: string; winners: any[]; is_published: boolean; created_at: string; }

interface AdminContextValue {
  products: Product[]; categories: string[]; overrides: Record<string, ProductOverride>; settings: AppSettings;
  extraSettings: ExtraSettings; announcement: string; customers: ExtendedCustomer[]; orders: Order[];
  seasons: Season[]; loading: boolean; refreshData: () => Promise<void>;
  setAnnouncement: (text: string) => Promise<void>; updateSetting: (key: keyof AppSettings, value: string) => Promise<void>;
  updateExtraSettings: (patch: Partial<ExtraSettings>) => Promise<void>; setOverride: (id: string, patch: Partial<Omit<ProductOverride, 'id'>>) => Promise<void>;
  addProduct: (product: Omit<Product, 'id'> & { id?: string }) => Promise<void>; updateProduct: (id: string, patch: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>; upsertCustomer: (phone: string, name?: string | null, avatar_url?: string | null) => Promise<ExtendedCustomer | null>;
  addCustomerPoints: (customerId: string, points: number) => Promise<void>; createOrder: (order: Omit<Order, 'created_at'>) => Promise<void>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>; finalizeSeason: (name: string, prize: string, winners: any[]) => Promise<void>;
  deleteSeason: (id: string) => Promise<void>; toggleSeasonVisibility: (id: string, published: boolean) => Promise<void>;
  updateSeasonWinners: (id: string, winners: any[]) => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = { announcement: '', primary_color: '#E67E22', banner_link: '' };
const DEFAULT_EXTRA: ExtraSettings = {
  logo_url: '/logo-final.png', ranking_title: 'Ranking VIP', prize_description: 'Premios',
  ranking_end_date: '', winner_photo_url: '', prize_1: '', prize_2: '', prize_3: ''
};

const AdminContext = createContext<AdminContextValue>(null as any);
export function useAdmin() { return useContext(AdminContext); }

const normalizeProduct = (p: Product): Product => ({ ...p, available: p.available !== false });
const slug = (text: string) => text.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `p-${Date.now()}`;

export function AdminProvider({ children }: { children: ReactNode }) {
  const [remoteProducts, setRemoteProducts] = useState<Product[]>([]);
  const [overrides, setOverrides] = useState<Record<string, ProductOverride>>({});
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [extraSettings, setExtraSettings] = useState<ExtraSettings>(DEFAULT_EXTRA);
  const [customers, setCustomers] = useState<ExtendedCustomer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
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
    try {
      const [prodRes, ovRes, settingsRes, extraRes, custRes, orderRes, seasonsRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at'),
        supabase.from('product_overrides').select('id, price, available'),
        supabase.from('app_settings').select('key, value'),
        supabase.from('settings').select('*').eq('id', 'global').maybeSingle(), 
        supabase.from('customers').select('*').order('points', { ascending: false }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('seasons').select('*').order('created_at', { ascending: false }),
      ]);
      
      if (prodRes.data) setRemoteProducts(prodRes.data as Product[]);
      if (ovRes.data) {
        const m: Record<string, ProductOverride> = {};
        ovRes.data.forEach(r => m[r.id] = r as ProductOverride);
        setOverrides(m);
      }
      if (settingsRes.data) {
        const next = { ...DEFAULT_SETTINGS };
        settingsRes.data.forEach((s: any) => { if (s.key in next) (next as any)[s.key] = s.value; });
        setSettings(next);
      }
      // ✅ RESCATE DE DATOS: Asegurar que extraSettings nunca sea null o incompleto
      setExtraSettings({ ...DEFAULT_EXTRA, ...(extraRes.data || {}) });
      setCustomers(custRes.data || []);
      setOrders(orderRes.data || []);
      setSeasons(seasonsRes.data || []);
    } catch (e) { console.error("Error load:", e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateExtraSettings = useCallback(async (patch: Partial<ExtraSettings>) => {
    const next = { ...extraSettings, ...patch };
    setExtraSettings(next);
    if (isSupabaseConfigured) await supabase.from('settings').upsert({ id: 'global', ...next });
  }, [extraSettings]);

  const finalizeSeason = useCallback(async (name: string, prize: string, winners: any[]) => {
    if (isSupabaseConfigured) {
      await supabase.from('seasons').insert({ name, prize, winners, is_published: false });
      await load();
    }
  }, [load]);

  const deleteSeason = useCallback(async (id: string) => { if (isSupabaseConfigured) { await supabase.from('seasons').delete().eq('id', id); load(); } }, [load]);
  const toggleSeasonVisibility = useCallback(async (id: string, published: boolean) => { if (isSupabaseConfigured) { await supabase.from('seasons').update({ is_published: published }).eq('id', id); load(); } }, [load]);
  const updateSeasonWinners = useCallback(async (id: string, winners: any[]) => { if (isSupabaseConfigured) { await supabase.from('seasons').update({ winners }).eq('id', id); load(); } }, [load]);
  const setOverride = useCallback(async (id: string, patch: any) => { const c = overrides[id] ?? { id, price: null, available: true }; const u = { ...c, ...patch, id }; setOverrides(p => ({ ...p, [id]: u })); if (isSupabaseConfigured) await supabase.from('product_overrides').upsert(u); }, [overrides]);
  const addProduct = useCallback(async (p: any) => { const n = normalizeProduct({ ...p, id: p.id || slug(p.name) }); setRemoteProducts(v => [n, ...v]); if (isSupabaseConfigured) await supabase.from('products').upsert(n); }, []);
  const updateProduct = useCallback(async (id: string, patch: any) => { setRemoteProducts(v => v.map(p => p.id === id ? { ...p, ...patch } : p)); if (isSupabaseConfigured) await supabase.from('products').update(patch).eq('id', id); }, []);
  const deleteProduct = useCallback(async (id: string) => { setRemoteProducts(v => v.filter(p => p.id !== id)); if (isSupabaseConfigured) await supabase.from('products').delete().eq('id', id); }, []);
  const upsertCustomer = useCallback(async (phone: string, name?: string | null, avatar_url?: string | null) => { const { data } = await supabase.from('customers').upsert({ phone: phone.replace(/\D/g, ''), name: name ?? null, avatar_url: avatar_url ?? null }, { onConflict: 'phone' }).select().single(); if (data) load(); return data as ExtendedCustomer; }, [load]);
  const addCustomerPoints = useCallback(async (id: string, pts: number) => { const c = customers.find(x => x.id === id); const n = Math.max(0, (c?.points ?? 0) + pts); if (isSupabaseConfigured) { await supabase.from('customers').update({ points: n }).eq('id', id); load(); } }, [customers, load]);
  const createOrder = useCallback(async (o: any) => { if (isSupabaseConfigured) { await supabase.from('orders').insert(o); load(); } }, [load]);
  const updateOrderStatus = useCallback(async (id: string, status: any) => { setOrders(v => v.map(o => o.id === id ? { ...o, status } : o)); if (isSupabaseConfigured) await supabase.from('orders').update({ status }).eq('id', id); }, []);

  return (
    <AdminContext.Provider value={{ 
      products, categories, overrides, settings, extraSettings, announcement: settings.announcement, 
      customers, orders, seasons, loading, refreshData: load, 
      setAnnouncement: (t) => updateSetting('announcement', t), 
      updateSetting, updateExtraSettings, setOverride, addProduct, updateProduct, deleteProduct, 
      upsertCustomer, addCustomerPoints, createOrder, updateOrderStatus,
      finalizeSeason, deleteSeason, toggleSeasonVisibility, updateSeasonWinners
    }}>
      {children}
    </AdminContext.Provider>
  );
}
