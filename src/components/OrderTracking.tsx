import { useState } from 'react';
import { Package, MapPin, CheckCircle2, Loader2, ChevronUp, ChevronDown, X } from 'lucide-react';
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
  const [isOpen, setIsOpen] = useState(false); // Estado para abrir/cerrar

  if (!customerPhone || !orders || orders.length === 0) return null;

  const cleanUser = customerPhone.slice(-7);
  const myOrders = orders
    .filter(o => {
      const cleanOrder = o.customer_phone?.replace(/\D/g, '').slice(-7);
      const isRecent = new Date(o.created_at || '').getTime() > Date.now() - (12 * 60 * 60 * 1000);
      return cleanOrder === cleanUser && isRecent && o.status !== 'Cancelado' && o.status !== 'Entregado';
    })
    .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());

  const order = myOrders;
  if (!order) return null;

  return (
    <div className="fixed bottom-24 right-4 z- flex flex-col items-end pointer-events-none">
      {/* TARJETA DETALLADA (Solo se ve si está abierto) */}
      {isOpen && (
        <div className="mb-3 w-[85vw] max-w-[350px] bg-white rounded-[32px] p-5 shadow-2xl border-2 border-orange-500 animate-in slide-in-from-bottom-4 duration-300 pointer-events-auto">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-[10px] font-black text-orange-500 uppercase">Rastreando Pedido</p>
              <p className="text-sm font-black text-gray-900">#{order.order_code}</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 bg-gray-100 rounded-full text-gray-400">
              <X size={16} />
            </button>
          </div>

          <div className="relative flex justify-between items-center px-2 py-4">
            <div className="absolute left-0 right-0 top-[30px] h-[2px] bg-gray-100" />
            {statusSteps.map((step, idx) => {
              const currentStatusIdx = statusSteps.findIndex(s => s.status === order.status);
              const isCompleted = currentStatusIdx >= idx;
              const Icon = step.icon;
              return (
                <div key={step.status} className="flex flex-col items-center gap-1 z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    isCompleted ? 'bg-orange-500 text-white shadow-lg scale-110' : 'bg-white border-2 border-gray-100 text-gray-200'
                  }`}>
                    <Icon size={14} className={step.status === 'Preparando' && order.status === 'Preparando' ? 'animate-spin' : ''} />
                  </div>
                  <span className={`text-[7px] font-black uppercase ${isCompleted ? 'text-gray-900' : 'text-gray-300'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* BOTÓN FLOTANTE (El que siempre se ve si hay pedido) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="pointer-events-auto flex items-center gap-3 bg-orange-500 text-white px-5 py-3 rounded-full shadow-xl shadow-orange-200 border-2 border-white animate-bounce-slow"
      >
        <div className="relative">
          <Package size={20} />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 border-2 border-orange-500 rounded-full animate-ping" />
        </div>
        <span className="text-[11px] font-black uppercase tracking-tight">
          {isOpen ? 'Cerrar Rastreo' : `Pedido ${order.status}...`}
        </span>
        {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>
    </div>
  );
}
