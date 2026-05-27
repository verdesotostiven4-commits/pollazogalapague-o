import { useMemo, useState } from 'react';
import {
  Bike,
  Lock,
  MapPin,
  Phone,
  MessageCircle,
  CheckCircle2,
  Truck,
  Package,
  RefreshCw,
  LogOut,
  Clock,
  Navigation,
  AlertTriangle,
  ClipboardList,
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import type { Order, OrderStatus } from '../types';

const DELIVERY_PIN = '2580';
const DELIVERY_PIN_KEY = 'pollazo_delivery_auth';

const cleanPhone = (phone?: string | null) => {
  return String(phone || '').replace(/\D/g, '');
};

const prettyPhone = (phone?: string | null) => {
  const clean = cleanPhone(phone);

  if (!clean) return 'Sin teléfono';

  if (clean.startsWith('593')) return `+${clean}`;

  return clean;
};

const toMoney = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = Number.parseFloat(
    String(value || '0')
      .replace(',', '.')
      .replace(/[^0-9.-]/g, '')
  );

  return Number.isFinite(parsed) ? parsed : 0;
};

const isValidCoordinate = (value: unknown) => {
  const number = toMoney(value);
  return Number.isFinite(number) && number !== 0;
};

const formatTime = (date?: string | null) => {
  if (!date) return '--';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return '--';

  return parsed.toLocaleString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const orderItemsLabel = (order: Order) => {
  const items = order.items || [];

  if (items.length === 0) return 'Pedido sin detalle';

  const totalQuantity = items.reduce((sum, item) => {
    return sum + Number(item.quantity || 1);
  }, 0);

  return `${totalQuantity} producto${totalQuantity !== 1 ? 's' : ''}`;
};

const orderItemsPreview = (order: Order) => {
  const items = order.items || [];

  if (items.length === 0) return 'Sin productos registrados';

  return items
    .slice(0, 3)
    .map(item => `${Number(item.quantity || 1)}x ${item.name || item.product?.name || 'Producto'}`)
    .join(' · ');
};

const getStatusStyle = (status: OrderStatus) => {
  if (status === 'Preparando') return 'bg-blue-50 text-blue-600 border-blue-100';
  if (status === 'Enviado') return 'bg-yellow-50 text-yellow-700 border-yellow-100';
  if (status === 'Entregado') return 'bg-green-50 text-green-600 border-green-100';

  return 'bg-gray-50 text-gray-500 border-gray-100';
};

function DeliveryPinScreen({ onAuth }: { onAuth: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const addDigit = (digit: string) => {
    setError(false);

    const next = (pin + digit).slice(0, 4);
    setPin(next);

    if (next.length === 4) {
      if (next === DELIVERY_PIN) {
        sessionStorage.setItem(DELIVERY_PIN_KEY, '1');
        onAuth();
      } else {
        setError(true);
        window.setTimeout(() => {
          setPin('');
          setError(false);
        }, 450);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-xs text-center space-y-7">
        <div className="w-24 h-24 rounded-[32px] bg-orange-500 mx-auto flex items-center justify-center shadow-2xl shadow-orange-500/20">
          <Bike size={46} />
        </div>

        <div>
          <h1 className="font-black text-2xl uppercase italic tracking-tight">
            Repartidor
          </h1>
          <p className="text-white/45 text-[10px] font-black uppercase tracking-[0.25em] mt-2">
            La Casa del Pollazo
          </p>
        </div>

        <div className="flex justify-center gap-3">
          {[0, 1, 2, 3].map(index => (
            <div
              key={index}
              className={`w-3.5 h-3.5 rounded-full transition-all ${
                index < pin.length
                  ? error
                    ? 'bg-red-500'
                    : 'bg-orange-500 scale-125 shadow-[0_0_12px_#f97316]'
                  : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((digit, index) =>
            digit ? (
              <button
                key={index}
                type="button"
                onClick={() => {
                  if (digit === '⌫') {
                    setPin(current => current.slice(0, -1));
                    return;
                  }

                  addDigit(digit);
                }}
                className="aspect-square rounded-2xl bg-white/5 border border-white/10 text-xl font-black active:scale-90 transition-all"
              >
                {digit}
              </button>
            ) : (
              <div key={index} />
            )
          )}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3 text-left">
          <Lock size={18} className="text-orange-400 flex-shrink-0" />
          <p className="text-[10px] font-bold text-white/50 leading-relaxed">
            Esta pantalla solo muestra pedidos para entrega. No permite editar productos, ranking ni configuración.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DeliveryDashboard() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(DELIVERY_PIN_KEY) === '1');
  const [filter, setFilter] = useState<'ready' | 'sent' | 'all'>('ready');
  const { orders, customers, updateOrderStatus, refreshData, loading } = useAdmin();

  const deliveryOrders = useMemo(() => {
    return [...orders]
      .filter(order => order.status === 'Preparando' || order.status === 'Enviado')
      .filter(order => {
        if (filter === 'ready') return order.status === 'Preparando';
        if (filter === 'sent') return order.status === 'Enviado';
        return true;
      })
      .sort((a, b) => {
        const statusScore = (status: OrderStatus) => {
          if (status === 'Enviado') return 0;
          if (status === 'Preparando') return 1;
          return 2;
        };

        const diff = statusScore(a.status) - statusScore(b.status);

        if (diff !== 0) return diff;

        return new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime();
      });
  }, [filter, orders]);

  const readyCount = orders.filter(order => order.status === 'Preparando').length;
  const sentCount = orders.filter(order => order.status === 'Enviado').length;

  if (!authed) {
    return <DeliveryPinScreen onAuth={() => setAuthed(true)} />;
  }

  const handleStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, status);
      await refreshData();
    } catch (error) {
      console.error('No se pudo actualizar pedido:', error);
      window.alert('No se pudo actualizar el pedido.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-orange-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200">
              <Bike size={24} />
            </div>

            <div>
              <p className="font-black text-gray-900 uppercase italic leading-none">
                Entregas
              </p>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">
                {readyCount} listos · {sentCount} en camino
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refreshData}
              className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
              aria-label="Actualizar entregas"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>

            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem(DELIVERY_PIN_KEY);
                setAuthed(false);
              }}
              className="w-10 h-10 bg-gray-100 text-gray-400 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
              aria-label="Salir"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4">
        <section className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setFilter('ready')}
            className={`rounded-2xl p-3 border text-left active:scale-95 transition-all ${
              filter === 'ready'
                ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-100'
                : 'bg-white text-gray-500 border-gray-100'
            }`}
          >
            <Package size={18} />
            <p className="font-black text-lg leading-none mt-2">{readyCount}</p>
            <p className="text-[8px] font-black uppercase mt-1 opacity-75">
              Listos
            </p>
          </button>

          <button
            type="button"
            onClick={() => setFilter('sent')}
            className={`rounded-2xl p-3 border text-left active:scale-95 transition-all ${
              filter === 'sent'
                ? 'bg-yellow-500 text-white border-yellow-500 shadow-lg shadow-yellow-100'
                : 'bg-white text-gray-500 border-gray-100'
            }`}
          >
            <Truck size={18} />
            <p className="font-black text-lg leading-none mt-2">{sentCount}</p>
            <p className="text-[8px] font-black uppercase mt-1 opacity-75">
              Ruta
            </p>
          </button>

          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-2xl p-3 border text-left active:scale-95 transition-all ${
              filter === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                : 'bg-white text-gray-500 border-gray-100'
            }`}
          >
            <ClipboardList size={18} />
            <p className="font-black text-lg leading-none mt-2">{readyCount + sentCount}</p>
            <p className="text-[8px] font-black uppercase mt-1 opacity-75">
              Todos
            </p>
          </button>
        </section>

        {deliveryOrders.length === 0 ? (
          <section className="bg-white rounded-[32px] border border-gray-100 p-10 text-center shadow-sm mt-6">
            <div className="w-16 h-16 bg-orange-50 text-orange-400 rounded-[24px] flex items-center justify-center mx-auto mb-4">
              <Package size={32} />
            </div>

            <h2 className="font-black text-gray-900 uppercase">
              No hay entregas ahora
            </h2>
            <p className="text-xs font-bold text-gray-400 leading-relaxed mt-2">
              Cuando el admin marque pedidos como “Preparando” o “Enviado”, aparecerán aquí.
            </p>
          </section>
        ) : (
          deliveryOrders.map(order => {
            const customer = customers.find(current => {
              const customerPhone = cleanPhone(current.phone).slice(-9);
              const orderPhone = cleanPhone(order.customer_phone).slice(-9);

              return customerPhone && customerPhone === orderPhone;
            });

            const deliveryLat = order.lat ?? customer?.lat ?? null;
            const deliveryLng = order.lng ?? customer?.lng ?? null;
            const hasGps = isValidCoordinate(deliveryLat) && isValidCoordinate(deliveryLng);
            const reference = order.reference || customer?.reference || '';
            const phone = order.customer_phone || customer?.phone || '';

            return (
              <article
                key={order.id}
                className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="p-5 border-b border-gray-50 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full border ${getStatusStyle(order.status)}`}>
                        {order.status === 'Preparando' ? 'Listo para ruta' : 'En camino'}
                      </span>

                      <span className="text-[8px] font-black uppercase text-gray-300">
                        {formatTime(order.created_at)}
                      </span>
                    </div>

                    <h2 className="font-black text-gray-900 uppercase italic mt-2 truncate">
                      {customer?.name || 'Cliente'}
                    </h2>

                    <p className="text-[10px] font-black text-gray-400 uppercase mt-1">
                      {order.order_code || 'Sin código'} · {orderItemsLabel(order)}
                    </p>
                  </div>

                  <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center flex-shrink-0">
                    {order.status === 'Enviado' ? <Truck size={24} /> : <Package size={24} />}
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div className="bg-orange-50/60 border border-orange-100 rounded-2xl p-3">
                    <p className="text-[8px] font-black text-orange-500 uppercase tracking-widest mb-1">
                      Resumen del pedido
                    </p>
                    <p className="text-[11px] font-bold text-gray-700 leading-relaxed">
                      {orderItemsPreview(order)}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3 flex items-start gap-3">
                      <MapPin size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase">
                          Referencia de entrega
                        </p>
                        <p className="text-xs font-bold text-gray-700 leading-relaxed mt-1">
                          {reference || 'Sin referencia escrita'}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3 flex items-center gap-3">
                      <Phone size={18} className="text-green-500 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-[9px] font-black text-gray-400 uppercase">
                          Teléfono
                        </p>
                        <p className="text-xs font-black text-gray-700 mt-1">
                          {prettyPhone(phone)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {!hasGps && (
                    <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-3 flex items-start gap-3">
                      <AlertTriangle size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                      <p className="text-[10px] font-bold text-yellow-700 leading-relaxed">
                        Este pedido no tiene GPS exacto. Usa la referencia o comunícate con el cliente.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {hasGps ? (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${deliveryLat},${deliveryLng}&travelmode=driving`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-red-600 text-white rounded-2xl py-3 font-black text-[9px] uppercase flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-lg shadow-red-100"
                      >
                        <Navigation size={14} />
                        Mapa
                      </a>
                    ) : (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(reference || 'Puerto Ayora El Mirador')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-red-100 text-red-600 rounded-2xl py-3 font-black text-[9px] uppercase flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                      >
                        <MapPin size={14} />
                        Buscar
                      </a>
                    )}

                    <a
                      href={`tel:${cleanPhone(phone)}`}
                      className="bg-green-50 text-green-600 border border-green-100 rounded-2xl py-3 font-black text-[9px] uppercase flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                    >
                      <Phone size={14} />
                      Llamar
                    </a>

                    <a
                      href={`https://wa.me/${cleanPhone(phone)}?text=${encodeURIComponent(`Hola, soy de La Casa del Pollazo. Estoy coordinando tu pedido ${order.order_code || ''}.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#25D366] text-white rounded-2xl py-3 font-black text-[9px] uppercase flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                    >
                      <MessageCircle size={14} />
                      WhatsApp
                    </a>

                    {order.status === 'Preparando' ? (
                      <button
                        type="button"
                        onClick={() => handleStatus(order.id, 'Enviado')}
                        className="bg-yellow-500 text-white rounded-2xl py-3 font-black text-[9px] uppercase flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-lg shadow-yellow-100"
                      >
                        <Truck size={14} />
                        En ruta
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const ok = window.confirm('¿Marcar este pedido como entregado?');

                          if (ok) {
                            handleStatus(order.id, 'Entregado');
                          }
                        }}
                        className="bg-green-500 text-white rounded-2xl py-3 font-black text-[9px] uppercase flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-lg shadow-green-100"
                      >
                        <CheckCircle2 size={14} />
                        Entregado
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
