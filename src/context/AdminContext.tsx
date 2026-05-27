import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { products as seedProducts, categories as seedCategories } from '../data/products';
import type { Customer, Order, Product } from '../types';

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

export interface ExtraSettings {
  logo_url: string;
  ranking_title: string;
  prize_description: string;
  ranking_end_date: string;
  winner_photo_url: string;
  prize_1?: string;
  prize_2?: string;
  prize_3?: string;
  event_active?: boolean;
}

export type PaymentStatus =
  | 'pendiente'
  | 'validando'
  | 'confirmado'
  | 'rechazado'
  | 'contra_entrega';

export interface ExtendedCustomer extends Customer {
  avatar_url?: string | null;
  phone_verified?: boolean;
  risk_level?: 'normal' | 'confiable' | 'riesgoso' | 'bloqueado';
  blocked?: boolean;
  total_spent?: number;
  total_orders?: number;
  last_order_at?: string | null;
  updated_at?: string;
}

export interface ExtendedOrder extends Order {
  payment_status?: PaymentStatus;
  confirmed_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  cancelled_reason?: string | null;
  counted_in_metrics?: boolean;
  is_test_order?: boolean;
  service_fee?: number;
  card_fee?: number;
  updated_at?: string;
}

export interface Season {
  id: string;
  name: string;
  prize: string;
  winners: any[];
  is_published: boolean;
  created_at: string;
  updated_at?: string;
}

type CustomerLocationPatch = {
  lat?: number | null;
  lng?: number | null;
  reference?: string | null;
};

type CreateOrderInput = Omit<ExtendedOrder, 'id'>;

interface AdminContextValue {
  products: Product[];
  categories: CategoryString[];
  overrides: Record<string, ProductOverride>;
  settings: AppSettings;
  extraSettings: ExtraSettings;
  announcement: string;
  customers: ExtendedCustomer[];
  orders: ExtendedOrder[];
  seasons: Season[];
  loading: boolean;
  refreshData: () => Promise<void>;
  setAnnouncement: (text: string) => Promise<void>;
  updateSetting: (key: keyof AppSettings, value: string) => Promise<void>;
  updateExtraSettings: (patch: Partial<ExtraSettings>) => Promise<void>;
  setOverride: (id: string, patch: Partial<Omit<ProductOverride, 'id'>>) => Promise<void>;
  addProduct: (product: Omit<Product, 'id'> & { id?: string }) => Promise<void>;
  updateProduct: (id: string, patch: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  upsertCustomer: (
    phone: string,
    name?: string | null,
    avatar_url?: string | null,
    locationPatch?: CustomerLocationPatch
  ) => Promise<ExtendedCustomer | null>;
  addCustomerPoints: (customerId: string, points: number) => Promise<void>;
  resetSeasonPoints: () => Promise<void>;
  createOrder: (order: CreateOrderInput) => Promise<void>;
  updateOrderStatus: (orderId: string, status: ExtendedOrder['status']) => Promise<void>;
  finalizeSeason: (name: string, prize: string, winners: any[]) => Promise<void>;
  deleteSeason: (id: string) => Promise<void>;
  toggleSeasonVisibility: (id: string, published: boolean) => Promise<void>;
  updateSeasonWinners: (id: string, winners: any[]) => Promise<void>;
}

type CategoryString = Product['category'];

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
  winner_photo_url: '',
  prize_1: '',
  prize_2: '',
  prize_3: '',
  event_active: true,
};

const CONFIRMED_STATUSES: ExtendedOrder['status'][] = [
  'Recibido',
  'Preparando',
  'Enviado',
  'Entregado',
];

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);

  if (!ctx) {
    throw new Error('useAdmin must be used within AdminProvider');
  }

  return ctx;
}

const normalizeProduct = (product: Product): Product => ({
  ...product,
  available: product.available !== false,
});

const slug = (text: string) => {
  return (
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `prod-${Date.now()}`
  );
};

const cleanPhone = (phone?: string | null) => {
  return (phone || '').replace(/\D/g, '');
};

const toMoneyNumber = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
  }

  const raw = String(value || '').trim();

  if (!raw) return 0;

  const normalized = raw
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');

  const numeric = Number.parseFloat(normalized);

  return Number.isFinite(numeric) ? Number(numeric.toFixed(2)) : 0;
};

