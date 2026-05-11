import { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { products as seedProducts, categories as seedCategories } from '../data/products';
import { Customer, Order, Product, ExtraSettings } from '../types';

export interface ExtendedCustomer extends Customer { avatar_url?: string | null; }
export interface Season { id: string; name: string; prize: string; winners: any[]; is_published: boolean; created_at: string; }

interface AdminContextValue {
  products: Product[]; customers: ExtendedCustomer[]; orders: Order[]; seasons: Season[]; extraSettings: ExtraSettings; 
  loading: boolean; refreshData: () => Promise<void>; updateExtraSettings: (patch: Partial<ExtraSettings>) => Promise<void>;
  finalizeSeason: (name: string, prize: string, winners: any[]) => Promise<void>; deleteSeason: (id: string) => Promise<void>;
  toggleSeasonVisibility: (id: string, published: boolean) => Promise<void>; updateSeasonWinners: (id: string, winners: any[]) => Promise<void>;
  addCustomerPoints: (customerId: string, points: number) => Promise<void>; createOrder: (order: Omit<Order, 'created_at'>) => Promise<void>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  upsertCustomer: (phone: string, name?: string | null, avatar_url?: string | null) => Promise<ExtendedCustomer | null>;
}

const DEFAULT_EXTRA: ExtraSettings = { logo_url: '/logo-final.png', ranking_title: 'Ranking VIP', prize_description: 'Premios', ranking_end_date: '', winner_photo_url: '', prize_1: '', prize_2: '', prize_3: '' };

const AdminContext = createContext<AdminContextValue>(null as any);
export function useAdmin() { return useContext(AdminContext); }

export function AdminProvider({ children }: { children: ReactNode }) {
  const [remoteProducts, setRemoteProducts] = useState<Product[]>([]);
  const [extraSettings, setExtraSettings] = useState<ExtraSettings>(DEFAULT_EXTRA);
  const [customers, setCustomers] = useState<ExtendedCustomer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    try {
      const [prodRes, extraRes, custRes, orderRes, seasonsRes] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('settings').select('*').eq('id', 'global').maybeSingle(), 
        supabase.from('customers').select('*').order('points', { ascending: false }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('seasons').select('*').order('created_at', { ascending: false }),
      ]);
      setRemoteProducts(prodRes.data || []);
      setExtraSettings({ ...DEFAULT_EXTRA, ...(extraRes.data || {}) });
      setCustomers(custRes.data || []);
      setOrders(orderRes.data || []);
      setSeasons(seasonsRes.data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateExtraSettings = useCallback(async (p: any) => { const n = { ...extraSettings, ...p }; setExtraSettings(n); await supabase.from('settings').upsert({ id: 'global', ...n }); }, [extraSettings]);
  const finalizeSeason = useCallback(async (n: any, p: any, w: any) => { await supabase.from('seasons').insert({ name: n, prize: p, winners: w }); load(); }, [load]);
  const deleteSeason = useCallback(async (id: any) => { await supabase.from('seasons').delete().eq('id', id); load(); }, [load]);
  const toggleSeasonVisibility = useCallback(async (id: any, pub: any) => { await supabase.from('seasons').update({ is_published: pub }).eq('id', id); load(); }, [load]);
  const updateSeasonWinners = useCallback(async (id: any, w: any) => { await supabase.from('seasons').update({ winners: w }).eq('id', id); load(); }, [load]);
  const addCustomerPoints = useCallback(async (id: any, pts: any) => { const c = customers.find(x => x.id === id); const n = Math.max(0, (c?.points || 0) + pts); await supabase.from('customers').update({ points: n }).eq('id', id); load(); }, [customers, load]);
  const createOrder = useCallback(async (o: any) => { await supabase.from('orders').insert(o); load(); }, [load]);
  const updateOrderStatus = useCallback(async (id: any, s: any) => { setOrders(v => v.map(o => o.id === id ? { ...o, status: s } : o)); await supabase.from('orders').update({ status: s }).eq('id', id); }, []);
  const upsertCustomer = useCallback(async (phone: string, name?: string | null, avatar_url?: string | null) => { const { data } = await supabase.from('customers').upsert({ phone: phone.replace(/\D/g, ''), name: name ?? null, avatar_url: avatar_url ?? null }, { onConflict: 'phone' }).select().single(); if (data) load(); return data as ExtendedCustomer; }, [load]);

  return (
    <AdminContext.Provider value={{ 
      products: remoteProducts, customers, orders, seasons, extraSettings, loading, refreshData: load, 
      updateExtraSettings, finalizeSeason, deleteSeason, toggleSeasonVisibility, updateSeasonWinners, addCustomerPoints, createOrder, updateOrderStatus, upsertCustomer 
    }}>
      {children}
    </AdminContext.Provider>
  );
}
