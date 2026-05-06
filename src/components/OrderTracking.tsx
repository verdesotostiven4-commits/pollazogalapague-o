import { Package, MapPin, Clock, CheckCircle2, Loader2, ChevronRight } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { OrderStatus } from '../types';

const statusSteps: { status: OrderStatus; label: string; icon: any; color: string }[] = [
  { status: 'Recibido', label: 'Recibido', icon: CheckCircle2, color: 'text-blue-500' },
  { status: 'Preparando', label: 'En el Horno', icon: Loader2, color: 'text-orange-500' },
  { status: 'Enviado', label: 'En Camino', icon: MapPin, color: 'text-purple-500' },
  { status: 'Entregado', label: '¡Buen Provecho!', icon: Package, color: 'text-green-500' },
];

export default function OrderTracking({ customerPhone }: { customerPhone: string }) {
  const { orders } = useAdmin();
  
  // Filtrar pedidos de este cliente (activos o recientes)
  const myOrders = orders
    .filter(o => o.customer_phone === customerPhone)
    .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());

  if (myOrders.length === 0) return null;

  return (
    <div className="space-y-4 px-2">
      <h3 className="font-black text-gray-900 flex items-center gap-2 px-2">
        <Clock size={20} className="text-orange-500" /> Mis Pedidos
      </h3>
      
      {myOrders.slice(0, 3).map((order) => (
        <div key={order.id} className="bg-white rounded-[32px] p-5 border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Orden #{order.order_code}</p>
              <p className="font-black text-gray-900">Total: ${order.total}</p>
            </div>
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${
              order.status === 'Cancelado' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-600'
            }`}>
              {order.status}
            </span>
          </div>

          {order.status !== 'Cancelado' && (
            <div className="relative flex justify-between items-center mt-2 px-2">
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-gray-100 -z-10" />
              {statusSteps.map((step, idx) => {
                const isCompleted = statusSteps.findIndex(s => s.status === order.status) >= idx;
                const Icon = step.icon;
                return (
                  <div key={step.status} className="flex flex-col items-center gap-1.5 bg-white px-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      isCompleted ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'bg-gray-100 text-gray-300'
                    }`}>
                      <Icon size={14} className={step.status === 'Preparando' && isCompleted ? 'animate-spin' : ''} />
                    </div>
                    <span className={`text-[8px] font-black uppercase ${isCompleted ? 'text-gray-900' : 'text-gray-300'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
