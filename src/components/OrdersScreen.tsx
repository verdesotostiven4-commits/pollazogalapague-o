import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MessageCircle,
  PackageCheck,
  PackageSearch,
  ReceiptText,
  Repeat2,
  Search,
  ShoppingBag,
  Truck,
  UserCheck,
  X,
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

type StatusFilter = 'active' | 'delivered' | 'all';
type NoticeTone = 'success' | 'warning' | 'info';

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

function cleanId(value: unknown) {
  return String(value || '').trim();
}

function normalizeText(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
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

function dateMs(order: Order) {
  const time = new Date(safeDate(order)).getTime();
  return Number.isFinite(time) ? time : 0;
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
  if (status === 'Por Confirmar') return 'Por confirmar';
  return status;
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

function orderSubtotal(order: Order) {
  return safeItems(order).reduce((sum, item) => sum + itemSubtotal(item), 0);
}

function orderDelivery(order: Order) {
  return toNumber((order as any).delivery_fee);
}

function orderTotal(order: Order) {
  const total = toNumber(order.total);
  if (total > 0) return total;
  return orderSubtotal(order) + orderDelivery(order);
}

function normalizeCategory(value: unknown): Category {
  const category = String(value || '').trim();
  return VALID_CATEGORIES.includes(category as Category) ? (category as Category) : 'Abarrotes y básicos';
}

function productFromOrderItem(item: any, order: Order, index: number, available = true): Product {
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
    available,
  };
}

function findCurrentProduct(item: any, products: Product[]) {
  const itemIds = [
    item?.product_id,
    item?.cart_item_id,
    item?.product?.id,
    item?.id,
  ].map(cleanId).filter(Boolean);
  const name = normalizeText(itemName(item));

  return products.find(product => {
    const productId = cleanId(product.id);
    const productName = normalizeText(product.name);
    return itemIds.includes(productId) || itemIds.some(id => id.startsWith(`${productId}-`)) || productName === name;
  }) || null;
}

function itemUnavailable(item: any, products: Product[], overrides: Record<string, { available?: boolean | null }>) {
  const currentProduct = findCurrentProduct(item, products);
  if (!currentProduct) return false;

  const override = overrides[currentProduct.id];
  const available = override?.available ?? currentProduct.available;
  const rawCurrent = currentProduct as any;
  const stockTracked = Boolean(rawCurrent.track_stock);
  const stock = toNumber(rawCurrent.current_stock);

  return available === false || (stockTracked && stock <= 0);
}

function GuestOrders({ onOpenProfile, onNavigate }: Pick<Props, 'onOpenProfile' | 'onNavigate'>) {
  return (
    <div className="min-h-full bg-gradient-to-b from-orange-50/70 via-white to-white px-4 pt-5 pb-32 space-y-4">
      <section className="bg-white rounded-[38px] border border-orange-100 p-6 shadow-sm text-center">
        <div className="mx-auto w-18 h-18 rounded-[30px] bg-gradient-to-br from-orange-500 to-yellow-400 text-white flex items-center justify-center shadow-xl shadow-orange-100 mb-5">
          <ReceiptText size={36} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-orange-500">Mis pedidos</p>
        <h1 className="text-3xl font-black uppercase italic leading-none mt-2 text-gray-950">Tu historial empieza aquí</h1>
        <p className="text-sm font-bold text-gray-500 leading-relaxed mt-4">
          Registra tu WhatsApp para guardar tus compras, ver el estado y repetir pedidos fácilmente.
        </p>
        <button
          type="button"
          onClick={onOpenProfile}
          className="mt-6 w-full bg-gradient-to-r from-orange-500 to-yellow-400 text-white rounded-[26px] px-6 py-4 text-xs font-black uppercase tracking-widest active:scale-95 transition-transform shadow-xl shadow-orange-100 flex items-center justify-center gap-2"
        >
          <UserCheck size={17} />
          Activar mi historial
          <ArrowRight size={16} />
        </button>
      </section>

      <section className="bg-orange-50/70 rounded-[30px] border border-orange-100 p-5">
        <h2 className="text-sm font-black text-gray-950 uppercase italic leading-none">Aún no tienes pedidos</h2>
        <p className="text-[11px] font-bold text-gray-500 leading-relaxed mt-2">
          Explora el catálogo, agrega productos y confirma tu primera compra cuando quieras.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('catalog')}
          className="mt-4 w-full bg-white text-orange-600 border border-orange-100 rounded-[22px] py-3 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          Ver catálogo
          <ArrowRight size={15} />
        </button>
      </section>
    </div>
  );
}

