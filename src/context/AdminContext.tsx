import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { products as seedProducts, categories as seedCategories } from '../data/products';
import type {
  AppSettings,
  Customer,
  ExtraSettings,
  Order,
  PaymentStatus,
  Product,
} from '../types';

export interface ProductOverride {
  id: string;
  price: string | null;
  available: boolean;
}

export interface ExtendedCustomer extends Customer {
  avatar_url?: string | null;
  phone_verified?: boolean;
  risk_level?: 'normal' | 'confiable' | 'riesgoso' | 'bloqueado' | null;
  blocked?: boolean;
  total_spent?: number;
  total_orders?: number;
  last_order_at?: string | null;
  updated_at?: string;
}

export interface ExtendedOrder extends Order {
  payment_status?: PaymentStatus | null;
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
type CategoryString = Product['category'];

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
const normalizeEcuadorPhone = (phone?: string | null) => {
  const clean = cleanPhone(phone);

  if (!clean) return '';

  if (clean.startsWith('593') && clean.length >= 11) {
    return clean;
  }

  if (clean.startsWith('0') && clean.length === 10) {
    return `593${clean.slice(1)}`;
  }

  if (clean.startsWith('9') && clean.length === 9) {
    return `593${clean}`;
  }

  return clean;
};

const cleanPhoneTail = (phone?: string | null) => {
  return cleanPhone(phone).slice(-9);
};

const findBestCustomerByPhone = (
  customerList: ExtendedCustomer[],
  phone?: string | null
) => {
  const tail = cleanPhoneTail(phone);

  if (!tail) return null;

  const matches = customerList.filter(customer => cleanPhoneTail(customer.phone) === tail);

  if (matches.length === 0) return null;

  return [...matches].sort((a, b) => {
    const scoreA =
      (a.total_orders || 0) * 100000 +
      (a.total_spent || 0) * 1000 +
      (a.exp || 0) * 10 +
      (a.points || 0);

    const scoreB =
      (b.total_orders || 0) * 100000 +
      (b.total_spent || 0) * 1000 +
      (b.exp || 0) * 10 +
      (b.points || 0);

    if (scoreB !== scoreA) return scoreB - scoreA;

    return (
      new Date(b.updated_at || b.created_at || '').getTime() -
      new Date(a.updated_at || a.created_at || '').getTime()
    );
  })[0];
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

const warnIfError = (label: string, error: unknown) => {
  if (error) {
    console.warn(`⚠️ ${label}:`, error);
  }
};

const buildCategoryList = (products: Product[]): CategoryString[] => {
  const result: CategoryString[] = [];

  seedCategories.forEach(category => {
    if (!result.includes(category)) {
      result.push(category);
    }
  });

  products.forEach(product => {
    if (!result.includes(product.category)) {
      result.push(product.category);
    }
  });

  return result;
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

    seedProducts.forEach(product => {
      map.set(product.id, normalizeProduct(product));
    });

    remoteProducts.forEach(product => {
      map.set(product.id, normalizeProduct(product));
    });

    return Array.from(map.values()).map(product =>
      withProductOverride(product, overrides[product.id])
    );
  }, [remoteProducts, overrides]);

