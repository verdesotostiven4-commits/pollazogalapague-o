import { Package, MapPin, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { OrderStatus } from '../types';

// Definición de los pasos de la barrita
const statusSteps: Array<{ status: OrderStatus; label: string; icon: any }> = [
  { status: 'Recibido', label: 'Recibido', icon: CheckCircle2 },
  { status: 'Preparando', label: 'En Horno', icon: Loader2 },
  { status: 'Enviado', label: 'En Camino', icon: MapPin },
  { status: 'Entregado', label: '¡Listo!', icon: Package },
];

export default function OrderTracking({ customerPhone }: { customerPhone: string }) {
  const { orders } = useAdmin();
  
  // LÓGICA INFALIBLE: Comparamos solo los últimos 9 dígitos para evitar errores de formato (+593, 09, etc)
  const cleanUserPhone = customerPhone.replace(/\D/g, '').slice(-9);

  const myOrders = orders.filter(o => {
    const cleanOrderPhone = o.customer_phone.replace(/\D/g, '').slice(-9);
    const isMine = cleanOrderPhone === cleanUserPhone;
    
    // Solo pedidos de las últimas 12 horas
    const orderDate = new Date(o.created_at || '').getTime();
    const isRecent = orderDate > Date.now() - (12 * 60 * 60 * 1000);
    
    // Si está cancelado, no lo mostramos
    if (o.status === 'Cancelado') return false;
    
    // Si ya se entregó, lo dejamos visible por 30 minutos para que el cliente vea que terminó
    if (o.status === 'Entregado') {
      return isMine && (orderDate > Date.now() - (30 * 60 * 1000));
    }

    return isMine && isRecent;
  });

  if (myOrders.length === 0) return null;

  return (
    <div className="px-4 py-2 space-y-3">
      {myOrders.slice(0, 2).map((order) => (
        <div 
          key={order.id} 
          className="bg-white rounded-[28px] p-4 border border-orange-100 shadow-sm shadow-orange-100/50 animate-in fade-in slide-in-from-top-4 duration-500"
        >
          {/* Cabecera de la tarjeta */}
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Seguimiento #{order.order_code}
              </p>
            </div>
            <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg uppercase">
              {order.status === 'Recibido' ? '¡Recibido!' : order.status}
            </span>
          </div>

          {/* Línea de tiempo visual */}
          <div className="relative flex justify-between items-center px-1">
            <div className="absolute left-0 right-0 top-[14px] h-[2px] bg-gray-100 -z-0" />
            
            {statusSteps.map((step, idx) => {
              const currentStatusIdx = statusSteps.findIndex(s => s.status === order.status);
              const isCompleted = currentStatusIdx >= idx;
              const Icon = step.icon;
              
              return (
                <div key={step.status} className="flex flex-col items-center gap-1 z-10">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-700 ${
                    isCompleted ? 'bg-orange-500 text-white shadow-md' : 'bg-white border-2 border-gray-100 text-gray-200'
                  }`}>
                    <Icon 
                      size={12} 
                      className={step.status === 'Preparando' && order.status === 'Preparando' ? 'animate-spin' : ''} 
                    />
                  </div>
                  <span className={`text-[7px] font-black uppercase tracking-tighter ${
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
