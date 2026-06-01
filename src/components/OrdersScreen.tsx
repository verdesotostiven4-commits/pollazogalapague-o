import { useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Crown,
  Gift,
  MessageCircle,
  PackageSearch,
  ReceiptText,
  RefreshCw,
  Repeat2,
  Search,
  ShoppingBag,
  Star,
  Truck,
  X,
  XCircle,
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';
import type {
  Category,
  Order,
  OrderItem,
  OrderStatus,
  PaymentStatus,
  Product,
  Screen,
} from '../types';

interface Props {
  onNavigate: (screen: Screen) => void;
  onOpenProfile: () => void;
  onOpenTracking: () => void;
}

type StatusFilter = 'active' | 'delivered' | 'cancelled' | 'all';
type RangeFilter = '7d' | '15d' | '30d' | '3m' | '6m' | 'all';
type RepeatMode = 'replace' | 'add';

const WHATSAPP_NUMBER = '593989795628';

const STATUS_FILTERS: Array<{
  id: StatusFilter;
  label: string;
  short: string;
}> = [
  { id: 'active', label: 'Activos', short: 'Activos' },
  { id: 'delivered', label: 'Entregados', short: 'OK' },
  { id: 'cancelled', label: 'Cancelados', short: 'Cancel.' },
  { id: 'all', label: 'Todos', short: 'Todos' },
];

const RANGE_FILTERS: Array<{
  id: RangeFilter;
  label: string;
}> = [
  { id: '7d', label: '7 días' },
  { id: '15d', label: '15 días' },
  { id: '30d', label: '30 días' },
  { id: '3m', label: '3 meses' },
  { id: '6m', label: '6 meses' },
  { id: 'all', label: 'Todo' },
];

const ACTIVE_STATUSES: OrderStatus[] = [
  'Por Confirmar',
  'Recibido',
  'Preparando',
  'Enviado',
];

const cleanPhoneTail = (phone?: string | null) => {
  return String(phone || '').replace(/\D/g, '').slice(-9);
};

const toNumber = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const raw = String(value || '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');

  const parsed = Number.parseFloat(raw);

  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value: unknown) => {
  return toNumber(value).toFixed(2);
};

