import {
  Truck,
  CheckCircle2,
  ClipboardList,
  X,
  ShoppingBag,
  Info,
  PackageSearch,
  Clock3,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext';
import type { Order, OrderStatus } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const statusSteps: Array<{ status: OrderStatus; label: string; icon: LucideIcon }> = [
  { status: 'Por Confirmar', label: 'Por confirmar', icon: Clock3 },
  { status: 'Recibido', label: 'Recibido', icon: ClipboardList },
  { status: 'Preparando', label: 'Empacando', icon: ShoppingBag },
  { status: 'Enviado', label: 'En camino', icon: Truck },
  { status: 'Entregado', label: 'Entregado', icon: CheckCircle2 },
];

const cleanPhoneTail = (phone?: string | null) => {
  return (phone || '').replace(/\D/g, '').slice(-8);
};

const isRecentOrder = (order: Order) => {
  const createdAt = order.created_at ? new Date(order.created_at).getTime() : 0;

  if (!createdAt || Number.isNaN(createdAt)) {
    return false;
  }

  return createdAt > Date.now() - 24 * 60 * 60 * 1000;
};

const getStatusMessage = (status: OrderStatus) => {
  switch (status) {
    case 'Por Confirmar':
      return 'Recibimos tu pedido. Enseguida lo revisamos para confirmarlo.';
    case 'Recibido':
      return '¡Pedido confirmado! Ya tenemos tu compra en el sistema.';
    case 'Preparando':
      return 'Estamos empacando tus productos con cuidado.';
    case 'Enviado':
      return '¡Tu pedido va en camino a tu casa!';
    case 'Entregado':
      return '¡Pedido entregado! ¡Buen provecho!';
    case 'Cancelado':
      return 'Este pedido fue cancelado.';
    default:
      return 'Estamos revisando el estado de tu pedido.';
  }
};

export default function OrderTracking({ isOpen, onClose }: Props) {
  const { orders } = useAdmin();
  const { customerPhone } = useUser();

  const activeOrder = useMemo(() => {
    const cleanUser = cleanPhoneTail(customerPhone);

    if (!cleanUser) {
      return null;
    }

    return (
      orders
        ?.filter(order => {
          const cleanOrder = cleanPhoneTail(order.customer_phone);
          return (
            cleanOrder === cleanUser &&
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
  }, [customerPhone, orders]);

  if (!isOpen) return null;

  const hasActiveOrder = Boolean(activeOrder);
  const currentStatus = activeOrder?.status;
  const currentStatusIdx = currentStatus
    ? statusSteps.findIndex(step => step.status === currentStatus)
    : -1;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Fondo borroso Glassmorphism */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md bg-white rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95 duration-300 border border-white/20">
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
                ? 'bg-green-100 text-green-600'
                : 'bg-orange-100 text-orange-500'
            }`}
          >
            {hasActiveOrder ? <Truck size={40} /> : <PackageSearch size={40} />}
          </div>

          <h2 className="text-2xl font-black text-gray-900 uppercase italic leading-none">
            {hasActiveOrder ? 'Pedido en Curso' : 'Rastreo en Vivo'}
          </h2>

          <p className="text-sm font-bold text-gray-400 mt-2">
            {hasActiveOrder
              ? `Código: ${activeOrder?.order_code || 'Sin código'}`
              : 'Sigue tu compra paso a paso'}
          </p>
        </div>

        {hasActiveOrder && currentStatus ? (
          <div className="py-4">
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

            <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 text-center shadow-sm">
              <p className="text-xs font-black text-orange-600 uppercase italic leading-relaxed">
                {getStatusMessage(currentStatus)}
              </p>
            </div>

            {activeOrder?.created_at && (
              <p className="text-center text-[10px] text-gray-300 font-bold uppercase mt-4">
                Actualizado según tu último pedido de las últimas 24 horas
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
