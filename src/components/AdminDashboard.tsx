import { useCallback, useEffect, useMemo, useRef, useState, Component } from 'react';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Edit3,
  LogOut,
  Package,
  Plus,
  Send,
  Trash2,
  Users,
  Image,
  Trophy,
  Clock,
  PackageSearch,
  RefreshCw,
  Save,
  X,
  History,
  Zap,
  MapPin,
  Search,
  Banknote,
  QrCode,
  Building,
  Crown,
  Medal,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Truck,
  ClipboardList,
  Filter,
  DollarSign,
  MessageCircle,
  Route,
  PlayCircle,
  PauseCircle,
  ShieldCheck,
  CalendarDays,
  BarChart3,
  ReceiptText,
  Wallet,
  CreditCard,
  Copy,
  TrendingUp,
  Home,
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Category, OrderStatus, PaymentStatus } from '../types';
import { buildStatusWhatsAppUrl } from '../utils/whatsapp';
import { logoutPanelSession } from '../utils/panelSession';
import AdminPlusPanel from './AdminPlusPanel';


const TABS = [
  { id: 'overview', label: 'Inicio', Icon: Home },
  { id: 'orders', label: 'Pedidos', Icon: Send },
  { id: 'cash', label: 'Caja', Icon: ReceiptText },
  { id: 'plus', label: 'Plus', Icon: Crown },
  { id: 'products', label: 'Menú', Icon: Package },
  { id: 'customers', label: 'Clientes', Icon: Users },
  { id: 'ranking_config', label: 'Concurso', Icon: Trophy },
  { id: 'branding', label: 'Marca', Icon: Image },
] as const;

type TabId = (typeof TABS)[number]['id'];

type OrderBucket =
  | 'waiting'
  | 'confirmed'
  | 'preparing'
  | 'sent'
  | 'delivered'
  | 'cancelled'
  | 'all';

type AdminAlertKind = 'new_order' | 'ready_order' | 'payment_ready';

interface AdminAlert {
  id: string;
  orderId?: string;
  kind: AdminAlertKind;
  title: string;
  message: string;
  createdAt: number;
}

type MethodKey = 'efectivo' | 'deuna' | 'transferencia' | 'tarjeta' | 'otro';

interface MethodTotal {
  key: MethodKey;
  label: string;
  value: number;
  count: number;
  Icon: LucideIcon;
  tone: 'orange' | 'green' | 'blue' | 'yellow' | 'slate';
}

const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  'Por Confirmar',
  'Recibido',
  'Preparando',
  'Enviado',
  'Entregado',
  'Cancelado',
];

const ORDER_BUCKETS: Array<{
  id: OrderBucket;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  statuses?: OrderStatus[];
}> = [
  {
    id: 'waiting',
    label: 'En espera',
    shortLabel: 'Espera',
    icon: AlertTriangle,
    statuses: ['Por Confirmar'],
  },
  {
    id: 'confirmed',
    label: 'Confirmados',
    shortLabel: 'Confirm.',
    icon: ClipboardList,
    statuses: ['Recibido'],
  },
  {
    id: 'preparing',
    label: 'Preparando',
    shortLabel: 'Prep.',
    icon: Package,
    statuses: ['Preparando'],
  },
  {
    id: 'sent',
    label: 'En camino',
    shortLabel: 'Camino',
    icon: Truck,
    statuses: ['Enviado'],
  },
  {
    id: 'delivered',
    label: 'Entregados',
    shortLabel: 'OK',
    icon: CheckCircle2,
    statuses: ['Entregado'],
  },
  {
    id: 'cancelled',
    label: 'Cancelados',
    shortLabel: 'Cancel.',
    icon: X,
    statuses: ['Cancelado'],
  },
  {
    id: 'all',
    label: 'Todos',
    shortLabel: 'Todos',
    icon: Filter,
  },
];

const SUBCATEGORIES_MAP: Record<Category, string[]> = {
  Pollos: ['Enteros', 'Por Presas', 'Asados y Broaster', 'Menudencias'],
  Embutidos: ['Salchichas', 'Chorizos', 'Jamones', 'Mortadelas'],
  'Lácteos y refrigerados': ['Quesos', 'Leches', 'Yogures', 'Mantequillas y Cremas'],
  'Abarrotes y básicos': ['Arroz y Fideos', 'Aceites', 'Enlatados', 'Azúcar y Sal', 'Harinas'],
  'Salsas, aliños y aceites': ['Salsas Finas', 'Aliños Caseros', 'Vinagres y Aderezos'],
  Bebidas: ['Gaseosas', 'Jugos y Maltas', 'Aguas', 'Energizantes'],
  'Frutas y verduras': ['Frutas', 'Verduras', 'Hierbas y Legumbres'],
  'Snacks y dulces': ['Papas y Platanitos', 'Galletas', 'Chocolates y Caramelos'],
  'Cuidado personal': ['Champú y Jabón', 'Cremas', 'Desodorantes y Cuidado'],
  'Limpieza y hogar': ['Detergentes', 'Desinfectantes', 'Papel Higiénico y Toallas', 'Velas y Fósforos'],
};

class AdminErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: unknown; info: any }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, error, info: null };
  }

  componentDidCatch(error: unknown, info: any) {
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-white font-sans">
          <div className="bg-red-500/10 border border-red-500/50 p-8 rounded-[32px] max-w-2xl w-full shadow-[0_0_50px_rgba(239,68,68,0.2)]">
            <h1 className="text-3xl font-black text-red-500 uppercase italic tracking-widest mb-2 flex items-center gap-3">
              <Zap /> Cortocircuito Detectado
            </h1>
            <p className="text-gray-400 text-sm mb-6">
              El panel evitó la pantalla blanca. Error detectado:
            </p>
            <div className="bg-black p-5 rounded-2xl text-xs font-mono text-red-300 overflow-x-auto shadow-inner border border-white/5">
              <p className="font-black text-white text-sm mb-2">
                {String(this.state.error)}
              </p>
              <pre className="opacity-70">{this.state.info?.componentStack}</pre>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] active:scale-95 transition-transform shadow-lg shadow-red-600/30"
            >
              Reintentar Conexión
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const toNumber = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const raw = String(value || '').trim();

  if (!raw) return 0;

  const normalized = raw
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');

  const numeric = Number.parseFloat(normalized);

  return Number.isFinite(numeric) ? numeric : 0;
};

const money = (value: unknown) => {
  return toNumber(value).toFixed(2);
};

const cleanPhone = (phone?: string | null) => (phone || '').replace(/\D/g, '');

const prettyPhone = (phone?: string | null) => {
  const clean = cleanPhone(phone);

  if (!clean) return 'Sin teléfono';

  if (clean.length >= 10) {
    return `+${clean}`;
  }

  return clean;
};

const whatsappLink = (phone?: string | null) => {
  const clean = cleanPhone(phone);
  return clean ? `https://wa.me/${clean}` : '#';
};

const isToday = (value?: string | null) => {
  if (!value) return false;

  const date = new Date(value);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

const isThisMonth = (value?: string | null) => {
  if (!value) return false;

  const date = new Date(value);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
};

const isValidCoordinate = (value: unknown) => {
  const number = toNumber(value);
  return Number.isFinite(number) && number !== 0;
};

const toDateTimeLocalValue = (value?: string | null) => {
  if (!value) return '';

  if (value.includes('T')) {
    return value.slice(0, 16);
  }

  return value;
};

const formatProductPrice = (product: {
  price?: string | number | null;
  is_variable?: boolean;
}) => {
  if (product.is_variable) return 'VALOR VARIABLE';

  const raw = String(product.price || '').trim();

  if (!raw || raw.toLowerCase().includes('consultar')) {
    return 'A CONSULTAR';
  }

  return `$${money(raw)}`;
};

const paymentIcon = (method?: string | null) => {
  if (method === 'efectivo') return <Banknote size={13} />;
  if (method === 'deuna') return <QrCode size={13} />;
  if (method === 'transferencia') return <Building size={13} />;
  if (method === 'tarjeta') return <CreditCard size={13} />;
  return <PackageSearch size={13} />;
};

const paymentLabel = (method?: string | null) => {
  if (method === 'efectivo') return 'Efectivo';
  if (method === 'deuna') return 'Deuna';
  if (method === 'transferencia') return 'Transferencia';
  if (method === 'tarjeta') return 'Tarjeta';
  return 'No definido';
};

const paymentStatusLabel = (status?: PaymentStatus | string | null) => {
  if (status === 'pendiente') return 'Pendiente';
  if (status === 'validando') return 'Validando pago';
  if (status === 'confirmado') return 'Pago confirmado';
  if (status === 'rechazado') return 'Pago rechazado';
  if (status === 'contra_entrega') return 'Contra entrega';
  return 'Sin estado';
};

const paymentStatusTone = (status?: PaymentStatus | string | null) => {
  if (status === 'confirmado') return 'bg-green-50 text-green-600 border-green-100';
  if (status === 'validando') return 'bg-blue-50 text-blue-600 border-blue-100';
  if (status === 'contra_entrega') return 'bg-orange-50 text-orange-600 border-orange-100';
  if (status === 'rechazado') return 'bg-red-50 text-red-500 border-red-100';
  return 'bg-gray-50 text-gray-500 border-gray-100';
};

const getStatusTone = (status?: OrderStatus) => {
  if (status === 'Por Confirmar') {
    return 'bg-orange-50 text-orange-600 border-orange-200';
  }

  if (status === 'Recibido') {
    return 'bg-slate-50 text-slate-600 border-slate-200';
  }

  if (status === 'Preparando') {
    return 'bg-blue-50 text-blue-600 border-blue-200';
  }

  if (status === 'Enviado') {
    return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  }

  if (status === 'Entregado') {
    return 'bg-green-50 text-green-600 border-green-200';
  }

  if (status === 'Cancelado') {
    return 'bg-red-50 text-red-500 border-red-100';
  }

  return 'bg-gray-50 text-gray-400 border-gray-200';
};

const getStatusHelp = (status?: OrderStatus) => {
  if (status === 'Por Confirmar') return 'Revisar disponibilidad/pago';
  if (status === 'Recibido') return 'Pedido aceptado';
  if (status === 'Preparando') return 'Armando pedido';
  if (status === 'Enviado') return 'En ruta';
  if (status === 'Entregado') return 'Venta completada';
  if (status === 'Cancelado') return 'No se realizará';
  return 'Sin estado';
};

const productTextOfOrder = (order: any) => {
  return (order?.items || [])
    .map((item: any) => item?.name || item?.product?.name || 'Producto')
    .join(' ');
};

const triggerAdminVibration = () => {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([90, 55, 90, 55, 140]);
    }
  } catch {
    // Vibración opcional.
  }
};