function RepeatCartChoice({
  order,
  currentCount,
  onClose,
  onReplace,
  onAdd,
}: {
  order: Order | null;
  currentCount: number;
  onClose: () => void;
  onReplace: () => void;
  onAdd: () => void;
}) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-[12500] flex items-end justify-center">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-orange-950/25" />
      <section className="relative w-full max-w-md bg-white rounded-t-[36px] shadow-2xl p-5 animate-in slide-in-from-bottom-6 duration-300">
        <div className="w-14 h-14 rounded-[24px] bg-orange-50 text-orange-500 flex items-center justify-center border border-orange-100 mb-4">
          <Repeat2 size={28} />
        </div>
        <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.24em]">Repetir pedido</p>
        <h2 className="text-2xl font-black text-gray-950 uppercase italic leading-none mt-2">Ya tienes productos en carrito</h2>
        <p className="text-sm font-bold text-gray-500 leading-relaxed mt-3">
          Tienes {currentCount} producto{currentCount === 1 ? '' : 's'} en el carrito. Puedes reemplazarlos por este pedido o agregar este pedido a lo que ya tienes.
        </p>
        <div className="grid grid-cols-1 gap-2 mt-5">
          <button type="button" onClick={onReplace} className="w-full bg-gradient-to-r from-orange-500 to-yellow-400 text-white rounded-[24px] py-4 text-xs font-black uppercase tracking-widest active:scale-95 transition-transform">
            Reemplazar carrito
          </button>
          <button type="button" onClick={onAdd} className="w-full bg-orange-50 text-orange-600 border border-orange-100 rounded-[24px] py-4 text-xs font-black uppercase tracking-widest active:scale-95 transition-transform">
            Agregar al carrito
          </button>
          <button type="button" onClick={onClose} className="w-full bg-gray-50 text-gray-400 border border-gray-100 rounded-[24px] py-3 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform">
            Cancelar
          </button>
        </div>
      </section>
    </div>
  );
}

