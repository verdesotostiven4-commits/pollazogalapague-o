import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bike,
  MapPin,
  Phone,
  MessageCircle,
  CheckCircle2,
  Truck,
  Package,
  RefreshCw,
  LogOut,
  Navigation,
  AlertTriangle,
  ClipboardList,
  BellRing,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import type { Order, OrderStatus } from '../types';
import { logoutPanelSession } from '../utils/panelSession';

const DELIVERY_SEEN_READY_KEY = 'pollazo_delivery_seen_ready_ids';

const DELIVERY_ACTIVE_STATUSES: OrderStatus[] = ['Preparando', 'Enviado'];

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

  const firstItems = items
    .slice(0, 3)
    .map(item => `${Number(item.quantity || 1)}x ${item.name || item.product?.name || 'Producto'}`)
    .join(' · ');

  if (items.length <= 3) return firstItems;

  return `${firstItems} · +${items.length - 3} más`;
};

const getStatusStyle = (status: OrderStatus) => {
  if (status === 'Preparando') return 'bg-blue-50 text-blue-600 border-blue-100';
  if (status === 'Enviado') return 'bg-yellow-50 text-yellow-700 border-yellow-100';
  if (status === 'Entregado') return 'bg-green-50 text-green-600 border-green-100';

  return 'bg-gray-50 text-gray-500 border-gray-100';
};

const readSeenReadyIds = () => {
  try {
    const raw = localStorage.getItem(DELIVERY_SEEN_READY_KEY);

    if (!raw) return new Set<string>();

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return new Set<string>();

    return new Set(parsed.map(String));
  } catch {
    return new Set<string>();
  }
};

const saveSeenReadyIds = (ids: Set<string>) => {
  try {
    localStorage.setItem(DELIVERY_SEEN_READY_KEY, JSON.stringify(Array.from(ids).slice(-80)));
  } catch {
    // localStorage opcional.
  }
};

const vibrateDeliveryAlert = () => {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate([140, 70, 140, 70, 220]);
    }
  } catch {
    // Vibración opcional.
  }
};

const playDeliveryAlertSound = () => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const notes = [523.25, 659.25, 783.99, 1046.5];

    notes.forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + index * 0.11;
      const duration = 0.18;

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.09, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      oscillator.start(start);
      oscillator.stop(start + duration);
    });

    window.setTimeout(() => {
      ctx.close().catch(() => undefined);
    }, 900);
  } catch {
    // Algunos navegadores bloquean audio sin interacción previa.
  }
};

