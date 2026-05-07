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

  const cleanUser = customerPhone ? customerPhone.replace(/\D/g, '').slice(-8) : '';
  
  const activeOrder = orders
    ?.filter(o => {
      const cleanOrder = (o.customer_phone || '').replace(/\D/g, '').slice(-8);
      const isRecent = new Date(o.created_at || '').getTime() > Date.now() - (24 * 60 * 60 * 1000);
      return cleanOrder === cleanUser && isRecent && o.status !== 'Cancelado';
    })
    .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());

  const isTrackingNow = activeOrder && ['Preparando', 'Enviado', 'Entregado'].includes(activeOrder.status);

  return (
    <div className="fixed inset-0 z- flex items-center justify-center p-4">
      {/* Fondo ultra oscuro para que no se vea el texto de atrás */}
      <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={onClose} />
      
      <div className="relative z-10 w-full max-w-md bg-white rounded-[40px] p-8 shadow-[0_32px_64px_rgba(0,0,0,0.5)] border border-gray-100">
        <button 
          type="button" 
          onClick={onClose} 
          className="absolute top-6 right-6 w-12 h-12 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center active:scale-90 transition-transform"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-8">
          <div className={`w-20 h-20 rounded-[32px] flex items-center justify-center mx-auto mb-4 ${isTrackingNow ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-500'}`}>
            {isTrackingNow ? <Truck size={40} /> : <Sparkles size={40} />}
          </div>
          <h2 className="text-2xl font-black text-gray-900 uppercase italic">
            {isTrackingNow ? 'Rastreo en Vivo' : 'Únete al Club'}
          </h2>
          <p className="text-sm font-bold text-gray-400 mt-2">
            {isTrackingNow ? `Orden #${activeOrder.order_code}` : 'Acumula puntos y gana con tus compras'}
          </p>
        </div>

        {isTrackingNow ? (
          <div className="space-y-8">
            <div className="relative flex justify-between items-center px-2">
              <div className="absolute left-0 right-0 top-[20px] h-[4px] bg-gray-100 rounded-full" />
              {statusSteps.map((step, idx) => {
                const currentStatusIdx = statusSteps.findIndex(s => s.status === activeOrder.status);
                const isCompleted = currentStatusIdx >= idx;
                const isCurrent = activeOrder.status === step.status;
                const Icon = step.icon;
                return (
                  <div key={step.status} className="flex flex-col items-center gap-3 z-10">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-700 ${isCompleted ? 'bg-orange-500 text-white shadow-xl shadow-orange-200' : 'bg-white border-2 border-gray-100 text-gray-300'} ${isCurrent ? 'scale-125 ring-4 ring-orange-100' : ''}`}>
                      <Icon size={20} className={isCurrent ? 'animate-pulse' : ''} />
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-tighter ${isCompleted ? 'text-gray-900' : 'text-gray-300'}`}>{step.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="bg-orange-50 p-5 rounded-[24px] border border-orange-100 text-center shadow-inner">
               <p className="text-sm font-black text-orange-700 uppercase italic tracking-tight">
                  {activeOrder.status === 'Preparando' && '👨‍🍳 ¡Estamos empacando tu pedido!'}
                  {activeOrder.status === 'Enviado' && '🛵 ¡El repartidor va volando a tu casa!'}
                  {activeOrder.status === 'Entregado' && '✅ ¡Pedido entregado! ¡A disfrutar!'}
               </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 text-center">
            <p className="text-sm text-gray-500 font-bold leading-relaxed px-4">
              ¡Hola! Aquí podrás ver el progreso de tu compra en tiempo real. Cuando realices un pedido, el sistema activará este seguimiento automáticamente. 🛵💨
            </p>
            <div className="p-5 bg-blue-50 rounded-[32px] flex items-center gap-4 border border-blue-100 shadow-sm">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-500 shadow-sm flex-shrink-0">
                <Info size={24}/>
              </div>
              <p className="text-[10px] font-black text-blue-700 uppercase leading-tight text-left">
                Te notificaremos cuando tu pedido salga de "La Casa del Pollazo".
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="w-full py-5 bg-gray-900 text-white font-black rounded-[24px] text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl"
            >
              Entendido
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
