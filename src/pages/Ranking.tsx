import { useState, useEffect, useMemo } from 'react';
import { Trophy, User, Timer, Star, Crown, Medal } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext';

export default function Ranking() {
  const { customers = [], extraSettings, loading } = useAdmin();
  const { customerPhone } = useUser();
  const [timeLeft, setTimeLeft] = useState({ d: '0', h: '0', m: '0', s: '0' });

  // 🕒 CONTADOR CON SEGUNDOS
  useEffect(() => {
    if (!extraSettings?.ranking_end_date) return;
    const timer = setInterval(() => {
      const target = new Date(extraSettings.ranking_end_date).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) { clearInterval(timer); return; }

      setTimeLeft({
        d: Math.floor(diff / (1000 * 60 * 60 * 24)).toString(),
        h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString(),
        m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString(),
        s: Math.floor((diff % (1000 * 60)) / 1000).toString()
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [extraSettings?.ranking_end_date]);

  // 🏆 LÓGICA DE POSICIONES
  const ranking = useMemo(() => [...customers].sort((a, b) => b.points - a.points), [customers]);
  const myRankIndex = ranking.findIndex(c => c.phone.replace(/\D/g, '') === customerPhone.replace(/\D/g, ''));
  const myData = myRankIndex !== -1 ? ranking[myRankIndex] : null;

  if (loading) return <div className="p-10 text-center font-black text-orange-500 animate-pulse uppercase italic">Cargando Arena de Campeones...</div>;

  return (
    <div className="relative pb-24 animate-in fade-in duration-500">
      {/* HEADER CON EVENTO */}
      <div className="bg-gradient-to-b from-orange-500 to-orange-600 p-8 rounded-b-[40px] shadow-lg text-center text-white mb-8">
        <Trophy size={48} className="mx-auto mb-4 text-yellow-300 animate-bounce" />
        <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-2">
          {extraSettings?.ranking_title || 'Temporada de Pollazos'}
        </h1>
        <p className="text-orange-100 font-bold text-sm mb-6 max-w-[250px] mx-auto">
          {extraSettings?.prize_description || '¡Compite por el primer lugar!'}
        </p>

        {/* RELOJ DIGITAL */}
        <div className="flex justify-center gap-3">
          {[
            { v: timeLeft.d, l: 'DÍAS' },
            { v: timeLeft.h, l: 'HRS' },
            { v: timeLeft.m, l: 'MIN' },
            { v: timeLeft.s, l: 'SEG' }
          ].map((t, i) => (
            <div key={i} className="bg-black/20 backdrop-blur-md rounded-2xl p-3 min-w-[60px] border border-white/10">
              <p className="text-2xl font-black leading-none">{t.v.padStart(2, '0')}</p>
              <p className="text-[8px] font-black mt-1 opacity-70">{t.l}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-4">
        {ranking.length > 0 ? (
          ranking.map((c, i) => {
            const isTop3 = i < 3;
            const isMe = c.phone.replace(/\D/g, '') === customerPhone.replace(/\D/g, '');

            return (
              <div 
                key={c.id} 
                className={`relative flex items-center gap-4 p-4 rounded-[24px] transition-all border-2 ${
                  i === 0 ? 'bg-yellow-50 border-yellow-400 shadow-yellow-100 shadow-xl scale-105 z-10' :
                  i === 1 ? 'bg-slate-50 border-slate-300 shadow-lg' :
                  i === 2 ? 'bg-orange-50 border-orange-300 shadow-lg' :
                  'bg-white border-transparent shadow-sm'
                } ${isMe ? 'ring-4 ring-orange-500 ring-offset-2' : ''}`}
              >
                {/* RANK NUMBER / ICON */}
                <div className="w-10 flex justify-center items-center">
                  {i === 0 ? <Crown className="text-yellow-500" size={32} /> :
                   i === 1 ? <Medal className="text-slate-400" size={28} /> :
                   i === 2 ? <Medal className="text-orange-400" size={28} /> :
                   <span className="font-black text-slate-300 text-lg">#{i + 1}</span>}
                </div>

                {/* AVATAR CON MARCO */}
                <div className={`relative w-14 h-14 rounded-2xl overflow-hidden border-4 ${
                   i === 0 ? 'border-yellow-400' : 
                   i === 1 ? 'border-slate-300' : 
                   i === 2 ? 'border-orange-300' : 'border-white'
                }`}>
                  <img src={c.avatar_url || `https://api.dicebear.com/8.x/adventurer/svg?seed=${c.name}`} className="w-full h-full object-cover" />
                </div>

                {/* INFO */}
                <div className="flex-1">
                  <p className={`font-black uppercase italic ${isTop3 ? 'text-gray-900' : 'text-slate-600'}`}>
                    {c.name || 'Cliente Pro'} {isMe && '(TÚ)'}
                  </p>
                  <div className="flex items-center gap-1">
                    <Star size={12} className={isTop3 ? 'text-orange-500 fill-orange-500' : 'text-slate-300'} />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nivel Pollazo</p>
                  </div>
                </div>

                {/* PUNTOS */}
                <div className="text-right">
                  <p className={`text-xl font-black leading-none ${isTop3 ? 'text-orange-600' : 'text-slate-900'}`}>
                    {c.points}
                  </p>
                  <p className="text-[8px] font-black text-slate-400">PUNTOS</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-20 opacity-30">
             <Trophy size={64} className="mx-auto mb-4" />
             <p className="font-black italic uppercase">Esperando al primer campeón...</p>
          </div>
        )}
      </div>

      {/* 🚀 RADAR DEL USUARIO (STICKY FOOTER) */}
      {myData && myRankIndex > 2 && (
        <div className="fixed bottom-20 left-4 right-4 z-50">
          <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom duration-500">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-orange-500">
                  <img src={myData.avatar_url} className="w-full h-full object-cover" />
               </div>
               <div>
                  <p className="text-[10px] font-black text-orange-500 uppercase leading-none mb-1">Tu Posición Actual</p>
                  <p className="text-white font-black text-lg leading-none">PUESTO #{myRankIndex + 1}</p>
               </div>
            </div>
            <div className="text-right">
               <p className="text-white font-black text-lg leading-none">{myData.points}</p>
               <p className="text-[8px] font-black text-orange-500 uppercase">Pts acumulados</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