export default function DeliveryDashboard() {
  const [filter, setFilter] = useState<'ready' | 'sent' | 'all'>('ready');
  const [urgentReadyIds, setUrgentReadyIds] = useState<Set<string>>(() => new Set());
  const [deliveryNotice, setDeliveryNotice] = useState<{
    title: string;
    message: string;
    orderCode?: string | null;
  } | null>(null);

  const { orders, customers, updateOrderStatus, refreshData, loading } = useAdmin();

  const initializedRef = useRef(false);
  const previousReadyIdsRef = useRef<Set<string>>(new Set());

  const readyOrders = useMemo(() => {
    return [...orders]
      .filter(order => order.status === 'Preparando')
      .sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime());
  }, [orders]);

  const sentOrders = useMemo(() => {
    return [...orders]
      .filter(order => order.status === 'Enviado')
      .sort((a, b) => new Date(a.updated_at || a.created_at || '').getTime() - new Date(b.updated_at || b.created_at || '').getTime());
  }, [orders]);

  const deliveryOrders = useMemo(() => {
    return [...orders]
      .filter(order => DELIVERY_ACTIVE_STATUSES.includes(order.status))
      .filter(order => {
        if (filter === 'ready') return order.status === 'Preparando';
        if (filter === 'sent') return order.status === 'Enviado';
        return true;
      })
      .sort((a, b) => {
        const statusScore = (status: OrderStatus) => {
          if (status === 'Preparando') return 0;
          if (status === 'Enviado') return 1;
          return 2;
        };

        const diff = statusScore(a.status) - statusScore(b.status);

        if (diff !== 0) return diff;

        return new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime();
      });
  }, [filter, orders]);

  const readyCount = readyOrders.length;
  const sentCount = sentOrders.length;
  const urgentCount = urgentReadyIds.size;

  const dismissDeliveryNotice = () => {
    setDeliveryNotice(null);

    const seen = readSeenReadyIds();
    urgentReadyIds.forEach(id => seen.add(id));
    saveSeenReadyIds(seen);

    setUrgentReadyIds(new Set());
  };

  useEffect(() => {
    const currentReadyIds = new Set(readyOrders.map(order => order.id));
    const seenReadyIds = readSeenReadyIds();

    if (!initializedRef.current) {
      previousReadyIdsRef.current = currentReadyIds;
      initializedRef.current = true;
      return;
    }

    const newReadyOrders = readyOrders.filter(order => {
      return !previousReadyIdsRef.current.has(order.id) && !seenReadyIds.has(order.id);
    });

    previousReadyIdsRef.current = currentReadyIds;

    if (newReadyOrders.length === 0) return;

    const newIds = new Set(newReadyOrders.map(order => order.id));

    setUrgentReadyIds(prev => {
      const next = new Set(prev);

      newIds.forEach(id => next.add(id));

      return next;
    });

    const firstOrder = newReadyOrders[0];

    setDeliveryNotice({
      title: newReadyOrders.length === 1 ? 'Pedido listo para ruta' : 'Nuevos pedidos listos',
      message:
        newReadyOrders.length === 1
          ? 'Hay un pedido preparado esperando que lo tomes para entrega.'
          : `Hay ${newReadyOrders.length} pedidos preparados esperando salida.`,
      orderCode: firstOrder.order_code,
    });

    setFilter('ready');
    vibrateDeliveryAlert();
    playDeliveryAlertSound();

    try {
      document.title = `🛵 ${newReadyOrders.length} entrega${newReadyOrders.length > 1 ? 's' : ''} lista${newReadyOrders.length > 1 ? 's' : ''}`;
    } catch {
      // Título opcional.
    }
  }, [readyOrders]);

  useEffect(() => {
    if (!deliveryNotice) {
      try {
        document.title = 'La Casa del Pollazo';
      } catch {
        // Ignorar.
      }
    }
  }, [deliveryNotice]);


  const handleStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, status);

      if (status === 'Enviado') {
        const seen = readSeenReadyIds();
        seen.add(orderId);
        saveSeenReadyIds(seen);

        setUrgentReadyIds(prev => {
          const next = new Set(prev);
          next.delete(orderId);
          return next;
        });
      }
    } catch (error) {
      console.error('No se pudo actualizar pedido:', error);
      window.alert(
        error instanceof Error ? error.message : 'No se pudo actualizar el pedido.'
      );
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 pb-10 ${urgentCount > 0 ? 'animate-[pulse_1.8s_ease-in-out_infinite]' : ''}`}>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-orange-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 text-white rounded-2xl flex items-center justify-center shadow-lg ${
              urgentCount > 0
                ? 'bg-red-500 shadow-red-200 animate-bounce'
                : 'bg-orange-500 shadow-orange-200'
            }`}>
              {urgentCount > 0 ? <BellRing size={24} /> : <Bike size={24} />}
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
            {urgentCount > 0 && (
              <button
                type="button"
                onClick={dismissDeliveryNotice}
                className="h-10 px-3 bg-red-50 text-red-600 rounded-xl flex items-center gap-1.5 active:scale-90 transition-transform"
              >
                <BellRing size={16} />
                <span className="text-[9px] font-black uppercase">
                  Visto
                </span>
              </button>
            )}

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
              onClick={() => void logoutPanelSession('delivery')}
              className="w-10 h-10 bg-gray-100 text-gray-400 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
              aria-label="Salir"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {deliveryNotice && (
        <div className="fixed inset-x-0 top-[74px] z-50 px-4">
          <div className="max-w-3xl mx-auto bg-red-500 text-white rounded-[28px] shadow-2xl shadow-red-200 p-4 border border-red-400 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0 animate-pulse">
                <BellRing size={25} />
              </div>

              <div className="flex-1">
                <p className="text-xs font-black uppercase italic leading-tight">
                  {deliveryNotice.title}
                </p>
                <p className="text-[11px] font-bold text-white/85 leading-relaxed mt-1">
                  {deliveryNotice.orderCode ? `${deliveryNotice.orderCode} · ` : ''}
                  {deliveryNotice.message}
                </p>

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={dismissDeliveryNotice}
                    className="bg-white text-red-600 rounded-xl px-3 py-2 text-[9px] font-black uppercase active:scale-95 transition-all"
                  >
                    Entendido
                  </button>

                  <div className="flex items-center gap-1 text-[9px] font-black uppercase text-white/70">
                    <Volume2 size={12} />
                    Sonido y vibración
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={dismissDeliveryNotice}
                className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center active:scale-90 transition-transform"
                aria-label="Cerrar aviso"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto p-4 space-y-4">
        {urgentCount > 0 && (
          <section className="bg-red-50 border border-red-100 rounded-[28px] p-4 flex items-start gap-3 shadow-sm">
            <div className="w-11 h-11 rounded-2xl bg-red-500 text-white flex items-center justify-center flex-shrink-0">
              <Zap size={22} />
            </div>

            <div>
              <p className="text-xs font-black text-red-600 uppercase italic">
                Atención repartidor
              </p>
              <p className="text-[11px] font-bold text-red-600/80 leading-relaxed mt-1">
                Hay {urgentCount} pedido{urgentCount !== 1 ? 's' : ''} preparado{urgentCount !== 1 ? 's' : ''} esperando salida. Toca “En ruta” cuando lo tomes.
              </p>
            </div>
          </section>
        )}

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
              Cuando el admin marque pedidos como “Preparando”, aparecerán aquí como listos para ruta.
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
            const isUrgentReady = urgentReadyIds.has(order.id);

            return (
              <article
                key={order.id}
                className={`bg-white rounded-[32px] border shadow-sm overflow-hidden transition-all ${
                  isUrgentReady
                    ? 'border-red-200 ring-4 ring-red-100 shadow-red-100 animate-pulse'
                    : 'border-gray-100'
                }`}
              >
                <div className="p-5 border-b border-gray-50 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full border ${getStatusStyle(order.status)}`}>
                        {order.status === 'Preparando' ? 'Listo para ruta' : 'En camino'}
                      </span>

                      {isUrgentReady && (
                        <span className="text-[8px] font-black uppercase px-2 py-1 rounded-full border bg-red-50 text-red-600 border-red-100">
                          Nuevo
                        </span>
                      )}

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

                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    isUrgentReady
                      ? 'bg-red-50 text-red-500'
                      : 'bg-orange-50 text-orange-500'
                  }`}>
                    {isUrgentReady ? <BellRing size={24} /> : order.status === 'Enviado' ? <Truck size={24} /> : <Package size={24} />}
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
