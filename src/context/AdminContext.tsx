import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { products as seedProducts, categories as seedCategories } from '../data/products';
import { getOrderCredentials, saveOrderCredential } from '../utils/orderCredentials';
import { runPanelAction } from '../utils/panelApi';
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
  const loadInFlightRef = useRef<Promise<void> | null>(null);

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
    if (loadInFlightRef.current) {
      return loadInFlightRef.current;
    }

    const request = (async () => {
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
        loadInFlightRef.current = null;
      }
    })();

    loadInFlightRef.current = request;
    return request;
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

    try {
      await runPanelAction('update_setting', { key, value });
    } catch (error) {
      await load();
      throw error;
    }
  }, [load]);

  const updateExtraSettings = useCallback(
    async (patch: Partial<ExtraSettings>) => {
      setExtraSettings(prev => ({ ...prev, ...patch }));

      try {
        await runPanelAction('update_extra_settings', { patch });
        await load();
      } catch (error) {
        await load();
        throw error;
      }
    },
    [load]
  );

  const finalizeSeason = useCallback(
    async (name: string, prize: string, winners: any[]) => {
      await runPanelAction('finalize_season', { name, prize, winners });
      await load();
    },
    [load]
  );

  const deleteSeason = useCallback(
    async (id: string) => {
      await runPanelAction('delete_season', { id });
      await load();
    },
    [load]
  );

  const toggleSeasonVisibility = useCallback(
    async (id: string, published: boolean) => {
      await runPanelAction('toggle_season', { id, published });
      await load();
    },
    [load]
  );

  const updateSeasonWinners = useCallback(
    async (id: string, winners: any[]) => {
      await runPanelAction('update_season_winners', { id, winners });
      await load();
    },
    [load]
  );

  const setOverride = useCallback(
    async (id: string, patch: Partial<Omit<ProductOverride, 'id'>>) => {
      const current = overrides[id] ?? { id, price: null, available: true };
      const updated: ProductOverride = {
        ...current,
        ...patch,
        id,
        available: patch.available ?? current.available ?? true,
      };

      setOverrides(prev => ({ ...prev, [id]: updated }));

      try {
        await runPanelAction('set_product_override', { ...updated });
      } catch (error) {
        await load();
        throw error;
      }
    },
    [load, overrides]
  );

  const addProduct = useCallback(async (product: Omit<Product, 'id'> & { id?: string }) => {
    const newProduct = normalizeProduct({
      ...product,
      id: product.id || slug(product.name),
    } as Product);

    setRemoteProducts(prev => [
      newProduct,
      ...prev.filter(item => item.id !== newProduct.id),
    ]);

    try {
      await runPanelAction<Product>('upsert_product', { product: newProduct });
    } catch (error) {
      await load();
      throw error;
    }
  }, [load]);

  const updateProduct = useCallback(
    async (id: string, patch: Partial<Product>) => {
      const baseProduct =
        remoteProducts.find(product => product.id === id) ||
        seedProducts.find(product => product.id === id);

      const nextProduct = normalizeProduct({
        ...(baseProduct || {
          id,
          name: patch.name || id,
          category: patch.category || 'Pollos',
        }),
        ...patch,
        id,
      } as Product);

      setRemoteProducts(prev => [
        nextProduct,
        ...prev.filter(product => product.id !== id),
      ]);

      try {
        await runPanelAction<Product>('upsert_product', { product: nextProduct });
      } catch (error) {
        await load();
        throw error;
      }
    },
    [load, remoteProducts]
  );

  const deleteProduct = useCallback(async (id: string) => {
    const seedProduct = seedProducts.find(product => product.id === id);

    if (seedProduct) {
      const hiddenProduct = normalizeProduct({ ...seedProduct, available: false } as Product);
      setRemoteProducts(prev => [hiddenProduct, ...prev.filter(product => product.id !== id)]);
      await runPanelAction('upsert_product', { product: hiddenProduct });
      return;
    }

    setRemoteProducts(prev => prev.filter(product => product.id !== id));

    try {
      await runPanelAction('delete_product', { id });
    } catch (error) {
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
      if (window.location.pathname !== '/admin') return null;

      const clean = normalizeEcuadorPhone(phone);
      if (!clean) return null;

      const existingCustomer = findBestCustomerByPhone(customers, clean);
      const customer = {
        phone: clean,
        name: name ?? existingCustomer?.name ?? null,
        avatar_url: avatar_url ?? existingCustomer?.avatar_url ?? null,
        lat: locationPatch?.lat ?? existingCustomer?.lat ?? null,
        lng: locationPatch?.lng ?? existingCustomer?.lng ?? null,
        reference: locationPatch?.reference ?? existingCustomer?.reference ?? null,
      };

      const data = await runPanelAction<ExtendedCustomer | null>('upsert_customer', {
        id: existingCustomer?.id || null,
        customer,
      });
      await load();
      return data;
    },
    [customers, load]
  );

  const addCustomerPoints = useCallback(
    async (customerId: string, pointsToAdd: number) => {
      await runPanelAction('add_customer_points', {
        id: customerId,
        points: Math.max(0, pointsToAdd),
      });
      await load();
    },
    [load]
  );

  const resetSeasonPoints = useCallback(async () => {
    await runPanelAction('reset_season_points');
    await load();
  }, [load]);

  const requestMembership = useCallback(
    async (input: MembershipRequestInput) => {
      const response = await fetch('/api/request-membership', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        membership?: CustomerMembership;
      };

      if (!response.ok || !result.ok || !result.membership) {
        throw new Error(result.error || 'No se pudo solicitar Pollazo Plus.');
      }

      if (window.location.pathname === '/admin') {
        await load();
      }

      return result.membership;
    },
    [load]
  );

  const activateMembership = useCallback(
    async (membershipId: string, paymentMethod?: PaymentMethod | null) => {
      await runPanelAction('activate_membership', { membershipId, paymentMethod });
      await load();
    },
    [load]
  );

  const cancelMembership = useCallback(
    async (membershipId: string, notes?: string | null) => {
      if (window.location.pathname !== '/admin') {
        throw new Error('La cancelación debe ser revisada por el administrador.');
      }
      await runPanelAction('cancel_membership', { membershipId, notes });
      await load();
    },
    [load]
  );

  const expireMembership = useCallback(
    async (membershipId: string) => {
      await runPanelAction('expire_membership', { membershipId });
      await load();
    },
    [load]
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


  const updateOrderStatus = useCallback(
    async (orderId: string, status: ExtendedOrder['status']) => {
      const currentOrder = orders.find(order => order.id === orderId);
      const result = await runPanelAction<{ order: ExtendedOrder }>('transition_order', {
        orderId,
        status,
      });

      if (result.order) {
        setOrders(prev =>
          prev.map(order => (order.id === orderId ? result.order : order))
        );

        if (currentOrder) {
          void sendOrderPushNotification(
            result.order,
            result.order.status,
            result.order.payment_status || currentOrder.payment_status || 'pendiente'
          );
        }
      }

      await load();
    },
    [load, orders]
  );

  const addVipGiftToOrder = useCallback(
    async (orderId: string, gift: VipGiftInput) => {
      const result = await runPanelAction<{
        gift: OrderBonusItem;
        order: ExtendedOrder;
      }>('add_vip_gift', { orderId, gift });

      if (result.order) {
        setOrders(prev =>
          prev.map(order => (order.id === orderId ? result.order : order))
        );
      }

      const currentOrder = orders.find(order => order.id === orderId);
      if (currentOrder && result.gift) {
        void sendVipGiftPushNotification(currentOrder, {
          ...gift,
          item_name: result.gift.item_name,
          quantity: result.gift.quantity,
          message: result.gift.message || gift.message,
        });
      }

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
