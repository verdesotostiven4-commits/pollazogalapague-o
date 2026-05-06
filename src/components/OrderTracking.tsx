import { Package, MapPin, CheckCircle2, Loader2 } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext';
import { OrderStatus } from '../types';

const statusSteps: Array<{ status: OrderStatus; label: string; icon: any }> = [
  { status: 'Recibido', label: 'Recibido', icon: CheckCircle2 },
  { status: 'Preparando', label: 'En Horno', icon: Loader2 },
  { status: 'Enviado', label: 'En Camino', icon: MapPin },
  { status: 'Entregado', label: '¡Listo!', icon: Package },
];

export default function OrderTracking() {
  const { orders } = useAdmin();
  const { customerPhone } = useUser();
  
  if (!customerPhone || !orders || orders.length === 0) return null;

  const cleanUser = customerPhone.replace(/\D/g, '').slice(-7);

  // Filtramos y ordenamos por fecha para tener el más nuevo arriba
  const myOrders = orders
    .filter(o => {
      if (!o.customer_phone) return false;
      const cleanOrder = o.customer_phone.replace(/\D/g, '').slice(-7);
      const isMine = cleanOrder === cleanUser;
      const isRecent = new Date(o.created_at || '').getTime() > Date.now() - (12 * 60 * 60 * 1000);
      
      return isMine && isRecent && o.status !== 'Cancelado' && o.status !== 'Entregado';
    })
    // Ordenamos por fecha (el más nuevo primero)
    .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());

  // 🔥 LA MAGIA: Solo tomamos el primer pedido (el más reciente)
  const latestOrder = myOrders;

  if (!latestOrder) return null;

  return (
    <div className="px-4 pt-4 pb-2 animate-in fade-in slide-in-from-top duration-700">
      <div className="bg-white rounded-[28px] p-5 border-2 border-orange-500 shadow-xl shadow-orange-100/50">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
            <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest">
              Tu Pedido #{latestOrder.order_code}
            </p>
          </div>
          <span className="text-[10px] font-black text-white bg-orange-500 px-3 py-1 rounded-full uppercase">
            {latestOrder.status}
          </span>
        </div>

        <div className="relative flex justify-between items-center px-2">
          <div className="absolute left-0 right-0 top-[14px] h-[2px] bg-gray-100 -z-0" />
          
          {statusSteps.map((step, idx) => {
            const currentStatusIdx = statusSteps.findIndex(s => s.status === latestOrder.status);
            const isCompleted = currentStatusIdx >= idx;
            const Icon = step.icon;
            
            return (
              <div key={step.status} className="flex flex-col items-center gap-2 z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${
                  isCompleted ? 'bg-orange-500 text-white shadow-lg' : 'bg-white border-2 border-gray-100 text-gray-200'
                }`}>
                  <Icon 
                    size={14} 
                    className={step.status === 'Preparando' && latestOrder.status === 'Preparando' ? 'animate-spin' : ''} 
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
    </div>
  );
}
