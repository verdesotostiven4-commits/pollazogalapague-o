import { Truck, CheckCircle2, ClipboardList, X, ShoppingBag, Info, PackageSearch } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext';
import { OrderStatus } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const statusSteps: Array<{ status: OrderStatus; label: string; icon: any }> = [
  { status: 'Recibido', label: 'Recibido', icon: ClipboardList },
  { status: 'Preparando', label: 'Empacando', icon: ShoppingBag },
  { status: 'Enviado', label: 'En Camino', icon: Truck },
  { status: 'Entregado', label: 'Entregado', icon: CheckCircle2 },
];

export default function OrderTracking({ isOpen, onClose }: Props) {
  const { orders } = useAdmin();
  const { customerPhone } = useUser();

  if (!isOpen) return null;

  // 🛠️ LIMPIEZA TOTAL: Solo nos quedamos con los números
  const userNum = customerPhone ? customerPhone.replace(/\D/g, '') : '';
  
  const activeOrder = orders
    ?.filter(o => {
      const orderNum = (o.customer_phone || '').replace(/\D/g, '');
      // Comparamos los últimos 8 dígitos. Si coinciden, es el mismo dueño.
      const match = orderNum.length >= 8 && userNum.length >= 8 && 
                    orderNum.slice(-8) === userNum.slice(-8);
      
      // Pedidos de las últimas 24 horas que no estén cancelados
      const isRecent = new Date(o.created_at || '').getTime() > Date.now() - (24 * 60 * 60 * 1000);
      
      return match && isRecent && o.status !== 'Cancelado';
    })
    .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());

  const isTrackingNow = !!activeOrder;

  return (
    <div className="fixed inset-0 z- flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative z-10 w-full max-w-md bg-white rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center active:scale-90">
          <X size={20} />
        </button>

        <div className="text-center mb-8">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 ${isTrackingNow ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-500'}`}>
            {isTrackingNow ? <Truck size={40} /> : <PackageSearch size={40} />}
          </div>
          <h2 className="text-2xl font-black text-gray-900 uppercase italic leading-none">
            {isTrackingNow ? 'Estado del Pedido' : 'Rastreo en Vivo'}
          </h2>
          <p className="text-sm font-bold text-gray-400 mt-2">
            {isTrackingNow ? `Orden: #${activeOrder.order_code}` : 'Sigue tu compra paso a paso'}
          </p>
        </div>

        {isTrackingNow ? (
          <div className="space-y-8">
            <div className="relative flex justify-between items-center px-2 mb-8">
              <div className="absolute left-0 right-0 top-[20px] h-[3px] bg-gray-100 rounded-full" />
              {statusSteps.map((step, idx) => {
                const currentStatusIdx = statusSteps.findIndex(s => s.status === activeOrder.status);
                const isCompleted = currentStatusIdx >= idx;
                const isCurrent = activeOrder.status === step.status;
                const Icon = step.icon;
                return (
                  <div key={step.status} className="flex flex-col items-center gap-2 z-10">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${isCompleted ? 'bg-orange-500 text-white shadow-lg' : 'bg-white border-2 border-gray-100 text-gray-300'} ${isCurrent ? 'scale-125 ring-4 ring-orange-100' : ''}`}>
                      <Icon size={18} />
                    </div>
                    <span className={`text-[8px] font-black uppercase tracking-tighter ${isCompleted ? 'text-gray-900' : 'text-gray-300'}`}>{step.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 text-center shadow-sm">
               <p className="text-xs font-black text-orange-600 uppercase italic">
                  {activeOrder.status === 'Recibido' && 'Hemos recibido tu pedido correctamente'}
                  {activeOrder.status === 'Preparando' && 'Estamos empacando tus productos...'}
                  {activeOrder.status === 'Enviado' && '¡Tu pedido va en camino a tu casa!'}
                  {activeOrder.status === 'Entregado' && '¡Pedido entregado! ¡Buen provecho!'}
               </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 text-center">
            <p className="text-sm text-gray-500 font-bold leading-relaxed px-2">
              Aquí podrás ver el progreso de tu compra en tiempo real. Cuando realices un pedido y lo confirmemos, se activará este seguimiento automático. 🛵💨
            </p>
            <div className="p-5 bg-blue-50 rounded-[32px] flex items-center gap-4 border border-blue-100 shadow-sm">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-500 shadow-sm flex-shrink-0">
                <Info size={24}/>
              </div>
              <p className="text-[10px] font-black text-blue-700 uppercase leading-tight text-left">
                Te notificaremos cuando el pedido salga de "La Casa del Pollazo".
              </p>
            </div>
            <button type="button" onClick={onClose} className="w-full py-5 bg-gray-900 text-white font-black rounded-[24px] text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl">
              ¡Entendido!
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
