import { useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  Bell,
  CheckCircle2,
  CircleDollarSign,
  Crown,
  LayoutDashboard,
  LogOut,
  Package,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Settings,
  ShoppingBag,
  Trash2,
  Truck,
  UserRound,
  Users,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import AdminPlusPanel from './AdminPlusPanel';
import { logoutPanelSession } from '../utils/panelSession';
import { transitionOrder, updateOrderPayment } from '../utils/orderLifecycleApi';
import type { Category, OrderStatus } from '../types';

type Tab = 'resumen' | 'pedidos' | 'productos' | 'clientes' | 'plus' | 'ajustes';
type PaymentAction = 'confirmado' | 'rechazado' | 'contra_entrega';

type SummaryCard = {
  label: string;
  value: string | number;
  Icon: LucideIcon;
  tone: string;
};

const money = (value: unknown) => {
  const parsed = Number.parseFloat(
    String(value ?? '0').replace(',', '.').replace(/[^0-9.-]/g, '')
  );
  return Number.isFinite(parsed) ? parsed : 0;
};

const cleanPhone = (value?: string | null) => String(value || '').replace(/\D/g, '');

const timeLabel = (value?: string | null) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';

  return date.toLocaleString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const nextStatuses = (status: OrderStatus): OrderStatus[] => {
  const map: Partial<Record<OrderStatus, OrderStatus[]>> = {
    'Por Confirmar': ['Recibido', 'Cancelado'],
    Recibido: ['Preparando', 'Cancelado'],
    Preparando: ['Enviado', 'Cancelado'],
    Enviado: ['Entregado', 'Cancelado'],
    Entregado: [],
    Cancelado: [],
  };

  return map[status] || [];
};

const statusTone = (status: OrderStatus) => {
  if (status === 'Por Confirmar') return 'bg-orange-50 text-orange-600 border-orange-100';
  if (status === 'Recibido') return 'bg-blue-50 text-blue-600 border-blue-100';
  if (status === 'Preparando') return 'bg-indigo-50 text-indigo-600 border-indigo-100';
  if (status === 'Enviado') return 'bg-yellow-50 text-yellow-700 border-yellow-100';
  if (status === 'Entregado') return 'bg-green-50 text-green-600 border-green-100';
  return 'bg-red-50 text-red-500 border-red-100';
};

const paymentTone = (status?: string | null) => {
  if (status === 'confirmado') return 'bg-green-50 text-green-600 border-green-100';
  if (status === 'rechazado') return 'bg-red-50 text-red-500 border-red-100';
  return 'bg-purple-50 text-purple-600 border-purple-100';
};

const paymentLabel = (status?: string | null) => {
  if (status === 'confirmado') return 'Pagado';
  if (status === 'rechazado') return 'No recibido';
  return 'Contra entrega';
};

const categories: Category[] = [
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

export default function AdminDashboard() {
  const {
    orders,
    products,
    customers,
    loading,
    announcement,
    refreshData,
    setAnnouncement,
    addProduct,
    updateProduct,
    deleteProduct,
  } = useAdmin();

  const [tab, setTab] = useState<Tab>('resumen');
  const [search, setSearch] = useState('');
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [announcementDraft, setAnnouncementDraft] = useState(announcement || '');
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'Abarrotes y básicos' as Category,
    price: '',
    image: '',
  });

  useEffect(() => {
    setAnnouncementDraft(announcement || '');
  }, [announcement]);

  useEffect(() => {
    void refreshData();
    const interval = window.setInterval(() => void refreshData(), 12000);
    return () => window.clearInterval(interval);
  }, [refreshData]);

  const activeOrders = useMemo(
    () => orders.filter(order => !['Entregado', 'Cancelado'].includes(order.status)),
    [orders]
  );

  const deliveredPaid = useMemo(
    () =>
      orders.filter(
        order => order.status === 'Entregado' && order.payment_status === 'confirmado'
      ),
    [orders]
  );

  const todayIncome = useMemo(() => {
    const today = new Date();
    return deliveredPaid
      .filter(order => {
        const date = new Date(order.delivered_at || order.updated_at || order.created_at);
        return (
          date.getFullYear() === today.getFullYear() &&
          date.getMonth() === today.getMonth() &&
          date.getDate() === today.getDate()
        );
      })
      .reduce((sum, order) => sum + money(order.total), 0);
  }, [deliveredPaid]);

  const visibleOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...orders]
      .filter(order => {
        if (!term) return true;
        return (
          order.order_code.toLowerCase().includes(term) ||
          cleanPhone(order.customer_phone).includes(term) ||
          order.status.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders, search]);

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter(product => {
      if (!term) return true;
      return (
        product.name.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term)
      );
    });
  }, [products, search]);

  const visibleCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...customers]
      .filter(customer => {
        if (!term) return true;
        return (
          String(customer.name || '').toLowerCase().includes(term) ||
          cleanPhone(customer.phone).includes(term)
        );
      })
      .sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0));
  }, [customers, search]);

  const summaryCards: SummaryCard[] = [
    {
      label: 'Activos',
      value: activeOrders.length,
      Icon: ShoppingBag,
      tone: 'text-orange-600 bg-orange-50',
    },
    {
      label: 'Por confirmar',
      value: orders.filter(order => order.status === 'Por Confirmar').length,
      Icon: Bell,
      tone: 'text-red-600 bg-red-50',
    },
    {
      label: 'Entregados',
      value: deliveredPaid.length,
      Icon: CheckCircle2,
      tone: 'text-green-600 bg-green-50',
    },
    {
      label: 'Ingresos hoy',
      value: `$${todayIncome.toFixed(2)}`,
      Icon: CircleDollarSign,
      tone: 'text-blue-600 bg-blue-50',
    },
  ];

  const runStatus = async (orderId: string, status: OrderStatus) => {
    let reason: string | null = null;

    if (status === 'Cancelado') {
      reason = window.prompt('Motivo de cancelación:')?.trim() || null;
      if (!reason) return;
    }

    setWorkingId(orderId);
    setNotice(null);

    try {
      await transitionOrder('admin', orderId, status, reason);
      await refreshData();
      setNotice(`Pedido actualizado a ${status}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo actualizar el pedido.');
    } finally {
      setWorkingId(null);
    }
  };

  const runPayment = async (orderId: string, status: PaymentAction) => {
    setWorkingId(orderId);
    setNotice(null);

    try {
      await updateOrderPayment('admin', orderId, status);
      await refreshData();
      setNotice(status === 'confirmado' ? 'Pago confirmado.' : 'Estado de pago actualizado.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo actualizar el pago.');
    } finally {
      setWorkingId(null);
    }
  };

  const createProduct = async () => {
    if (!newProduct.name.trim()) {
      setNotice('Escribe el nombre del producto.');
      return;
    }

    try {
      await addProduct({
        name: newProduct.name.trim(),
        category: newProduct.category,
        price: newProduct.price.trim() || 'Consultar precio',
        image: newProduct.image.trim(),
        description: '',
        badge: null,
        available: true,
        show_in_app: true,
        show_in_pos: true,
        is_variable: !newProduct.price.trim(),
      });
      setNewProduct({
        name: '',
        category: 'Abarrotes y básicos',
        price: '',
        image: '',
      });
      await refreshData();
      setNotice('Producto agregado.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo agregar el producto.');
    }
  };

  const tabs: Array<{ id: Tab; label: string; Icon: LucideIcon }> = [
    { id: 'resumen', label: 'Resumen', Icon: LayoutDashboard },
    { id: 'pedidos', label: 'Pedidos', Icon: ShoppingBag },
    { id: 'productos', label: 'Productos', Icon: Package },
    { id: 'clientes', label: 'Clientes', Icon: Users },
    { id: 'plus', label: 'Plus', Icon: Crown },
    { id: 'ajustes', label: 'Ajustes', Icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-orange-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center">
              <LayoutDashboard size={23} />
            </div>
            <div>
              <p className="font-black uppercase italic text-slate-900">Panel Pollazo</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                {activeOrders.length} pedidos activos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void refreshData()}
              disabled={loading}
              className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center disabled:opacity-40"
              aria-label="Actualizar panel"
            >
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={() => void logoutPanelSession('admin')}
              className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center"
              aria-label="Cerrar sesión"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                setSearch('');
              }}
              className={`flex-shrink-0 rounded-xl px-3 py-2 text-[9px] font-black uppercase flex items-center gap-1.5 border ${
                tab === id
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-slate-500 border-slate-100'
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5 space-y-4">
        {notice && (
          <div className="rounded-2xl bg-blue-50 border border-blue-100 p-3 text-[10px] font-black uppercase text-blue-700">
            {notice}
          </div>
        )}

        {!['resumen', 'plus', 'ajustes'].includes(tab) && (
          <div className="relative">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar..."
              className="w-full bg-white border border-slate-100 rounded-2xl pl-10 pr-4 py-3 text-sm font-bold outline-none"
            />
          </div>
        )}

        {tab === 'resumen' && (
          <>
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {summaryCards.map(({ label, value, Icon, tone }) => (
                <article key={label} className="bg-white rounded-[26px] border border-slate-100 p-4 shadow-sm">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${tone}`}>
                    <Icon size={19} />
                  </div>
                  <p className="text-2xl font-black text-slate-900 mt-3">{value}</p>
                  <p className="text-[9px] font-black uppercase text-slate-400 mt-1">{label}</p>
                </article>
              ))}
            </section>

            <section className="bg-white rounded-[30px] border border-slate-100 p-4 shadow-sm">
              <h2 className="font-black uppercase italic text-slate-900 mb-3">Pedidos pendientes</h2>
              <div className="space-y-2">
                {activeOrders.slice(0, 6).map(order => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setTab('pedidos')}
                    className="w-full rounded-2xl bg-slate-50 border border-slate-100 p-3 flex items-center justify-between gap-3 text-left"
                  >
                    <div>
                      <p className="text-xs font-black uppercase text-slate-900">{order.order_code}</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-1">{timeLabel(order.created_at)}</p>
                    </div>
                    <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full border ${statusTone(order.status)}`}>
                      {order.status}
                    </span>
                  </button>
                ))}
                {activeOrders.length === 0 && (
                  <p className="text-sm font-bold text-slate-400 text-center py-8">No hay pedidos activos.</p>
                )}
              </div>
            </section>
          </>
        )}

        {tab === 'pedidos' && (
          <section className="space-y-3">
            {visibleOrders.map(order => {
              const customer = customers.find(
                item =>
                  cleanPhone(item.phone).slice(-9) ===
                  cleanPhone(order.customer_phone).slice(-9)
              );
              const paid = order.payment_status === 'confirmado';
              const busy = workingId === order.id;

              return (
                <article key={order.id} className="bg-white rounded-[30px] border border-slate-100 p-4 shadow-sm space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full border ${statusTone(order.status)}`}>
                          {order.status}
                        </span>
                        <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full border ${paymentTone(order.payment_status)}`}>
                          {paymentLabel(order.payment_status)}
                        </span>
                      </div>
                      <h2 className="font-black uppercase italic text-slate-900 mt-2">
                        {customer?.name || 'Cliente'}
                      </h2>
                      <p className="text-[10px] font-black uppercase text-slate-400 mt-1">
                        {order.order_code} · {order.customer_phone}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-orange-600">${money(order.total).toFixed(2)}</p>
                      <p className="text-[8px] font-bold text-slate-400 mt-1">{timeLabel(order.created_at)}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 space-y-1">
                    {(order.items || []).slice(0, 8).map((item, index) => (
                      <p key={`${order.id}-${index}`} className="text-[10px] font-bold text-slate-700">
                        {Number(item.quantity || 1)}x {item.name || item.product?.name || 'Producto'}
                      </p>
                    ))}
                  </div>

                  {!['Cancelado', 'Entregado'].includes(order.status) && (
                    <section className={`rounded-2xl border p-3 ${paid ? 'bg-green-50 border-green-100' : 'bg-purple-50 border-purple-100'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
                          {order.payment_method === 'deuna' ? (
                            <QrCode size={18} className="text-purple-600" />
                          ) : (
                            <Banknote size={18} className="text-green-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-[9px] font-black uppercase text-slate-500">
                            {order.payment_method === 'deuna' ? 'DeUna al recibir' : 'Efectivo al recibir'}
                          </p>
                          <p className="text-[10px] font-bold text-slate-700 mt-1">
                            {paid ? 'Pago recibido.' : 'Confirma únicamente después de recibir el dinero.'}
                          </p>
                        </div>
                      </div>

                      {!paid && (
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void runPayment(order.id, 'confirmado')}
                            className="bg-emerald-600 text-white rounded-xl py-3 text-[9px] font-black uppercase disabled:opacity-40"
                          >
                            Confirmar pago
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void runPayment(order.id, 'rechazado')}
                            className="bg-white text-red-500 border border-red-100 rounded-xl py-3 text-[9px] font-black uppercase disabled:opacity-40"
                          >
                            No recibido
                          </button>
                        </div>
                      )}
                    </section>
                  )}

                  {nextStatuses(order.status).length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {nextStatuses(order.status).map(status => {
                        const blocked = status === 'Entregado' && !paid;
                        return (
                          <button
                            key={status}
                            type="button"
                            disabled={busy || blocked}
                            onClick={() => void runStatus(order.id, status)}
                            className={`rounded-xl py-3 px-2 text-[9px] font-black uppercase flex items-center justify-center gap-1.5 disabled:opacity-35 ${
                              status === 'Cancelado'
                                ? 'bg-red-50 text-red-500 border border-red-100'
                                : status === 'Entregado'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-slate-900 text-white'
                            }`}
                          >
                            {status === 'Preparando' && <Package size={13} />}
                            {status === 'Enviado' && <Truck size={13} />}
                            {status === 'Entregado' && <CheckCircle2 size={13} />}
                            {status === 'Cancelado' && <XCircle size={13} />}
                            {blocked ? 'Falta pago' : status}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {order.status === 'Cancelado' && order.cancelled_reason && (
                    <p className="rounded-xl bg-red-50 border border-red-100 p-3 text-[10px] font-bold text-red-600">
                      Motivo: {order.cancelled_reason}
                    </p>
                  )}
                </article>
              );
            })}
          </section>
        )}

        {tab === 'productos' && (
          <>
            <section className="bg-white rounded-[30px] border border-slate-100 p-4 shadow-sm space-y-3">
              <h2 className="font-black uppercase italic text-slate-900 flex items-center gap-2">
                <Plus size={18} className="text-orange-500" /> Agregar producto
              </h2>
              <input
                value={newProduct.name}
                onChange={event => setNewProduct(current => ({ ...current, name: event.target.value }))}
                placeholder="Nombre"
                className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold outline-none"
              />
              <select
                value={newProduct.category}
                onChange={event =>
                  setNewProduct(current => ({ ...current, category: event.target.value as Category }))
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold bg-white"
              >
                {categories.map(category => (
                  <option key={category}>{category}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={newProduct.price}
                  onChange={event => setNewProduct(current => ({ ...current, price: event.target.value }))}
                  placeholder="$ Precio"
                  className="border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold outline-none"
                />
                <input
                  value={newProduct.image}
                  onChange={event => setNewProduct(current => ({ ...current, image: event.target.value }))}
                  placeholder="URL imagen"
                  className="border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => void createProduct()}
                className="w-full bg-orange-500 text-white rounded-xl py-3 font-black text-[10px] uppercase"
              >
                Guardar producto
              </button>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {visibleProducts.map(product => (
                <article key={product.id} className="bg-white rounded-[26px] border border-slate-100 p-4 shadow-sm flex gap-3">
                  <img
                    src={product.image || '/logo-final.png'}
                    alt={product.name}
                    className="w-16 h-16 rounded-2xl object-cover bg-slate-50"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-xs uppercase text-slate-900 truncate">{product.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 mt-1">{product.category}</p>
                    <p className="text-sm font-black text-orange-600 mt-2">
                      {product.price || 'Consultar precio'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => void updateProduct(product.id, { available: product.available === false })}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        product.available === false
                          ? 'bg-red-50 text-red-500'
                          : 'bg-green-50 text-green-600'
                      }`}
                      aria-label="Cambiar disponibilidad"
                    >
                      {product.available === false ? <XCircle size={17} /> : <CheckCircle2 size={17} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`¿Eliminar ${product.name}?`)) {
                          void deleteProduct(product.id);
                        }
                      }}
                      className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center"
                      aria-label="Eliminar producto"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </section>
          </>
        )}

        {tab === 'clientes' && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visibleCustomers.map(customer => (
              <article key={customer.id} className="bg-white rounded-[26px] border border-slate-100 p-4 shadow-sm flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
                  <UserRound size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-xs uppercase text-slate-900 truncate">
                    {customer.name || 'Cliente'}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">{customer.phone}</p>
                  <p className="text-[9px] font-black text-orange-600 mt-2">
                    {customer.total_orders || 0} pedidos · ${money(customer.total_spent).toFixed(2)}
                  </p>
                </div>
                {customer.is_vip && <Crown size={19} className="text-yellow-500" />}
              </article>
            ))}
          </section>
        )}

        {tab === 'plus' && <AdminPlusPanel />}

        {tab === 'ajustes' && (
          <section className="bg-white rounded-[30px] border border-slate-100 p-5 shadow-sm max-w-2xl">
            <h2 className="font-black uppercase italic text-slate-900 mb-3">Aviso general</h2>
            <textarea
              value={announcementDraft}
              onChange={event => setAnnouncementDraft(event.target.value)}
              rows={5}
              className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none resize-none"
              placeholder="Escribe un aviso..."
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  await setAnnouncement(announcementDraft.trim());
                  setNotice('Aviso guardado.');
                } catch (error) {
                  setNotice(error instanceof Error ? error.message : 'No se pudo guardar el aviso.');
                }
              }}
              className="w-full mt-3 bg-slate-950 text-white rounded-xl py-3 font-black text-[10px] uppercase"
            >
              Guardar aviso
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
