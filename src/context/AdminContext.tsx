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
import { getOrderCredentials, saveOrderCredential } from '../utils/orderCredentials';
import type {
  AppSettings,
  Customer,
  CustomerMembership,
  ExtraSettings,
  MembershipPayment,
  Order,
  OrderBonusItem,
  PaymentMethod,
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

type MembershipRequestInput = {
  customerPhone: string;
  customerName?: string | null;
  paymentMethod: PaymentMethod;
  notes?: string | null;
};

type VipGiftInput = {
  item_name: string;
  quantity?: number;
  reason?: string | null;
  message?: string | null;
  added_by_admin?: string | null;
};

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

  memberships: CustomerMembership[];
  membershipPayments: MembershipPayment[];
  orderBonusItems: OrderBonusItem[];

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

  createOrder: (order: CreateOrderInput) => Promise<ExtendedOrder | null>;
  updateOrderStatus: (orderId: string, status: ExtendedOrder['status']) => Promise<void>;

  requestMembership: (input: MembershipRequestInput) => Promise<CustomerMembership | null>;
  activateMembership: (
    membershipId: string,
    paymentMethod?: PaymentMethod | null
  ) => Promise<void>;
  cancelMembership: (membershipId: string, notes?: string | null) => Promise<void>;
  expireMembership: (membershipId: string) => Promise<void>;
  getActiveMembershipForPhone: (phone?: string | null) => CustomerMembership | null;

  addVipGiftToOrder: (orderId: string, gift: VipGiftInput) => Promise<void>;

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

const POLLAZO_PLUS_PRICE = 6.99;
const POLLAZO_PLUS_PLAN_KEY = 'pollazo_plus';
const POLLAZO_PLUS_PLAN_NAME = 'Pollazo Plus';

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

  if (method === 'deuna' || method === 'transferencia' || method === 'tarjeta') {
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

  if (method === 'deuna' || method === 'transferencia' || method === 'tarjeta') {
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

const isMembershipCurrentlyActive = (membership?: CustomerMembership | null) => {
  if (!membership || membership.status !== 'active') return false;

  if (!membership.expires_at) return true;

  return new Date(membership.expires_at).getTime() > Date.now();
};

const findActiveMembershipByPhone = (
  membershipList: CustomerMembership[],
  phone?: string | null
) => {
  const tail = cleanPhoneTail(phone);

  if (!tail) return null;

  const matches = membershipList.filter(membership => {
    return (
      cleanPhoneTail(membership.customer_phone) === tail &&
      isMembershipCurrentlyActive(membership)
    );
  });

  if (matches.length === 0) return null;

  return [...matches].sort((a, b) => {
    return (
      new Date(b.expires_at || b.updated_at || b.created_at || '').getTime() -
      new Date(a.expires_at || a.updated_at || a.created_at || '').getTime()
    );
  })[0];
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const sendOrderPushNotification = async (
  order: ExtendedOrder,
  status: ExtendedOrder['status'],
  paymentStatus?: PaymentStatus | null
) => {
  try {
    if (!order.customer_phone) return;

    await fetch('/api/send-push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerPhone: order.customer_phone,
        orderCode: order.order_code,
        status,
        paymentStatus: paymentStatus || order.payment_status || null,
        url: '/?tracking=1',
      }),
    });
  } catch (error) {
    console.warn('⚠️ No se pudo enviar push del pedido:', error);
  }
};

const sendVipGiftPushNotification = async (
  order: ExtendedOrder,
  gift: VipGiftInput
) => {
  try {
    if (!order.customer_phone) return;

    const quantity = gift.quantity && gift.quantity > 0 ? gift.quantity : 1;
    const body =
      gift.message ||
      `Por ser parte de Pollazo Plus, agregamos ${quantity} ${gift.item_name} de regalo a tu pedido. 🎁`;

    await fetch('/api/send-push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerPhone: order.customer_phone,
        orderCode: order.order_code,
        status: order.status,
        paymentStatus: order.payment_status || null,
        title: '🎁 Sorpresa Pollazo Plus',
        body,
        url: '/?tracking=1',
        tag: `pollazo-plus-gift-${order.order_code}`,
      }),
    });
  } catch (error) {
    console.warn('⚠️ No se pudo enviar push del regalo VIP:', error);
  }
};

