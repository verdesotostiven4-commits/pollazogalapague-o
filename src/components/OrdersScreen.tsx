import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  CheckCircle2,
  Clock3,
  MessageCircle,
  PackageSearch,
  RefreshCw,
  Repeat2,
  Search,
  ShoppingBag,
  Truck,
  UserCheck,
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';
import type { Category, Order, OrderStatus, Product, Screen } from '../types';

interface Props {
  onNavigate: (screen: Screen) => void;
  onOpenProfile: () => void;
  onOpenTracking: () => void;
}

type StatusFilter = 'active' | 'delivered' | 'cancelled' | 'all';

const WHATSAPP_NUMBER = '593989795628';
const ACTIVE_STATUSES: OrderStatus[] = ['Por Confirmar', 'Recibido', 'Preparando', 'Enviado'];
const VALID_CATEGORIES: Category[] = [
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

function cleanPhone(phone?: string | null) {
  return String(phone || '').replace(/\D/g, '').slice(-9);
}

function toNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const parsed = Number.parseFloat(
    String(value || '')
      .replace(',', '.')
      .replace(/[^0-9.-]/g, '')
  );

  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown) {
  return toNumber(value).toFixed(2);
}

function safeDate(order: Order) {
  return order.created_at || order.updated_at || '';
}

function formatDate(value?: string | null) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';

  return date.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function safeStatus(value?: string | null): OrderStatus {
  if (
    value === 'Por Confirmar' ||
    value === 'Recibido' ||
    value === 'Preparando' ||
    value === 'Enviado' ||
    value === 'Entregado' ||
    value === 'Cancelado'
  ) {
    return value;
  }

  return 'Por Confirmar';
}

function statusText(status: OrderStatus) {
  return status === 'Por Confirmar' ? 'Por confirmar' : status;
}

function statusTone(status: OrderStatus) {
  if (status === 'Entregado') return 'bg-green-50 text-green-600 border-green-100';
  if (status === 'Cancelado') return 'bg-red-50 text-red-500 border-red-100';
  if (status === 'Enviado') return 'bg-purple-50 text-purple-600 border-purple-100';
  if (status === 'Preparando') return 'bg-yellow-50 text-yellow-700 border-yellow-100';
  if (status === 'Recibido') return 'bg-blue-50 text-blue-600 border-blue-100';
  return 'bg-orange-50 text-orange-600 border-orange-100';
}

function statusIcon(status: OrderStatus) {
  if (status === 'Entregado') return <CheckCircle2 size={14} />;
  if (status === 'Enviado') return <Truck size={14} />;
  if (status === 'Preparando') return <ShoppingBag size={14} />;
  return <Clock3 size={14} />;
}

function safeItems(order: Order): any[] {
  return Array.isArray(order.items) ? order.items.filter(Boolean) : [];
}

function itemName(item: any) {
  return String(item?.name || item?.product?.name || 'Producto');
}

function itemImage(item: any) {
  return item?.image || item?.product?.image || '/logo-final.png';
}

