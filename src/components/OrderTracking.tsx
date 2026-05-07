import { useState } from 'react';
import { Truck, CheckCircle2, ClipboardList, ChevronUp, ChevronDown, X, ShoppingBag } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext';
import { OrderStatus } from '../types';

const statusSteps: Array<{ status: OrderStatus; label: string; icon: any }> = [
  { status: 'Recibido', label: 'Recibido', icon: ClipboardList },
  { status: 'Preparando', label: 'Empacando', icon: ShoppingBag },
  { status: 'Enviado', label: 'En Camino', icon: Truck },
  { status: 'Entregado', label: 'Entregado', icon: CheckCircle2 },
];

export default function OrderTracking() {
  const { orders } = useAdmin();
  const { customerPhone } = useUser();
  const [isOpen, setIsOpen] = useState(false);

  if (!customerPhone || !orders || orders.length === 0) return null;

  const cleanUser = customerPhone.slice(-7);
  const myOrders = orders
    .filter(o => {
      const cleanOrder = (o.customer_phone || '').replace(/\D/g, '').slice(-7);
      // ✅ SÓLO MOSTRAR SI EL ESTADO ES PREPARANDO O ENVIADO
      const isImportant = ['Preparando', 'Enviado'].includes(o.status);
      const isRecent = new Date(o.created_at || '').getTime() > Date.now() - (12 * 60 * 60 * 1000);
      return cleanOrder === cleanUser && isRecent && isImportant;
    })
    .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());

  const order = myOrders;
  if (!order) return null;

  return (
    <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end pointer-events-none">
      {isOpen && (
        <div className="mb-3 w-[85vw] max-w-[340px] bg-white rounded-[32px] p-6 shadow-2xl border-2 border-orange-500 animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="bg-orange-100 text-orange-600 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider">Tu Pedido</span>
              <p className="text-lg font-black text-gray-900 mt-1">Orden #{order.order_code}</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={18} className="text-gray-400" /></button>
          </div>

          <div className="relative flex justify-between items-center px-1 py-4">
            <div className="absolute left-0 right-0 top-[34px] h-[3px] bg-gray-100 rounded-full" />
            {statusSteps.map((step, idx) => {
              const currentStatusIdx = statusSteps.findIndex(s => s.status === order.status);
              const isCompleted = currentStatusIdx >= idx;
              const isCurrent = order.status === step.status;
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
        </div>
      )}

      <button onClick={() => setIsOpen(!isOpen)} className="pointer-events-auto flex items-center gap-3 bg-white text-orange-500 px-4 py-3 rounded-2xl shadow-xl border-2 border-orange-500 transition-all active:scale-95">
        <div className="relative"><ShoppingBag size={20} /><span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse" /></div>
        <div className="flex flex-col items-start leading-none"><span className="text-[9px] font-black text-gray-400 uppercase">Estado:</span><span className="text-[12px] font-black uppercase text-gray-900 mt-1">{order.status}</span></div>
        {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>
    </div>
  );
}
