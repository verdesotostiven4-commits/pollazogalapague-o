import { useState, useEffect } from 'react';
import { Trophy, Timer, Users, Star, Award } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';

export default function Ranking() {
  const { customers = [], extraSettings, loading } = useAdmin();
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!extraSettings?.ranking_end_date) return;
    const timer = setInterval(() => {
      const target = new Date(extraSettings.ranking_end_date).getTime();
      const now = new Date().getTime();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft("¡FINALIZADO!");
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${days}d ${hours}h ${mins}m`);
    }, 1000);
    return () => clearInterval(timer);
  }, [extraSettings?.ranking_end_date]);

  if (loading) return <div className="p-10 text-center font-bold text-orange-500 animate-pulse">CARGANDO TABLA DE POSICIONES...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 animate-in fade-in duration-500">
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 pt-12 pb-20 px-6 rounded-b-[40px] text-white shadow-xl relative">
        <div className="flex flex-col items-center text-center space-y-3">
          <Trophy size={40} className="text-yellow-300" />
          <h1 className="text-2xl font-black uppercase tracking-tight">{extraSettings?.ranking_title || 'Ranking de Clientes'}</h1>
          <p className="text-orange-100 text-sm font-medium bg-black/10 px-4 py-2 rounded-full inline-block">
            🎁 {extraSettings?.prize_description || '¡Participa por premios!'}
          </p>
        </div>
        <div className="absolute -bottom-8 left-6 right-6 bg-white rounded-3xl p-4 shadow-xl border-2 border-orange-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Timer className="text-orange-500" size={20} />
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase leading-none">Termina en:</p>
              <p className="text-lg font-black text-gray-900 mt-1">{timeLeft || '--'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 mt-16 space-y-3">
        {customers.length > 0 ? (
          customers.slice(0, 15).map((customer, index) => (
            <div key={customer.id} className="flex items-center gap-4 bg-white p-4 rounded-[24px] shadow-sm border-2 border-transparent">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-xl font-black text-orange-500">
                {index === 0 ? '👑' : index + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-gray-900">{customer.name || 'Cliente Pollazo'}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase">{customer.points || 0} Puntos</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-400 py-10 font-bold uppercase text-xs">Aún no hay competidores...</p>
        )}
      </div>
    </div>
  );
}