function itemQuantity(item: any) {
  const quantity = Number(item?.quantity || 1);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

function itemUnitPrice(item: any) {
  const direct =
    toNumber(item?.custom_price) ||
    toNumber(item?.price) ||
    toNumber(item?.product?.custom_price) ||
    toNumber(item?.product?.price);

  if (direct > 0) return direct;

  const subtotal = toNumber(item?.subtotal);
  const quantity = itemQuantity(item);
  return subtotal > 0 ? subtotal / quantity : 0;
}

function itemSubtotal(item: any) {
  const subtotal = toNumber(item?.subtotal);
  if (subtotal > 0) return subtotal;
  return itemUnitPrice(item) * itemQuantity(item);
}

function orderItemCount(order: Order) {
  return safeItems(order).reduce((sum, item) => sum + itemQuantity(item), 0);
}

function normalizeCategory(value: unknown): Category {
  const category = String(value || '').trim();
  return VALID_CATEGORIES.includes(category as Category) ? (category as Category) : 'Abarrotes y básicos';
}

function productFromOrderItem(item: any, order: Order, index: number): Product {
  const snapshot = item?.product || {};
  const price = itemUnitPrice(item);

  return {
    ...snapshot,
    id: String(item?.product_id || item?.cart_item_id || snapshot?.id || item?.id || `${order.order_code || 'pedido'}-${index}`),
    name: itemName(item),
    category: normalizeCategory(item?.category || snapshot?.category),
    subcategory: snapshot?.subcategory || null,
    description: snapshot?.description || null,
    unit: snapshot?.unit || null,
    badge: snapshot?.badge || null,
    price: price > 0 ? `$${price.toFixed(2)}` : item?.price_text || snapshot?.price || 'Consultar precio',
    image: itemImage(item),
    custom_price: toNumber(item?.custom_price || snapshot?.custom_price) || undefined,
    available: true,
  };
}

function GuestOrders({ onOpenProfile, onNavigate }: Pick<Props, 'onOpenProfile' | 'onNavigate'>) {
  return (
    <div className="min-h-full bg-gradient-to-b from-orange-50/70 via-white to-white px-4 pt-5 pb-32 space-y-4">
      <section className="relative overflow-hidden rounded-[42px] bg-gradient-to-br from-orange-500 via-orange-400 to-yellow-400 text-white p-6 shadow-2xl shadow-orange-100">
        <div className="relative">
          <div className="w-17 h-17 rounded-[28px] bg-white/20 border border-white/25 flex items-center justify-center mb-5 shadow-inner">
            <PackageSearch size={38} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/75">Mis pedidos</p>
          <h1 className="text-4xl font-black uppercase italic leading-none mt-2 tracking-tight">Tu historial empieza aquí</h1>
          <p className="text-sm font-bold text-white/85 leading-relaxed mt-4">
            Identifícate con tu WhatsApp para ver estados, historial y repetir compras.
          </p>
          <button
            type="button"
            onClick={onOpenProfile}
            className="mt-6 w-full bg-white text-orange-600 rounded-[26px] px-6 py-4 text-xs font-black uppercase tracking-widest active:scale-95 transition-transform shadow-xl shadow-orange-700/10 flex items-center justify-center gap-2"
          >
            <UserCheck size={17} />
            Identificarme con WhatsApp
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <section className="bg-white rounded-[32px] border border-orange-100 p-5 shadow-sm">
        <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Tip Pollazo</p>
        <h2 className="text-base font-black text-gray-950 uppercase italic leading-none mt-1">Primero arma tu pedido</h2>
        <p className="text-[11px] font-bold text-gray-500 leading-relaxed mt-2">
          Puedes mirar el catálogo, agregar productos y registrarte al confirmar.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('catalog')}
          className="mt-4 w-full bg-orange-50 text-orange-600 border border-orange-100 rounded-[22px] py-3 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          Ver catálogo
          <ArrowRight size={15} />
        </button>
      </section>
    </div>
  );
}

