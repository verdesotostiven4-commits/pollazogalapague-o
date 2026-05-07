import { useState } from 'react';
import { Truck, CheckCircle2, ClipboardList, ChevronUp, ChevronDown, X, ShoppingBag, Info } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext';
import { OrderStatus } from '../types';

interface Props {
  isMinimized: boolean;
  onMinimize: () => void;
}

const statusSteps: Array<{ status: OrderStatus; label: string; icon: any }> = [
  { status: 'Recibido', label: 'Recibido', icon: ClipboardList },
  { status: 'Preparando', label: 'Empacando', icon: ShoppingBag },
  { status: 'Enviado', label: 'En Camino', icon: Truck },
  { status: 'Entregado', label: 'Entregado', icon: CheckCircle2 },
];

export default function OrderTracking({ isMinimized, onMinimize }: Props) {
  const { orders } = useAdmin();
  const { customerPhone } = useUser();
  const [isOpen, setIsOpen] = useState(false);

  // No mostrar nada si el usuario lo minimizó (ya se ve en el header)
  if (isMinimized) return null;

  const cleanUser = customerPhone ? customerPhone.slice(-7) : null;
  
  // Buscar pedidos con estados de "Push" (Preparando o Enviado)
  const activeOrder = orders?.find(o => {
    const cleanOrder = (o.customer_phone || '').replace(/\D/g, '').slice(-7);
    const isPushStatus = ['Preparando', 'Enviado'].includes(o.status);
    const isRecent = new Date(o.created_at || '').getTime() > Date.now() - (12 * 60 * 60 * 1000);
    return cleanOrder === cleanUser && isPushStatus && isRecent;
  });

  const isPushActive = !!activeOrder;

  return (
    <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end pointer-events-none">
      {isOpen && (
        <div className="mb-3 w-[85vw] max-w-[340px] bg-white rounded-[32px] p-6 shadow-2xl border-2 border-orange-500 animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider ${isPushActive ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                {isPushActive ? 'Seguimiento en Vivo' : 'Nueva Función'}
              </span>
              <p className="text-lg font-black text-gray-900 mt-1">
                {isPushActive ? `Orden #${activeOrder.order_code}` : 'Rastrea tus Pedidos'}
              </p>
            </div>
            {/* Si hay push activo, permitimos minimizar al header con la X */}
            <button 
              onClick={() => {
                if (isPushActive) onMinimize();
                setIsOpen(false);
              }} 
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X size={18} className="text-gray-400" />
            </button>
          </div>

          {isPushActive ? (
            /* VISTA DE RASTREO REAL */
            <div className="relative flex justify-between items-center px-1 py-4">
              <div className="absolute left-0 right-0 top-[34px] h-[3px] bg-gray-100 rounded-full" />
              {statusSteps.map((step, idx) => {
                const currentStatusIdx = statusSteps.findIndex(s => s.status === activeOrder.status);
                const isCompleted = currentStatusIdx >= idx;
                const isCurrent = activeOrder.status === step.status;
                const Icon = step.icon;
                return (
                  <div key={step.status} className="flex flex-col items-center gap-2 z-10">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${isCompleted ? 'bg-orange-500 text-white shadow-lg' : 'bg-white border-2 border-gray-100 text-gray-300'} ${isCurrent ? 'scale-125 ring-4 ring-orange-100' : ''}`}>
                      <Icon size={18} className={isCurrent && step.status === 'Preparando' ? 'animate-bounce' : ''} />
                    </div>
                    <span className={`text-[8px] font-black uppercase tracking-tighter ${isCompleted ? 'text-gray-900' : 'text-gray-300'}`}>{step.label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            /* VISTA DE INTRO / TUTORIAL */
            <div className="py-2">
              <p className="text-xs text-gray-500 font-bold leading-relaxed">
                ¡Ahora puedes ver el progreso de tu compra en tiempo real! Cuando confirmemos tu pedido, aparecerá aquí el estado de entrega. 🛵💨
              </p>
              <div className="mt-4 p-3 bg-blue-50 rounded-2xl flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-blue-500 shadow-sm"><Info size={16}/></div>
                <span className="text-[10px] font-black text-blue-700 uppercase">¡Te avisaremos cuando salga tu pollo!</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BOTÓN FLOTANTE PRINCIPAL */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border-2 transition-all active:scale-95 ${isPushActive ? 'bg-white text-orange-500 border-orange-500 animate-bounce-subtle' : 'bg-white text-gray-400 border-gray-100'}`}
      >
        <div className="relative">
          <ShoppingBag size={20} />
          {isPushActive && <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse" />}
        </div>
        <div className="flex flex-col items-start leading-none">
          <span className="text-[9px] font-black text-gray-400 uppercase">
            {isPushActive ? 'Estado:' : 'Seguimiento'}
          </span>
          <span className={`text-[12px] font-black uppercase mt-1 ${isPushActive ? 'text-gray-900' : 'text-gray-300'}`}>
            {isPushActive ? activeOrder.status : 'NUEVO'}
          </span>
        </div>
        {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>
    </div>
  );
}
