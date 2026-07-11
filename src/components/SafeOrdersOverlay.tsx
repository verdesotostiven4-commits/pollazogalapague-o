import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, Home, Info, PackageSearch, RefreshCw, Repeat2, Search, ShoppingBag, ShoppingCart, Truck } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';
import type { Category, Order, Product } from '../types';

const WHATSAPP_NUMBER = '593989795628';
const ACTIVE_STATUSES = ['Por Confirmar', 'Recibido', 'Preparando', 'Enviado'];
const VALID_CATEGORIES: Category[] = [
  'Pollos', 'Embutidos', 'Lácteos y refrigerados', 'Abarrotes y básicos', 'Salsas, aliños y aceites',
  'Bebidas', 'Frutas y verduras', 'Snacks y dulces', 'Cuidado personal', 'Limpieza y hogar',
];

type Filter = 'active' | 'all' | 'delivered' | 'cancelled';

function cleanPhone(phone?: string | null) {
  return String(phone || '').replace(/\D/g, '').slice(-9);
}

function num(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number.parseFloat(String(value || '').replace(',', '.').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown) {
  return num(value).toFixed(2);
}

function dateOf(order: Order) {
  return order.created_at || order.updated_at || '';
}

function fmtDate(value?: string | null) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusOf(order: Order) {
  const value = String(order.status || 'Por Confirmar');
  if (['Por Confirmar', 'Recibido', 'Preparando', 'Enviado', 'Entregado', 'Cancelado'].includes(value)) return value;
  return 'Por Confirmar';
}

function statusClass(status: string) {
  if (status === 'Entregado') return 'bg-green-50 text-green-600 border-green-100';
  if (status === 'Cancelado') return 'bg-red-50 text-red-500 border-red-100';
  if (status === 'Enviado') return 'bg-purple-50 text-purple-600 border-purple-100';
  if (status === 'Preparando') return 'bg-yellow-50 text-yellow-700 border-yellow-100';
  if (status === 'Recibido') return 'bg-blue-50 text-blue-600 border-blue-100';
  return 'bg-orange-50 text-orange-600 border-orange-100';
}

function itemsOf(order: Order): any[] {
  return Array.isArray(order.items) ? order.items : [];
}

function itemName(item: any) {
  return String(item?.name || item?.product?.name || 'Producto');
}

function itemPrice(item: any) {
  const qty = Math.max(1, Number(item?.quantity || 1));
  const direct = num(item?.custom_price) || num(item?.price) || num(item?.product?.custom_price) || num(item?.product?.price);
  if (direct > 0) return direct;
  const subtotal = num(item?.subtotal);
  return subtotal > 0 ? subtotal / qty : 0;
}

function itemSubtotal(item: any) {
  return num(item?.subtotal) || itemPrice(item) * Math.max(1, Number(item?.quantity || 1));
}

function productFromItem(item: any, order: Order, index: number): Product {
  const snapshot = item?.product || {};
  const category = String(item?.category || snapshot?.category || 'Abarrotes y básicos');
  const safeCategory = VALID_CATEGORIES.includes(category as Category) ? (category as Category) : 'Abarrotes y básicos';
  const price = itemPrice(item);

  return {
    ...snapshot,
    id: String(item?.product_id || item?.cart_item_id || snapshot?.id || item?.id || `${order.order_code || 'pedido'}-${index}`),
    name: itemName(item),
    category: safeCategory,
    subcategory: snapshot?.subcategory || null,
    description: snapshot?.description || null,
    unit: snapshot?.unit || null,
    badge: snapshot?.badge || null,
    price: price > 0 ? `$${price.toFixed(2)}` : item?.price_text || snapshot?.price || 'Consultar precio',
    image: item?.image || snapshot?.image || '/logo-final.png',
    available: true,
    custom_price: num(item?.custom_price || snapshot?.custom_price) || undefined,
  };
}

function clickNav(label: string) {
  const buttons = Array.from(document.querySelectorAll('nav button')) as HTMLButtonElement[];
  const target = buttons.find(button => (button.innerText || '').toLowerCase().includes(label));
  target?.click();
}

export default function SafeOrdersOverlay() {
  const { orders, loading, refreshData } = useAdmin();
  const { customerPhone, customerName } = useUser();
  const { addItem, clearCart } = useCart();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>('active');
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const intercept = (event: MouseEvent) => {
      const element = event.target as HTMLElement | null;
      const button = element?.closest('button, a') as HTMLElement | null;
      if (!button) return;

      const text = `${button.innerText || ''} ${button.getAttribute('aria-label') || ''}`.toLowerCase();
      const isOrdersNav = text.includes('pedidos') || text.includes('orders');
      const isInsideSafeOrders = Boolean(button.closest('[data-safe-orders="1"]'));

      if (!isOrdersNav || isInsideSafeOrders) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setOpen(true);
    };

    document.addEventListener('click', intercept, true);
    return () => document.removeEventListener('click', intercept, true);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  const phone = cleanPhone(customerPhone);

  const customerOrders = useMemo(() => {
    if (!phone) return [];
    return [...(orders || [])]
      .filter(order => cleanPhone(order?.customer_phone) === phone)
      .sort((a, b) => (new Date(dateOf(b)).getTime() || 0) - (new Date(dateOf(a)).getTime() || 0));
  }, [orders, phone]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return customerOrders.filter(order => {
      const status = statusOf(order);
      if (filter === 'active' && !ACTIVE_STATUSES.includes(status)) return false;
      if (filter === 'delivered' && status !== 'Entregado') return false;
      if (filter === 'cancelled' && status !== 'Cancelado') return false;
      if (!search) return true;
      const text = [order.order_code, status, order.total, order.reference, ...itemsOf(order).map(itemName)].join(' ').toLowerCase();
      return text.includes(search);
    });
  }, [customerOrders, filter, query]);

  const stats = useMemo(() => {
    const active = customerOrders.filter(order => ACTIVE_STATUSES.includes(statusOf(order))).length;
    const delivered = customerOrders.filter(order => statusOf(order) === 'Entregado');
    const spent = delivered.reduce((sum, order) => sum + num(order.total), 0);
    return { active, delivered: delivered.length, spent };
  }, [customerOrders]);

  const repeatOrder = (order: Order) => {
    const orderItems = itemsOf(order);
    if (orderItems.length === 0) {
      setNotice('Este pedido no tiene productos para repetir.');
      return;
    }
    clearCart();
    orderItems.forEach((item, index) => addItem(productFromItem(item, order, index), Math.max(1, Number(item?.quantity || 1))));
    setNotice('Pedido agregado al carrito.');
    window.setTimeout(() => {
      setOpen(false);
      setNotice('');
      clickNav('carrito');
    }, 650);
  };

  if (!open) return null;

  return (
    <div data-safe-orders="1" className="fixed inset-0 z-[14000] bg-gradient-to-b from-orange-50/80 via-white to-white flex flex-col">
      <header className="flex-shrink-0 bg-white/95 border-b border-orange-50 px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => setOpen(false)} className="flex items-center gap-1 text-orange-500 font-black text-sm">
            <ChevronLeft size={20} /> Inicio
          </button>
          <h1 className="text-sm font-black text-gray-950 uppercase tracking-wide">Pedidos</h1>
          <button type="button" onClick={() => refreshData()} className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center border border-orange-100">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-32 space-y-4">
        {!phone ? (
          <section className="rounded-[36px] bg-white border border-orange-100 p-6 text-center shadow-sm">
            <PackageSearch size={40} className="mx-auto text-orange-500 mb-4" />
            <h2 className="text-2xl font-black uppercase italic text-gray-950">Tu historial empieza aquí</h2>
            <p className="mt-3 text-sm font-bold text-gray-500 leading-relaxed">Registra tu WhatsApp para ver tus pedidos guardados.</p>
            <button type="button" onClick={() => { setOpen(false); clickNav('info'); }} className="mt-5 w-full rounded-[24px] bg-orange-500 text-white py-4 text-xs font-black uppercase tracking-widest">
              Ir a mi cuenta
            </button>
          </section>
        ) : (
          <>
            <section className="rounded-[36px] bg-white border border-orange-100 p-5 shadow-sm">
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.25em]">Mi historial Pollazo</p>
              <h2 className="text-3xl font-black text-gray-950 uppercase italic leading-none mt-2">Mis pedidos</h2>
              <p className="text-[12px] font-bold text-gray-500 mt-2 leading-relaxed">{customerName ? `${customerName}, ` : ''}aquí puedes revisar tus compras.</p>
              <div className="grid grid-cols-3 gap-2 mt-5">
                <div className="bg-orange-50 border border-orange-100 rounded-[22px] p-3"><p className="text-xl font-black text-orange-600">{stats.active}</p><p className="text-[8px] font-black text-orange-500 uppercase">Activos</p></div>
                <div className="bg-green-50 border border-green-100 rounded-[22px] p-3"><p className="text-xl font-black text-green-600">{stats.delivered}</p><p className="text-[8px] font-black text-green-600 uppercase">Entregados</p></div>
                <div className="bg-yellow-50 border border-yellow-100 rounded-[22px] p-3"><p className="text-xl font-black text-yellow-700">${money(stats.spent)}</p><p className="text-[8px] font-black text-yellow-700 uppercase">Comprado</p></div>
              </div>
            </section>

            {notice && <div className="rounded-[24px] bg-green-50 border border-green-100 p-4 text-[11px] font-black text-green-700 uppercase">{notice}</div>}

            <section className="rounded-[32px] bg-white border border-orange-100 p-4 shadow-sm space-y-3">
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-300" />
                <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar pedido o producto..." className="w-full bg-orange-50/60 border border-orange-100 rounded-2xl py-4 pl-11 pr-4 text-sm font-bold text-gray-800 outline-none" />
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {[
                  ['active', 'Activos'], ['delivered', 'Entregados'], ['cancelled', 'Cancelados'], ['all', 'Todos'],
                ].map(([id, label]) => (
                  <button key={id} type="button" onClick={() => setFilter(id as Filter)} className={`flex-shrink-0 px-4 py-3 rounded-2xl border text-[9px] font-black uppercase ${filter === id ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-400 border-gray-100'}`}>{label}</button>
                ))}
              </div>
            </section>

            {filtered.length === 0 ? (
              <section className="rounded-[32px] bg-white border border-orange-100 p-8 text-center shadow-sm">
                <PackageSearch size={36} className="mx-auto text-orange-500 mb-4" />
                <h3 className="text-xl font-black text-gray-950 uppercase italic">No encontramos pedidos</h3>
                <p className="text-sm font-bold text-gray-400 mt-3">Prueba cambiando el filtro o actualizando.</p>
              </section>
            ) : (
              <section className="space-y-3">
                {filtered.map((order, index) => {
                  const status = statusOf(order);
                  const active = ACTIVE_STATUSES.includes(status);
                  const orderItems = itemsOf(order);
                  const count = orderItems.reduce((sum, item) => sum + Math.max(1, Number(item?.quantity || 1)), 0);
                  return (
                    <article key={String(order.id || order.order_code || index)} className="rounded-[32px] bg-white border border-orange-100 p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[8px] font-black uppercase ${statusClass(status)}`}>{status}</span>
                          <h3 className="text-sm font-black text-gray-950 uppercase mt-3">{order.order_code || 'Pedido'}</h3>
                          <p className="text-[10px] font-bold text-gray-400 mt-2"><CalendarDays size={12} className="inline mr-1" />{fmtDate(dateOf(order))} · {count} producto{count === 1 ? '' : 's'}</p>
                        </div>
                        <p className="text-xl font-black text-orange-600">${money(order.total)}</p>
                      </div>
                      <div className="mt-4 rounded-[24px] bg-orange-50/60 border border-orange-100 p-3 space-y-1.5">
                        {orderItems.slice(0, 3).map((item, itemIndex) => <p key={`${itemName(item)}-${itemIndex}`} className="text-[10px] font-bold text-gray-600 truncate"><span className="font-black text-orange-500">{Math.max(1, Number(item?.quantity || 1))}x</span> {itemName(item)} <span className="text-gray-400">${money(itemSubtotal(item))}</span></p>)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <button type="button" onClick={() => repeatOrder(order)} className="rounded-2xl bg-orange-50 border border-orange-100 text-orange-600 py-3 text-[9px] font-black uppercase flex items-center justify-center gap-1"><Repeat2 size={14} /> Repetir</button>
                        <button type="button" onClick={() => active ? setOpen(false) : window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hola, necesito ayuda con mi pedido ${order.order_code || ''}.`)}`, '_blank')} className="rounded-2xl bg-orange-500 text-white py-3 text-[9px] font-black uppercase flex items-center justify-center gap-1"><Truck size={14} /> {active ? 'Rastrear' : 'Ayuda'}</button>
                      </div>
                    </article>
                  );
                })}
              </section>
            )}
          </>
        )}
      </main>

      <nav className="fixed left-3 right-3 bottom-[calc(env(safe-area-inset-bottom)+10px)] z-[14001] rounded-[34px] bg-white/95 border border-orange-50 shadow-2xl px-4 py-3 grid grid-cols-5 gap-2">
        {[['inicio', Home, 'Inicio'], ['catálogo', ShoppingBag, 'Catálogo'], ['pedidos', PackageSearch, 'Pedidos'], ['carrito', ShoppingCart, 'Carrito'], ['info', Info, 'Info']].map(([label, Icon, title]) => (
          <button key={String(label)} type="button" onClick={() => { if (label !== 'pedidos') { setOpen(false); window.setTimeout(() => clickNav(String(label)), 60); } }} className={`flex flex-col items-center gap-1 text-[8px] font-black uppercase ${label === 'pedidos' ? 'text-orange-500' : 'text-gray-400'}`}>
            <Icon size={21} />
            {String(title)}
          </button>
        ))}
      </nav>
    </div>
  );
}
