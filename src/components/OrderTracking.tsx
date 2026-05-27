import {
  Truck,
  CheckCircle2,
  ClipboardList,
  X,
  ShoppingBag,
  Info,
  PackageSearch,
  Clock3,
  MapPin,
  TimerReset,
  Navigation,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Order, OrderStatus } from '../types';

interface Props {
  isOpen?: boolean;
  onClose?: () => void;
}

const STORE_LOCATION = {
  lat: -0.736323,
  lng: -90.321829,
};

const statusSteps: Array<{ status: OrderStatus; label: string; icon: LucideIcon }> = [
  { status: 'Por Confirmar', label: 'Por confirmar', icon: Clock3 },
  { status: 'Recibido', label: 'Confirmado', icon: ClipboardList },
  { status: 'Preparando', label: 'Empacando', icon: ShoppingBag },
  { status: 'Enviado', label: 'En camino', icon: Truck },
  { status: 'Entregado', label: 'Entregado', icon: CheckCircle2 },
];

const cleanPhoneTail = (phone?: string | null) => {
  return (phone || '').replace(/\D/g, '').slice(-8);
};

const toRadians = (value: number) => {
  return (value * Math.PI) / 180;
};

const parseCoordinate = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const getOrderLocation = (order: Order | null) => {
  if (!order) return null;

  const lat = parseCoordinate(order.lat);
  const lng = parseCoordinate(order.lng);

  if (lat === null || lng === null) {
    return null;
  }

  return { lat, lng };
};

