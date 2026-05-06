import { useState, useEffect } from 'react';
import { Trophy, Medal, Timer, Users, Star, Award } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';

export default function Ranking() {
  const { customers, extraSettings } = useAdmin();
  const [timeLeft, setTimeLeft] = useState('');

  // Lógica de la Cuenta Regresiva
  useEffect(() => {
    const timer = setInterval(() => {
      const target = new Date(extraSettings.ranking_end_date).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft("¡TIEMPO AGOTADO!");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${days}d ${hours}h ${mins}m`);
    }, 1000);
    return () => clearInterval(timer);
  }, [extraSettings.ranking_end_date]);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* HEADER DEL PREMIO */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 pt-12 pb-20 px-6 rounded-b-[40px] text-white shadow-xl relative">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
            <Trophy size={40} className="text-yellow-300" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight">{extraSettings.ranking_title}</h1>
          <p className="text-orange-100 text-sm font-medium bg-black/10 px-4 py-2 rounded-full inline-block">
            🎁 {extraSettings.prize_description}
          </p>
        </div>

        {/* CONTADOR FLOTANTE */}
        <div className="absolute -bottom-8 left-6 right-6 bg-white rounded-3xl p-4 shadow-xl border-2 border-orange-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-xl">
              <Timer className="text-orange-500" size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase leading-none">Termina en:</p>
              <p className="text-lg font-black text-gray-900 leading-none mt-1">{timeLeft}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-gray-400 uppercase leading-none">Mínimo Sorteo</p>
            <p className="text-lg font-black text-orange-500 mt-1">${extraSettings.raffle_min_amount}</p>
          </div>
        </div>
      </div>

      {/* LISTA DE COMPETIDORES */}
      <div className="px-6 mt-16 space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-black text-gray-900 uppercase tracking-widest ml-2">
          <Users size={16} /> Top Clientes
        </h2>
        
        {customers.slice(0, 20).map((customer, index) => {
          const isTop1 = index === 0;
          const isTop2 = index === 1;
          const isTop3 = index === 2;

          return (
            <div 
              key={customer.id} 
              className={`flex items-center gap-4 bg-white p-4 rounded-[24px] shadow-sm border-2 transition-all ${
                isTop1 ? 'border-yellow-400 scale-[1.02]' : isTop2 ? 'border-slate-300' : isTop3 ? 'border-orange-200' : 'border-transparent'
              }`}
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 overflow-hidden border-2 border-white shadow-md">
                  <img 
                    src={customer.avatar_url || `https://ui-avatars.com/api/?name=${customer.name}&background=random`} 
                    alt={customer.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                {isTop1 && <div className="absolute -top-3 -right-2 text-xl">👑</div>}
                {isTop2 && <div className="absolute -top-3 -right-2 text-xl">🥈</div>}
                {isTop3 && <div className="absolute -top-3 -right-2 text-xl">🥉</div>}
              </div>

              <div className="flex-1">
                <p className="text-sm font-black text-gray-900 line-clamp-1">{customer.name || 'Cliente Pollazo'}</p>
                <div className="flex items-center gap-1">
                  <Star size={10} className="fill-orange-500 text-orange-500" />
                  <p className="text-[10px] font-bold text-gray-400 uppercase">{customer.points} Puntos acumulados</p>
                </div>
              </div>

              <div className="text-center bg-gray-50 px-4 py-2 rounded-2xl min-w-[50px]">
                <p className="text-[10px] font-black text-gray-400 uppercase leading-none">Puesto</p>
                <p className={`text-lg font-black ${isTop1 ? 'text-yellow-500' : 'text-gray-900'}`}>#{index + 1}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* GALERÍA DE EVIDENCIA (GANADORES) */}
      {extraSettings.winners_gallery.length > 0 && (
        <div className="mt-12 px-6">
          <h2 className="flex items-center gap-2 text-sm font-black text-gray-900 uppercase tracking-widest ml-2 mb-4">
            <Award size={16} /> Salón de la Fama
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 no-scrollbar">
            {extraSettings.winners_gallery.map((winner) => (
              <div key={winner.id} className="min-w-[200px] bg-white p-3 rounded-[32px] shadow-lg border-4 border-yellow-400">
                <div className="w-full h-32 rounded-[24px] overflow-hidden mb-3">
                  <img src={winner.photo} alt={winner.name} className="w-full h-full object-cover" />
                </div>
                <p className="text-[11px] font-black text-gray-900 text-center uppercase">{winner.name}</p>
                <p className="text-[9px] font-bold text-orange-500 text-center uppercase">{winner.prize}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
