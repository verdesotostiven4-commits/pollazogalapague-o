import { useState, useEffect } from 'react';
import { Trophy, User } from 'lucide-react';
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
      if (diff <= 0) { setTimeLeft("¡FINALIZADO!"); return; }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${days}d ${hours}h ${mins}m`);
    }, 1000);
    return () => clearInterval(timer);
  }, [extraSettings?.ranking_end_date]);

  if (loading) return <div className="p-10 text-center font-black text-orange-500 animate-pulse">CARGANDO POSICIONES...</div>;

  return (
    <div className="bg-white rounded-[32px] p-6 shadow-xl border-2 border-orange-50">
      <div className="flex flex-col items-center text-center mb-6">
        <Trophy size={40} className="text-yellow-400 mb-2" />
        <h2 className="font-black text-xl uppercase italic text-gray-900">{extraSettings?.ranking_title || 'Ranking Pollazo'}</h2>
        <div className="bg-orange-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full mt-2 uppercase tracking-widest">
           Termina en: {timeLeft || '--:--'}
        </div>
      </div>
      <div className="space-y-3">
        {customers.length > 0 ? (
          customers.slice(0, 10).map((c, i) => (
            <div key={c.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-2xl border border-white shadow-sm">
              <span className="font-black text-orange-500 w-6 text-center text-xs">{i + 1}º</span>
              
              {/* ✅ FOTO DEL CLIENTE AGREGADA */}
              <div className="w-10 h-10 rounded-full overflow-hidden bg-orange-100 border-2 border-white shadow-sm flex-shrink-0">
                {c.avatar_url ? (
                  <img src={c.avatar_url} alt={c.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-orange-500">
                    <User size={20} />
                  </div>
                )}
              </div>

              <div className="flex-1 font-bold text-gray-800 text-sm truncate">{c.name || 'Cliente'}</div>
              <span className="font-black text-orange-600 text-xs uppercase bg-orange-50 px-2.5 py-1 rounded-lg">{c.points} Pts</span>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-400 text-xs font-bold uppercase">Aún no hay puntos registrados</p>
        )}
      </div>
    </div>
  );
}