  const categories = useMemo(() => {
    return buildCategoryList(products);
  }, [products]);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      const [
        prodRes,
        ovRes,
        settingsRes,
        extraRes,
        custRes,
        orderRes,
        seasonsRes,
      ] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: true }),
        supabase.from('product_overrides').select('id, price, available'),
        supabase.from('app_settings').select('key, value'),
        supabase.from('settings').select('*').eq('id', 'global').maybeSingle(),
        supabase.from('customers').select('*').order('points', { ascending: false }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(150),
        supabase.from('seasons').select('*').order('created_at', { ascending: false }),
      ]);

      warnIfError('Error leyendo products', prodRes.error);
      warnIfError('Error leyendo product_overrides', ovRes.error);
      warnIfError('Error leyendo app_settings', settingsRes.error);
      warnIfError('Error leyendo settings global', extraRes.error);
      warnIfError('Error leyendo customers', custRes.error);
      warnIfError('Error leyendo orders', orderRes.error);
      warnIfError('Error leyendo seasons', seasonsRes.error);

      if (prodRes.data) {
        setRemoteProducts(prodRes.data as Product[]);
      }

      if (ovRes.data) {
        const map: Record<string, ProductOverride> = {};

        ovRes.data.forEach(row => {
          map[row.id] = {
            id: row.id,
            price: row.price ?? null,
            available: row.available !== false,
          };
        });

        setOverrides(map);
      }

      const nextSettings: AppSettings = { ...DEFAULT_SETTINGS };
      const prizeSettings: Partial<ExtraSettings> = {};

      if (settingsRes.data) {
        settingsRes.data.forEach((setting: { key: string; value: string }) => {
          if (setting.key in nextSettings) {
            nextSettings[setting.key as keyof AppSettings] = setting.value;
          }

          if (
            setting.key === 'prize_1' ||
            setting.key === 'prize_2' ||
            setting.key === 'prize_3'
          ) {
            prizeSettings[setting.key] = setting.value;
          }
        });
      }

      setSettings(nextSettings);
      document.documentElement.style.setProperty(
        '--pollazo-primary',
        nextSettings.primary_color
      );

      if (extraRes.data) {
        setExtraSettings({
          ...DEFAULT_EXTRA,
          ...(extraRes.data as Partial<ExtraSettings>),
          ...prizeSettings,
        });
      } else {
        setExtraSettings({
          ...DEFAULT_EXTRA,
          ...prizeSettings,
        });
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

    if (!isSupabaseConfigured) return;

    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key,
        value,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('❌ Error guardando setting:', error);
      throw error;
    }
  }, []);

  const updateExtraSettings = useCallback(
    async (patch: Partial<ExtraSettings>) => {
      const now = new Date().toISOString();
      const next: ExtraSettings = {
        ...extraSettings,
        ...patch,
      };

      setExtraSettings(next);

      if (!isSupabaseConfigured) return;

      const { error: settingsError } = await supabase
        .from('settings')
        .upsert({
          id: 'global',
          ...next,
          updated_at: now,
        });

      if (settingsError) {
        console.error('❌ Error guardando settings global:', settingsError);
        await load();
        throw settingsError;
      }

      const prizePromises = [];

      if (patch.prize_1 !== undefined) {
        prizePromises.push(
          supabase
            .from('app_settings')
            .upsert({ key: 'prize_1', value: patch.prize_1, updated_at: now })
        );
      }

      if (patch.prize_2 !== undefined) {
        prizePromises.push(
          supabase
            .from('app_settings')
            .upsert({ key: 'prize_2', value: patch.prize_2, updated_at: now })
        );
      }

      if (patch.prize_3 !== undefined) {
        prizePromises.push(
          supabase
            .from('app_settings')
            .upsert({ key: 'prize_3', value: patch.prize_3, updated_at: now })
        );
      }

      if (prizePromises.length > 0) {
        const results = await Promise.all(prizePromises);

        results.forEach(result => {
          if (result.error) {
            console.error('❌ Error guardando premio:', result.error);
          }
        });
      }

      await load();
    },
    [extraSettings, load]
  );

  const finalizeSeason = useCallback(
    async (name: string, prize: string, winners: any[]) => {
      if (!isSupabaseConfigured) return;

      const now = new Date().toISOString();

      const { error } = await supabase.from('seasons').insert({
        name,
        prize,
        winners,
        is_published: false,
        created_at: now,
        updated_at: now,
      });

      if (error) {
        console.error('❌ Error finalizando temporada:', error);
        throw error;
      }

      await load();
    },
    [load]
  );

  const deleteSeason = useCallback(
    async (id: string) => {
      if (!isSupabaseConfigured) return;

      const { error } = await supabase.from('seasons').delete().eq('id', id);

      if (error) {
        console.error('❌ Error eliminando temporada:', error);
        throw error;
      }

      await load();
    },
    [load]
  );

  const toggleSeasonVisibility = useCallback(
    async (id: string, published: boolean) => {
      if (!isSupabaseConfigured) return;

      const { error } = await supabase
        .from('seasons')
        .update({
          is_published: published,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('❌ Error cambiando visibilidad de temporada:', error);
        throw error;
      }

      await load();
    },
    [load]
  );

  const updateSeasonWinners = useCallback(
    async (id: string, winners: any[]) => {
      if (!isSupabaseConfigured) return;

      const { error } = await supabase
        .from('seasons')
        .update({
          winners,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('❌ Error actualizando ganadores:', error);
        throw error;
      }

      await load();
    },
    [load]
  );

  const setOverride = useCallback(
    async (id: string, patch: Partial<Omit<ProductOverride, 'id'>>) => {
      const current = overrides[id] ?? {
        id,
        price: null,
        available: true,
      };

      const updated: ProductOverride = {
        ...current,
        ...patch,
        id,
        available: patch.available ?? current.available ?? true,
      };

      setOverrides(prev => ({
        ...prev,
        [id]: updated,
      }));

      if (!isSupabaseConfigured) return;

      const { error } = await supabase
        .from('product_overrides')
        .upsert({
          ...updated,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('❌ Error guardando override:', error);
        await load();
        throw error;
      }
    },
    [load, overrides]
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

    if (!isSupabaseConfigured) return;

    const { error } = await supabase.from('products').upsert({
      ...newProduct,
      created_at: newProduct.created_at || now,
      updated_at: now,
    });

    if (error) {
      console.error('❌ Error agregando producto:', error);
      throw error;
    }
  }, []);

  const updateProduct = useCallback(
    async (id: string, patch: Partial<Product>) => {
      const baseProduct =
        remoteProducts.find(product => product.id === id) ||
        seedProducts.find(product => product.id === id);

      setRemoteProducts(prev => {
        const exists = prev.some(product => product.id === id);

        if (exists) {
          return prev.map(product =>
            product.id === id ? normalizeProduct({ ...product, ...patch }) : product
          );
        }

        if (baseProduct) {
          return [normalizeProduct({ ...baseProduct, ...patch } as Product), ...prev];
        }

        return prev;
      });

      if (!isSupabaseConfigured) return;

      const now = new Date().toISOString();

      if (baseProduct) {
        const { error } = await supabase.from('products').upsert({
          ...baseProduct,
          ...patch,
          id,
          updated_at: now,
        });

        if (error) {
          console.error('❌ Error actualizando producto:', error);
          await load();
          throw error;
        }

        return;
      }

      const { error } = await supabase
        .from('products')
        .update({
          ...patch,
          updated_at: now,
        })
        .eq('id', id);

      if (error) {
        console.error('❌ Error actualizando producto:', error);
        await load();
        throw error;
      }
    },
    [load, remoteProducts]
  );

  const deleteProduct = useCallback(async (id: string) => {
    const seedProduct = seedProducts.find(product => product.id === id);
    const now = new Date().toISOString();

    if (seedProduct) {
      const hiddenProduct = normalizeProduct({
        ...seedProduct,
        available: false,
      } as Product);

      setRemoteProducts(prev => {
        const withoutDuplicate = prev.filter(product => product.id !== id);
        return [hiddenProduct, ...withoutDuplicate];
      });

      if (!isSupabaseConfigured) return;

      const { error } = await supabase.from('products').upsert({
        ...hiddenProduct,
        updated_at: now,
      });

      if (error) {
        console.error('❌ Error ocultando producto base:', error);
        throw error;
      }

      return;
    }

    setRemoteProducts(prev => prev.filter(product => product.id !== id));

    if (!isSupabaseConfigured) return;

    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) {
      console.error('❌ Error eliminando producto:', error);
      await load();
      throw error;
    }
  }, [load]);

  const upsertCustomer = useCallback(
    async (
      phone: string,
      name?: string | null,
      avatar_url?: string | null,
      locationPatch?: CustomerLocationPatch
    ) => {
      const clean = cleanPhone(phone);

      if (!clean) return null;

      const payload: Record<string, unknown> = {
        phone: clean,
        updated_at: new Date().toISOString(),
      };

      if (name !== undefined) {
        payload.name = name || null;
      }

      if (avatar_url !== undefined) {
        payload.avatar_url = avatar_url || null;
      }

      if (locationPatch) {
        if ('lat' in locationPatch) {
          payload.lat = locationPatch.lat ?? null;
        }

        if ('lng' in locationPatch) {
          payload.lng = locationPatch.lng ?? null;
        }

        if ('reference' in locationPatch) {
          payload.reference = locationPatch.reference || null;
        }
      }

      if (!isSupabaseConfigured) {
        return null;
      }

      const { data, error } = await supabase
        .from('customers')
        .upsert(payload, { onConflict: 'phone' })
        .select()
        .maybeSingle();

      if (error) {
        console.error('❌ Error guardando cliente:', error);
        return null;
      }

      await load();

      return data as ExtendedCustomer | null;
    },
    [load]
  );

  const addCustomerPoints = useCallback(
    async (customerId: string, pointsToAdd: number) => {
      const current = customers.find(customer => customer.id === customerId);

      if (!current) return;

      const safePointsToAdd = Math.max(0, pointsToAdd);
      const nextPoints = Math.max(0, (current.points ?? 0) + safePointsToAdd);
      const nextExp = Math.max(0, (current.exp ?? 0) + safePointsToAdd);

      if (!isSupabaseConfigured) {
        setCustomers(prev =>
          prev.map(customer =>
            customer.id === customerId
              ? { ...customer, points: nextPoints, exp: nextExp }
              : customer
          )
        );

        return;
      }

      const { error } = await supabase
        .from('customers')
        .update({
          points: nextPoints,
          exp: nextExp,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customerId);

      if (error) {
        console.error('❌ Error sumando puntos:', error);
        throw error;
      }

      await load();
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

    if (!isSupabaseConfigured) return;

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
        provider: order.provider ?? false,
        service_fee: toMoneyNumber(order.service_fee || 0),
        card_fee: toMoneyNumber(order.card_fee || 0),
        delivery_fee: toMoneyNumber(order.delivery_fee || 0),
        subtotal: toMoneyNumber(order.subtotal || 0),
        total: toMoneyNumber(order.total || 0),
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
      const now = new Date().toISOString();

      const rpcResult = await supabase.rpc('increment_metric', {
        metric_id: 'total_orders',
      });

      if (rpcResult.error) {
        console.warn('No se pudo incrementar total_orders:', rpcResult.error);
      }

      if (!cleanCustomerPhone || orderTotal <= 0 || expToAdd <= 0) {
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

        const { error } = await supabase
          .from('customers')
          .update({
            exp: nextExp,
            points: nextPoints,
            total_spent: nextTotalSpent,
            total_orders: nextTotalOrders,
            last_order_at: now,
            updated_at: now,
          })
          .eq('id', currentCustomer.id);

        if (error) {
          console.error('❌ Error actualizando historial del cliente:', error);
        }

        return;
      }

      const { error } = await supabase
        .from('customers')
        .upsert(
          {
            phone: cleanCustomerPhone,
            name: null,
            points: shouldAddSeasonPoints ? expToAdd : 0,
            exp: expToAdd,
            total_spent: orderTotal,
            total_orders: 1,
            last_order_at: now,
            updated_at: now,
          },
          { onConflict: 'phone' }
        );

      if (error) {
        console.error('❌ Error creando historial del cliente:', error);
      }
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

      if (!isSupabaseConfigured) return;

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