const getOptionalDate = (order: Order, key: string): Date | null => {
  const value = (order as unknown as Record<string, unknown>)[key];

  if (!value) return null;

  const parsed = new Date(String(value));

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const distanceKmBetween = (
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const isRecentOrder = (order: Order) => {
  const createdAt = order.created_at ? new Date(order.created_at).getTime() : 0;

  if (!createdAt || Number.isNaN(createdAt)) {
    return false;
  }

  return createdAt > Date.now() - 24 * 60 * 60 * 1000;
};

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getOrderItemCount = (order: Order) => {
  return (order.items || []).reduce((sum: number, item: any) => {
    return sum + Number(item?.quantity || 1);
  }, 0);
};

const hasFreshOrVariableItems = (order: Order) => {
  return (order.items || []).some((item: any) => {
    const name = String(item?.name || item?.product?.name || '').toLowerCase();
    const category = String(item?.category || item?.product?.category || '').toLowerCase();

    return (
      item?.custom_price ||
      item?.product?.custom_price ||
      item?.product?.is_variable ||
      category.includes('pollo') ||
      name.includes('pollo') ||
      name.includes('pechuga') ||
      name.includes('alas') ||
      name.includes('cuartos') ||
      name.includes('menudencia')
    );
  });
};

const getPrepMinutes = (order: Order) => {
  const itemCount = getOrderItemCount(order);
  const hasFresh = hasFreshOrVariableItems(order);

  let min = 4;
  let max = 8;

  if (itemCount >= 4 && itemCount <= 8) {
    min += 3;
    max += 5;
  }

  if (itemCount > 8) {
    min += 6;
    max += 10;
  }

  if (hasFresh) {
    min += 4;
    max += 8;
  }

  if (order.payment_method === 'transferencia' || order.payment_method === 'deuna') {
    min += 2;
    max += 4;
  }

  return { min, max };
};

const getDeliveryMinutes = (distanceKm: number | null) => {
  if (distanceKm === null) {
    return { min: 8, max: 18 };
  }

  if (distanceKm <= 0) {
    return { min: 5, max: 10 };
  }

  const baseMin = Math.ceil(distanceKm * 4) + 4;
  const baseMax = Math.ceil(distanceKm * 6) + 8;

  return {
    min: Math.max(5, baseMin),
    max: Math.max(10, baseMax),
  };
};

const getTimingBaseDate = (order: Order, now: Date) => {
  const createdAt = order.created_at ? new Date(order.created_at) : now;
  const confirmedAt = getOptionalDate(order, 'confirmed_at');
  const updatedAt = getOptionalDate(order, 'updated_at');

  if (order.status === 'Enviado') {
    return updatedAt || confirmedAt || createdAt;
  }

  if (order.status === 'Preparando') {
    return updatedAt || confirmedAt || createdAt;
  }

  if (order.status === 'Recibido') {
    return confirmedAt || updatedAt || createdAt;
  }

  return createdAt;
};

const estimateOrderTiming = (order: Order, now: Date) => {
  const baseDate = getTimingBaseDate(order, now);
  const customerLocation = getOrderLocation(order);

  const distanceKm = customerLocation
    ? distanceKmBetween(STORE_LOCATION, customerLocation)
    : null;

  const prep = getPrepMinutes(order);
  const delivery = getDeliveryMinutes(distanceKm);

  let minMinutes = prep.min + delivery.min;
  let maxMinutes = prep.max + delivery.max;

  if (order.status === 'Preparando') {
    minMinutes = Math.max(6, delivery.min + 3);
    maxMinutes = Math.max(12, delivery.max + 8);
  }

  if (order.status === 'Enviado') {
    minMinutes = delivery.min;
    maxMinutes = delivery.max;
  }

  if (order.status === 'Entregado') {
    minMinutes = 0;
    maxMinutes = 0;
  }

  const earliest = new Date(baseDate.getTime() + minMinutes * 60 * 1000);
  const latest = new Date(baseDate.getTime() + maxMinutes * 60 * 1000);
  const remainingMs = latest.getTime() - now.getTime();
  const remainingMinutes = Math.max(0, Math.ceil(remainingMs / 60000));

  return {
    distanceKm,
    minMinutes,
    maxMinutes,
    earliest,
    latest,
    remainingMinutes,
  };
};

const getStatusMessage = (status: OrderStatus) => {
  switch (status) {
    case 'Por Confirmar':
      return 'Recibimos tu pedido. El negocio está revisando disponibilidad y método de pago.';
    case 'Recibido':
      return '¡Pedido confirmado! Ya tenemos tu compra en el sistema.';
    case 'Preparando':
      return 'Estamos empacando tus productos con cuidado.';
    case 'Enviado':
      return '¡Tu pedido va en camino a tu casa!';
    case 'Entregado':
      return '¡Pedido entregado! ¡Gracias por comprar en La Casa del Pollazo!';
    case 'Cancelado':
      return 'Este pedido fue cancelado.';
    default:
      return 'Estamos revisando el estado de tu pedido.';
  }
};

const getPendingPaymentText = (order: Order) => {
  if (order.payment_method === 'efectivo') {
    return 'Tu pedido espera confirmación del negocio antes de prepararse. El pago será contra entrega.';
  }

  if (order.payment_method === 'deuna') {
    return 'Tu pedido espera validación del pago por Deuna antes de activar el tiempo estimado.';
  }

  if (order.payment_method === 'transferencia') {
    return 'Tu pedido espera validación de transferencia antes de activar el tiempo estimado.';
  }

  return 'Cuando el negocio confirme tu pedido, aquí aparecerá el tiempo estimado de entrega.';
};

export default function OrderTracking({
  isOpen = false,
  onClose = () => {},
}: Props) {
  const { orders, refreshData } = useAdmin();
  const { customerPhone } = useUser();
  const [now, setNow] = useState(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const cleanUserPhone = cleanPhoneTail(customerPhone);

  const refreshTracking = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await refreshData();
      setNow(new Date());
    } catch (error) {
      console.error('No se pudo refrescar el rastreo:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshData]);

  useEffect(() => {
    if (!isOpen) return undefined;

    setNow(new Date());

    const clock = window.setInterval(() => {
      setNow(new Date());
    }, 15000);

    return () => window.clearInterval(clock);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    refreshTracking();

    const interval = window.setInterval(refreshTracking, 12000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isOpen, refreshTracking]);

  useEffect(() => {
    if (!isOpen || !isSupabaseConfigured || !cleanUserPhone) {
      return undefined;
    }

    const channel = supabase
      .channel(`pollazo_tracking_${cleanUserPhone}_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        payload => {
          const nextRow = payload.new as { customer_phone?: string } | null;
          const oldRow = payload.old as { customer_phone?: string } | null;

          const changedPhone =
            cleanPhoneTail(nextRow?.customer_phone) ||
            cleanPhoneTail(oldRow?.customer_phone);

          if (changedPhone === cleanUserPhone) {
            refreshTracking();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cleanUserPhone, isOpen, refreshTracking]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshTracking();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isOpen, refreshTracking]);

  const activeOrder = useMemo(() => {
    if (!cleanUserPhone) {
      return null;
    }

    return (
      orders
        ?.filter(order => {
          const cleanOrder = cleanPhoneTail(order.customer_phone);

          return (
            cleanOrder === cleanUserPhone &&
            isRecentOrder(order) &&
            order.status !== 'Cancelado'
          );
        })
        .sort((a, b) => {
          const dateA = new Date(a.created_at || '').getTime();
          const dateB = new Date(b.created_at || '').getTime();

          return dateB - dateA;
        })[0] || null
    );
  }, [cleanUserPhone, orders]);

  if (!isOpen) return null;

  const hasActiveOrder = Boolean(activeOrder);
  const currentStatus = activeOrder?.status;
  const currentStatusIdx = currentStatus
    ? statusSteps.findIndex(step => step.status === currentStatus)
    : -1;

  const canShowEta =
    activeOrder &&
    currentStatus &&
    currentStatus !== 'Por Confirmar' &&
    currentStatus !== 'Entregado' &&
    currentStatus !== 'Cancelado';

  const estimate = canShowEta ? estimateOrderTiming(activeOrder, now) : null;
  const orderLocation = getOrderLocation(activeOrder);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md bg-white rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95 duration-300 border border-white/20 max-h-[92vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Cerrar rastreo"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-8">
          <div
            className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 ${
              hasActiveOrder
                ? currentStatus === 'Por Confirmar'
                  ? 'bg-orange-100 text-orange-500'
                  : 'bg-green-100 text-green-600'
                : 'bg-orange-100 text-orange-500'
            }`}
          >
            {hasActiveOrder ? (
              currentStatus === 'Por Confirmar' ? (
                <Clock3 size={40} />
              ) : (
                <Truck size={40} />
              )
            ) : (
              <PackageSearch size={40} />
            )}
          </div>

          <h2 className="text-2xl font-black text-gray-900 uppercase italic leading-none">
            {hasActiveOrder
              ? currentStatus === 'Por Confirmar'
                ? 'Esperando Confirmación'
                : 'Pedido en Curso'
              : 'Rastreo en Vivo'}
          </h2>

          <p className="text-sm font-bold text-gray-400 mt-2">
            {hasActiveOrder
              ? `Código: ${activeOrder?.order_code || 'Sin código'}`
              : 'Sigue tu compra paso a paso'}
          </p>

          {hasActiveOrder && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5">
                <RefreshCw
                  size={12}
                  className={`text-orange-500 ${isRefreshing ? 'animate-spin' : ''}`}
                />
                <span className="text-[9px] font-black uppercase text-gray-400">
                  En vivo
                </span>
              </div>

              <button
                type="button"
                onClick={refreshTracking}
                className="inline-flex items-center gap-1 bg-orange-50 text-orange-600 border border-orange-100 rounded-full px-3 py-1.5 text-[9px] font-black uppercase active:scale-95 transition-all"
              >
                Actualizar
              </button>
            </div>
          )}
        </div>

        {hasActiveOrder && currentStatus ? (
          <div className="py-2">
            <div className="relative flex justify-between items-center px-1 mb-8">
              <div className="absolute left-0 right-0 top-[20px] h-[3px] bg-gray-100 rounded-full" />

              {statusSteps.map((step, idx) => {
                const isCompleted = currentStatusIdx >= idx;
                const isCurrent = currentStatus === step.status;
                const Icon = step.icon;

                return (
                  <div key={step.status} className="flex flex-col items-center gap-2 z-10">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                        isCompleted
                          ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
                          : 'bg-white border-2 border-gray-100 text-gray-300'
                      } ${isCurrent ? 'scale-125 ring-4 ring-orange-100' : ''}`}
                    >
                      <Icon size={18} />
                    </div>

                    <span
                      className={`text-[7px] font-black uppercase tracking-tighter text-center max-w-[58px] leading-tight ${
                        isCompleted ? 'text-gray-900' : 'text-gray-300'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div
              className={`p-4 rounded-2xl border text-center shadow-sm ${
                currentStatus === 'Por Confirmar'
                  ? 'bg-orange-50 border-orange-100'
                  : 'bg-green-50 border-green-100'
              }`}
            >
              <p
                className={`text-xs font-black uppercase italic leading-relaxed ${
                  currentStatus === 'Por Confirmar'
                    ? 'text-orange-600'
                    : 'text-green-700'
                }`}
              >
                {getStatusMessage(currentStatus)}
              </p>
            </div>

            {currentStatus === 'Por Confirmar' && activeOrder && (
              <div className="mt-4 bg-yellow-50 border border-yellow-100 rounded-[28px] p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-yellow-600 shadow-sm flex-shrink-0">
                    <ShieldCheck size={20} />
                  </div>

                  <div>
                    <p className="text-[10px] font-black text-yellow-700 uppercase">
                      Tiempo estimado bloqueado
                    </p>
                    <p className="text-[11px] font-bold text-yellow-700/80 leading-relaxed mt-1">
                      {getPendingPaymentText(activeOrder)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {estimate && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3">
                  <div className="flex items-center gap-2 text-orange-600 mb-1">
                    <TimerReset size={15} />
                    <span className="text-[8px] font-black uppercase">
                      Llegada estimada
                    </span>
                  </div>
                  <p className="text-xs font-black text-gray-900 leading-snug">
                    {formatTime(estimate.earliest)} - {formatTime(estimate.latest)}
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3">
                  <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <Navigation size={15} />
                    <span className="text-[8px] font-black uppercase">
                      Distancia aprox.
                    </span>
                  </div>
                  <p className="text-xs font-black text-gray-900 leading-snug">
                    {estimate.distanceKm !== null
                      ? `${estimate.distanceKm.toFixed(1)} km`
                      : 'Sin GPS exacto'}
                  </p>
                </div>

                <div className="col-span-2 bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
                  <p className="text-[10px] font-black uppercase text-green-700 leading-relaxed">
                    {currentStatus === 'Enviado'
                      ? `Tu pedido debería llegar en aproximadamente ${estimate.remainingMinutes} min.`
                      : `Tu pedido está estimado para llegar entre ${estimate.minMinutes} y ${estimate.maxMinutes} min desde la confirmación.`}
                  </p>
                </div>
              </div>
            )}

            {activeOrder?.reference && (
              <div className="mt-4 bg-blue-50 border border-blue-100 rounded-2xl p-3 flex items-start gap-3">
                <MapPin size={17} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] font-bold text-blue-700 uppercase leading-relaxed">
                  Referencia: {activeOrder.reference}
                </p>
              </div>
            )}

            {!orderLocation && currentStatus !== 'Por Confirmar' && (
              <div className="mt-4 bg-orange-50 border border-orange-100 rounded-2xl p-3 flex items-start gap-3">
                <MapPin size={17} className="text-orange-500 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] font-bold text-orange-700 uppercase leading-relaxed">
                  No encontramos GPS exacto en este pedido. El tiempo se calcula como zona cercana.
                </p>
              </div>
            )}

            {activeOrder?.created_at && (
              <p className="text-center text-[10px] text-gray-300 font-bold uppercase mt-4">
                Se actualiza automáticamente cuando el admin cambia el estado
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-gray-500 font-bold leading-relaxed text-center px-2">
              Aquí podrás ver el progreso de tu compra en tiempo real. Cuando realices un pedido y lo confirmemos, se activará este seguimiento automático. 🛵💨
            </p>

            <div className="p-5 bg-blue-50 rounded-[32px] flex items-center gap-4 border border-blue-100 shadow-sm">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-500 shadow-sm flex-shrink-0">
                <Info size={24} />
              </div>

              <p className="text-[10px] font-black text-blue-700 uppercase leading-tight text-left">
                Te notificaremos cuando el pedido salga de "La Casa del Pollazo".
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-5 bg-gray-900 text-white font-black rounded-[24px] text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl"
            >
              ¡Entendido!
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
