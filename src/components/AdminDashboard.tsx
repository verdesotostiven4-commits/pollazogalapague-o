import { useAdmin } from '../context/AdminContext';
import { CheckCircle, DollarSign, MessageCircle, Star } from 'lucide-react';

export default function AdminDashboard() {
  const { orders, products, customers, updateOrder, upsertCustomer } = useAdmin();

  const handleQuickValidate = async (order: any) => {
    // 1. Calculamos los puntos (1 punto por cada dólar)
    const pointsToAdd = Math.floor(order.total);
    const customer = customers.find(c => c.phone.slice(-8) === order.customer_phone.slice(-8));

    if (!customer) {
      alert("No se encontró el perfil del cliente.");
      return;
    }

    // 2. Sumamos puntos al cliente
    const newPoints = (customer.points || 0) + pointsToAdd;
    await upsertCustomer(customer.phone, customer.name, customer.avatar_url, newPoints);

    // 3. Marcamos el pedido como validado y guardamos la hora para el tracking automático
    // Usamos el campo 'notes' o 'status' para disparar el cronómetro
    await updateOrder(order.id, { 
      status: 'Preparando', 
      notes: new Date().toISOString() // Guardamos aquí el inicio del tiempo real
    });

    alert(`¡Pago validado! Se sumaron ${pointsToAdd} puntos a ${customer.name}`);
  };

  return (
    <div className="p-4 bg-gray-100 min-h-screen pb-24">
      <h1 className="text-2xl font-black uppercase italic mb-6">Panel de Control 🍗</h1>
      
      <div className="space-y-4">
        {orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(order => (
          <div key={order.id} className="bg-white p-4 rounded-[24px] shadow-sm border border-gray-200">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black bg-gray-100 px-2 py-1 rounded-lg uppercase">#{order.order_code}</span>
              <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${order.status === 'Recibido' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                {order.status}
              </span>
            </div>
            
            <p className="font-black text-gray-900">{order.customer_phone}</p>
            <p className="text-xs font-bold text-gray-500 mb-3">{order.items.length} productos - Total: ${order.total.toFixed(2)}</p>

            <div className="flex gap-2">
              {/* ✅ BOTÓN MAESTRO DE STIVEN */}
              {order.status === 'Recibido' && (
                <button 
                  onClick={() => handleQuickValidate(order)}
                  className="flex-1 bg-green-500 text-white py-3 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 shadow-lg shadow-green-100"
                >
                  <DollarSign size={14}/> Validar Pago y +Puntos
                </button>
              )}
              
              <button 
                onClick={() => window.open(`https://wa.me/${order.customer_phone.replace(/\D/g,'')}`, '_blank')}
                className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"
              >
                <MessageCircle size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
