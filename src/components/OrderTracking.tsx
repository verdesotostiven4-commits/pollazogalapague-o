import { Package, MapPin, CheckCircle2, Loader2 } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext'; // Importamos el cerebro del usuario
import { OrderStatus } from '../types';

const statusSteps: Array<{ status: OrderStatus; label: string; icon: any }> = [
  { status: 'Recibido', label: 'Recibido', icon: CheckCircle2 },
  { status: 'Preparando', label: 'En Horno', icon: Loader2 },
  { status: 'Enviado', label: 'En Camino', icon: MapPin },
  { status: 'Entregado', label: '¡Listo!', icon: Package },
];

export default function OrderTracking() {
  const { orders } = useAdmin();
  const { customerPhone } = useUser(); // Extraemos el teléfono guardado automáticamente
  
  // Si no hay teléfono o no hay pedidos cargados, no mostramos nada
  if (!customerPhone || !orders || orders.length === 0) return null;

  // Limpiamos el número del cliente para comparar (últimos 7 dígitos)
  const cleanUser = customerPhone.replace(/\D/g, '').slice(-7);

  // Filtramos los pedidos del cliente que estén activos
  const myOrders = orders.filter(o => {
    if (!o.customer_phone) return false;
    
    const cleanOrder = o.customer_phone.replace(/\D/g, '').slice(-7);
    const isMine = cleanOrder === cleanUser;
    
    // Solo mostramos pedidos de las últimas 12 horas
    const orderDate = new Date(o.created_at || '').getTime();
    const isRecent = orderDate > Date.now() - (12 * 60 * 60 * 1000);
    
    // No mostramos si está cancelado o si ya se entregó hace mucho
    if (o.status === 'Cancelado') return false;
    if (o.status === 'Entregado') {
      // Si ya se entregó, lo dejamos 20 min más para que el cliente vea el éxito
      return isMine && (orderDate > Date.now() - (20 * 60 * 1000));
    }

    return isMine && isRecent;
  });

  if (myOrders.length === 0) return null;

  return (
    <div className="px-4 py-2 space-y-3 mb-4 animate-in fade-in slide-in-from-top duration-700">
      {myOrders.map((order) => (
        <div 
          key={order.id} 
          className="bg-white rounded-[28px] p-5 border-2 border-orange-500 shadow-xl shadow-orange-100/50"
        >
          {/* Cabecera del rastreo */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
              <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest">
                Seguimiento #{order.order_code}
              </p>
            </div>
            <span className="text-[10px] font-black text-white bg-orange-500 px-3 py-1 rounded-full uppercase">
              {order.status === 'Recibido' ? '¡Recibido!' : order.status}
            </span>
          </div>

          {/* Línea de tiempo visual */}
          <div className="relative flex justify-between items-center px-2">
            <div className="absolute left-0 right-0 top-[14px] h-[2px] bg-gray-100 -z-0" />
            
            {statusSteps.map((step, idx) => {
              const currentStatusIdx = statusSteps.findIndex(s => s.status === order.status);
              const isCompleted = currentStatusIdx >= idx;
              const Icon = step.icon;
              
              return (
                <div key={step.status} className="flex flex-col items-center gap-2 z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${
                    isCompleted ? 'bg-orange-500 text-white shadow-lg' : 'bg-white border-2 border-gray-100 text-gray-200'
                  }`}>
                    <Icon 
                      size={14} 
                      className={step.status === 'Preparando' && order.status === 'Preparando' ? 'animate-spin' : ''} 
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