export function AdminProvider({ children }: { children: ReactNode }) {
  const [remoteProducts, setRemoteProducts] = useState<Product[]>([]);
  const [overrides, setOverrides] = useState<Record<string, ProductOverride>>({});
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [extraSettings, setExtraSettings] = useState<ExtraSettings>(DEFAULT_EXTRA);
  const [customers, setCustomers] = useState<ExtendedCustomer[]>([]);
  const [orders, setOrders] = useState<ExtendedOrder[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);

  const [memberships, setMemberships] = useState<CustomerMembership[]>([]);
  const [membershipPayments, setMembershipPayments] = useState<MembershipPayment[]>([]);
  const [orderBonusItems, setOrderBonusItems] = useState<OrderBonusItem[]>([]);

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

  const getActiveMembershipForPhone = useCallback(
    (phone?: string | null) => {
      return findActiveMembershipByPhone(memberships, phone);
    },
    [memberships]
  );

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const path = window.location.pathname;
      const panel = path === '/admin' ? 'admin' : path === '/repartidor' ? 'delivery' : null;
      const dataResponse = await fetch(
        panel ? `/api/panel-data?panel=${encodeURIComponent(panel)}` : '/api/public-data',
        {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
        }
      );

      const data = (await dataResponse.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        products?: Product[];
        overrides?: ProductOverride[];
        appSettings?: Array<{ key: string; value: string }>;
        settings?: Partial<ExtraSettings> | null;
        seasons?: Season[];
        customers?: ExtendedCustomer[];
        orders?: ExtendedOrder[];
        memberships?: CustomerMembership[];
        membershipPayments?: MembershipPayment[];
        orderBonusItems?: OrderBonusItem[];
      };

      if (!dataResponse.ok || !data.ok) {
        throw new Error(data.error || 'No se pudieron cargar los datos de la aplicación.');
      }

      setRemoteProducts(Array.isArray(data.products) ? data.products : []);

      const overrideMap: Record<string, ProductOverride> = {};
      (Array.isArray(data.overrides) ? data.overrides : []).forEach(row => {
        if (!row?.id) return;
        overrideMap[row.id] = {
          id: row.id,
          price: row.price ?? null,
          available: row.available !== false,
        };
      });
      setOverrides(overrideMap);

      const nextSettings: AppSettings = { ...DEFAULT_SETTINGS };
      const prizeSettings: Partial<ExtraSettings> = {};

      (Array.isArray(data.appSettings) ? data.appSettings : []).forEach(setting => {
        if (!setting?.key) return;

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

      setSettings(nextSettings);
      document.documentElement.style.setProperty(
        '--pollazo-primary',
        nextSettings.primary_color
      );
      setExtraSettings({
        ...DEFAULT_EXTRA,
        ...(data.settings || {}),
        ...prizeSettings,
      });
      setSeasons(Array.isArray(data.seasons) ? data.seasons : []);

      if (panel) {
        setCustomers(Array.isArray(data.customers) ? data.customers : []);
        setOrders(Array.isArray(data.orders) ? data.orders : []);
        setMemberships(Array.isArray(data.memberships) ? data.memberships : []);
        setMembershipPayments(
          Array.isArray(data.membershipPayments) ? data.membershipPayments : []
        );
        setOrderBonusItems(
          Array.isArray(data.orderBonusItems) ? data.orderBonusItems : []
        );
      } else {
        setCustomers([]);
        setMemberships([]);
        setMembershipPayments([]);
        setOrderBonusItems([]);

        const credentials = getOrderCredentials();
        const ordersResponse = await fetch('/api/customer-orders', {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ credentials }),
        });
        const ordersPayload = (await ordersResponse.json().catch(() => ({}))) as {
          ok?: boolean;
          orders?: ExtendedOrder[];
        };

        setOrders(
          ordersResponse.ok && ordersPayload.ok && Array.isArray(ordersPayload.orders)
            ? ordersPayload.orders
            : []
        );
      }
    } catch (error) {
      console.error('❌ Error cargando datos protegidos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const panel =
      window.location.pathname === '/admin'
        ? 'admin'
        : window.location.pathname === '/repartidor'
          ? 'delivery'
          : null;

    const refresh = () => {
      if (document.visibilityState === 'visible') {
        void load();
      }
    };

    const interval = window.setInterval(
      refresh,
      panel === 'delivery' ? 5000 : panel === 'admin' ? 10000 : 60000
    );

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
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
      const clean = normalizeEcuadorPhone(phone);

      if (!clean) return null;

      const now = new Date().toISOString();

      const payload: Record<string, unknown> = {
        phone: clean,
        updated_at: now,
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

      const activeMembership = findActiveMembershipByPhone(memberships, clean);

      if (activeMembership) {
        payload.membership_status = 'active';
        payload.membership_plan = activeMembership.plan_name;
        payload.membership_started_at = activeMembership.started_at || null;
        payload.membership_expires_at = activeMembership.expires_at || null;
        payload.membership_updated_at = now;
      }

      if (!isSupabaseConfigured) {
        return null;
      }

      const existingCustomer = findBestCustomerByPhone(customers, clean);

      if (existingCustomer?.id) {
        const updatePayload = { ...payload };

        delete updatePayload.phone;

        const { data, error } = await supabase
          .from('customers')
          .update(updatePayload)
          .eq('id', existingCustomer.id)
          .select()
          .maybeSingle();

        if (error) {
          console.error('❌ Error actualizando cliente existente:', error);
          return null;
        }

        await load();

        return data as ExtendedCustomer | null;
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
    [customers, load, memberships]
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

  const requestMembership = useCallback(
    async (input: MembershipRequestInput) => {
      const clean = normalizeEcuadorPhone(input.customerPhone);

      if (!clean || !isSupabaseConfigured) return null;

      const active = findActiveMembershipByPhone(memberships, clean);

      if (active) {
        return active;
      }

      const pending = memberships.find(membership => {
        return (
          cleanPhoneTail(membership.customer_phone) === cleanPhoneTail(clean) &&
          membership.status === 'pending'
        );
      });

      if (pending) {
        return pending;
      }

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('customer_memberships')
        .insert({
          customer_phone: clean,
          customer_name: input.customerName || null,
          plan_key: POLLAZO_PLUS_PLAN_KEY,
          plan_name: POLLAZO_PLUS_PLAN_NAME,
          status: 'pending',
          price: POLLAZO_PLUS_PRICE,
          payment_method: input.paymentMethod,
          payment_status: 'pendiente',
          notes: input.notes || null,
          created_at: now,
          updated_at: now,
        })
        .select()
        .maybeSingle();

      if (error) {
        console.error('❌ Error solicitando membresía:', error);
        throw error;
      }

      if (data) {
        const { error: paymentError } = await supabase
          .from('membership_payments')
          .insert({
            membership_id: data.id,
            customer_phone: clean,
            customer_name: input.customerName || null,
            amount: POLLAZO_PLUS_PRICE,
            payment_method: input.paymentMethod,
            payment_status: 'pendiente',
            notes: input.notes || null,
            created_at: now,
            updated_at: now,
          });

        if (paymentError) {
          console.error('❌ Error registrando pago de membresía:', paymentError);
        }
      }

      await load();

      return data as CustomerMembership | null;
    },
    [load, memberships]
  );

  const activateMembership = useCallback(
    async (membershipId: string, paymentMethod?: PaymentMethod | null) => {
      if (!isSupabaseConfigured) return;

      const membership = memberships.find(item => item.id === membershipId);

      if (!membership) return;

      const nowDate = new Date();
      const now = nowDate.toISOString();
      const expiresAt = addDays(nowDate, 30).toISOString();
      const clean = normalizeEcuadorPhone(membership.customer_phone);

      await supabase
        .from('customer_memberships')
        .update({
          status: 'expired',
          updated_at: now,
        })
        .eq('customer_phone', membership.customer_phone)
        .eq('status', 'active')
        .neq('id', membershipId);

      const { error } = await supabase
        .from('customer_memberships')
        .update({
          status: 'active',
          started_at: now,
          expires_at: expiresAt,
          payment_method: paymentMethod || membership.payment_method || 'efectivo',
          payment_status: 'confirmado',
          updated_at: now,
        })
        .eq('id', membershipId);

      if (error) {
        console.error('❌ Error activando membresía:', error);
        throw error;
      }

      const { error: paymentError } = await supabase
        .from('membership_payments')
        .update({
          payment_status: 'confirmado',
          payment_method: paymentMethod || membership.payment_method || 'efectivo',
          period_start: now,
          period_end: expiresAt,
          confirmed_at: now,
          confirmed_by: 'admin',
          updated_at: now,
        })
        .eq('membership_id', membershipId);

      if (paymentError) {
        console.warn('⚠️ No se pudo confirmar pago de membresía:', paymentError);
      }

      const existingCustomer = findBestCustomerByPhone(customers, clean);

      if (existingCustomer?.id) {
        const { error: customerError } = await supabase
          .from('customers')
          .update({
            membership_status: 'active',
            membership_plan: POLLAZO_PLUS_PLAN_NAME,
            membership_started_at: now,
            membership_expires_at: expiresAt,
            membership_updated_at: now,
            is_vip: true,
            updated_at: now,
          })
          .eq('id', existingCustomer.id);

        if (customerError) {
          console.warn('⚠️ No se pudo actualizar cliente con membresía:', customerError);
        }
      } else if (clean) {
        const { error: customerUpsertError } = await supabase
          .from('customers')
          .upsert(
            {
              phone: clean,
              name: membership.customer_name || null,
              points: 0,
              exp: 0,
              is_vip: true,
              membership_status: 'active',
              membership_plan: POLLAZO_PLUS_PLAN_NAME,
              membership_started_at: now,
              membership_expires_at: expiresAt,
              membership_updated_at: now,
              updated_at: now,
            },
            { onConflict: 'phone' }
          );

        if (customerUpsertError) {
          console.warn('⚠️ No se pudo crear cliente con membresía:', customerUpsertError);
        }
      }

      await load();
    },
    [customers, load, memberships]
  );

  const cancelMembership = useCallback(
    async (membershipId: string, notes?: string | null) => {
      if (!isSupabaseConfigured) return;

      const membership = memberships.find(item => item.id === membershipId);
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('customer_memberships')
        .update({
          status: 'cancelled',
          notes: notes || membership?.notes || null,
          updated_at: now,
        })
        .eq('id', membershipId);

      if (error) {
        console.error('❌ Error cancelando membresía:', error);
        throw error;
      }

      if (membership) {
        const existingCustomer = findBestCustomerByPhone(customers, membership.customer_phone);

        if (existingCustomer?.id) {
          await supabase
            .from('customers')
            .update({
              membership_status: 'cancelled',
              membership_plan: membership.plan_name,
              membership_updated_at: now,
              updated_at: now,
            })
            .eq('id', existingCustomer.id);
        }
      }

      await load();
    },
    [customers, load, memberships]
  );

  const expireMembership = useCallback(
    async (membershipId: string) => {
      if (!isSupabaseConfigured) return;

      const membership = memberships.find(item => item.id === membershipId);
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('customer_memberships')
        .update({
          status: 'expired',
          updated_at: now,
        })
        .eq('id', membershipId);

      if (error) {
        console.error('❌ Error venciendo membresía:', error);
        throw error;
      }

      if (membership) {
        const existingCustomer = findBestCustomerByPhone(customers, membership.customer_phone);

        if (existingCustomer?.id) {
          await supabase
            .from('customers')
            .update({
              membership_status: 'expired',
              membership_plan: membership.plan_name,
              membership_updated_at: now,
              updated_at: now,
            })
            .eq('id', existingCustomer.id);
        }
      }

      await load();
    },
    [customers, load, memberships]
  );

  const createOrder = useCallback(
    async (order: CreateOrderInput): Promise<ExtendedOrder | null> => {
      const idempotencyKey = String(order.order_code || '').trim();

      if (!idempotencyKey) {
        throw new Error('No se pudo generar la clave segura del pedido.');
      }

      const customerPhone = normalizeEcuadorPhone(order.customer_phone);
      const customer = findBestCustomerByPhone(customers, customerPhone);
      const items = Array.isArray(order.items) ? order.items : [];

      const response = await fetch('/api/create-order', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idempotencyKey,
          customerPhone,
          customerName: customer?.name || null,
          items: items.map(item => ({
            productId:
              item.product_id ||
              item.product?.id ||
              item.cart_item_id ||
              item.id ||
              '',
            quantity: Number(item.quantity || 1),
            customPrice:
              typeof item.custom_price === 'number'
                ? item.custom_price
                : typeof item.product?.custom_price === 'number'
                  ? item.product.custom_price
                  : null,
          })),
          paymentMethod: order.payment_method,
          deliveryType: order.delivery_type || 'domicilio',
          lat: typeof order.lat === 'number' ? order.lat : Number(order.lat),
          lng: typeof order.lng === 'number' ? order.lng : Number(order.lng),
          reference: order.reference || null,
        }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        order?: ExtendedOrder;
        trackingToken?: string;
        minimumOrder?: number;
        storeClosed?: boolean;
      };

      if (!response.ok || !result.ok || !result.order) {
        const error = new Error(result.error || 'No se pudo registrar el pedido de forma segura.');
        Object.assign(error, {
          status: response.status,
          minimumOrder: result.minimumOrder,
          storeClosed: result.storeClosed,
        });
        throw error;
      }

      if (result.trackingToken) {
        saveOrderCredential(result.order.order_code, result.trackingToken);
      }

      setOrders(prev => {
        const withoutDuplicate = prev.filter(item => item.id !== result.order?.id);
        return result.order ? [result.order, ...withoutDuplicate] : withoutDuplicate;
      });

      return result.order;
    },
    [customers]
  );

  const countOrderForMetricsAndCustomer = useCallback(
    async (order: ExtendedOrder) => {
      if (!isSupabaseConfigured) return;

      const cleanCustomerPhone = normalizeEcuadorPhone(order.customer_phone);
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

      const currentCustomer = findBestCustomerByPhone(customers, cleanCustomerPhone);

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

      if (currentOrder) {
        void sendOrderPushNotification(
          { ...currentOrder, ...patch },
          status,
          paymentStatus
        );
      }

      await load();
    },
    [countOrderForMetricsAndCustomer, load, orders]
  );

  const addVipGiftToOrder = useCallback(
    async (orderId: string, gift: VipGiftInput) => {
      if (!isSupabaseConfigured) return;

      const currentOrder = orders.find(order => order.id === orderId);

      if (!currentOrder) return;

      const now = new Date().toISOString();
      const quantity = gift.quantity && gift.quantity > 0 ? gift.quantity : 1;

      const giftPayload = {
        order_id: currentOrder.id,
        order_code: currentOrder.order_code,
        customer_phone: currentOrder.customer_phone,
        item_name: gift.item_name.trim(),
        quantity,
        reason: gift.reason || 'Regalo Pollazo Plus',
        message:
          gift.message ||
          `Te agregamos ${quantity} ${gift.item_name.trim()} de regalo por ser parte de Pollazo Plus 🎁`,
        added_by_admin: gift.added_by_admin || 'admin',
        created_at: now,
      };

      if (!giftPayload.item_name) return;

      const { data, error } = await supabase
        .from('order_bonus_items')
        .insert(giftPayload)
        .select()
        .maybeSingle();

      if (error) {
        console.error('❌ Error agregando regalo VIP:', error);
        throw error;
      }

      const nextGift = (data || giftPayload) as OrderBonusItem;
      const nextBonusItems = [
        ...(Array.isArray(currentOrder.bonus_items) ? currentOrder.bonus_items : []),
        nextGift,
      ];

      const { error: orderError } = await supabase
        .from('orders')
        .update({
          bonus_items: nextBonusItems,
          vip_gift_message: nextGift.message || giftPayload.message,
          updated_at: now,
        })
        .eq('id', currentOrder.id);

      if (orderError) {
        console.error('❌ Error actualizando pedido con regalo VIP:', orderError);
        throw orderError;
      }

      setOrders(prev =>
        prev.map(order =>
          order.id === currentOrder.id
            ? {
                ...order,
                bonus_items: nextBonusItems,
                vip_gift_message: nextGift.message || giftPayload.message,
                updated_at: now,
              }
            : order
        )
      );

      void sendVipGiftPushNotification(currentOrder, {
        ...gift,
        item_name: giftPayload.item_name,
        quantity,
        message: nextGift.message || giftPayload.message,
      });

      await load();
    },
    [load, orders]
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

        memberships,
        membershipPayments,
        orderBonusItems,

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

        requestMembership,
        activateMembership,
        cancelMembership,
        expireMembership,
        getActiveMembershipForPhone,

        addVipGiftToOrder,

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