export default function OrdersScreen({ onNavigate, onOpenProfile, onOpenTracking }: Props) {
  const { orders, loading, refreshData } = useAdmin();
  const { addItem, clearCart } = useCart();
  const { customerPhone, customerName } = useUser();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const cleanCustomerPhone = cleanPhone(customerPhone);

  const customerOrders = useMemo(() => {
    if (!cleanCustomerPhone) return [];

    return [...(orders || [])]
      .filter(order => cleanPhone(order?.customer_phone) === cleanCustomerPhone)
      .sort((a, b) => {
        const dateA = new Date(safeDate(a)).getTime() || 0;
        const dateB = new Date(safeDate(b)).getTime() || 0;
        return dateB - dateA;
      });
  }, [cleanCustomerPhone, orders]);

  const stats = useMemo(() => {
    const active = customerOrders.filter(order => ACTIVE_STATUSES.includes(safeStatus(order.status))).length;
    const delivered = customerOrders.filter(order => safeStatus(order.status) === 'Entregado');
    const spent = delivered.reduce((sum, order) => sum + toNumber(order.total), 0);
    return { active, delivered: delivered.length, spent };
  }, [customerOrders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return customerOrders.filter(order => {
      const status = safeStatus(order.status);
      if (statusFilter === 'active' && !ACTIVE_STATUSES.includes(status)) return false;
      if (statusFilter === 'delivered' && status !== 'Entregado') return false;
      if (statusFilter === 'cancelled' && status !== 'Cancelado') return false;

      if (!query) return true;

      const haystack = [
        order.order_code,
        status,
        order.total,
        order.reference,
        ...safeItems(order).map(itemName),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [customerOrders, search, statusFilter]);

  const repeatOrder = (order: Order) => {
    const items = safeItems(order);

    if (items.length === 0) {
      setNotice('Este pedido no tiene productos para repetir.');
      return;
    }

    clearCart();
    items.forEach((item, index) => {
      addItem(productFromOrderItem(item, order, index), itemQuantity(item));
    });

    setNotice('Pedido agregado al carrito.');
    window.setTimeout(() => {
      setNotice('');
      onNavigate('cart');
    }, 700);
  };

  const askHelp = (order: Order) => {
    const message = encodeURIComponent(`Hola, necesito ayuda con mi pedido ${order.order_code || ''} en La Casa del Pollazo.`);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
  };

  if (!cleanCustomerPhone) {
    return <GuestOrders onOpenProfile={onOpenProfile} onNavigate={onNavigate} />;
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-orange-50/70 via-white to-white px-4 pt-4 pb-32 space-y-4">
      <section className="relative overflow-hidden rounded-[36px] bg-white border border-orange-100 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.25em]">Mi historial Pollazo</p>
            <h1 className="text-3xl font-black text-gray-950 uppercase italic leading-none mt-2">Mis pedidos</h1>
            <p className="text-[12px] font-bold text-gray-500 mt-2 leading-relaxed">
              {customerName ? `${customerName}, ` : ''}aquí puedes revisar tus compras.
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
            <p className="text-xl font-black text-orange-600 leading-none">{stats.active}</p>
            <p className="text-[8px] font-black text-orange-500 uppercase mt-2">Activos</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-[22px] p-3">
            <p className="text-xl font-black text-green-600 leading-none">{stats.delivered}</p>
            <p className="text-[8px] font-black text-green-600 uppercase mt-2">Entregados</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-100 rounded-[22px] p-3">
            <p className="text-xl font-black text-yellow-700 leading-none">${money(stats.spent)}</p>
            <p className="text-[8px] font-black text-yellow-700 uppercase mt-2">Comprado</p>
          </div>
        </div>
      </section>

      {notice && (
        <div className="bg-green-50 border border-green-100 rounded-[24px] p-4 text-[11px] font-black text-green-700 uppercase leading-relaxed">
          {notice}
        </div>
      )}

      <section className="bg-white rounded-[32px] border border-orange-100 p-4 shadow-sm space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-300" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Buscar pedido o producto..."
            className="w-full bg-orange-50/60 border border-orange-100 rounded-2xl py-4 pl-11 pr-4 text-sm font-bold text-gray-800 outline-none focus:border-orange-300"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            ['active', 'Activos'],
            ['delivered', 'Entregados'],
            ['cancelled', 'Cancelados'],
            ['all', 'Todos'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setStatusFilter(id as StatusFilter)}
              className={`flex-shrink-0 px-4 py-3 rounded-2xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                statusFilter === id
                  ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-100'
                  : 'bg-white text-gray-400 border-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {loading && customerOrders.length === 0 ? (
        <section className="bg-white rounded-[32px] border border-orange-100 p-8 text-center shadow-sm">
          <RefreshCw size={34} className="mx-auto text-orange-500 animate-spin mb-4" />
          <p className="text-xs font-black text-gray-500 uppercase">Cargando tus pedidos...</p>
        </section>
      ) : filteredOrders.length === 0 ? (
        <section className="bg-white rounded-[32px] border border-orange-100 p-8 text-center shadow-sm">
          <PackageSearch size={36} className="mx-auto text-orange-500 mb-4" />
          <h3 className="text-xl font-black text-gray-950 uppercase italic leading-none">
            {customerOrders.length === 0 ? 'Aún no tienes pedidos' : 'No encontramos pedidos'}
          </h3>
          <p className="text-sm font-bold text-gray-400 leading-relaxed mt-3">
            {customerOrders.length === 0
              ? 'Cuando hagas tu primera compra aparecerá aquí con fecha, estado y detalle.'
              : 'Prueba cambiando el filtro o buscando otro producto.'}
          </p>
          <button
            type="button"
            onClick={customerOrders.length === 0 ? () => onNavigate('catalog') : () => { setStatusFilter('active'); setSearch(''); }}
            className="mt-6 bg-gradient-to-r from-orange-500 to-yellow-400 text-white px-6 py-4 rounded-[24px] text-xs font-black uppercase tracking-widest shadow-xl shadow-orange-100 active:scale-95 transition-transform"
          >
            {customerOrders.length === 0 ? 'Ir al catálogo' : 'Limpiar'}
          </button>
        </section>
      ) : (
        <section className="space-y-3">
          {filteredOrders.map((order, index) => {
            const status = safeStatus(order.status);
            const active = ACTIVE_STATUSES.includes(status);
            const items = safeItems(order);
            const count = orderItemCount(order);

            return (
              <article key={String(order.id || order.order_code || index)} className="bg-white rounded-[32px] border border-orange-100 p-4 shadow-sm active:scale-[0.99] transition-transform">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[8px] font-black uppercase ${statusTone(status)}`}>
                      {statusIcon(status)}
                      {statusText(status)}
                    </span>
                    <h3 className="text-sm font-black text-gray-950 uppercase mt-3 leading-none">{order.order_code || 'Pedido'}</h3>
                    <p className="text-[10px] font-bold text-gray-400 mt-2">
                      <CalendarDays size={12} className="inline mr-1" />
                      {formatDate(safeDate(order))} · {count} producto{count === 1 ? '' : 's'}
                    </p>
                  </div>
                  <p className="text-xl font-black text-orange-600 leading-none">${money(order.total)}</p>
                </div>

                <div className="mt-4 bg-orange-50/60 border border-orange-100/70 rounded-[24px] p-3 space-y-2">
                  {items.length === 0 ? (
                    <p className="text-[10px] font-black text-gray-400 uppercase">Sin productos guardados</p>
                  ) : (
                    items.slice(0, 4).map((item, itemIndex) => (
                      <div key={`${itemName(item)}-${itemIndex}`} className="flex items-center gap-3 text-[10px] font-bold">
                        <img src={itemImage(item)} alt={itemName(item)} className="w-9 h-9 object-contain rounded-xl bg-white border border-orange-100 p-1 flex-shrink-0" />
                        <span className="min-w-0 flex-1 truncate text-gray-600">
                          <span className="font-black text-orange-500">{itemQuantity(item)}x</span> {itemName(item)}
                        </span>
                        <span className="text-gray-400 font-black flex-shrink-0">${money(itemSubtotal(item))}</span>
                      </div>
                    ))
                  )}
                  {items.length > 4 && (
                    <p className="text-[9px] font-black text-orange-500 uppercase">+{items.length - 4} productos más</p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => repeatOrder(order)}
                    className="bg-orange-50 text-orange-600 border border-orange-100 rounded-2xl py-3 text-[9px] font-black uppercase active:scale-95 transition-transform flex items-center justify-center gap-1"
                  >
                    <Repeat2 size={14} />
                    Repetir
                  </button>
                  <button
                    type="button"
                    onClick={active ? onOpenTracking : () => askHelp(order)}
                    className="bg-orange-500 text-white rounded-2xl py-3 text-[9px] font-black uppercase active:scale-95 transition-transform flex items-center justify-center gap-1 shadow-lg shadow-orange-100"
                  >
                    <Truck size={14} />
                    {active ? 'Estado' : 'Ayuda'}
                  </button>
                  <button
                    type="button"
                    onClick={() => askHelp(order)}
                    className="bg-green-50 text-green-600 border border-green-100 rounded-2xl py-3 text-[9px] font-black uppercase active:scale-95 transition-transform flex items-center justify-center gap-1"
                  >
                    <MessageCircle size={14} />
                    Chat
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
