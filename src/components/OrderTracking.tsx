import { Truck, CheckCircle2, ClipboardList, X, ShoppingBag, Info, Sparkles } from 'lucide-react';
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

  // Limpiamos el número para comparar bien (últimos 8 dígitos)
  const cleanUser = customerPhone ? customerPhone.replace(/\D/g, '').slice(-8) : '';
  
  // Buscamos el pedido más reciente del usuario
  const activeOrder = orders
    ?.filter(o => {
      const cleanOrder = (o.customer_phone || '').replace(/\D/g, '').slice(-8);
      const isRecent = new Date(o.created_at || '').getTime() > Date.now() - (24 * 60 * 60 * 1000);
      return cleanOrder === cleanUser && isRecent && o.status !== 'Cancelado';
    })
    .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());

  // Solo consideramos "Rastreo Activo" si tú ya le diste al Push (Preparando o Enviado)
  const isTrackingNow = activeOrder && ['Preparando', 'Enviado', 'Entregado'].includes(activeOrder.status);

  return (
    <div className="fixed inset-0 z- flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-[36px] p-6 shadow-2xl relative animate-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-5 right-5 w-10 h-10 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center active:scale-90">
          <X size={20} />
        </button>

        <div className="text-center mb-6 mt-4">
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-3 ${isTrackingNow ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-500'}`}>
            {isTrackingNow ? <Truck size={32} /> : <Sparkles size={32} />}
          </div>
          <h2 className="text-2xl font-black text-gray-900 uppercase italic">
            {isTrackingNow ? 'Pedido en Curso' : 'Rastreo de Pedidos'}
          </h2>
          <p className="text-sm font-bold text-gray-400 mt-1">
            {isTrackingNow ? `Orden #${activeOrder.order_code}` : 'Nueva función exclusiva'}
          </p>
        </div>

        {isTrackingNow ? (
          /* PASOS DEL PEDIDO (VISTA REAL) */
          <div className="py-4">
            <div className="relative flex justify-between items-center px-1 mb-8">
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
            <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 text-center">
               <p className="text-xs font-black text-orange-600 uppercase tracking-widest">
                  {activeOrder.status === 'Preparando' && 'Estamos empacando tus productos...'}
                  {activeOrder.status === 'Enviado' && '¡Tu pedido va en camino a tu casa!'}
                  {activeOrder.status === 'Entregado' && '¡Pedido entregado! ¡Buen provecho!'}
               </p>
            </div>
          </div>
        ) : (
          /* INTRO / NO HAY PEDIDO */
          <div className="space-y-4">
            <p className="text-sm text-gray-500 font-bold leading-relaxed text-center">
              ¡Hola! Aquí podrás ver el progreso de tu compra en tiempo real. Cuando realices un pedido y lo confirmemos, el repartidor activará este seguimiento. 🛵💨
            </p>
            <div className="p-4 bg-blue-50 rounded-[24px] flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-500 shadow-sm flex-shrink-0">
                <Info size={20}/>
              </div>
              <p className="text-[10px] font-black text-blue-700 uppercase leading-tight">
                Te notificaremos aquí mismo cuando tu pedido salga del market.
              </p>
            </div>
            <button onClick={onClose} className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl text-xs uppercase tracking-widest active:scale-95 transition-all">
              Entendido
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
