import { Truck, CheckCircle2, ClipboardList, X, ShoppingBag, Info, PackageSearch } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext';
import { OrderStatus } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function OrderTracking({ isOpen, onClose }: Props) {
  const { orders } = useAdmin();
  const { customerPhone } = useUser();

  if (!isOpen) return null;

  const cleanUser = customerPhone ? customerPhone.replace(/\D/g, '').slice(-8) : '';
  const activeOrder = orders?.find(o => (o.customer_phone || '').replace(/\D/g, '').slice(-8) === cleanUser && o.status !== 'Cancelado');

  // 🕒 LÓGICA DE TIEMPO AUTOMÁTICO
  let virtualStatus: OrderStatus = 'Recibido';
  let isTrackingNow = false;

  if (activeOrder && activeOrder.notes) { // 'notes' tiene la hora de validación
    isTrackingNow = true;
    const startTime = new Date(activeOrder.notes).getTime();
    const elapsedMinutes = (Date.now() - startTime) / (1000 * 60);

    // Creamos tiempos "al azar" pero fijos para ESTE pedido usando su código
    const seed = parseInt(activeOrder.order_code.replace(/\D/g, '')) || 5;
    const timeToPack = (seed % 5) + 3; // Entre 3 y 8 min
    const timeToShip = (seed % 10) + 12; // Entre 12 y 22 min
    const timeToDeliver = (seed % 15) + 20; // Entre 20 y 35 min

    if (elapsedMinutes > timeToDeliver) virtualStatus = 'Entregado';
    else if (elapsedMinutes > timeToShip) virtualStatus = 'Enviado';
    else if (elapsedMinutes > timeToPack) virtualStatus = 'Preparando';
    else virtualStatus = 'Recibido';
  }

  const steps: Array<{ s: OrderStatus; l: string; i: any }> = [
    { s: 'Recibido', l: 'Recibido', i: ClipboardList },
    { s: 'Preparando', l: 'Empacando', i: ShoppingBag },
    { s: 'Enviado', l: 'En Camino', i: Truck },
    { s: 'Entregado', l: 'Entregado', i: CheckCircle2 },
  ];

  return (
    <div className="fixed inset-0 z- flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center">
          <X size={20} />
        </button>

        <div className="text-center mb-8">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 ${isTrackingNow ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-500'}`}>
            {isTrackingNow ? <Truck size={40} className="animate-bounce" /> : <PackageSearch size={40} />}
          </div>
          <h2 className="text-2xl font-black text-gray-900 uppercase italic">
            {isTrackingNow ? 'Siguiente Parada...' : 'Rastreo en Vivo'}
          </h2>
        </div>

        {isTrackingNow ? (
          <div className="space-y-8">
            <div className="relative flex justify-between items-center px-2">
              <div className="absolute left-0 right-0 top-[20px] h-[3px] bg-gray-100 rounded-full" />
              {steps.map((step, idx) => {
                const currentIdx = steps.findIndex(s => s.s === virtualStatus);
                const isCompleted = currentIdx >= idx;
                const Icon = step.i;
                return (
                  <div key={step.s} className="flex flex-col items-center gap-2 z-10">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-700 ${isCompleted ? 'bg-orange-500 text-white shadow-lg' : 'bg-white border-2 border-gray-100 text-gray-300'}`}>
                      <Icon size={18} />
                    </div>
                    <span className={`text-[8px] font-black uppercase ${isCompleted ? 'text-gray-900' : 'text-gray-300'}`}>{step.l}</span>
                  </div>
                );
              })}
            </div>
            <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 text-center text-[10px] font-black text-orange-600 uppercase italic">
               {virtualStatus === 'Recibido' && '¡Pago verificado! Empezamos ahora.'}
               {virtualStatus === 'Preparando' && 'Tu orden está siendo empacada con cuidado.'}
               {virtualStatus === 'Enviado' && '¡Ya salió! El repartidor va hacia ti.'}
               {virtualStatus === 'Entregado' && '¡Buen provecho! Pedido entregado.'}
            </div>
          </div>
        ) : (
          /* ✅ LA INTRO QUE QUERÍAS */
          <div className="space-y-6 text-center">
            <p className="text-sm text-gray-500 font-bold leading-relaxed px-2">
              Aquí podrás ver el progreso de tu compra en tiempo real. Cuando confirmemos tu pago, se activará este seguimiento automáticamente. 🛵💨
            </p>
            <div className="p-5 bg-blue-50 rounded-[32px] flex items-center gap-4 border border-blue-100 shadow-sm">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-500 flex-shrink-0"><Info size={24}/></div>
              <p className="text-[10px] font-black text-blue-700 uppercase leading-tight text-left">Confirmaremos tu pedido apenas verifiquemos el comprobante.</p>
            </div>
            <button onClick={onClose} className="w-full py-5 bg-gray-900 text-white font-black rounded-[24px] text-xs uppercase tracking-widest">¡Entendido!</button>
          </div>
        )}
      </div>
    </div>
  );
}