const getExpFromTotal = (total: unknown) => {
  const value = toMoneyNumber(total);

  if (value <= 0) return 0;

  return Math.max(1, Math.floor(value));
};

const resolvePaymentStatus = (
  order: Partial<ExtendedOrder>,
  nextStatus: ExtendedOrder['status']
): PaymentStatus => {
  const method = order.payment_method;

  if (nextStatus === 'Cancelado') {
    return order.payment_status === 'confirmado' ? 'confirmado' : 'rechazado';
  }

  if (method === 'efectivo') {
    return 'contra_entrega';
  }

  if (method === 'deuna' || method === 'transferencia') {
    return CONFIRMED_STATUSES.includes(nextStatus) ? 'confirmado' : 'validando';
  }

  return CONFIRMED_STATUSES.includes(nextStatus) ? 'confirmado' : 'pendiente';
};

const shouldCountOrderNow = (
  order: ExtendedOrder,
  nextStatus: ExtendedOrder['status']
) => {
  if (order.counted_in_metrics || order.is_test_order) return false;

  const method = order.payment_method;

  if (method === 'efectivo') {
    return nextStatus === 'Entregado';
  }

  if (method === 'deuna' || method === 'transferencia') {
    return CONFIRMED_STATUSES.includes(nextStatus);
  }

  return nextStatus === 'Entregado';
};

const withProductOverride = (
  product: Product,
  override?: ProductOverride
): Product => {
  if (!override) {
    return normalizeProduct(product);
  }

  return normalizeProduct({
    ...product,
    price: override.price ?? product.price,
    available: override.available !== false,
  });
};