const getOrderDate = (order: Order) => {
  return order.created_at || order.updated_at || '';
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Sin fecha';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Sin fecha';

  return date.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatTime = (value?: string | null) => {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleTimeString('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const rangeToMs = (range: RangeFilter) => {
  const day = 24 * 60 * 60 * 1000;

  if (range === '7d') return day * 7;
  if (range === '15d') return day * 15;
  if (range === '30d') return day * 30;
  if (range === '3m') return day * 90;
  if (range === '6m') return day * 180;

  return Infinity;
};

const statusTone = (status: OrderStatus) => {
  if (status === 'Por Confirmar') {
    return 'bg-orange-50 text-orange-600 border-orange-100';
  }

  if (status === 'Recibido') {
    return 'bg-blue-50 text-blue-600 border-blue-100';
  }

  if (status === 'Preparando') {
    return 'bg-yellow-50 text-yellow-700 border-yellow-100';
  }

  if (status === 'Enviado') {
    return 'bg-purple-50 text-purple-600 border-purple-100';
  }

  if (status === 'Entregado') {
    return 'bg-green-50 text-green-600 border-green-100';
  }

  return 'bg-red-50 text-red-500 border-red-100';
};

const statusIcon = (status: OrderStatus) => {
  if (status === 'Entregado') return <CheckCircle2 size={15} />;
  if (status === 'Cancelado') return <XCircle size={15} />;
  if (status === 'Enviado') return <Truck size={15} />;
  if (status === 'Preparando') return <ShoppingBag size={15} />;

  return <Clock3 size={15} />;
};

const paymentLabel = (status?: PaymentStatus | null) => {
  if (status === 'contra_entrega') return 'Contra entrega';
  if (status === 'validando') return 'Validando pago';
  if (status === 'confirmado') return 'Pago confirmado';
  if (status === 'rechazado') return 'Pago rechazado';
  if (status === 'pendiente') return 'Pago pendiente';

  return 'Pago pendiente';
};

const paymentTone = (status?: PaymentStatus | null) => {
  if (status === 'confirmado') return 'text-green-600 bg-green-50 border-green-100';
  if (status === 'validando') return 'text-blue-600 bg-blue-50 border-blue-100';
  if (status === 'rechazado') return 'text-red-500 bg-red-50 border-red-100';
  if (status === 'contra_entrega') return 'text-orange-600 bg-orange-50 border-orange-100';

  return 'text-gray-500 bg-gray-50 border-gray-100';
};

const isActiveOrder = (order: Order) => {
  return ACTIVE_STATUSES.includes(order.status);
};

const getOrderItemsCount = (order: Order) => {
  return (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 1), 0);
};

const getItemUnitPrice = (item: OrderItem) => {
  const quantity = Math.max(1, Number(item.quantity || 1));

  const direct =
    toNumber(item.custom_price) ||
    toNumber(item.price) ||
    toNumber(item.product?.custom_price) ||
    toNumber(item.product?.price);

  if (direct > 0) return direct;

  const subtotal = toNumber(item.subtotal);

  if (subtotal > 0) {
    return subtotal / quantity;
  }

  return 0;
};

const normalizeCategory = (value: unknown): Category => {
  const category = String(value || '').trim();

  const validCategories: Category[] = [
    'Pollos',
    'Embutidos',
    'Lácteos y refrigerados',
    'Abarrotes y básicos',
    'Salsas, aliños y aceites',
    'Bebidas',
    'Frutas y verduras',
    'Snacks y dulces',
    'Cuidado personal',
    'Limpieza y hogar',
  ];

  return validCategories.includes(category as Category)
    ? (category as Category)
    : 'Abarrotes y básicos';
};

const itemToProduct = (item: OrderItem, index: number, orderCode: string): Product => {
  const unitPrice = getItemUnitPrice(item);
  const snapshot = item.product;
  const customPrice =
    toNumber(item.custom_price) > 0
      ? toNumber(item.custom_price)
      : toNumber(snapshot?.custom_price) > 0
        ? toNumber(snapshot?.custom_price)
        : undefined;

  const id =
    item.product_id ||
    item.cart_item_id ||
    snapshot?.id ||
    item.id ||
    `repeat-${orderCode}-${index}`;

  return {
    ...(snapshot || {}),
    id: String(id),
    name: item.name || snapshot?.name || 'Producto',
    category: normalizeCategory(item.category || snapshot?.category),
    price:
      unitPrice > 0
        ? `$${unitPrice.toFixed(2)}`
        : item.price_text || snapshot?.price || 'Consultar precio',
    image: item.image || snapshot?.image || null,
    custom_price: customPrice,
    available: true,
  };
};

function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <section className="bg-white rounded-[32px] border border-orange-100 p-8 text-center shadow-sm">
      <div className="w-20 h-20 rounded-[30px] bg-orange-50 text-orange-500 flex items-center justify-center mx-auto mb-5">
        <PackageSearch size={36} />
      </div>

      <h3 className="text-xl font-black text-gray-950 uppercase italic leading-none">
        {title}
      </h3>

      <p className="text-sm font-bold text-gray-400 leading-relaxed mt-3">
        {message}
      </p>

      <button
        type="button"
        onClick={onAction}
        className="mt-6 bg-gradient-to-r from-orange-500 to-yellow-400 text-white px-6 py-4 rounded-[24px] text-xs font-black uppercase tracking-widest shadow-xl shadow-orange-100 active:scale-95 transition-transform"
      >
        {actionLabel}
      </button>
    </section>
  );
}

function OrderMiniItems({ order }: { order: Order }) {
  const visibleItems = (order.items || []).slice(0, 3);
  const hiddenCount = Math.max(0, (order.items || []).length - visibleItems.length);

  return (
    <div className="space-y-1.5">
      {visibleItems.map((item, index) => (
        <div
          key={`${item.name}-${index}`}
          className="flex items-center justify-between gap-3 text-[10px] font-bold"
        >
          <span className="min-w-0 truncate text-gray-600">
            <span className="font-black text-orange-500">
              {Number(item.quantity || 1)}x
            </span>{' '}
            {item.name || item.product?.name || 'Producto'}
          </span>

          <span className="text-gray-400 font-black flex-shrink-0">
            ${money(item.subtotal || getItemUnitPrice(item) * Number(item.quantity || 1))}
          </span>
        </div>
      ))}

      {hiddenCount > 0 && (
        <p className="text-[9px] font-black text-orange-500 uppercase">
          +{hiddenCount} producto{hiddenCount === 1 ? '' : 's'} más
        </p>
      )}
    </div>
  );
}