const isValidSaleOrder = (order: any) => {
  return order?.status !== 'Cancelado' && order?.status !== 'Por Confirmar';
};

const getMethodKey = (method?: string | null): MethodKey => {
  if (method === 'efectivo') return 'efectivo';
  if (method === 'deuna') return 'deuna';
  if (method === 'transferencia') return 'transferencia';
  if (method === 'tarjeta') return 'tarjeta';
  return 'otro';
};

const buildMethodTotals = (orders: any[]): MethodTotal[] => {
  const base: Record<MethodKey, MethodTotal> = {
    efectivo: {
      key: 'efectivo',
      label: 'Efectivo',
      value: 0,
      count: 0,
      Icon: Banknote,
      tone: 'green',
    },
    deuna: {
      key: 'deuna',
      label: 'Deuna',
      value: 0,
      count: 0,
      Icon: QrCode,
      tone: 'blue',
    },
    transferencia: {
      key: 'transferencia',
      label: 'Transferencia',
      value: 0,
      count: 0,
      Icon: Building,
      tone: 'orange',
    },
    tarjeta: {
      key: 'tarjeta',
      label: 'Tarjeta',
      value: 0,
      count: 0,
      Icon: CreditCard,
      tone: 'yellow',
    },
    otro: {
      key: 'otro',
      label: 'Otro',
      value: 0,
      count: 0,
      Icon: Wallet,
      tone: 'slate',
    },
  };

  orders.forEach(order => {
    const key = getMethodKey(order.payment_method);

    base[key].value += toNumber(order.total);
    base[key].count += 1;
  });

  return Object.values(base);
};

const getTopProducts = (orders: any[], limit = 6) => {
  const map = new Map<string, { name: string; quantity: number; sales: number }>();

  orders.forEach(order => {
    (order.items || []).forEach((item: any) => {
      const name = item?.name || item?.product?.name || 'Producto';
      const quantity = Number(item?.quantity || 1);
      const unitPrice = toNumber(item?.custom_price || item?.price || item?.product?.price || 0);
      const subtotal = toNumber(item?.subtotal || unitPrice * quantity);

      const current = map.get(name) || {
        name,
        quantity: 0,
        sales: 0,
      };

      current.quantity += quantity;
      current.sales += subtotal;

      map.set(name, current);
    });
  });

  return Array.from(map.values())
    .sort((a, b) => {
      if (b.quantity !== a.quantity) return b.quantity - a.quantity;
      return b.sales - a.sales;
    })
    .slice(0, limit);
};

function StatCard({
  label,
  value,
  detail,
  Icon,
  tone = 'orange',
}: {
  label: string;
  value: string | number;
  detail?: string;
  Icon: LucideIcon;
  tone?: 'orange' | 'green' | 'blue' | 'yellow' | 'red' | 'slate';
}) {
  const tones = {
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    red: 'bg-red-50 text-red-500 border-red-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
  };

  return (
    <div className="bg-white rounded-[28px] border border-gray-100 p-4 shadow-sm min-w-[140px]">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border mb-3 ${tones[tone]}`}>
        <Icon size={18} />
      </div>
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">
        {label}
      </p>
      <p className="text-2xl font-black text-gray-900 mt-2 leading-none">
        {value}
      </p>
      {detail && (
        <p className="text-[9px] font-bold text-gray-400 mt-2 leading-tight">
          {detail}
        </p>
      )}
    </div>
  );
}

function MethodCard({ item }: { item: MethodTotal }) {
  const tones = {
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
  };

  const Icon = item.Icon;

  return (
    <div className="bg-white rounded-[28px] border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${tones[item.tone]}`}>
          <Icon size={20} />
        </div>

        <span className="text-[9px] font-black uppercase px-2 py-1 rounded-full bg-gray-50 text-gray-400 border border-gray-100">
          {item.count} pedido{item.count !== 1 ? 's' : ''}
        </span>
      </div>

      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-4">
        {item.label}
      </p>

      <p className="text-2xl font-black text-gray-900 mt-1">
        ${money(item.value)}
      </p>
    </div>
  );
}

