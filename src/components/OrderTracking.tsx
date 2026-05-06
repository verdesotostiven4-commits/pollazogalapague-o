import { Package, MapPin, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { OrderStatus } from '../types';

const statusSteps: Array<{ status: OrderStatus; label: string; icon: any }> = Array.of(
  { status: 'Recibido', label: 'Recibido', icon: CheckCircle2 },
  { status: 'Preparando', label: 'En Horno', icon: Loader2 },
  { status: 'Enviado', label: 'En Camino', icon: MapPin },
  { status: 'Entregado', label: '¡Listo!', icon: Package },
);

export default function OrderTracking({ customerPhone }: { customerPhone: string }) {
  const { orders } = useAdmin();
  
  // MAGIA ANTI-ERRORES: Limpiamos ambos números para que coincidan siempre
  const cleanCustomerPhone = customerPhone.replace(/\D/g, '').slice(-9);

  const myOrders = orders
    .filter(o => {
      const cleanOrderPhone = o.customer_phone.replace(/\D/g, '').slice(-9);
      // Solo mostramos pedidos que coincidan con el teléfono del cliente
      return cleanOrderPhone === cleanCustomerPhone;
    })
    .filter(o => {
      // Solo mostramos pedidos de las últimas 24 horas que no estén terminados hace mucho
      const orderDate = new Date(o.created_at || '').getTime();
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      
      // Si ya está entregado o cancelado, solo lo mostramos un ratito (2 horas)
      if (o.status === 'Entregado' || o.status === 'Cancelado') {
        const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
        return orderDate > twoHoursAgo;
      }
      
      return orderDate > oneDayAgo;
    })
    .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());

  if (myOrders.length === 0) return null;

  return (
    <div className="px-4 py-2 space-y-3">
      {myOrders.slice(0, 2).map((order) => (
        <div key={order.id} className="bg-white rounded-[28px] p-4 border border-orange-100 shadow-sm shadow-orange-100/50">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sigue tu pedido #{order.order_code}</p>
            </div>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
              order.status === 'Cancelado' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-600'
            }`}>
              {order.status === 'Recibido' ? '¡Lo recibimos!' : order.status}
            </span>
          </div>

          <div className="relative flex justify-between items-center px-1">
            <div className="absolute left-0 right-0 top-[14px] h-[2px] bg-gray-100 -z-0" />
            {statusSteps.map((step, idx) => {
              // Lógica para saber hasta qué bolita pintar
              const currentStatusIdx = statusSteps.findIndex(s => s.status === order.status);
              const isCompleted = currentStatusIdx >= idx;
              const Icon = step.icon;
              
              // Si está cancelado, no pintamos progreso
              const colorClass = order.status === 'Cancelado' 
                ? 'bg-gray-100 text-gray-300' 
                : isCompleted ? 'bg-orange-500 text-white shadow-md' : 'bg-white border-2 border-gray-100 text-gray-200';

              return (
                <div key={step.status} className="flex flex-col items-center gap-1 z-10">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-500 ${colorClass}`}>
                    <Icon size={12} className={step.status === 'Preparando' && order.status === 'Preparando' ? 'animate-spin' : ''} />
                  </div>
                  <span className={`text-[7px] font-black uppercase tracking-tighter ${isCompleted && order.status !== 'Cancelado' ? 'text-gray-900' : 'text-gray-300'}`}>
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
