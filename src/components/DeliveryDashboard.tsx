import { useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  Bike,
  CheckCircle2,
  Clock,
  LogOut,
  MapPin,
  MessageCircle,
  Navigation,
  Package,
  Phone,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { logoutPanelSession } from '../utils/panelSession';
import { transitionOrder, updateOrderPayment } from '../utils/orderLifecycleApi';
import type { Order, OrderStatus } from '../types';

const cleanPhone = (value?: string | null) => String(value || '').replace(/\D/g, '');

const money = (value: unknown) => {
  const parsed = Number.parseFloat(String(value ?? '0').replace(',', '.').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const validCoordinate = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed !== 0;
};

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

const paymentLabel = (order: Order) => {
  if (order.payment_method === 'deuna') return 'DeUna al recibir';
  return 'Efectivo al recibir';
};

export default function DeliveryDashboard() {
  const { orders, customers, refreshData, loading } = useAdmin();
  const [filter, setFilter] = useState<'listos' | 'ruta' | 'todos'>('listos');
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void refreshData();
    const interval = window.setInterval(() => void refreshData(), 9000);
    const onFocus = () => void refreshData();
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshData]);

  const activeOrders = useMemo(() => {
    return [...orders]
      .filter(order => order.status === 'Preparando' || order.status === 'Enviado')
      .filter(order => {
        if (filter === 'listos') return order.status === 'Preparando';
        if (filter === 'ruta') return order.status === 'Enviado';
        return true;
      })
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [filter, orders]);

  const readyCount = orders.filter(order => order.status === 'Preparando').length;
  const routeCount = orders.filter(order => order.status === 'Enviado').length;

  const runTransition = async (orderId: string, status: OrderStatus) => {
    setWorkingId(orderId);
    setNotice(null);

    try {
      await transitionOrder('delivery', orderId, status);
      await refreshData();
      setNotice(status === 'Enviado' ? 'Pedido marcado en ruta.' : 'Pedido entregado correctamente.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo actualizar el pedido.');
    } finally {
      setWorkingId(null);
    }
  };

  const confirmPayment = async (orderId: string) => {
    setWorkingId(orderId);
    setNotice(null);

    try {
      await updateOrderPayment('delivery', orderId, 'confirmado');
      await refreshData();
      setNotice('Pago recibido y confirmado.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo confirmar el pago.');
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-orange-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-200">
              <Bike size={25} />
            </div>
            <div>
              <p className="font-black uppercase italic text-slate-900">Repartidor</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                {readyCount} listos · {routeCount} en ruta
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void refreshData()}
              disabled={loading}
              className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center disabled:opacity-40"
              aria-label="Actualizar entregas"
            >
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={() => void logoutPanelSession('delivery')}
              className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center"
              aria-label="Cerrar sesión"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {notice && (
          <div className="rounded-2xl bg-blue-50 border border-blue-100 p-3 text-[10px] font-black uppercase text-blue-700 leading-relaxed">
            {notice}
          </div>
        )}

        <section className="grid grid-cols-3 gap-2">
          {([
            ['listos', 'Listos', readyCount, Package],
            ['ruta', 'En ruta', routeCount, Truck],
            ['todos', 'Todos', readyCount + routeCount, Bike],
          ] as const).map(([key, label, count, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-2xl border p-3 text-left transition-all ${
                filter === key
                  ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-100'
                  : 'bg-white text-slate-500 border-slate-100'
              }`}
            >
              <Icon size={17} />
              <p className="text-xl font-black mt-2 leading-none">{count}</p>
              <p className="text-[8px] font-black uppercase mt-1 opacity-75">{label}</p>
            </button>
          ))}
        </section>

        {activeOrders.length === 0 ? (
          <section className="bg-white rounded-[30px] border border-slate-100 p-10 text-center shadow-sm">
            <div className="w-16 h-16 rounded-3xl bg-orange-50 text-orange-400 flex items-center justify-center mx-auto">
              <Package size={30} />
            </div>
            <h2 className="mt-4 font-black uppercase text-slate-900">No hay entregas ahora</h2>
            <p className="text-xs font-bold text-slate-400 mt-2">
              Los pedidos preparados aparecerán aquí automáticamente.
            </p>
          </section>
        ) : (
          activeOrders.map(order => {
            const customer = customers.find(item => {
              return cleanPhone(item.phone).slice(-9) === cleanPhone(order.customer_phone).slice(-9);
            });
            const lat = order.lat ?? customer?.lat ?? null;
            const lng = order.lng ?? customer?.lng ?? null;
            const reference = order.reference || customer?.reference || '';
            const phone = order.customer_phone || customer?.phone || '';
            const hasGps = validCoordinate(lat) && validCoordinate(lng);
            const paid = order.payment_status === 'confirmado';
            const busy = workingId === order.id;

            return (
              <article key={order.id} className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-50 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full border ${
                        order.status === 'Preparando'
                          ? 'bg-blue-50 text-blue-600 border-blue-100'
                          : 'bg-yellow-50 text-yellow-700 border-yellow-100'
                      }`}>
                        {order.status === 'Preparando' ? 'Listo para ruta' : 'En camino'}
                      </span>
                      <span className="text-[8px] font-black uppercase text-slate-300 flex items-center gap-1">
                        <Clock size={10} /> {timeLabel(order.created_at)}
                      </span>
                    </div>
                    <h2 className="mt-2 font-black uppercase italic text-slate-900 truncate">
                      {customer?.name || 'Cliente'}
                    </h2>
                    <p className="text-[10px] font-black uppercase text-slate-400 mt-1">
                      {order.order_code} · ${money(order.total).toFixed(2)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
                    {order.status === 'Preparando' ? <Package size={23} /> : <Truck size={23} />}
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <section className="rounded-2xl bg-slate-50 border border-slate-100 p-3 space-y-2">
                    <div className="flex items-start gap-3">
                      <MapPin size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[8px] font-black uppercase text-slate-400">Referencia</p>
                        <p className="text-xs font-bold text-slate-700 mt-1 leading-relaxed">
                          {reference || 'Sin referencia escrita'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone size={18} className="text-green-500 flex-shrink-0" />
                      <p className="text-xs font-black text-slate-700">{phone || 'Sin teléfono'}</p>
                    </div>
                  </section>

                  <section className={`rounded-2xl border p-4 ${
                    paid ? 'bg-green-50 border-green-100' : 'bg-purple-50 border-purple-100'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                        {order.payment_method === 'deuna' ? (
                          <QrCode size={21} className="text-purple-600" />
                        ) : (
                          <Banknote size={21} className="text-green-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-[9px] font-black uppercase text-slate-500">{paymentLabel(order)}</p>
                        <p className="text-[10px] font-bold text-slate-700 mt-1 leading-relaxed">
                          {paid
                            ? 'Pago recibido y confirmado.'
                            : order.payment_method === 'deuna'
                              ? 'Muestra tu QR personal de DeUna. Confirma solo cuando veas el pago.'
                              : 'Cuenta el efectivo. Confirma solo cuando lo recibas.'}
                        </p>
                      </div>
                      <ShieldCheck size={19} className={paid ? 'text-green-600' : 'text-purple-500'} />
                    </div>

                    {!paid && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void confirmPayment(order.id)}
                        className="w-full mt-3 bg-emerald-600 text-white rounded-xl py-3 font-black text-[9px] uppercase disabled:opacity-40 active:scale-95"
                      >
                        {busy ? 'Confirmando...' : 'Confirmar pago recibido'}
                      </button>
                    )}
                  </section>

                  <div className="grid grid-cols-2 gap-2">
                    {hasGps ? (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-red-600 text-white rounded-2xl py-3 font-black text-[9px] uppercase flex items-center justify-center gap-1.5"
                      >
                        <Navigation size={14} /> Mapa
                      </a>
                    ) : (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(reference || 'Puerto Ayora')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-red-50 text-red-600 border border-red-100 rounded-2xl py-3 font-black text-[9px] uppercase flex items-center justify-center gap-1.5"
                      >
                        <MapPin size={14} /> Buscar
                      </a>
                    )}

                    <a
                      href={`tel:${cleanPhone(phone)}`}
                      className="bg-green-50 text-green-600 border border-green-100 rounded-2xl py-3 font-black text-[9px] uppercase flex items-center justify-center gap-1.5"
                    >
                      <Phone size={14} /> Llamar
                    </a>

                    <a
                      href={`https://wa.me/${cleanPhone(phone)}?text=${encodeURIComponent(`Hola, estoy coordinando tu pedido ${order.order_code}.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#25D366] text-white rounded-2xl py-3 font-black text-[9px] uppercase flex items-center justify-center gap-1.5"
                    >
                      <MessageCircle size={14} /> WhatsApp
                    </a>

                    {order.status === 'Preparando' ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void runTransition(order.id, 'Enviado')}
                        className="bg-yellow-500 text-white rounded-2xl py-3 font-black text-[9px] uppercase flex items-center justify-center gap-1.5 disabled:opacity-40"
                      >
                        <Truck size={14} /> En ruta
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy || !paid}
                        onClick={() => {
                          if (!paid) return;
                          if (window.confirm('¿Pedido entregado y pago verificado?')) {
                            void runTransition(order.id, 'Entregado');
                          }
                        }}
                        className={`rounded-2xl py-3 font-black text-[9px] uppercase flex items-center justify-center gap-1.5 disabled:opacity-45 ${
                          paid ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        <CheckCircle2 size={14} /> {paid ? 'Entregado' : 'Falta pago'}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </main>
    </div>
  );
}
