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
  
  // SEGURIDAD: Si no hay teléfono, no hacemos nada para evitar errores
  if (!customerPhone) return null;

  // Limpiamos el número: solo los últimos 7 dígitos para que coincida SÍ O SÍ
  const cleanUser = customerPhone.replace(/\D/g, '').slice(-7);

  const myOrders = orders.filter(o => {
    if (!o.customer_phone) return false;
    const cleanOrder = o.customer_phone.replace(/\D/g, '').slice(-7);
    
    const isMine = cleanOrder === cleanUser;
    const orderDate = new Date(o.created_at || '').getTime();
    const isRecent = orderDate > Date.now() - (24 * 60 * 60 * 1000); // 24 horas
    
    // Mostramos si es mío, es reciente y NO está cancelado
    return isMine && isRecent && o.status !== 'Cancelado';
  });

  if (myOrders.length === 0) return null;

  return (
    <div className="px-4 py-2 space-y-3 mb-4">
      {myOrders.map((order) => (
        <div key={order.id} className="bg-white rounded-[28px] p-5 border-2 border-orange-100 shadow-xl shadow-orange-100/20">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Orden #{order.order_code}</p>
            </div>
            <span className="text-[10px] font-black text-white bg-orange-500 px-3 py-1 rounded-full uppercase shadow-sm">
              {order.status}
            </span>
          </div>

          <div className="relative flex justify-between items-center px-2">
            <div className="absolute left-0 right-0 top-[14px] h-[3px] bg-gray-100 -z-0" />
            {statusSteps.map((step, idx) => {
              const currentIdx = statusSteps.findIndex(s => s.status === order.status);
              const isCompleted = currentIdx >= idx;
              const Icon = step.icon;
              return (
                <div key={step.status} className="flex flex-col items-center gap-2 z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-700 ${
                    isCompleted ? 'bg-orange-500 text-white shadow-lg scale-110' : 'bg-white border-2 border-gray-100 text-gray-200'
                  }`}>
                    <Icon size={14} className={step.status === 'Preparando' && order.status === 'Preparando' ? 'animate-spin' : ''} />
                  </div>
                  <span className={`text-[8px] font-black uppercase ${isCompleted ? 'text-gray-900' : 'text-gray-300'}`}>
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