function AdminDashboardContent() {
  const context = useAdmin();

  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');
  const [orderBucket, setOrderBucket] = useState<OrderBucket>('waiting');
  const [points, setPoints] = useState<Record<string, string>>({});
  const [savingBranding, setSavingBranding] = useState(false);
  const [savingSeason, setSavingSeason] = useState(false);
  const [resettingPoints, setResettingPoints] = useState(false);
  const [activeAlert, setActiveAlert] = useState<AdminAlert | null>(null);
  const [copiedCashSummary, setCopiedCashSummary] = useState(false);

  const orderSnapshotRef = useRef<Map<string, { status?: OrderStatus; paymentStatus?: string | null }>>(new Map());
  const initializedOrderWatcherRef = useRef(false);
  const alertAudioRef = useRef<AudioContext | null>(null);

  const [draft, setDraft] = useState({
    name: '',
    category: 'Pollos' as Category,
    subcategory: 'Enteros',
    price: '',
    description: '',
    image: '',
    available: true,
    is_variable: false,
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  const safeProducts = context?.products || [];
  const safeCustomers = context?.customers || [];
  const safeOrders = context?.orders || [];
  const safeSeasons = context?.seasons || [];
  const safeExtraSettings = context?.extraSettings || {
    logo_url: '/logo-final.png',
    ranking_title: '',
    prize_description: '',
    ranking_end_date: '',
    winner_photo_url: '',
    prize_1: '',
    prize_2: '',
    prize_3: '',
    event_active: true,
  };
  const safeSettings = context?.settings || {
    announcement: '',
    primary_color: '#E67E22',
    banner_link: '',
  };

  const seasonActive = safeExtraSettings.event_active !== false;

  const playAdminAlertSound = useCallback((kind: AdminAlertKind) => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextClass) return;

      if (alertAudioRef.current) {
        alertAudioRef.current.close().catch(() => undefined);
        alertAudioRef.current = null;
      }

      const ctx = new AudioContextClass();
      alertAudioRef.current = ctx;

      const notes =
        kind === 'new_order'
          ? [523.25, 659.25, 783.99]
          : kind === 'ready_order'
            ? [440, 587.33, 698.46]
            : [493.88, 659.25, 880];

      notes.forEach((frequency, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + index * 0.12;
        const duration = 0.18;

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.08, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

        osc.start(start);
        osc.stop(start + duration);
      });

      window.setTimeout(() => {
        if (alertAudioRef.current) {
          alertAudioRef.current.close().catch(() => undefined);
          alertAudioRef.current = null;
        }
      }, 900);
    } catch {
      // Sonido opcional.
    }
  }, []);

  const raiseOperationalAlert = useCallback(
    (alert: Omit<AdminAlert, 'id' | 'createdAt'>) => {
      const nextAlert: AdminAlert = {
        ...alert,
        id: `${alert.kind}-${alert.orderId || 'general'}-${Date.now()}`,
        createdAt: Date.now(),
      };

      setActiveAlert(nextAlert);
      triggerAdminVibration();
      playAdminAlertSound(alert.kind);

      if (alert.kind === 'new_order') {
        setTab('orders');
        setOrderBucket('waiting');
      }

      if (alert.kind === 'ready_order') {
        setTab('orders');
        setOrderBucket('preparing');
      }

      if (alert.kind === 'payment_ready') {
        setTab('orders');
        setOrderBucket('confirmed');
      }
    },
    [playAdminAlertSound]
  );

  useEffect(() => {
    return () => {
      if (alertAudioRef.current) {
        alertAudioRef.current.close().catch(() => undefined);
        alertAudioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!safeOrders.length) {
      return;
    }

    const currentSnapshot = new Map<string, { status?: OrderStatus; paymentStatus?: string | null }>();

    safeOrders.forEach(order => {
      if (!order?.id) return;

      currentSnapshot.set(String(order.id), {
        status: order.status,
        paymentStatus: order.payment_status || null,
      });
    });

    if (!initializedOrderWatcherRef.current) {
      orderSnapshotRef.current = currentSnapshot;
      initializedOrderWatcherRef.current = true;
      return;
    }

    let pendingAlert: Omit<AdminAlert, 'id' | 'createdAt'> | null = null;

    for (const order of safeOrders) {
      if (!order?.id) continue;

      const orderId = String(order.id);
      const previous = orderSnapshotRef.current.get(orderId);
      const isNewOrder = !previous;
      const becamePreparing =
        Boolean(previous) &&
        previous?.status !== 'Preparando' &&
        order.status === 'Preparando';

      const paymentBecameConfirmed =
        Boolean(previous) &&
        previous?.paymentStatus !== 'confirmado' &&
        order.payment_status === 'confirmado' &&
        (order.status === 'Recibido' || order.status === 'Preparando');

      if (isNewOrder && order.status === 'Por Confirmar') {
        pendingAlert = {
          kind: 'new_order',
          orderId,
          title: '🚨 Nuevo pedido por confirmar',
          message: `${order.order_code || 'Pedido nuevo'} necesita revisión de disponibilidad y pago.`,
        };
        break;
      }

      if (becamePreparing) {
        pendingAlert = {
          kind: 'ready_order',
          orderId,
          title: '📦 Pedido listo para empacar/enviar',
          message: `${order.order_code || 'Pedido'} entró a preparación. Revísalo para despacho.`,
        };
        break;
      }

      if (paymentBecameConfirmed) {
        pendingAlert = {
          kind: 'payment_ready',
          orderId,
          title: '💸 Pago confirmado',
          message: `${order.order_code || 'Pedido'} ya tiene pago confirmado. Puede pasar a preparación.`,
        };
        break;
      }
    }

    orderSnapshotRef.current = currentSnapshot;

    if (pendingAlert) {
      raiseOperationalAlert(pendingAlert);
    }
  }, [raiseOperationalAlert, safeOrders]);

  const ranking = useMemo(() => {
    return [...safeCustomers].sort((a, b) => (b?.points || 0) - (a?.points || 0));
  }, [safeCustomers]);

  const sortedProducts = useMemo(() => {
    const query = search.toLowerCase();

    return [...safeProducts]
      .filter(product =>
        `${product?.name || ''} ${product?.category || ''} ${product?.subcategory || ''}`
          .toLowerCase()
          .includes(query)
      )
      .sort((a, b) => {
        const catA = a?.category || 'Otros';
        const catB = b?.category || 'Otros';

        if (catA < catB) return -1;
        if (catA > catB) return 1;

        return (a?.name || '').localeCompare(b?.name || '');
      });
  }, [safeProducts, search]);

  const sortedSeasons = useMemo(() => {
    return [...safeSeasons].sort(
      (a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime()
    );
  }, [safeSeasons]);

  const activeOrders = useMemo(() => {
    return safeOrders.filter(order => order.status !== 'Entregado' && order.status !== 'Cancelado');
  }, [safeOrders]);

  const orderStats = useMemo(() => {
    const todayOrders = safeOrders.filter(order => isToday(order.created_at));

    const totalWaiting = safeOrders.filter(order => order.status === 'Por Confirmar').length;
    const totalConfirmed = safeOrders.filter(order => order.status === 'Recibido').length;
    const totalPreparing = safeOrders.filter(order => order.status === 'Preparando').length;
    const totalSent = safeOrders.filter(order => order.status === 'Enviado').length;
    const totalDeliveredToday = todayOrders.filter(order => order.status === 'Entregado').length;
    const totalCancelledToday = todayOrders.filter(order => order.status === 'Cancelado').length;

    const todaySales = todayOrders
      .filter(isValidSaleOrder)
      .reduce((sum, order) => sum + toNumber(order.total), 0);

    const pendingPayments = safeOrders.filter(order => {
      return (
        order.status === 'Por Confirmar' &&
        (order.payment_method === 'deuna' || order.payment_method === 'transferencia')
      );
    }).length;

    return {
      totalWaiting,
      totalConfirmed,
      totalPreparing,
      totalSent,
      totalDeliveredToday,
      totalCancelledToday,
      todaySales,
      pendingPayments,
    };
  }, [safeOrders]);

  const financialStats = useMemo(() => {
    const validOrders = safeOrders.filter(isValidSaleOrder);
    const todayValidOrders = validOrders.filter(order => isToday(order.created_at));
    const monthValidOrders = validOrders.filter(order => isThisMonth(order.created_at));

    const totalSales = validOrders.reduce((sum, order) => sum + toNumber(order.total), 0);
    const todaySales = todayValidOrders.reduce((sum, order) => sum + toNumber(order.total), 0);
    const monthSales = monthValidOrders.reduce((sum, order) => sum + toNumber(order.total), 0);

    const todayAverageTicket =
      todayValidOrders.length > 0 ? todaySales / todayValidOrders.length : 0;

    const monthAverageTicket =
      monthValidOrders.length > 0 ? monthSales / monthValidOrders.length : 0;

    const todayMethods = buildMethodTotals(todayValidOrders);
    const monthMethods = buildMethodTotals(monthValidOrders);
    const totalMethods = buildMethodTotals(validOrders);

    const topTodayProducts = getTopProducts(todayValidOrders);
    const topMonthProducts = getTopProducts(monthValidOrders);

    const deliveredToday = safeOrders.filter(order => {
      return order.status === 'Entregado' && isToday(order.updated_at || order.created_at);
    });

    const cancelledToday = safeOrders.filter(order => {
      return order.status === 'Cancelado' && isToday(order.updated_at || order.created_at);
    });

    return {
      validOrders,
      todayValidOrders,
      monthValidOrders,
      totalSales,
      todaySales,
      monthSales,
      todayAverageTicket,
      monthAverageTicket,
      todayMethods,
      monthMethods,
      totalMethods,
      topTodayProducts,
      topMonthProducts,
      deliveredToday,
      cancelledToday,
    };
  }, [safeOrders]);

  const cashSummaryText = useMemo(() => {
    const today = new Date().toLocaleDateString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const methods = financialStats.todayMethods
      .map(method => `- ${method.label}: $${money(method.value)} (${method.count})`)
      .join('\n');

    return [
      `📊 CORTE DEL DÍA - LA CASA DEL POLLAZO`,
      `Fecha: ${today}`,
      ``,
      `Total vendido: $${money(financialStats.todaySales)}`,
      `Pedidos válidos: ${financialStats.todayValidOrders.length}`,
      `Ticket promedio: $${money(financialStats.todayAverageTicket)}`,
      `Entregados hoy: ${financialStats.deliveredToday.length}`,
      `Cancelados hoy: ${financialStats.cancelledToday.length}`,
      ``,
      `Métodos de pago:`,
      methods,
      ``,
      `Pendientes por confirmar: ${orderStats.totalWaiting}`,
      `Pagos por validar: ${orderStats.pendingPayments}`,
    ].join('\n');
  }, [financialStats, orderStats.pendingPayments, orderStats.totalWaiting]);

  const filteredOrders = useMemo(() => {
    const bucket = ORDER_BUCKETS.find(item => item.id === orderBucket);
    const query = search.toLowerCase().trim();

    return [...safeOrders]
      .filter(order => {
        if (bucket?.statuses && !bucket.statuses.includes(order.status)) {
          return false;
        }

        if (!query) return true;

        const customer = safeCustomers.find(
          current => cleanPhone(current?.phone) === cleanPhone(order?.customer_phone)
        );

        const haystack = [
          order.order_code,
          order.customer_phone,
          customer?.name,
          order.payment_method,
          order.payment_status,
          order.delivery_type,
          order.reference,
          productTextOfOrder(order),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(query);
      })
      .sort((a, b) => {
        const dateA = new Date(a.created_at || '').getTime();
        const dateB = new Date(b.created_at || '').getTime();

        return dateB - dateA;
      });
  }, [orderBucket, safeCustomers, safeOrders, search]);


  if (!context || context.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-orange-500 font-black animate-pulse uppercase italic tracking-widest">
        Sincronizando Imperio...
      </div>
    );
  }

  const resetDraft = () => {
    setDraft({
      name: '',
      category: 'Pollos',
      subcategory: 'Enteros',
      price: '',
      description: '',
      image: '',
      available: true,
      is_variable: false,
    });
    setEditingId(null);
  };

  const handleSaveProduct = async () => {
    if (!draft.name.trim()) return;

    const payload = {
      ...draft,
      price: draft.is_variable ? 'Consultar precio' : draft.price,
    };

    try {
      if (editingId) {
        await context.updateProduct(editingId, payload);
      } else {
        await context.addProduct(payload);
      }

      resetDraft();
      window.alert('¡Guardado en el Menú!');
    } catch {
      window.alert('Error al guardar');
    }
  };

  const handleOrderStatus = async (orderId: string | undefined, status: OrderStatus) => {
    if (!orderId) return;

    try {
      await context.updateOrderStatus(orderId, status);
      await context.refreshData();

      if (activeAlert?.orderId === orderId) {
        setActiveAlert(null);
      }
    } catch {
      window.alert('No se pudo actualizar el pedido.');
    }
  };

  const handleDeleteTestOrder = async (orderId: string | undefined) => {
    if (!orderId) return;

    if (!window.confirm('¿Eliminar este pedido de prueba? Esta acción no se puede deshacer.')) {
      return;
    }

    if (!isSupabaseConfigured) {
      window.alert('Supabase no está configurado.');
      return;
    }

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      window.alert('No se pudo borrar. Puede faltar una política DELETE en Supabase.');
      console.error(error);
      return;
    }

    if (activeAlert?.orderId === orderId) {
      setActiveAlert(null);
    }

    await context.refreshData();
  };

  const startEdit = (product: any) => {
    const nextCategory = (product.category || 'Pollos') as Category;

    setEditingId(product.id);
    setDraft({
      name: product.name || '',
      category: nextCategory,
      subcategory: product.subcategory || SUBCATEGORIES_MAP[nextCategory]?.[0] || '',
      price: product.price || '',
      description: product.description || '',
      image: product.image || '',
      available: product.available !== false,
      is_variable: Boolean(product.is_variable),
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleSeason = async () => {
    const nextActive = !seasonActive;

    const confirmMessage = nextActive
      ? '¿Activar la temporada? Desde ahora los pedidos válidos podrán sumar puntos de concurso.'
      : '¿Pausar la temporada? Las compras seguirán sumando EXP, pero no puntos de concurso.';

    if (!window.confirm(confirmMessage)) return;

    setSavingSeason(true);

    try {
      await context.updateExtraSettings({ event_active: nextActive });
      await context.refreshData();
    } catch {
      window.alert('No se pudo actualizar el estado de la temporada.');
    } finally {
      setSavingSeason(false);
    }
  };

  const handleFinalizeSeason = async () => {
    const title = safeExtraSettings.ranking_title || 'Temporada Finalizada';

    if (!window.confirm(`¿Finalizar "${title}" y guardar Top 3 en el Historial?`)) return;

    const top3 = ranking.slice(0, 3).map((customer, index) => ({
      name: customer?.name || 'Guerrero',
      points: customer?.points || 0,
      avatar_url: customer?.avatar_url || '',
      rank: index + 1,
      prize_won:
        index === 0
          ? safeExtraSettings.prize_1
          : index === 1
            ? safeExtraSettings.prize_2
            : safeExtraSettings.prize_3,
    }));

    try {
      await context.finalizeSeason(title, 'Premios VIP', top3);
      await context.updateExtraSettings({ event_active: false });
      await context.refreshData();
      window.alert('¡Temporada finalizada y pausada! Ya está arriba en el historial.');
    } catch {
      window.alert('Error al finalizar temporada');
    }
  };

  const handleResetSeasonPoints = async () => {
    const confirmMessage = [
      '¿Reiniciar puntos de temporada?',
      '',
      'Esto pondrá todos los puntos del ranking en 0.',
      'NO borra EXP permanente.',
      'NO borra historial de pedidos.',
      'NO borra total gastado.',
      '',
      'Úsalo solo cuando vayas a iniciar una nueva temporada limpia.',
    ].join('\n');

    if (!window.confirm(confirmMessage)) return;

    const secondConfirm = window.prompt(
      'Para confirmar escribe: REINICIAR'
    );

    if (secondConfirm !== 'REINICIAR') {
      window.alert('Reinicio cancelado.');
      return;
    }

    setResettingPoints(true);

    try {
      await context.resetSeasonPoints();
      await context.refreshData();
      window.alert('Puntos de temporada reiniciados. La EXP e historial quedaron intactos.');
    } catch {
      window.alert('No se pudieron reiniciar los puntos.');
    } finally {
      setResettingPoints(false);
    }
  };

  const handleSaveBranding = async () => {
    setSavingBranding(true);

    try {
      await context.refreshData();
    } finally {
      setSavingBranding(false);
    }
  };

  const handleViewAlertOrder = () => {
    if (!activeAlert) return;

    setTab('orders');
    setSearch('');

    if (activeAlert.kind === 'new_order') {
      setOrderBucket('waiting');
    }

    if (activeAlert.kind === 'ready_order') {
      setOrderBucket('preparing');
    }

    if (activeAlert.kind === 'payment_ready') {
      setOrderBucket('confirmed');
    }
  };

  const copyCashSummary = async () => {
    try {
      await navigator.clipboard.writeText(cashSummaryText);
      setCopiedCashSummary(true);

      window.setTimeout(() => {
        setCopiedCashSummary(false);
      }, 2500);
    } catch {
      window.prompt('Copia el corte del día:', cashSummaryText);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans text-slate-900 overflow-x-hidden leading-tight">
      <header
        className={`sticky top-0 z-40 bg-white border-b p-4 shadow-sm ${
          activeAlert ? 'ring-4 ring-orange-200 animate-pulse' : ''
        }`}
      >
        <div className="max-w-4xl mx-auto flex justify-between items-center gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={safeExtraSettings?.logo_url || '/logo-final.png'}
              className="w-9 h-9 object-contain flex-shrink-0"
              alt="Logo admin"
            />
            <div className="min-w-0">
              <p className="font-black text-xs uppercase italic truncate">Admin Panel VIP</p>
              <p className="text-[9px] text-gray-400 font-black uppercase truncate">
                {activeOrders.length} activo{activeOrders.length !== 1 ? 's' : ''} · Hoy ${money(financialStats.todaySales)}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={context.refreshData}
              className="p-2 bg-orange-50 text-orange-600 rounded-xl active:scale-75 transition-all"
              aria-label="Actualizar datos"
            >
              <RefreshCw size={18} />
            </button>

            <button
              type="button"
              onClick={() => void logoutPanelSession('admin')}
              className="p-2 text-gray-400 active:scale-75"
              aria-label="Cerrar admin"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {activeAlert && (
          <section className="bg-slate-950 text-white rounded-[32px] p-4 border border-orange-400/40 shadow-2xl shadow-orange-200 animate-pulse">
            <div className="flex gap-3 items-start">
              <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/30 flex-shrink-0">
                {activeAlert.kind === 'new_order' ? (
                  <AlertTriangle size={24} />
                ) : activeAlert.kind === 'ready_order' ? (
                  <Package size={24} />
                ) : (
                  <ShieldCheck size={24} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-black uppercase italic tracking-tight">
                  {activeAlert.title}
                </p>
                <p className="text-[11px] font-bold text-white/65 leading-relaxed mt-1">
                  {activeAlert.message}
                </p>

                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleViewAlertOrder}
                    className="bg-orange-500 text-white rounded-2xl px-4 py-3 text-[10px] font-black uppercase active:scale-95 shadow-lg shadow-orange-500/20"
                  >
                    Ver pedido
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveAlert(null)}
                    className="bg-white/10 text-white rounded-2xl px-4 py-3 text-[10px] font-black uppercase active:scale-95 border border-white/10"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {TABS.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                setSearch('');
              }}
              className={`flex-shrink-0 px-5 py-3 rounded-2xl text-[10px] font-black flex items-center gap-2 transition-all uppercase tracking-widest ${
                tab === item.id
                  ? 'bg-orange-500 text-white shadow-lg'
                  : 'bg-white text-gray-400 border'
              }`}
            >
              <item.Icon size={14} />
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="space-y-5 animate-in fade-in duration-500 pb-10">
            <section className="bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 rounded-[34px] p-5 text-white shadow-2xl shadow-orange-100 overflow-hidden relative">
              <div className="absolute -right-12 -top-12 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl" />
              <div className="absolute -left-16 bottom-0 w-44 h-44 bg-yellow-400/10 rounded-full blur-3xl" />

              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-300">
                    Resumen de control
                  </p>
                  <h1 className="text-2xl font-black uppercase italic mt-2 leading-none">
                    Hoy: ${money(financialStats.todaySales)}
                  </h1>
                  <p className="text-[11px] font-bold text-white/55 mt-2 leading-relaxed">
                    {financialStats.todayValidOrders.length} pedidos válidos · {orderStats.totalWaiting} en espera · {orderStats.pendingPayments} pagos por validar
                  </p>
                </div>

                <button
                  type="button"
                  onClick={copyCashSummary}
                  className="bg-white/10 border border-white/10 rounded-2xl px-3 py-2 text-[9px] font-black uppercase flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <Copy size={13} />
                  {copiedCashSummary ? 'Copiado' : 'Corte'}
                </button>
              </div>
            </section>

            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Ventas hoy"
                value={`$${money(financialStats.todaySales)}`}
                detail={`${financialStats.todayValidOrders.length} pedidos válidos`}
                Icon={DollarSign}
                tone="green"
              />
              <StatCard
                label="Ventas mes"
                value={`$${money(financialStats.monthSales)}`}
                detail={new Date().toLocaleDateString('es-EC', { month: 'long' })}
                Icon={TrendingUp}
                tone="blue"
              />
              <StatCard
                label="Ticket prom."
                value={`$${money(financialStats.todayAverageTicket)}`}
                detail="Promedio del día"
                Icon={ReceiptText}
                tone="orange"
              />
              <StatCard
                label="Activos"
                value={activeOrders.length}
                detail="Sin entregar/cancelar"
                Icon={Zap}
                tone="yellow"
              />
            </section>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  setTab('orders');
                  setOrderBucket('waiting');
                }}
                className="bg-white rounded-[28px] border border-orange-100 p-4 shadow-sm text-left active:scale-[0.98] transition-all"
              >
                <AlertTriangle size={22} className="text-orange-500 mb-3" />
                <p className="text-2xl font-black text-gray-900">{orderStats.totalWaiting}</p>
                <p className="text-[10px] font-black text-gray-400 uppercase mt-1">
                  Pedidos por confirmar
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTab('orders');
                  setOrderBucket('confirmed');
                }}
                className="bg-white rounded-[28px] border border-blue-100 p-4 shadow-sm text-left active:scale-[0.98] transition-all"
              >
                <ClipboardList size={22} className="text-blue-500 mb-3" />
                <p className="text-2xl font-black text-gray-900">{orderStats.totalConfirmed}</p>
                <p className="text-[10px] font-black text-gray-400 uppercase mt-1">
                  Confirmados
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTab('orders');
                  setOrderBucket('preparing');
                }}
                className="bg-white rounded-[28px] border border-yellow-100 p-4 shadow-sm text-left active:scale-[0.98] transition-all"
              >
                <Package size={22} className="text-yellow-600 mb-3" />
                <p className="text-2xl font-black text-gray-900">{orderStats.totalPreparing}</p>
                <p className="text-[10px] font-black text-gray-400 uppercase mt-1">
                  Preparando
                </p>
              </button>
            </section>

            {orderStats.pendingPayments > 0 && (
              <section className="bg-yellow-50 border border-yellow-100 rounded-[28px] p-4 flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center text-yellow-600 shadow-sm">
                  <QrCode size={20} />
                </div>
                <div>
                  <p className="text-xs font-black text-yellow-700 uppercase">
                    {orderStats.pendingPayments} pago{orderStats.pendingPayments !== 1 ? 's' : ''} por validar
                  </p>
                  <p className="text-[10px] font-bold text-yellow-700/70 mt-1">
                    Revisa Deuna o transferencia antes de confirmar.
                  </p>
                </div>
              </section>
            )}

            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-[32px] p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-black uppercase italic">Pago de hoy</p>
                    <p className="text-[10px] font-bold text-gray-400 mt-1">
                      Separado por método
                    </p>
                  </div>
                  <Wallet size={22} className="text-orange-500" />
                </div>

                <div className="space-y-2">
                  {financialStats.todayMethods.map(method => {
                    const Icon = method.Icon;

                    return (
                      <div key={method.key} className="flex items-center justify-between gap-3 bg-gray-50 rounded-2xl p-3 border border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-orange-500 shadow-sm">
                            <Icon size={16} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase text-gray-700">
                              {method.label}
                            </p>
                            <p className="text-[8px] font-bold text-gray-400">
                              {method.count} pedido{method.count !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-black text-gray-900">
                          ${money(method.value)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-[32px] p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-black uppercase italic">Top productos hoy</p>
                    <p className="text-[10px] font-bold text-gray-400 mt-1">
                      Lo que más se mueve
                    </p>
                  </div>
                  <BarChart3 size={22} className="text-orange-500" />
                </div>

                {financialStats.topTodayProducts.length > 0 ? (
                  <div className="space-y-2">
                    {financialStats.topTodayProducts.slice(0, 5).map((product, index) => (
                      <div key={product.name} className="flex items-center justify-between gap-3 bg-gray-50 rounded-2xl p-3 border border-gray-100">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-gray-800 uppercase truncate">
                            {index + 1}. {product.name}
                          </p>
                          <p className="text-[8px] font-bold text-gray-400">
                            {product.quantity} vendido{product.quantity !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <p className="text-xs font-black text-green-600">
                          ${money(product.sales)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-bold text-gray-400 bg-gray-50 rounded-2xl p-5 text-center">
                    Todavía no hay productos vendidos hoy.
                  </p>
                )}
              </div>
            </section>
          </div>
        )}

        {tab === 'cash' && (
          <div className="space-y-5 pb-10 animate-in fade-in duration-500">
            <section className="bg-white rounded-[32px] p-5 border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">
                    Caja y ventas
                  </p>
                  <h2 className="text-2xl font-black text-gray-900 uppercase italic mt-1">
                    Corte del día
                  </h2>
                  <p className="text-xs font-bold text-gray-400 mt-2 leading-relaxed">
                    Ventas registradas sin contar pedidos cancelados ni pedidos por confirmar.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={copyCashSummary}
                  className="bg-slate-950 text-white rounded-2xl px-4 py-3 text-[10px] font-black uppercase flex items-center gap-2 active:scale-95 transition-all"
                >
                  <Copy size={14} />
                  {copiedCashSummary ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </section>

            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Hoy"
                value={`$${money(financialStats.todaySales)}`}
                detail={`${financialStats.todayValidOrders.length} pedidos`}
                Icon={DollarSign}
                tone="green"
              />
              <StatCard
                label="Este mes"
                value={`$${money(financialStats.monthSales)}`}
                detail={`${financialStats.monthValidOrders.length} pedidos`}
                Icon={TrendingUp}
                tone="blue"
              />
              <StatCard
                label="Total"
                value={`$${money(financialStats.totalSales)}`}
                detail={`${financialStats.validOrders.length} ventas`}
                Icon={Wallet}
                tone="orange"
              />
              <StatCard
                label="Prom. mes"
                value={`$${money(financialStats.monthAverageTicket)}`}
                detail="Ticket promedio"
                Icon={ReceiptText}
                tone="slate"
              />
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black uppercase italic text-gray-500">
                  Métodos de pago hoy
                </h3>
                <span className="text-[9px] font-black uppercase text-gray-300">
                  Total ${money(financialStats.todaySales)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {financialStats.todayMethods.map(method => (
                  <MethodCard key={method.key} item={method} />
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black uppercase italic text-gray-500">
                  Métodos de pago del mes
                </h3>
                <span className="text-[9px] font-black uppercase text-gray-300">
                  Total ${money(financialStats.monthSales)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {financialStats.monthMethods.map(method => (
                  <MethodCard key={method.key} item={method} />
                ))}
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-[32px] border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-black uppercase italic">Productos top hoy</p>
                    <p className="text-[10px] font-bold text-gray-400 mt-1">
                      Por cantidad vendida
                    </p>
                  </div>
                  <Package size={22} className="text-orange-500" />
                </div>

                {financialStats.topTodayProducts.length > 0 ? (
                  <div className="space-y-2">
                    {financialStats.topTodayProducts.map((product, index) => (
                      <div key={product.name} className="bg-gray-50 rounded-2xl p-3 border border-gray-100 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase text-gray-800 truncate">
                            {index + 1}. {product.name}
                          </p>
                          <p className="text-[8px] font-bold text-gray-400">
                            {product.quantity} unidades
                          </p>
                        </div>
                        <p className="text-xs font-black text-green-600">
                          ${money(product.sales)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-bold text-gray-400 text-center bg-gray-50 rounded-2xl p-5">
                    Sin ventas de productos hoy.
                  </p>
                )}
              </div>

              <div className="bg-white rounded-[32px] border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-black uppercase italic">Productos top mes</p>
                    <p className="text-[10px] font-bold text-gray-400 mt-1">
                      Lo más vendido del mes
                    </p>
                  </div>
                  <BarChart3 size={22} className="text-blue-500" />
                </div>

                {financialStats.topMonthProducts.length > 0 ? (
                  <div className="space-y-2">
                    {financialStats.topMonthProducts.map((product, index) => (
                      <div key={product.name} className="bg-gray-50 rounded-2xl p-3 border border-gray-100 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase text-gray-800 truncate">
                            {index + 1}. {product.name}
                          </p>
                          <p className="text-[8px] font-bold text-gray-400">
                            {product.quantity} unidades
                          </p>
                        </div>
                        <p className="text-xs font-black text-green-600">
                          ${money(product.sales)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-bold text-gray-400 text-center bg-gray-50 rounded-2xl p-5">
                    Sin ventas de productos este mes.
                  </p>
                )}
              </div>
            </section>

            <section className="bg-slate-950 text-white rounded-[32px] p-5 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <ReceiptText size={22} className="text-orange-400" />
                <div>
                  <p className="text-xs font-black uppercase italic">Resumen copiable</p>
                  <p className="text-[10px] font-bold text-white/45 mt-1">
                    Útil para enviar por WhatsApp o guardar el corte.
                  </p>
                </div>
              </div>

              <pre className="whitespace-pre-wrap text-[11px] font-bold leading-relaxed bg-white/5 border border-white/10 rounded-2xl p-4 text-white/75">
                {cashSummaryText}
              </pre>
            </section>
          </div>
        )}

        {tab === 'plus' && <AdminPlusPanel />}

        {tab === 'orders' && (
          <div className="space-y-4 pb-10 animate-in fade-in duration-500">
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="En espera"
                value={orderStats.totalWaiting}
                detail="Revisar antes de aceptar"
                Icon={AlertTriangle}
                tone="orange"
              />
              <StatCard
                label="Confirmados"
                value={orderStats.totalConfirmed}
                detail="Listos para preparar"
                Icon={ClipboardList}
                tone="slate"
              />
              <StatCard
                label="En camino"
                value={orderStats.totalSent}
                detail="Pedidos enviados"
                Icon={Truck}
                tone="yellow"
              />
              <StatCard
                label="Ventas hoy"
                value={`$${money(orderStats.todaySales)}`}
                detail={`${orderStats.totalDeliveredToday} entregados hoy`}
                Icon={DollarSign}
                tone="green"
              />
            </section>

            {orderStats.pendingPayments > 0 && (
              <div className="bg-yellow-50 border border-yellow-100 rounded-[28px] p-4 flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center text-yellow-600 shadow-sm">
                  <QrCode size={20} />
                </div>
                <div>
                  <p className="text-xs font-black text-yellow-700 uppercase">
                    {orderStats.pendingPayments} pago{orderStats.pendingPayments !== 1 ? 's' : ''} por validar
                  </p>
                  <p className="text-[10px] font-bold text-yellow-700/70 mt-1">
                    Revisa Deuna o transferencia antes de confirmar.
                  </p>
                </div>
              </div>
            )}

            <section className="bg-white rounded-[32px] p-4 border border-gray-100 shadow-sm space-y-3">
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Buscar pedido, cliente, teléfono o producto..."
                  className="w-full bg-gray-50 rounded-2xl py-4 pl-11 pr-4 text-sm font-bold border border-gray-100 outline-none focus:border-orange-300"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {ORDER_BUCKETS.map(bucket => {
                  const Icon = bucket.icon;
                  const count = bucket.statuses
                    ? safeOrders.filter(order => bucket.statuses?.includes(order.status)).length
                    : safeOrders.length;

                  return (
                    <button
                      key={bucket.id}
                      type="button"
                      onClick={() => setOrderBucket(bucket.id)}
                      className={`flex-shrink-0 px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border flex items-center gap-2 ${
                        orderBucket === bucket.id
                          ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                          : 'bg-white text-gray-400 border-gray-100'
                      }`}
                    >
                      <Icon size={13} />
                      {bucket.shortLabel}
                      <span
                        className={`min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center text-[8px] ${
                          orderBucket === bucket.id
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {filteredOrders.length === 0 && (
              <div className="bg-white rounded-[32px] p-10 text-center border border-gray-100">
                <PackageSearch size={38} className="mx-auto text-orange-300 mb-3" />
                <p className="text-gray-900 font-black uppercase">No hay pedidos aquí</p>
                <p className="text-gray-400 text-xs font-bold mt-1">
                  Cambia de filtro o espera un nuevo pedido.
                </p>
              </div>
            )}

            {filteredOrders.map(order => {
              const customer = safeCustomers.find(
                current => cleanPhone(current?.phone) === cleanPhone(order.customer_phone)
              );

              const deliveryLat = order.lat ?? customer?.lat ?? null;
              const deliveryLng = order.lng ?? customer?.lng ?? null;
              const hasDeliveryGps = isValidCoordinate(deliveryLat) && isValidCoordinate(deliveryLng);
              const deliveryRef = order.reference || customer?.reference || '';

              const isPending = order.status === 'Por Confirmar';
              const isReadyForAction =
                order.status === 'Preparando' ||
                (order.status === 'Recibido' && order.payment_status === 'confirmado');

              const isActiveAlertOrder = activeAlert?.orderId === order.id;
              const cleanCustomerPhone = cleanPhone(order.customer_phone);

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-[32px] border p-5 space-y-4 shadow-sm transition-all ${
                    isActiveAlertOrder
                      ? 'border-orange-400 shadow-orange-200 ring-4 ring-orange-200 animate-pulse'
                      : isPending
                        ? 'border-orange-300 shadow-orange-100 ring-2 ring-orange-100'
                        : isReadyForAction
                          ? 'border-blue-300 shadow-blue-100 ring-2 ring-blue-100'
                          : 'border-gray-100'
                  }`}
                >
                  <div className="flex justify-between items-start border-b pb-3 border-gray-50 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={
                          customer?.avatar_url ||
                          `https://api.dicebear.com/8.x/adventurer/svg?seed=${order.customer_phone}`
                        }
                        className="w-12 h-12 rounded-2xl border-2 border-orange-100 shadow-sm object-cover flex-shrink-0"
                        alt="Cliente"
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-black text-xs uppercase leading-none truncate">
                            {customer?.name || order.customer_phone || 'Cliente'}
                          </p>

                          {order.membership_applied && (
                            <span className="bg-yellow-400 text-yellow-950 text-[7px] font-black px-2 py-0.5 rounded-full uppercase">
                              Plus
                            </span>
                          )}

                          {isPending && (
                            <span className="bg-orange-500 text-white text-[7px] font-black px-2 py-0.5 rounded-full uppercase">
                              Nuevo
                            </span>
                          )}

                          {isReadyForAction && !isPending && (
                            <span className="bg-blue-500 text-white text-[7px] font-black px-2 py-0.5 rounded-full uppercase">
                              Acción
                            </span>
                          )}
                        </div>

                        <p className="text-[9px] font-black text-gray-400 mt-1">
                          {order.order_code || 'Sin código'}
                        </p>

                        <a
                          href={whatsappLink(order.customer_phone)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[9px] font-black text-green-600 mt-1 bg-green-50 px-2 py-1 rounded-lg border border-green-100"
                        >
                          <Phone size={10} />
                          {prettyPhone(order.customer_phone)}
                        </a>

                        <div className="flex items-center gap-1 text-[8px] font-black text-blue-500 mt-1">
                          <Clock size={10} />
                          {order.created_at
                            ? new Date(order.created_at).toLocaleString('es-EC', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })
                            : '--'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right leading-none flex-shrink-0">
                      <p className="font-black text-orange-600 text-lg italic">
                        ${money(order.total)}
                      </p>

                      <span
                        className={`text-[7px] font-black uppercase px-2 py-1 rounded-md mt-1 inline-block border ${getStatusTone(order.status)}`}
                      >
                        {order.status}
                      </span>

                      <p className="text-[8px] text-gray-400 font-black uppercase mt-1">
                        {getStatusHelp(order.status)}
                      </p>
                    </div>
                  </div>

                  {order.membership_applied && (
                    <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-3 flex items-center gap-2">
                      <Crown size={16} className="text-yellow-600 flex-shrink-0" />
                      <p className="text-[9px] font-black text-yellow-700 uppercase leading-relaxed">
                        Pollazo Plus aplicado: delivery gratis en este pedido.
                      </p>
                    </div>
                  )}

                  {Array.isArray(order.bonus_items) && order.bonus_items.length > 0 && (
                    <div className="bg-orange-50 border border-orange-100 rounded-2xl p-3 space-y-2">
                      <p className="text-[9px] font-black text-orange-700 uppercase flex items-center gap-2">
                        <Crown size={13} />
                        Regalos VIP agregados
                      </p>

                      {order.bonus_items.map((gift: any, index: number) => (
                        <div
                          key={`${gift.id || gift.item_name}-${index}`}
                          className="bg-white rounded-xl px-3 py-2 flex justify-between gap-3 border border-orange-100"
                        >
                          <span className="text-[10px] font-black uppercase truncate">
                            {money(gift.quantity || 1).replace('.00', '')}x {gift.item_name}
                          </span>

                          <span className="text-[8px] font-black text-orange-500 uppercase">
                            Plus
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Pago</p>
                      <p className="text-[10px] font-black text-slate-700 uppercase flex items-center gap-1 mt-1">
                        {paymentIcon(order.payment_method)}
                        {paymentLabel(order.payment_method)}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 text-[8px] font-black uppercase px-2 py-1 rounded-lg border mt-2 ${paymentStatusTone(order.payment_status)}`}
                      >
                        <ShieldCheck size={10} />
                        {paymentStatusLabel(order.payment_status)}
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Entrega</p>
                      <p className="text-[10px] font-black text-slate-700 uppercase mt-1 flex items-center gap-1">
                        <Route size={13} />
                        {order.delivery_type || 'domicilio'}
                      </p>
                      <p className="text-[8px] font-bold text-slate-400 mt-1">
                        {hasDeliveryGps ? 'Ubicación lista' : 'Sin GPS'}
                      </p>
                    </div>
                  </div>

                  {hasDeliveryGps && (
                    <div className="space-y-1.5 animate-in fade-in duration-300">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${deliveryLat},${deliveryLng}&travelmode=driving`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-black py-3.5 rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-md active:scale-[0.98] shadow-red-600/20"
                      >
                        <MapPin size={14} className="fill-white" />
                        Abrir mapa de entrega
                      </a>

                      {deliveryRef && (
                        <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[9px] font-bold text-slate-600 uppercase">
                          <span className="text-orange-600 font-black">🏠 Indicación casa:</span>{' '}
                          {deliveryRef}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="bg-orange-50/50 rounded-2xl p-4 border border-orange-100/30">
                    <p className="text-[9px] font-black text-orange-700 uppercase mb-2 flex items-center gap-2">
                      <PackageSearch size={14} /> Detalle Compra
                    </p>

                    {(order.items || []).length > 0 ? (
                      (order.items || []).map((item: any, index: number) => {
                        const quantity = Number(item?.quantity || 1);
                        const unitPrice = toNumber(item?.custom_price || item?.price || 0);
                        const lineTotal = toNumber(item?.subtotal || unitPrice * quantity || 0);

                        return (
                          <div
                            key={index}
                            className="flex justify-between text-[10px] font-bold uppercase py-1.5 border-b border-orange-100/30 last:border-0 gap-3"
                          >
                            <span className="flex-1 min-w-0">
                              <span className="text-orange-600 font-black">{quantity}x</span>{' '}
                              <span className="text-gray-700">
                                {item?.name || item?.product?.name || 'Producto'}
                              </span>
                              {item?.custom_price && (
                                <span className="text-[8px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded ml-2 font-black">
                                  VALOR FIJO
                                </span>
                              )}
                            </span>

                            <span className="text-gray-500 font-black flex-shrink-0">
                              ${money(lineTotal)}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-[9px] text-gray-400 font-bold italic text-center uppercase">
                        Pedido antiguo
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {order.status === 'Por Confirmar' && (
                      <button
                        type="button"
                        onClick={() => handleOrderStatus(order.id, 'Recibido')}
                        className="bg-orange-500 text-white py-3 rounded-xl font-black text-[9px] uppercase active:scale-95 transition-all shadow-md shadow-orange-100 flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 size={13} />
                        Confirmar
                      </button>
                    )}

                    {(order.status === 'Por Confirmar' || order.status === 'Recibido') && (
                      <button
                        type="button"
                        onClick={() => handleOrderStatus(order.id, 'Preparando')}
                        className="bg-blue-500 text-white py-3 rounded-xl font-black text-[9px] uppercase active:scale-95 transition-all shadow-md shadow-blue-100 flex items-center justify-center gap-1"
                      >
                        <Package size={13} />
                        Preparar
                      </button>
                    )}

                    {(order.status === 'Recibido' || order.status === 'Preparando') && (
                      <button
                        type="button"
                        onClick={() => handleOrderStatus(order.id, 'Enviado')}
                        className="bg-yellow-500 text-white py-3 rounded-xl font-black text-[9px] uppercase active:scale-95 transition-all shadow-md shadow-yellow-100 flex items-center justify-center gap-1"
                      >
                        <Truck size={13} />
                        Enviar
                      </button>
                    )}

                    {order.status === 'Enviado' && (
                      <button
                        type="button"
                        onClick={() => handleOrderStatus(order.id, 'Entregado')}
                        className="bg-green-500 text-white py-3 rounded-xl font-black text-[9px] uppercase active:scale-95 transition-all shadow-md shadow-green-100 flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 size={13} />
                        Entregar
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={order.status}
                      onChange={event =>
                        handleOrderStatus(order.id, event.target.value as OrderStatus)
                      }
                      className="flex-1 bg-gray-50 border rounded-xl p-3 text-[10px] font-black outline-none"
                    >
                      {ORDER_STATUS_OPTIONS.map(status => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>

                    <a
                      href={buildStatusWhatsAppUrl(
                        order.customer_phone || '',
                        order.order_code || 'PEDIDO',
                        order.status
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-[#25D366] text-white px-4 py-3 rounded-xl font-black text-[10px] flex items-center gap-2 shadow-md active:scale-95 transition-all"
                    >
                      <Send size={14} /> Estado
                    </a>

                    <a
                      href={cleanCustomerPhone ? whatsappLink(order.customer_phone) : '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-green-50 text-green-600 px-4 py-3 rounded-xl font-black text-[10px] flex items-center gap-2 border border-green-100 active:scale-95 transition-all"
                    >
                      <MessageCircle size={14} />
                    </a>
                  </div>

                  <div className="flex gap-2 border-t border-gray-50 pt-3">
                    {order.status !== 'Cancelado' && order.status !== 'Entregado' && (
                      <button
                        type="button"
                        onClick={() => handleOrderStatus(order.id, 'Cancelado')}
                        className="flex-1 bg-red-50 text-red-500 py-3 rounded-xl font-black text-[9px] uppercase border border-red-100 active:scale-95 transition-all"
                      >
                        Cancelar pedido
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteTestOrder(order.id)}
                      className="px-4 bg-gray-50 text-gray-400 py-3 rounded-xl font-black text-[9px] uppercase border border-gray-100 active:scale-95 transition-all"
                      title="Eliminar pedido de prueba"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'products' && (
          <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <section className="bg-white rounded-[32px] p-6 shadow-xl border border-orange-100 space-y-5">
              <div className="flex items-center gap-3 border-b border-orange-50 pb-4">
                <div className="p-3 bg-orange-500 text-white rounded-2xl shadow-lg">
                  {editingId ? <Edit3 size={20} /> : <Plus size={20} />}
                </div>
                <h2 className="font-black text-lg uppercase italic">
                  {editingId ? 'Editar Producto' : 'Nuevo Producto'}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  placeholder="Nombre del producto..."
                  value={draft.name}
                  onChange={event => setDraft({ ...draft, name: event.target.value })}
                  className="bg-gray-50 rounded-2xl px-4 py-4 text-sm font-bold border-none outline-none shadow-inner"
                />

                <select
                  value={draft.category}
                  onChange={event => {
                    const nextCat = event.target.value as Category;
                    setDraft({
                      ...draft,
                      category: nextCat,
                      subcategory: SUBCATEGORIES_MAP[nextCat]?.[0] || '',
                    });
                  }}
                  className="bg-gray-50 rounded-2xl px-4 py-4 text-sm font-bold border-none outline-none shadow-inner"
                >
                  {Object.keys(SUBCATEGORIES_MAP).map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>

                <select
                  value={draft.subcategory}
                  onChange={event => setDraft({ ...draft, subcategory: event.target.value })}
                  className="bg-gray-50 rounded-2xl px-4 py-4 text-sm font-bold border-none outline-none shadow-inner text-orange-600 uppercase tracking-tight"
                >
                  {(SUBCATEGORIES_MAP[draft.category] || []).map(subcategory => (
                    <option key={subcategory} value={subcategory}>
                      {subcategory}
                    </option>
                  ))}
                </select>

                <input
                  placeholder={draft.is_variable ? 'Precio automático: Consultar precio' : 'Precio Base (Ej: $10.50)'}
                  disabled={draft.is_variable}
                  value={draft.is_variable ? '' : draft.price}
                  onChange={event => setDraft({ ...draft, price: event.target.value })}
                  className={`bg-gray-50 rounded-2xl px-4 py-4 text-sm font-bold border-none outline-none shadow-inner ${
                    draft.is_variable ? 'opacity-40 select-none' : ''
                  }`}
                />

                <input
                  placeholder="Link de imagen del producto..."
                  value={draft.image}
                  onChange={event => setDraft({ ...draft, image: event.target.value })}
                  className="bg-gray-50 rounded-2xl px-4 py-4 text-sm font-bold border-none outline-none shadow-inner col-span-1 md:col-span-2"
                />

                <textarea
                  placeholder="Descripción breve..."
                  value={draft.description}
                  onChange={event => setDraft({ ...draft, description: event.target.value })}
                  className="bg-gray-50 rounded-2xl px-4 py-4 text-sm font-bold border-none outline-none shadow-inner col-span-1 md:col-span-2 min-h-[90px] resize-none"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="leading-tight">
                  <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider block">
                    Modalidad de Cobro
                  </span>
                  <p className="text-xs font-bold text-slate-700">
                    ¿Es un producto de valor variable? Ej: pedir $15 de pollo.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={draft.is_variable}
                    onChange={event => setDraft({ ...draft, is_variable: event.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500" />
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveProduct}
                  className="flex-1 bg-black text-white py-5 rounded-[24px] font-black uppercase text-xs active:scale-95 shadow-xl flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  {editingId ? 'Actualizar Producto' : 'Guardar en Catálogo'}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={resetDraft}
                    className="bg-gray-100 text-gray-500 px-6 rounded-[24px] active:scale-95"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            </section>

            <div className="space-y-4">
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Filtrar menú..."
                  className="w-full bg-white rounded-2xl py-4 pl-11 pr-4 text-sm font-bold border border-gray-100 shadow-sm outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                {sortedProducts.map(product => (
                  <div
                    key={product.id}
                    className="bg-white rounded-[28px] border border-gray-100 p-3 flex items-center gap-4 shadow-sm relative overflow-hidden group"
                  >
                    <img
                      src={product.image || '/logo-final.png'}
                      className="w-16 h-16 rounded-2xl object-cover border shadow-sm"
                      alt={product.name}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-[11px] text-gray-900 truncate uppercase italic">
                          {product.name}
                        </p>

                        {!product.available && (
                          <span className="bg-red-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase animate-pulse">
                            Agotado
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-[7px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 uppercase">
                          {product.category}
                        </span>

                        {product.subcategory && (
                          <span className="text-[7px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100 uppercase">
                            {product.subcategory}
                          </span>
                        )}

                        <span className="text-[10px] font-black text-gray-400">
                          {formatProductPrice(product)}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-1 pr-1">
                      <button
                        type="button"
                        onClick={() => context.updateProduct(product.id, { available: !product.available })}
                        className={`p-2.5 rounded-xl ${
                          product.available
                            ? 'bg-green-50 text-green-600'
                            : 'bg-red-50 text-red-600 shadow-inner'
                        }`}
                        aria-label="Cambiar disponibilidad"
                      >
                        <Package size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => startEdit(product)}
                        className="p-2.5 bg-blue-50 text-blue-600 rounded-xl active:scale-75"
                        aria-label="Editar producto"
                      >
                        <Edit3 size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => window.confirm('¿Borrar?') && context.deleteProduct(product.id)}
                        className="p-2.5 bg-red-50 text-red-400 rounded-xl active:scale-75"
                        aria-label="Borrar producto"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'customers' && (
          <div className="space-y-4 pb-10 animate-in fade-in duration-500">
            <div className="bg-white rounded-[32px] p-5 shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 rounded-2xl text-orange-600">
                  <Users size={22} />
                </div>
                <h2 className="font-black text-lg uppercase italic text-gray-900 leading-none">
                  Clientes VIP
                </h2>
              </div>

              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Buscar guerrero por nombre o celular..."
                className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-bold border-none outline-none shadow-inner"
              />
            </div>

            <div className="space-y-3">
              {ranking
                .filter(customer =>
                  `${customer?.name || ''} ${customer?.phone || ''}`
                    .toLowerCase()
                    .includes(search.toLowerCase())
                )
                .map((customer, index) => (
                  <div
                    key={customer.id}
                    className="bg-white rounded-[28px] border border-gray-100 p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <img
                      src={
                        customer.avatar_url ||
                        `https://api.dicebear.com/8.x/adventurer/svg?seed=${customer.name}`
                      }
                      className="w-12 h-12 rounded-2xl border border-orange-50 shadow-sm object-cover"
                      alt="Cliente"
                    />

                    <div className="flex-1 min-w-0">
                      <p className="font-black text-xs truncate uppercase italic">
                        {index + 1}º {customer.name || 'Guerrero'}
                      </p>
                      <p className="text-[9px] font-black text-gray-400 mt-1 leading-none">
                        {customer.phone}
                      </p>
                      <div className="flex gap-1 flex-wrap mt-1.5">
                        <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border border-orange-100">
                          {(customer.points || 0).toLocaleString()} Pts
                        </span>
                        <span className="bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border border-yellow-100">
                          {(customer.exp || 0).toLocaleString()} EXP
                        </span>
                        <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border border-green-100">
                          ${money(customer.total_spent || 0)}
                        </span>

                        {customer.membership_status === 'active' && (
                          <span className="bg-yellow-400 text-yellow-950 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border border-yellow-300">
                            Plus
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                      <input
                        type="number"
                        value={points[customer.id] ?? ''}
                        onChange={event =>
                          setPoints({ ...points, [customer.id]: event.target.value })
                        }
                        className="w-12 bg-white rounded-xl py-2 text-center text-xs font-black outline-none shadow-sm"
                        placeholder="+5"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          const pts = Number(points[customer.id] || 0);
                          if (pts !== 0) {
                            context.addCustomerPoints(customer.id, pts);
                            setPoints({ ...points, [customer.id]: '' });
                          }
                        }}
                        className="bg-black text-white p-2.5 rounded-xl active:scale-90 shadow-lg transition-transform"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                ))}

              {ranking.length === 0 && (
                <p className="text-center text-xs font-bold text-gray-400 italic mt-8">
                  No hay clientes registrados aún.
                </p>
              )}
            </div>
          </div>
        )}

        {tab === 'ranking_config' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 leading-tight">
            <section className="bg-white rounded-[32px] p-6 shadow-xl border border-orange-100 space-y-6">
              <div className="flex items-center gap-3 border-b pb-4 border-gray-50">
                <div className="p-3 bg-orange-100 rounded-2xl text-orange-600">
                  <Trophy size={22} />
                </div>
                <div className="flex-1">
                  <h2 className="font-black text-lg uppercase italic">Control de Concurso</h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                    Temporada, premios y ranking VIP
                  </p>
                </div>
              </div>

              <div
                className={`rounded-[30px] border p-5 ${
                  seasonActive
                    ? 'bg-green-50 border-green-100'
                    : 'bg-slate-50 border-slate-100'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                        seasonActive
                          ? 'bg-green-500 text-white'
                          : 'bg-slate-900 text-white'
                      }`}
                    >
                      {seasonActive ? <PlayCircle size={24} /> : <PauseCircle size={24} />}
                    </div>

                    <div>
                      <p
                        className={`text-sm font-black uppercase italic ${
                          seasonActive ? 'text-green-700' : 'text-slate-700'
                        }`}
                      >
                        {seasonActive ? 'Temporada activa' : 'Temporada pausada'}
                      </p>
                      <p className="text-[10px] font-bold text-gray-500 leading-relaxed mt-1">
                        {seasonActive
                          ? 'Los pedidos válidos pueden sumar puntos de concurso.'
                          : 'Las compras suman EXP, pero no puntos de temporada.'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleSeason}
                    disabled={savingSeason}
                    className={`px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-md ${
                      seasonActive
                        ? 'bg-slate-900 text-white'
                        : 'bg-green-500 text-white shadow-green-100'
                    } ${savingSeason ? 'opacity-60 cursor-wait' : ''}`}
                  >
                    {savingSeason
                      ? 'Guardando...'
                      : seasonActive
                        ? 'Pausar'
                        : 'Activar'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400">
                    Título Actual
                  </label>
                  <input
                    value={safeExtraSettings.ranking_title || ''}
                    onChange={event =>
                      context.updateExtraSettings({ ranking_title: event.target.value })
                    }
                    className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none outline-none shadow-inner"
                    placeholder="Ej: Ranking VIP Pollazo"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 flex items-center gap-1">
                    <CalendarDays size={12} /> Fecha Límite
                  </label>
                  <input
                    type="datetime-local"
                    value={toDateTimeLocalValue(safeExtraSettings.ranking_end_date)}
                    onChange={event =>
                      context.updateExtraSettings({ ranking_end_date: event.target.value })
                    }
                    className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none outline-none shadow-inner"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400">
                    Premio 1
                  </label>
                  <input
                    value={safeExtraSettings.prize_1 || ''}
                    onChange={event => context.updateExtraSettings({ prize_1: event.target.value })}
                    className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none outline-none shadow-inner"
                    placeholder="Ej: Combo familiar"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400">
                    Premio 2
                  </label>
                  <input
                    value={safeExtraSettings.prize_2 || ''}
                    onChange={event => context.updateExtraSettings({ prize_2: event.target.value })}
                    className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none outline-none shadow-inner"
                    placeholder="Ej: Canasta básica"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-[9px] font-black uppercase text-gray-400">
                    Premio 3
                  </label>
                  <input
                    value={safeExtraSettings.prize_3 || ''}
                    onChange={event => context.updateExtraSettings({ prize_3: event.target.value })}
                    className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none outline-none shadow-inner"
                    placeholder="Ej: Descuento VIP"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 space-y-3">
                <button
                  type="button"
                  onClick={handleFinalizeSeason}
                  className="w-full bg-black text-white py-5 rounded-[24px] font-black uppercase text-xs tracking-widest active:scale-95 transition-all shadow-xl"
                >
                  Finalizar, guardar top 3 y pausar temporada
                </button>

                <div className="bg-red-50 border border-red-100 rounded-[28px] p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-white text-red-500 flex items-center justify-center shadow-sm flex-shrink-0">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-red-600 uppercase">
                        Reinicio de temporada
                      </p>
                      <p className="text-[10px] font-bold text-red-500/80 leading-relaxed mt-1">
                        Reinicia solo los puntos del ranking. La EXP permanente, historial, total gastado y pedidos no se borran.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetSeasonPoints}
                    disabled={resettingPoints}
                    className={`w-full bg-red-500 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all shadow-lg shadow-red-100 flex items-center justify-center gap-2 ${
                      resettingPoints ? 'opacity-60 cursor-wait' : ''
                    }`}
                  >
                    <RefreshCw size={15} className={resettingPoints ? 'animate-spin' : ''} />
                    {resettingPoints ? 'Reiniciando puntos...' : 'Reiniciar puntos de temporada'}
                  </button>
                </div>

                <p className="text-[9px] text-gray-400 italic text-center mt-3 leading-relaxed">
                  Flujo recomendado: finaliza y guarda el Top 3, publica ganadores si quieres mostrarlos, luego reinicia puntos para una nueva temporada.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="font-black uppercase italic px-2 text-gray-400 text-xs flex items-center gap-2">
                <History size={16} /> Historial Cronológico
              </h2>

              {sortedSeasons.map((season, index) => (
                <div
                  key={season.id}
                  className="bg-white rounded-[32px] p-5 shadow-sm border border-gray-100 space-y-4"
                >
                  <div className="flex justify-between items-center border-b pb-3 border-gray-50">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center font-black text-[10px]">
                        #{sortedSeasons.length - index}
                      </div>
                      <p className="font-black text-sm uppercase italic">{season.name}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => window.confirm('¿Borrar?') && context.deleteSeason(season.id)}
                      className="text-red-400 p-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                    {(season.winners || []).map((winner: any, winnerIndex: number) => (
                      <div
                        key={winnerIndex}
                        className="bg-white p-2.5 rounded-xl flex items-center gap-3 shadow-sm border border-gray-100"
                      >
                        <span className="font-black text-[10px] w-6 italic text-gray-400">
                          {winnerIndex + 1}º
                        </span>
                        <div className="flex-1 min-w-0 leading-none">
                          <p className="text-[10px] font-black uppercase truncate">
                            {winner?.name}
                          </p>
                          <input
                            placeholder="Pegar link de foto..."
                            className="w-full text-[9px] font-bold text-blue-500 outline-none bg-transparent mt-2 italic"
                            value={winner?.photo_url || ''}
                            onChange={event => {
                              const nextWinners = [...(season.winners || [])];
                              nextWinners[winnerIndex].photo_url = event.target.value;
                              context.updateSeasonWinners(season.id, nextWinners);
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      context.toggleSeasonVisibility(season.id, !season.is_published)
                    }
                    className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase shadow-md transition-all ${
                      season.is_published
                        ? 'bg-green-500 text-white shadow-green-100'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {season.is_published ? '✅ Visible en Ranking' : 'Publicar Ganadores'}
                  </button>
                </div>
              ))}
            </section>
          </div>
        )}

        {tab === 'branding' && (
          <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <section className="bg-white rounded-[32px] p-6 shadow-xl border border-orange-100 space-y-5">
              <div className="flex items-center gap-3 border-b pb-4 border-gray-50">
                <div className="p-3 bg-orange-100 rounded-2xl text-orange-600">
                  <Image size={22} />
                </div>
                <h2 className="font-black text-lg uppercase italic">Marca y Avisos</h2>
              </div>

              <div className="flex items-center gap-4 bg-orange-50/50 rounded-[28px] p-4 border border-orange-100">
                <img
                  src={safeExtraSettings.logo_url || '/logo-final.png'}
                  className="w-20 h-20 object-contain rounded-2xl bg-white p-2 shadow-sm"
                  alt="Logo actual"
                />
                <div>
                  <p className="text-xs font-black uppercase text-gray-900">
                    La Casa del Pollazo
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 mt-1">
                    Control básico de marca, color y banner.
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-gray-400">
                  URL del logo
                </label>
                <input
                  value={safeExtraSettings.logo_url || ''}
                  onChange={event => context.updateExtraSettings({ logo_url: event.target.value })}
                  className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none outline-none shadow-inner"
                  placeholder="/logo-final.png"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-gray-400">
                  Anuncio superior
                </label>
                <textarea
                  value={safeSettings.announcement || ''}
                  onChange={event => context.setAnnouncement(event.target.value)}
                  className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none outline-none shadow-inner min-h-[90px] resize-none"
                  placeholder="Ej: Hoy delivery gratis desde $10..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-gray-400">
                  Color primario
                </label>
                <input
                  type="color"
                  value={safeSettings.primary_color || '#E67E22'}
                  onChange={event => context.updateSetting('primary_color', event.target.value)}
                  className="w-full h-14 bg-gray-50 rounded-xl p-2 border-none outline-none shadow-inner"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveBranding}
                disabled={savingBranding}
                className="w-full bg-black text-white py-5 rounded-[24px] font-black uppercase text-xs active:scale-95 shadow-xl flex items-center justify-center gap-2"
              >
                {savingBranding ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" /> Sincronizando...
                  </>
                ) : (
                  <>
                    <Save size={18} /> Sincronizar marca
                  </>
                )}
              </button>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {ranking.slice(0, 3).map((customer, index) => (
                <div key={customer.id} className="bg-white rounded-[28px] p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    {index === 0 ? (
                      <Crown size={18} className="text-yellow-500" />
                    ) : (
                      <Medal size={18} className="text-orange-400" />
                    )}
                    <p className="text-[10px] font-black uppercase text-gray-500">
                      Top {index + 1}
                    </p>
                  </div>
                  <p className="font-black text-xs uppercase truncate">
                    {customer.name || 'Cliente'}
                  </p>
                  <p className="text-orange-600 font-black text-sm mt-1">
                    {(customer.points || 0).toLocaleString()} pts
                  </p>
                </div>
              ))}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <AdminErrorBoundary>
      <AdminDashboardContent />
    </AdminErrorBoundary>
  );
}