function OrderDetailSheet({
  order,
  onClose,
  onRepeat,
  onFeedback,
  onOpenTracking,
}: {
  order: Order | null;
  onClose: () => void;
  onRepeat: (order: Order) => void;
  onFeedback: (order: Order) => void;
  onOpenTracking: () => void;
}) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-[12000] flex items-end justify-center">
      <button
        type="button"
        aria-label="Cerrar detalle de pedido"
        onClick={onClose}
        className="absolute inset-0 bg-orange-950/25"
      />

      <section className="relative w-full max-w-md max-h-[88vh] bg-white rounded-t-[38px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
        <div className="bg-gradient-to-br from-orange-500 via-orange-400 to-yellow-400 text-white p-5 relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-36 h-36 bg-white/20 rounded-full blur-2xl" />

          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center active:scale-90 transition-transform z-10"
            aria-label="Cerrar"
          >
            <X size={19} />
          </button>

          <div className="relative pr-12">
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-white/75">
              Detalle de pedido
            </p>

            <h2 className="text-2xl font-black uppercase italic leading-none mt-2">
              {order.order_code || 'Pedido'}
            </h2>

            <p className="text-[11px] font-bold text-white/80 mt-2">
              {formatDate(getOrderDate(order))} · {formatTime(getOrderDate(order))}
            </p>

            <div className="mt-4 flex gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 bg-white/20 border border-white/25 rounded-full px-3 py-1.5 text-[9px] font-black uppercase">
                {statusIcon(order.status)}
                {order.status}
              </span>

              {order.membership_applied && (
                <span className="inline-flex items-center gap-1 bg-yellow-200 text-yellow-900 border border-yellow-100 rounded-full px-3 py-1.5 text-[9px] font-black uppercase">
                  <Crown size={12} />
                  Plus aplicado
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 overflow-y-auto max-h-[calc(88vh-210px)] space-y-4">
          <div className="bg-orange-50/70 border border-orange-100 rounded-[28px] p-4">
            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-3">
              Productos
            </p>

            <div className="space-y-2">
              {(order.items || []).map((item, index) => {
                const quantity = Number(item.quantity || 1);
                const lineTotal = toNumber(item.subtotal || getItemUnitPrice(item) * quantity);

                return (
                  <div
                    key={`${item.name}-${index}`}
                    className="bg-white rounded-2xl border border-orange-100 p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-gray-900 uppercase truncate">
                        {quantity}x {item.name || item.product?.name || 'Producto'}
                      </p>
                      <p className="text-[9px] font-bold text-gray-400 mt-1">
                        Unitario ${money(getItemUnitPrice(item))}
                      </p>
                    </div>

                    <span className="text-sm font-black text-orange-600">
                      ${money(lineTotal)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {Array.isArray(order.bonus_items) && order.bonus_items.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-[28px] p-4">
              <p className="text-[10px] font-black text-yellow-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Gift size={14} />
                Regalos Plus
              </p>

              <div className="space-y-2">
                {order.bonus_items.map((gift, index) => (
                  <div
                    key={`${gift.item_name}-${index}`}
                    className="bg-white rounded-2xl p-3 border border-yellow-100"
                  >
                    <p className="text-[11px] font-black text-gray-900 uppercase">
                      {Number(gift.quantity || 1)}x {gift.item_name}
                    </p>
                    {gift.message && (
                      <p className="text-[10px] font-bold text-gray-400 mt-1">
                        {gift.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-[24px] p-4 border border-gray-100">
              <p className="text-[9px] font-black text-gray-400 uppercase">
                Pago
              </p>
              <p className={`mt-2 inline-flex px-2 py-1 rounded-xl border text-[9px] font-black uppercase ${paymentTone(order.payment_status)}`}>
                {paymentLabel(order.payment_status)}
              </p>
            </div>

            <div className="bg-gray-50 rounded-[24px] p-4 border border-gray-100">
              <p className="text-[9px] font-black text-gray-400 uppercase">
                Entrega
              </p>
              <p className="text-[11px] font-black text-gray-700 uppercase mt-2">
                {order.delivery_type || 'domicilio'}
              </p>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-[28px] p-4 shadow-sm">
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-bold text-gray-500">
                <span>Subtotal</span>
                <span>${money(order.subtotal)}</span>
              </div>

              <div className="flex justify-between text-[11px] font-bold text-gray-500">
                <span>Delivery</span>
                <span>
                  {toNumber(order.delivery_fee || order.delivery_fee_final) <= 0
                    ? 'Gratis'
                    : `$${money(order.delivery_fee || order.delivery_fee_final)}`}
                </span>
              </div>

              <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                <span className="text-xs font-black text-gray-900 uppercase">
                  Total
                </span>
                <span className="text-2xl font-black text-orange-600">
                  ${money(order.total)}
                </span>
              </div>
            </div>
          </div>

          {order.reference && (
            <div className="bg-orange-50 border border-orange-100 rounded-[24px] p-4">
              <p className="text-[9px] font-black text-orange-600 uppercase">
                Referencia de entrega
              </p>
              <p className="text-[11px] font-bold text-orange-800 mt-1 leading-relaxed">
                {order.reference}
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 bg-white px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+16px)] grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onRepeat(order)}
            className="bg-orange-50 text-orange-600 border border-orange-100 rounded-[22px] py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Repeat2 size={16} />
            Repetir
          </button>

          {isActiveOrder(order) ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenTracking();
              }}
              className="bg-orange-500 text-white rounded-[22px] py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-orange-100"
            >
              <Truck size={16} />
              Ver estado
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onFeedback(order)}
              className="bg-green-500 text-white rounded-[22px] py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-green-100"
            >
              <MessageCircle size={16} />
              Opinar
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function RepeatChoiceSheet({
  order,
  onClose,
  onConfirm,
}: {
  order: Order | null;
  onClose: () => void;
  onConfirm: (mode: RepeatMode) => void;
}) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-[12100] flex items-end justify-center">
      <button
        type="button"
        aria-label="Cerrar repetir pedido"
        onClick={onClose}
        className="absolute inset-0 bg-orange-950/25"
      />

      <section className="relative w-full max-w-md bg-white rounded-t-[34px] p-5 shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        <div className="pr-10">
          <div className="w-14 h-14 rounded-[24px] bg-orange-50 text-orange-500 flex items-center justify-center mb-4">
            <Repeat2 size={28} />
          </div>

          <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.25em]">
            Repetir pedido
          </p>

          <h3 className="text-2xl font-black text-gray-950 uppercase italic leading-none mt-2">
            ¿Cómo quieres agregarlo?
          </h3>

          <p className="text-[12px] font-bold text-gray-500 mt-3 leading-relaxed">
            Ya tienes productos en el carrito. Puedes reemplazarlos o sumar este pedido a lo que ya tienes.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 mt-5">
          <button
            type="button"
            onClick={() => onConfirm('replace')}
            className="w-full bg-orange-500 text-white rounded-[24px] py-4 font-black uppercase text-xs tracking-widest active:scale-95 transition-transform shadow-xl shadow-orange-100"
          >
            Reemplazar carrito
          </button>

          <button
            type="button"
            onClick={() => onConfirm('add')}
            className="w-full bg-orange-50 text-orange-600 border border-orange-100 rounded-[24px] py-4 font-black uppercase text-xs tracking-widest active:scale-95 transition-transform"
          >
            Agregar al carrito actual
          </button>
        </div>
      </section>
    </div>
  );
}

export default function OrdersScreen({
  onNavigate,
  onOpenProfile,
  onOpenTracking,
}: Props) {
  const { orders, loading, refreshData } = useAdmin();
  const { addItem, clearCart, items: cartItems } = useCart();
  const { customerPhone, customerName } = useUser();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('30d');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [repeatTarget, setRepeatTarget] = useState<Order | null>(null);
  const [notice, setNotice] = useState('');

  const cleanCustomerPhone = cleanPhoneTail(customerPhone);

  const customerOrders = useMemo(() => {
    if (!cleanCustomerPhone) return [];

    return [...(orders || [])]
      .filter(order => cleanPhoneTail(order.customer_phone) === cleanCustomerPhone)
      .sort((a, b) => {
        const dateA = new Date(a.created_at || a.updated_at || '').getTime();
        const dateB = new Date(b.created_at || b.updated_at || '').getTime();

        return dateB - dateA;
      });
  }, [cleanCustomerPhone, orders]);

  const stats = useMemo(() => {
    const delivered = customerOrders.filter(order => order.status === 'Entregado');
    const active = customerOrders.filter(isActiveOrder);
    const cancelled = customerOrders.filter(order => order.status === 'Cancelado');
    const spent = delivered.reduce((sum, order) => sum + toNumber(order.total), 0);

    const productMap = new Map<string, number>();

    delivered.forEach(order => {
      (order.items || []).forEach(item => {
        const name = item.name || item.product?.name || 'Producto';
        const quantity = Number(item.quantity || 1);

        productMap.set(name, (productMap.get(name) || 0) + quantity);
      });
    });

    const favorite =
      Array.from(productMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

    return {
      active: active.length,
      delivered: delivered.length,
      cancelled: cancelled.length,
      spent,
      favorite,
    };
  }, [customerOrders]);

  const filteredOrders = useMemo(() => {
    const now = Date.now();
    const rangeMs = rangeToMs(rangeFilter);
    const query = search.trim().toLowerCase();

    return customerOrders.filter(order => {
      if (statusFilter === 'active' && !isActiveOrder(order)) return false;
      if (statusFilter === 'delivered' && order.status !== 'Entregado') return false;
      if (statusFilter === 'cancelled' && order.status !== 'Cancelado') return false;

      if (Number.isFinite(rangeMs)) {
        const orderTime = new Date(getOrderDate(order)).getTime();

        if (!orderTime || Number.isNaN(orderTime) || now - orderTime > rangeMs) {
          return false;
        }
      }

      if (!query) return true;

      const haystack = [
        order.order_code,
        order.status,
        order.payment_status,
        order.total,
        order.reference,
        ...(order.items || []).map(item => item.name || item.product?.name || ''),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [customerOrders, rangeFilter, search, statusFilter]);

  const handleRepeatNow = (order: Order, mode: RepeatMode) => {
    if (mode === 'replace') {
      clearCart();
    }

    (order.items || []).forEach((item, index) => {
      const product = itemToProduct(item, index, order.order_code);
      const quantity = Math.max(1, Number(item.quantity || 1));

      addItem(product, quantity);
    });

    setRepeatTarget(null);
    setSelectedOrder(null);
    setNotice(`Pedido ${order.order_code || ''} agregado al carrito.`.trim());

    window.setTimeout(() => {
      setNotice('');
      onNavigate('cart');
    }, 650);
  };

  const requestRepeat = (order: Order) => {
    if (!order.items || order.items.length === 0) {
      setNotice('Este pedido no tiene productos para repetir.');
      return;
    }

    if (cartItems.length > 0) {
      setRepeatTarget(order);
      return;
    }

    handleRepeatNow(order, 'replace');
  };

  const handleFeedback = (order: Order) => {
    const message = encodeURIComponent(
      `Hola, quiero opinar sobre mi pedido ${order.order_code || ''} en La Casa del Pollazo.`
    );

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
  };

  const resetFilters = () => {
    setStatusFilter('active');
    setRangeFilter('30d');
    setSearch('');
  };

  if (!cleanCustomerPhone) {
    return (
      <div className="min-h-full bg-gradient-to-b from-orange-50/70 via-white to-white px-4 pt-5 pb-32">
        <section className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-orange-500 via-orange-400 to-yellow-400 text-white p-6 shadow-2xl shadow-orange-100">
          <div className="absolute -right-12 -top-12 w-40 h-40 bg-white/20 rounded-full blur-3xl" />
          <div className="relative">
            <div className="w-16 h-16 rounded-[26px] bg-white/20 flex items-center justify-center mb-5">
              <ReceiptText size={34} />
            </div>

            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/75">
              Historial Pollazo
            </p>

            <h1 className="text-3xl font-black uppercase italic leading-none mt-2">
              Tus pedidos en un solo lugar
            </h1>

            <p className="text-sm font-bold text-white/80 leading-relaxed mt-4">
              Identifícate con tu nombre y WhatsApp para ver tus pedidos, repetir compras y seguir tus estados.
            </p>

            <button
              type="button"
              onClick={onOpenProfile}
              className="mt-6 bg-white text-orange-600 rounded-[24px] px-6 py-4 text-xs font-black uppercase tracking-widest active:scale-95 transition-transform shadow-xl shadow-orange-700/10"
            >
              Identificarme
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-orange-50/70 via-white to-white px-4 pt-4 pb-32 space-y-4">
      <section className="relative overflow-hidden rounded-[36px] bg-white border border-orange-100 p-5 shadow-sm">
        <div className="absolute -right-14 -top-14 w-44 h-44 bg-orange-200/35 rounded-full blur-3xl" />

        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.25em]">
                Mi historial Pollazo
              </p>

              <h1 className="text-3xl font-black text-gray-950 uppercase italic leading-none mt-2">
                Mis pedidos
              </h1>

              <p className="text-[12px] font-bold text-gray-500 mt-2 leading-relaxed">
                {customerName ? `${customerName}, ` : ''}aquí puedes ver, repetir y revisar tus compras.
              </p>
            </div>

            <button
              type="button"
              onClick={() => refreshData()}
              className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center active:scale-90 transition-transform border border-orange-100"
              aria-label="Actualizar pedidos"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-5">
            <div className="bg-orange-50 border border-orange-100 rounded-[22px] p-3">
              <p className="text-xl font-black text-orange-600 leading-none">
                {stats.active}
              </p>
              <p className="text-[8px] font-black text-orange-500 uppercase mt-2">
                Activos
              </p>
            </div>

            <div className="bg-green-50 border border-green-100 rounded-[22px] p-3">
              <p className="text-xl font-black text-green-600 leading-none">
                {stats.delivered}
              </p>
              <p className="text-[8px] font-black text-green-600 uppercase mt-2">
                Entregados
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-100 rounded-[22px] p-3">
              <p className="text-xl font-black text-yellow-700 leading-none">
                ${money(stats.spent)}
              </p>
              <p className="text-[8px] font-black text-yellow-700 uppercase mt-2">
                Comprado
              </p>
            </div>
          </div>

          {stats.favorite && (
            <div className="mt-3 bg-white border border-orange-100 rounded-[24px] p-3 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-2xl bg-yellow-50 text-yellow-600 flex items-center justify-center">
                <Star size={18} />
              </div>

              <div className="min-w-0">
                <p className="text-[9px] font-black text-gray-400 uppercase">
                  Tu producto más repetido
                </p>
                <p className="text-[11px] font-black text-gray-900 uppercase truncate mt-1">
                  {stats.favorite}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {notice && (
        <div className="bg-green-50 border border-green-100 rounded-[24px] p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
          <p className="text-[11px] font-black text-green-700 uppercase leading-relaxed">
            {notice}
          </p>
        </div>
      )}

      <section className="bg-white rounded-[32px] border border-orange-100 p-4 shadow-sm space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-300" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Buscar por código, producto o estado..."
            className="w-full bg-orange-50/60 border border-orange-100 rounded-2xl py-4 pl-11 pr-4 text-sm font-bold text-gray-800 outline-none focus:border-orange-300"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {STATUS_FILTERS.map(filter => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStatusFilter(filter.id)}
              className={`flex-shrink-0 px-4 py-3 rounded-2xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                statusFilter === filter.id
                  ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-100'
                  : 'bg-white text-gray-400 border-gray-100'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <div className="flex-shrink-0 flex items-center gap-1 text-[9px] font-black text-orange-500 uppercase px-2">
            <CalendarDays size={13} />
            Periodo
          </div>

          {RANGE_FILTERS.map(filter => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setRangeFilter(filter.id)}
              className={`flex-shrink-0 px-3.5 py-2.5 rounded-xl border text-[9px] font-black uppercase transition-all ${
                rangeFilter === filter.id
                  ? 'bg-yellow-400 text-yellow-950 border-yellow-400'
                  : 'bg-gray-50 text-gray-400 border-gray-100'
              }`}
            >
              {filter.label}
            </button>
          ))}

          {(statusFilter !== 'active' || rangeFilter !== '30d' || search) && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex-shrink-0 px-3.5 py-2.5 rounded-xl bg-gray-900 text-white text-[9px] font-black uppercase"
            >
              Limpiar
            </button>
          )}
        </div>
      </section>

      {loading && customerOrders.length === 0 ? (
        <section className="bg-white rounded-[32px] border border-orange-100 p-8 text-center shadow-sm">
          <RefreshCw size={34} className="mx-auto text-orange-500 animate-spin mb-4" />
          <p className="text-xs font-black text-gray-500 uppercase">
            Cargando tus pedidos...
          </p>
        </section>
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          title={customerOrders.length === 0 ? 'Aún no tienes pedidos' : 'No encontramos pedidos'}
          message={
            customerOrders.length === 0
              ? 'Cuando hagas tu primera compra, aparecerá aquí con fecha, estado y opción para repetir.'
              : 'Prueba cambiando el periodo, limpiando filtros o buscando otro producto.'
          }
          actionLabel={customerOrders.length === 0 ? 'Ir al catálogo' : 'Limpiar filtros'}
          onAction={customerOrders.length === 0 ? () => onNavigate('catalog') : resetFilters}
        />
      ) : (
        <section className="space-y-3">
          {filteredOrders.map(order => {
            const itemCount = getOrderItemsCount(order);
            const active = isActiveOrder(order);

            return (
              <article
                key={order.id}
                className="bg-white rounded-[32px] border border-orange-100 p-4 shadow-sm active:scale-[0.99] transition-transform"
              >
                <button
                  type="button"
                  onClick={() => setSelectedOrder(order)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[8px] font-black uppercase ${statusTone(order.status)}`}>
                          {statusIcon(order.status)}
                          {order.status}
                        </span>

                        {order.membership_applied && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-100 text-[8px] font-black uppercase">
                            <Crown size={11} />
                            Plus
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-black text-gray-950 uppercase mt-3 leading-none">
                        {order.order_code || 'Pedido'}
                      </h3>

                      <p className="text-[10px] font-bold text-gray-400 mt-2">
                        {formatDate(getOrderDate(order))} · {formatTime(getOrderDate(order))} · {itemCount} producto{itemCount === 1 ? '' : 's'}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-black text-orange-600 leading-none">
                        ${money(order.total)}
                      </p>
                      <p className={`inline-flex mt-2 px-2 py-1 rounded-lg border text-[8px] font-black uppercase ${paymentTone(order.payment_status)}`}>
                        {paymentLabel(order.payment_status)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 bg-orange-50/60 border border-orange-100/70 rounded-[24px] p-3">
                    <OrderMiniItems order={order} />
                  </div>
                </button>

                <div className="grid grid-cols-3 gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(order)}
                    className="bg-gray-50 text-gray-600 border border-gray-100 rounded-2xl py-3 text-[9px] font-black uppercase active:scale-95 transition-transform flex items-center justify-center gap-1"
                  >
                    <ChevronDown size={14} />
                    Detalle
                  </button>

                  <button
                    type="button"
                    onClick={() => requestRepeat(order)}
                    className="bg-orange-50 text-orange-600 border border-orange-100 rounded-2xl py-3 text-[9px] font-black uppercase active:scale-95 transition-transform flex items-center justify-center gap-1"
                  >
                    <Repeat2 size={14} />
                    Repetir
                  </button>

                  {active ? (
                    <button
                      type="button"
                      onClick={onOpenTracking}
                      className="bg-orange-500 text-white rounded-2xl py-3 text-[9px] font-black uppercase active:scale-95 transition-transform flex items-center justify-center gap-1 shadow-lg shadow-orange-100"
                    >
                      <Truck size={14} />
                      Estado
                    </button>
                  ) : order.status === 'Entregado' ? (
                    <button
                      type="button"
                      onClick={() => handleFeedback(order)}
                      className="bg-green-50 text-green-600 border border-green-100 rounded-2xl py-3 text-[9px] font-black uppercase active:scale-95 transition-transform flex items-center justify-center gap-1"
                    >
                      <MessageCircle size={14} />
                      Opinar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className="bg-red-50 text-red-500 border border-red-100 rounded-2xl py-3 text-[9px] font-black uppercase active:scale-95 transition-transform flex items-center justify-center gap-1"
                    >
                      <AlertCircle size={14} />
                      Ver
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      <OrderDetailSheet
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onRepeat={requestRepeat}
        onFeedback={handleFeedback}
        onOpenTracking={onOpenTracking}
      />

      <RepeatChoiceSheet
        order={repeatTarget}
        onClose={() => setRepeatTarget(null)}
        onConfirm={mode => {
          if (repeatTarget) {
            handleRepeatNow(repeatTarget, mode);
          }
        }}
      />
    </div>
  );
}
