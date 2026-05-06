import { Package, MapPin, CheckCircle2, Loader2 } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { OrderStatus } from '../types';

const statusSteps: Array<{ status: OrderStatus; label: string; icon: any }> = [
  { status: 'Recibido', label: 'Recibido', icon: CheckCircle2 },
  { status: 'Preparando', label: 'En Horno', icon: Loader2 },
  { status: 'Enviado', label: 'En Camino', icon: MapPin },
  { status: 'Entregado', label: '¡Listo!', icon: Package },
];

export default function OrderTracking({ customerPhone }: { customerPhone: string }) {
  const { orders } = useAdmin();
  
  // 1. SEGURIDAD: Si no hay teléfono o los pedidos aún no cargan, no mostramos nada
  if (!customerPhone || !orders) return null;

  // 2. LIMPIEZA DE NÚMERO: Tomamos los últimos 7 dígitos para evitar líos de formato
  const cleanUser = customerPhone.replace(/\D/g, '').slice(-7);

  const myOrders = orders.filter(o => {
    if (!o.customer_phone) return false;
    
    const cleanOrder = o.customer_phone.replace(/\D/g, '').slice(-7);
    const isMine = cleanOrder === cleanUser;
    
    const orderDate = new Date(o.created_at || '').getTime();
    const isRecent = orderDate > Date.now() - (12 * 60 * 60 * 1000); // Solo pedidos de las últimas 12 horas
    
    // REGLA DE VISIBILIDAD:
    // - Si está Cancelado: NO se muestra.
    // - Si está Entregado: Se muestra solo si fue hace menos de 30 minutos.
    // - El resto: Se muestran siempre que sean recientes.
    if (o.status === 'Cancelado') return false;
    if (o.status === 'Entregado') {
        const deliveredRecently = orderDate > Date.now() - (30 * 60 * 1000); // 30 min
        return isMine && deliveredRecently;
    }

    return isMine && isRecent;
  });

  // Si no hay pedidos activos para este cliente, no ocupamos espacio en la pantalla
  if (myOrders.length === 0) return null;

  return (
    <div className="px-4 py-2 space-y-3 mb-6">
      {myOrders.map((order) => (
        <div 
          key={order.id} 
          className="bg-white rounded-[32px] p-6 border-2 border-orange-100 shadow-xl shadow-orange-100/30 animate-in fade-in zoom-in duration-500"
        >
          {/* Encabezado del pedido */}
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                Seguimiento #{order.order_code}
              </p>
            </div>
            <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-full uppercase tracking-tight">
              {order.status === 'Entregado' ? '¡Buen provecho!' : order.status}
            </span>
          </div>

          {/* Línea de progreso visual */}
          <div className="relative flex justify-between items-center px-2">
            {/* Línea gris de fondo */}
            <div className="absolute left-0 right-0 top-[14px] h-[2px] bg-gray-100 -z-0" />
            
            {statusSteps.map((step, idx) => {
              const currentStatusIdx = statusSteps.findIndex(s => s.status === order.status);
              const isCompleted = currentStatusIdx >= idx;
              const isCurrent = order.status === step.status;
              const Icon = step.icon;
              
              return (
                <div key={step.status} className="flex flex-col items-center gap-2 z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-700 ${
                    isCompleted 
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 scale-110' 
                      : 'bg-white border-2 border-gray-100 text-gray-200'
                  }`}>
                    <Icon 
                      size={14} 
                      className={isCurrent && step.status === 'Preparando' ? 'animate-spin' : ''} 
                    />
                  </div>
                  <span className={`text-[8px] font-black uppercase tracking-tighter ${
                    isCompleted ? 'text-gray-900' : 'text-gray-300'
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