function OrderDetailModal({
  order,
  onClose,
  onRepeat,
  onHelp,
  onTracking,
}: {
  order: Order | null;
  onClose: () => void;
  onRepeat: (order: Order) => void;
  onHelp: (order: Order) => void;
  onTracking: () => void;
}) {
  if (!order) return null;

  const status = safeStatus(order.status);
  const active = ACTIVE_STATUSES.includes(status);
  const items = safeItems(order);
  const subtotal = orderSubtotal(order);
  const delivery = orderDelivery(order);
  const total = orderTotal(order);

  return (
    <div className="fixed inset-0 z-[12000] flex items-end justify-center">
      <button type="button" aria-label="Cerrar detalle" onClick={onClose} className="absolute inset-0 bg-orange-950/25" />
      <section className="relative w-full max-w-md max-h-[88dvh] bg-white rounded-t-[38px] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 duration-300">
        <header className="flex-shrink-0 bg-gradient-to-br from-orange-500 to-yellow-400 text-white px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-white/75">Detalle del pedido</p>
              <h2 className="text-2xl font-black uppercase italic leading-none mt-2 truncate">{order.order_code || 'Pedido'}</h2>
              <p className="text-[11px] font-bold text-white/80 mt-2">{formatDate(safeDate(order))}</p>
            </div>
            <button type="button" onClick={onClose} className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center active:scale-90 transition-transform flex-shrink-0" aria-label="Cerrar">
              <X size={19} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-orange-50/40">
          <div className="bg-white rounded-[28px] border border-orange-100 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[8px] font-black uppercase ${statusTone(status)}`}>
                {statusIcon(status)}
                {statusText(status)}
              </span>
              <p className="text-xl font-black text-orange-600">${money(total)}</p>
            </div>
            <p className="text-[11px] font-bold text-gray-500 leading-relaxed">
              {orderItemCount(order)} producto{orderItemCount(order) === 1 ? '' : 's'} en este pedido.
            </p>
          </div>

          <div className="bg-white rounded-[28px] border border-orange-100 p-4 shadow-sm">
            <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-3">Productos</p>
            {items.length === 0 ? (
              <p className="text-[11px] font-bold text-gray-400">Este pedido no tiene productos guardados.</p>
            ) : (
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={`${itemName(item)}-${index}`} className="flex items-center gap-3 rounded-2xl bg-orange-50/70 border border-orange-100 p-3">
                    <img src={itemImage(item)} alt={itemName(item)} className="w-12 h-12 object-contain rounded-xl bg-white border border-orange-100 p-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-black text-gray-900 uppercase leading-tight">{itemName(item)}</p>
                      <p className="text-[10px] font-bold text-gray-400 mt-1">{itemQuantity(item)} x ${money(itemUnitPrice(item))}</p>
                    </div>
                    <p className="text-xs font-black text-orange-600 flex-shrink-0">${money(itemSubtotal(item))}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-[28px] border border-orange-100 p-4 shadow-sm space-y-2">
            <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2">Resumen</p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-bold">Productos</span>
              <span className="text-gray-900 font-black">${money(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-bold">Delivery</span>
              <span className={delivery > 0 ? 'text-gray-900 font-black' : 'text-green-600 font-black'}>{delivery > 0 ? `$${money(delivery)}` : 'Gratis'}</span>
            </div>
            <div className="flex justify-between text-base pt-2 border-t border-orange-100">
              <span className="text-gray-900 font-black">Total</span>
              <span className="text-orange-600 font-black">${money(total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {active ? (
              <button type="button" onClick={onTracking} className="rounded-2xl bg-orange-500 text-white py-3 text-[9px] font-black uppercase flex items-center justify-center gap-1 active:scale-95 transition-transform shadow-lg shadow-orange-100">
                <Truck size={14} />
                Estado
              </button>
            ) : (
              <button type="button" onClick={() => onRepeat(order)} className="rounded-2xl bg-orange-500 text-white py-3 text-[9px] font-black uppercase flex items-center justify-center gap-1 active:scale-95 transition-transform shadow-lg shadow-orange-100">
                <Repeat2 size={14} />
                Repetir pedido
              </button>
            )}
            <button type="button" onClick={() => onHelp(order)} className="rounded-2xl bg-green-50 border border-green-100 text-green-600 py-3 text-[9px] font-black uppercase flex items-center justify-center gap-1 active:scale-95 transition-transform">
              <MessageCircle size={14} />
              Ayuda
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function OrdersScreen({ onNavigate, onOpenProfile, onOpenTracking }: Props) {
  const { orders, loading, products, overrides } = useAdmin();
  const { items: cartItems, addItem, clearCart } = useCart();
  const { customerPhone, customerName } = useUser();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState<{ text: string; tone: NoticeTone } | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [repeatChoiceOrder, setRepeatChoiceOrder] = useState<Order | null>(null);
  const cleanCustomerPhone = cleanPhone(customerPhone);

  const customerOrders = useMemo(() => {
    if (!cleanCustomerPhone) return [];

    return [...(orders || [])]
      .filter(order => cleanPhone(order?.customer_phone) === cleanCustomerPhone)
      .sort((a, b) => dateMs(b) - dateMs(a));
  }, [cleanCustomerPhone, orders]);

  const stats = useMemo(() => {
    const active = customerOrders.filter(order => ACTIVE_STATUSES.includes(safeStatus(order.status))).length;
    const delivered = customerOrders.filter(order => safeStatus(order.status) === 'Entregado');
    const spent = delivered.reduce((sum, order) => sum + orderTotal(order), 0);
    return { active, delivered: delivered.length, total: customerOrders.length, spent };
  }, [customerOrders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return customerOrders.filter(order => {
      const status = safeStatus(order.status);
      if (statusFilter === 'active' && !ACTIVE_STATUSES.includes(status)) return false;
      if (statusFilter === 'delivered' && status !== 'Entregado') return false;

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

  const showNotice = (text: string, tone: NoticeTone = 'success') => {
    setNotice({ text, tone });
    window.setTimeout(() => setNotice(null), 4200);
  };

  const unavailableItems = (order: Order) => safeItems(order).filter(item => itemUnavailable(item, products, overrides));
  const availableItems = (order: Order) => safeItems(order).filter(item => !itemUnavailable(item, products, overrides));

  const performRepeatOrder = (order: Order, mode: 'replace' | 'add') => {
    const readyItems = availableItems(order);
    const skippedItems = unavailableItems(order);

    if (readyItems.length === 0) {
      showNotice('No pudimos repetir este pedido porque sus productos no están disponibles por ahora.', 'warning');
      setRepeatChoiceOrder(null);
      return;
    }

    if (mode === 'replace') clearCart();

    readyItems.forEach((item, index) => {
      addItem(productFromOrderItem(item, order, index, true), itemQuantity(item));
    });

    setSelectedOrder(null);
    setRepeatChoiceOrder(null);

    if (skippedItems.length > 0) {
      const names = skippedItems.map(itemName).join(', ');
      showNotice(`Agregamos lo disponible. No se agregó: ${names}, porque está agotado o no disponible.`, 'warning');
    } else {
      showNotice(mode === 'replace' ? 'Pedido listo en tu carrito.' : 'Pedido agregado a tu carrito.', 'success');
    }

    window.setTimeout(() => {
      onNavigate('cart');
    }, 850);
  };

  const repeatOrder = (order: Order) => {
    const items = safeItems(order);

    if (items.length === 0) {
      showNotice('Este pedido no tiene productos para repetir.', 'warning');
      return;
    }

    if (cartItems.length > 0) {
      setRepeatChoiceOrder(order);
      return;
    }

    performRepeatOrder(order, 'replace');
  };

  const askHelp = (order: Order) => {
    const message = encodeURIComponent(`Hola, necesito ayuda con mi pedido ${order.order_code || ''} en La Casa del Pollazo.`);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
  };

  if (!cleanCustomerPhone) {
    return <GuestOrders onOpenProfile={onOpenProfile} onNavigate={onNavigate} />;
  }

  const noticeClass = notice?.tone === 'warning'
    ? 'bg-yellow-50 border-yellow-100 text-yellow-700'
    : notice?.tone === 'info'
      ? 'bg-blue-50 border-blue-100 text-blue-700'
      : 'bg-green-50 border-green-100 text-green-700';

  return (
    <div className="min-h-full bg-gradient-to-b from-orange-50/70 via-white to-white px-4 pt-4 pb-32 space-y-4">
      <section className="bg-white border border-orange-100 rounded-[34px] p-5 shadow-sm">
        <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.25em]">Mi historial Pollazo</p>
        <h1 className="text-3xl font-black text-gray-950 uppercase italic leading-none mt-2">Mis pedidos</h1>
        <p className="text-[12px] font-bold text-gray-500 mt-2 leading-relaxed">
          {customerName ? `${customerName}, ` : ''}revisa tus compras, estados y detalles.
        </p>

        <div className="grid grid-cols-3 gap-2 mt-5">
          <div className="bg-orange-50 border border-orange-100 rounded-[20px] p-3">
            <p className="text-xl font-black text-orange-600 leading-none">{stats.active}</p>
            <p className="text-[8px] font-black text-orange-500 uppercase mt-2">Activos</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-[20px] p-3">
            <p className="text-xl font-black text-green-600 leading-none">{stats.delivered}</p>
            <p className="text-[8px] font-black text-green-600 uppercase mt-2">Entregados</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-100 rounded-[20px] p-3">
            <p className="text-xl font-black text-yellow-700 leading-none">{stats.total}</p>
            <p className="text-[8px] font-black text-yellow-700 uppercase mt-2">Total</p>
          </div>
        </div>
      </section>

      {notice && (
        <div className={`border rounded-[24px] p-4 text-[11px] font-black uppercase leading-relaxed ${noticeClass}`}>
          {notice.text}
        </div>
      )}

      <section className="bg-white rounded-[30px] border border-orange-100 p-4 shadow-sm space-y-4">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-300" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Buscar por código o producto..."
            className="w-full bg-orange-50/60 border border-orange-100 rounded-2xl py-4 pl-11 pr-4 text-sm font-bold text-gray-800 outline-none focus:border-orange-300"
          />
        </div>

        <div>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Estado</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              ['active', 'Activos'],
              ['delivered', 'Entregados'],
              ['all', 'Todos'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setStatusFilter(id as StatusFilter)}
                className={`py-3.5 rounded-2xl border text-[10px] font-black uppercase transition-all ${
                  statusFilter === id
                    ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-100'
                    : 'bg-white text-gray-400 border-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {loading && customerOrders.length === 0 ? (
        <section className="bg-white rounded-[32px] border border-orange-100 p-8 text-center shadow-sm">
          <Clock3 size={34} className="mx-auto text-orange-500 animate-pulse mb-4" />
          <p className="text-xs font-black text-gray-500 uppercase">Cargando tus pedidos...</p>
        </section>
      ) : filteredOrders.length === 0 ? (
        <section className="bg-white rounded-[34px] border border-orange-100 p-7 text-center shadow-sm">
          <div className="mx-auto w-16 h-16 rounded-[26px] bg-orange-50 text-orange-500 flex items-center justify-center mb-4 border border-orange-100">
            {customerOrders.length === 0 ? <PackageCheck size={34} /> : <PackageSearch size={34} />}
          </div>
          <h3 className="text-2xl font-black text-gray-950 uppercase italic leading-none">
            {customerOrders.length === 0 ? 'Aún no tienes pedidos' : 'No encontramos pedidos'}
          </h3>
          <p className="text-sm font-bold text-gray-400 leading-relaxed mt-3">
            {customerOrders.length === 0
              ? 'Cuando hagas tu primera compra aparecerá aquí con estado, productos y total.'
              : 'Prueba cambiar el estado o buscar otro producto.'}
          </p>
          <button
            type="button"
            onClick={customerOrders.length === 0 ? () => onNavigate('catalog') : () => { setStatusFilter('active'); setSearch(''); }}
            className="mt-6 bg-gradient-to-r from-orange-500 to-yellow-400 text-white px-6 py-4 rounded-[24px] text-xs font-black uppercase tracking-widest shadow-xl shadow-orange-100 active:scale-95 transition-transform"
          >
            {customerOrders.length === 0 ? 'Ir al catálogo' : 'Limpiar filtros'}
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
              <article key={String(order.id || order.order_code || index)} className="bg-white rounded-[30px] border border-orange-100 p-4 shadow-sm">
                <button type="button" onClick={() => setSelectedOrder(order)} className="w-full text-left active:scale-[0.99] transition-transform">
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
                    <p className="text-xl font-black text-orange-600 leading-none">${money(orderTotal(order))}</p>
                  </div>

                  <div className="mt-4 bg-orange-50/60 border border-orange-100/70 rounded-[22px] p-3 space-y-2">
                    {items.length === 0 ? (
                      <p className="text-[10px] font-black text-gray-400 uppercase">Sin productos guardados</p>
                    ) : (
                      items.slice(0, 3).map((item, itemIndex) => (
                        <div key={`${itemName(item)}-${itemIndex}`} className="flex items-center gap-3 text-[10px] font-bold">
                          <img src={itemImage(item)} alt={itemName(item)} className="w-9 h-9 object-contain rounded-xl bg-white border border-orange-100 p-1 flex-shrink-0" />
                          <span className="min-w-0 flex-1 truncate text-gray-600">
                            <span className="font-black text-orange-500">{itemQuantity(item)}x</span> {itemName(item)}
                          </span>
                          <span className="text-gray-400 font-black flex-shrink-0">${money(itemSubtotal(item))}</span>
                        </div>
                      ))
                    )}
                    {items.length > 3 && (
                      <p className="text-[9px] font-black text-orange-500 uppercase">Toca detalle para ver {items.length - 3} producto{items.length - 3 === 1 ? '' : 's'} más</p>
                    )}
                  </div>
                </button>

                <div className="grid grid-cols-3 gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(order)}
                    className="bg-gray-50 text-gray-600 border border-gray-100 rounded-2xl py-3 text-[9px] font-black uppercase active:scale-95 transition-transform flex items-center justify-center gap-1"
                  >
                    <ReceiptText size={14} />
                    Detalle
                  </button>
                  <button
                    type="button"
                    onClick={active ? onOpenTracking : () => repeatOrder(order)}
                    className="bg-orange-500 text-white rounded-2xl py-3 text-[9px] font-black uppercase active:scale-95 transition-transform flex items-center justify-center gap-1 shadow-lg shadow-orange-100"
                  >
                    {active ? <Truck size={14} /> : <Repeat2 size={14} />}
                    {active ? 'Estado' : 'Repetir'}
                  </button>
                  <button
                    type="button"
                    onClick={() => askHelp(order)}
                    className="bg-green-50 text-green-600 border border-green-100 rounded-2xl py-3 text-[9px] font-black uppercase active:scale-95 transition-transform flex items-center justify-center gap-1"
                  >
                    <MessageCircle size={14} />
                    Ayuda
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onRepeat={repeatOrder}
        onHelp={askHelp}
        onTracking={onOpenTracking}
      />

      <RepeatCartChoice
        order={repeatChoiceOrder}
        currentCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
        onClose={() => setRepeatChoiceOrder(null)}
        onReplace={() => repeatChoiceOrder && performRepeatOrder(repeatChoiceOrder, 'replace')}
        onAdd={() => repeatChoiceOrder && performRepeatOrder(repeatChoiceOrder, 'add')}
      />
    </div>
  );
}