export function AdminProvider({ children }: { children: ReactNode }) {
  const [remoteProducts, setRemoteProducts] = useState<Product[]>([]);
  const [overrides, setOverrides] = useState<Record<string, ProductOverride>>({});
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [extraSettings, setExtraSettings] = useState<ExtraSettings>(DEFAULT_EXTRA);
  const [customers, setCustomers] = useState<ExtendedCustomer[]>([]);
  const [orders, setOrders] = useState<ExtendedOrder[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);

  const products = useMemo(() => {
    const map = new Map<string, Product>();

    seedProducts.forEach(product => map.set(product.id, normalizeProduct(product)));
    remoteProducts.forEach(product => map.set(product.id, normalizeProduct(product)));

    return Array.from(map.values()).map(product =>
      withProductOverride(product, overrides[product.id])
    );
  }, [remoteProducts, overrides]);

  const categories = useMemo(() => {
    return Array.from(
      new Set([...seedCategories, ...products.map(product => product.category)])
    ).sort() as CategoryString[];
  }, [products]);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      const [prodRes, ovRes, settingsRes, extraRes, custRes, orderRes, seasonsRes] =
        await Promise.all([
          supabase.from('products').select('*').order('created_at', { ascending: true }),
          supabase.from('product_overrides').select('id, price, available'),
          supabase.from('app_settings').select('key, value'),
          supabase.from('settings').select('*').eq('id', 'global').maybeSingle(),
          supabase.from('customers').select('*').order('points', { ascending: false }),
          supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(150),
          supabase.from('seasons').select('*').order('created_at', { ascending: false }),
        ]);

      if (prodRes.data) {
        setRemoteProducts(prodRes.data as Product[]);
      }

      if (ovRes.data) {
        const map: Record<string, ProductOverride> = {};

        ovRes.data.forEach(row => {
          map[row.id] = row as ProductOverride;
        });

        setOverrides(map);
      }

      const nextSettings = { ...DEFAULT_SETTINGS };
      const extraPrizes: Record<string, string> = {};

      if (settingsRes.data) {
        settingsRes.data.forEach((setting: { key: string; value: string }) => {
          if (setting.key in nextSettings) {
            nextSettings[setting.key as keyof AppSettings] = setting.value;
          }

          if (setting.key.startsWith('prize_')) {
            extraPrizes[setting.key] = setting.value;
          }
        });
      }

      setSettings(nextSettings);
      document.documentElement.style.setProperty('--pollazo-primary', nextSettings.primary_color);

      if (extraRes.data) {
        setExtraSettings({ ...DEFAULT_EXTRA, ...extraRes.data, ...extraPrizes });
      } else {
        setExtraSettings({ ...DEFAULT_EXTRA, ...extraPrizes });
      }

      if (custRes.data) {
        setCustomers(custRes.data as ExtendedCustomer[]);
      }

      if (orderRes.data) {
        setOrders(orderRes.data as ExtendedOrder[]);
      }

      if (seasonsRes.data) {
        setSeasons(seasonsRes.data as Season[]);
      }
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    const channel = supabase
      .channel('pollazo_admin_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seasons' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_overrides' }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const updateSetting = useCallback(async (key: keyof AppSettings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));

    if (key === 'primary_color') {
      document.documentElement.style.setProperty('--pollazo-primary', value);
    }

    if (isSupabaseConfigured) {
      await supabase
        .from('app_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() });
    }
  }, []);

  const updateExtraSettings = useCallback(
    async (patch: Partial<ExtraSettings>) => {
      const { prize_1, prize_2, prize_3, ...rest } = patch as ExtraSettings;
      const next = { ...extraSettings, ...rest };

      setExtraSettings(prev => ({ ...prev, ...patch }));

      if (isSupabaseConfigured) {
        await supabase.from('settings').upsert({
          id: 'global',
          ...next,
          updated_at: new Date().toISOString(),
        });

        const promises = [];

        if (prize_1 !== undefined) {
          promises.push(
            supabase
              .from('app_settings')
              .upsert({ key: 'prize_1', value: prize_1, updated_at: new Date().toISOString() })
          );
        }

        if (prize_2 !== undefined) {
          promises.push(
            supabase
              .from('app_settings')
              .upsert({ key: 'prize_2', value: prize_2, updated_at: new Date().toISOString() })
          );
        }

        if (prize_3 !== undefined) {
          promises.push(
            supabase
              .from('app_settings')
              .upsert({ key: 'prize_3', value: prize_3, updated_at: new Date().toISOString() })
          );
        }

        if (promises.length > 0) {
          await Promise.all(promises);
        }

        await load();
      }
    },
    [extraSettings, load]
  );

  const finalizeSeason = useCallback(
    async (name: string, prize: string, winners: any[]) => {
      if (isSupabaseConfigured) {
        await supabase.from('seasons').insert({
          name,
          prize,
          winners,
          is_published: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        await load();
      }
    },
    [load]
  );

  const deleteSeason = useCallback(
    async (id: string) => {
      if (isSupabaseConfigured) {
        await supabase.from('seasons').delete().eq('id', id);
        await load();
      }
    },
    [load]
  );

  const toggleSeasonVisibility = useCallback(
    async (id: string, published: boolean) => {
      if (isSupabaseConfigured) {
        await supabase
          .from('seasons')
          .update({ is_published: published, updated_at: new Date().toISOString() })
          .eq('id', id);

        await load();
      }
    },
    [load]
  );

  const updateSeasonWinners = useCallback(
    async (id: string, winners: any[]) => {
      if (isSupabaseConfigured) {
        await supabase
          .from('seasons')
          .update({ winners, updated_at: new Date().toISOString() })
          .eq('id', id);

        await load();
      }
    },
    [load]
  );

  const setOverride = useCallback(
    async (id: string, patch: Partial<Omit<ProductOverride, 'id'>>) => {
      const current = overrides[id] ?? { id, price: null, available: true };
      const updated = { ...current, ...patch, id };

      setOverrides(prev => ({ ...prev, [id]: updated }));

      if (isSupabaseConfigured) {
        await supabase
          .from('product_overrides')
          .upsert({ ...updated, updated_at: new Date().toISOString() });
      }
    },
    [overrides]
  );

  const addProduct = useCallback(async (product: Omit<Product, 'id'> & { id?: string }) => {
    const now = new Date().toISOString();

    const newProduct = normalizeProduct({
      ...product,
      id: product.id || slug(product.name),
    } as Product);

    setRemoteProducts(prev => {
      const withoutDuplicate = prev.filter(item => item.id !== newProduct.id);
      return [newProduct, ...withoutDuplicate];
    });

    if (isSupabaseConfigured) {
      await supabase.from('products').upsert({
        ...newProduct,
        created_at: now,
        updated_at: now,
      });
    }
  }, []);

  const updateProduct = useCallback(async (id: string, patch: Partial<Product>) => {
    const baseProduct =
      remoteProducts.find(product => product.id === id) ||
      seedProducts.find(product => product.id === id);

    setRemoteProducts(prev => {
      const exists = prev.some(product => product.id === id);

      if (exists) {
        return prev.map(product => (product.id === id ? { ...product, ...patch } : product));
      }

      if (baseProduct) {
        return [{ ...baseProduct, ...patch } as Product, ...prev];
      }

      return prev;
    });

    if (isSupabaseConfigured) {
      const now = new Date().toISOString();

      if (baseProduct) {
        await supabase.from('products').upsert({
          ...baseProduct,
          ...patch,
          id,
          updated_at: now,
        });
      } else {
        await supabase
          .from('products')
          .update({ ...patch, updated_at: now })
          .eq('id', id);
      }
    }
  }, [remoteProducts]);

  const deleteProduct = useCallback(async (id: string) => {
    const seedProduct = seedProducts.find(product => product.id === id);
    const now = new Date().toISOString();

    if (seedProduct) {
      const hiddenProduct = { ...seedProduct, available: false } as Product;

      setRemoteProducts(prev => {
        const withoutDuplicate = prev.filter(product => product.id !== id);
        return [hiddenProduct, ...withoutDuplicate];
      });

      if (isSupabaseConfigured) {
        await supabase.from('products').upsert({
          ...hiddenProduct,
          updated_at: now,
        });
      }

      return;
    }

    setRemoteProducts(prev => prev.filter(product => product.id !== id));

    if (isSupabaseConfigured) {
      await supabase.from('products').delete().eq('id', id);
    }
  }, []);

  const upsertCustomer = useCallback(
    async (
      phone: string,
      name?: string | null,
      avatar_url?: string | null,
      locationPatch?: CustomerLocationPatch
    ) => {
      const clean = cleanPhone(phone);

      const payload = {
        phone: clean,
        name: name ?? null,
        avatar_url: avatar_url ?? null,
        ...(locationPatch || {}),
        updated_at: new Date().toISOString(),
      };

      if (!isSupabaseConfigured) {
        return null;
      }

      const { data, error } = await supabase
        .from('customers')
        .upsert(payload, { onConflict: 'phone' })
        .select()
        .single();

      if (error) {
        console.error('❌ Error guardando cliente:', error);
        return null;
      }

      if (data) {
        await load();
      }

      return data as ExtendedCustomer;
    },
    [load]
  );

  const addCustomerPoints = useCallback(
    async (customerId: string, pointsToAdd: number) => {
      const current = customers.find(customer => customer.id === customerId);
      const nextPoints = Math.max(0, (current?.points ?? 0) + pointsToAdd);
      const nextExp = Math.max(0, (current?.exp ?? 0) + Math.max(0, pointsToAdd));

      if (isSupabaseConfigured) {
        await supabase
          .from('customers')
          .update({
            points: nextPoints,
            exp: nextExp,
            updated_at: new Date().toISOString(),
          })
          .eq('id', customerId);

        await load();
      }
    },
    [customers, load]
  );

  const resetSeasonPoints = useCallback(async () => {
    const now = new Date().toISOString();

    setCustomers(prev =>
      prev.map(customer => ({
        ...customer,
        points: 0,
        updated_at: now,
      }))
    );

    if (!isSupabaseConfigured) {
      return;
    }

    const { error } = await supabase
      .from('customers')
      .update({
        points: 0,
        updated_at: now,
      })
      .gte('points', 0);

    if (error) {
      console.error('❌ Error reiniciando puntos de temporada:', error);
      await load();
      throw error;
    }

    await load();
  }, [load]);

  const createOrder = useCallback(
    async (order: CreateOrderInput) => {
      if (!isSupabaseConfigured) return;

      const now = new Date().toISOString();
      const status = order.status || 'Por Confirmar';
      const paymentStatus = resolvePaymentStatus(order, status);

      const payload = {
        ...order,
        status,
        payment_status: order.payment_status || paymentStatus,
        counted_in_metrics: order.counted_in_metrics || false,
        is_test_order: order.is_test_order || false,
        service_fee: toMoneyNumber(order.service_fee || 0),
        card_fee: toMoneyNumber(order.card_fee || 0),
        created_at: order.created_at || now,
        updated_at: now,
      };

      const { error } = await supabase.from('orders').insert(payload);

      if (error) {
        console.error('❌ Error creando orden:', error);
        throw error;
      }

      await load();
    },
    [load]
  );

  const countOrderForMetricsAndCustomer = useCallback(
    async (order: ExtendedOrder) => {
      if (!isSupabaseConfigured) return;

      const cleanCustomerPhone = cleanPhone(order.customer_phone);
      const orderTotal = toMoneyNumber(order.total);
      const expToAdd = getExpFromTotal(orderTotal);
      const shouldAddSeasonPoints = extraSettings.event_active !== false;

      const rpcResult = await supabase.rpc('increment_metric', {
        metric_id: 'total_orders',
      });

      if (rpcResult.error) {
        console.warn('No se pudo incrementar total_orders:', rpcResult.error);
      }

      if (!cleanCustomerPhone || orderTotal <= 0) {
        return;
      }

      const currentCustomer =
        customers.find(customer => cleanPhone(customer.phone) === cleanCustomerPhone) || null;

      if (currentCustomer) {
        const nextExp = Math.max(0, (currentCustomer.exp || 0) + expToAdd);
        const nextPoints = Math.max(
          0,
          (currentCustomer.points || 0) + (shouldAddSeasonPoints ? expToAdd : 0)
        );
        const nextTotalSpent = toMoneyNumber((currentCustomer.total_spent || 0) + orderTotal);
        const nextTotalOrders = (currentCustomer.total_orders || 0) + 1;

        await supabase
          .from('customers')
          .update({
            exp: nextExp,
            points: nextPoints,
            total_spent: nextTotalSpent,
            total_orders: nextTotalOrders,
            last_order_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentCustomer.id);

        return;
      }

      await supabase
        .from('customers')
        .upsert(
          {
            phone: cleanCustomerPhone,
            name: null,
            points: shouldAddSeasonPoints ? expToAdd : 0,
            exp: expToAdd,
            total_spent: orderTotal,
            total_orders: 1,
            last_order_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'phone' }
        );
    },
    [customers, extraSettings.event_active]
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, status: ExtendedOrder['status']) => {
      const currentOrder = orders.find(order => order.id === orderId);
      const now = new Date().toISOString();

      const paymentStatus = resolvePaymentStatus(currentOrder || {}, status);

      const patch: Partial<ExtendedOrder> = {
        status,
        payment_status: paymentStatus,
        updated_at: now,
      };

      if (CONFIRMED_STATUSES.includes(status) && !currentOrder?.confirmed_at) {
        patch.confirmed_at = now;
      }

      if (status === 'Entregado') {
        patch.delivered_at = now;
      }

      if (status === 'Cancelado') {
        patch.cancelled_at = now;
      }

      const countNow = currentOrder ? shouldCountOrderNow(currentOrder, status) : false;

      if (countNow) {
        patch.counted_in_metrics = true;
      }

      setOrders(prev =>
        prev.map(order =>
          order.id === orderId
            ? { ...order, ...patch }
            : order
        )
      );

      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('orders')
          .update(patch)
          .eq('id', orderId);

        if (error) {
          console.error('❌ Error actualizando estado:', error);
          await load();
          throw error;
        }

        if (countNow && currentOrder) {
          await countOrderForMetricsAndCustomer({ ...currentOrder, ...patch });
        }

        await load();
      }
    },
    [countOrderForMetricsAndCustomer, load, orders]
  );

  return (
    <AdminContext.Provider
      value={{
        products,
        categories,
        overrides,
        settings,
        extraSettings,
        announcement: settings.announcement,
        customers,
        orders,
        seasons,
        loading,
        refreshData: load,
        setAnnouncement: text => updateSetting('announcement', text),
        updateSetting,
        updateExtraSettings,
        setOverride,
        addProduct,
        updateProduct,
        deleteProduct,
        upsertCustomer,
        addCustomerPoints,
        resetSeasonPoints,
        createOrder,
        updateOrderStatus,
        finalizeSeason,
        deleteSeason,
        toggleSeasonVisibility,
        updateSeasonWinners,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}
