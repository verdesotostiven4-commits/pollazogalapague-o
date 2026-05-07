import { useState, useEffect, useMemo } from 'react';
import { Trophy, User, Star, Crown, Medal, Award, CameraOff } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext';

export default function Ranking() {
  const { customers = [], extraSettings, seasons = [], loading } = useAdmin();
  const { customerPhone } = useUser();
  const [timeLeft, setTimeLeft] = useState({ d: '0', h: '0', m: '0', s: '0' });

  // 🕒 CONTADOR CON SEGUNDOS (MANTENIDO)
  useEffect(() => {
    if (!extraSettings?.ranking_end_date) return;
    const timer = setInterval(() => {
      const target = new Date(extraSettings.ranking_end_date).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) { 
        setTimeLeft({ d: '0', h: '0', m: '0', s: '0' });
        clearInterval(timer); 
        return; 
      }

      setTimeLeft({
        d: Math.floor(diff / (1000 * 60 * 60 * 24)).toString(),
        h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString(),
        m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString(),
        s: Math.floor((diff % (1000 * 60)) / 1000).toString()
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [extraSettings?.ranking_end_date]);

  // 🏆 LÓGICA DE POSICIONES (MANTENIDO)
  const ranking = useMemo(() => [...customers].sort((a, b) => b.points - a.points), [customers]);
  const myRankIndex = ranking.findIndex(c => c.phone.replace(/\D/g, '') === (customerPhone || '').replace(/\D/g, ''));
  const myData = myRankIndex !== -1 ? ranking[myRankIndex] : null;

  if (loading) return <div className="p-10 text-center font-black text-orange-500 animate-pulse uppercase italic">Cargando Arena de Campeones...</div>;

  return (
    <div className="relative pb-32 animate-in fade-in duration-500 max-w-2xl mx-auto">
      
      {/* --- EVENTO ACTUAL --- */}
      <div className="bg-gradient-to-b from-orange-500 to-orange-600 p-8 rounded-b-[40px] shadow-lg text-center text-white mb-8">
        <Trophy size={48} className="mx-auto mb-4 text-yellow-300 animate-bounce" />
        <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-2">
          {extraSettings?.ranking_title || 'Temporada de Pollazos'}
        </h1>
        <p className="text-orange-100 font-bold text-sm mb-6 max-w-[250px] mx-auto uppercase">
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

      {/* LISTA DE POSICIONES ACTUALES */}
      <div className="px-4 space-y-4">
        {ranking.length > 0 ? (
          ranking.map((c, i) => {
            const isTop3 = i < 3;
            const isMe = c.phone.replace(/\D/g, '') === (customerPhone || '').replace(/\D/g, '');

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
                <div className="w-10 flex justify-center items-center">
                  {i === 0 ? <Crown className="text-yellow-500" size={32} /> :
                   i === 1 ? <Medal className="text-slate-400" size={28} /> :
                   i === 2 ? <Medal className="text-orange-400" size={28} /> :
                   <span className="font-black text-slate-300 text-lg">#{i + 1}</span>}
                </div>

                <div className={`relative w-14 h-14 rounded-2xl overflow-hidden border-4 ${
                   i === 0 ? 'border-yellow-400' : 
                   i === 1 ? 'border-slate-300' : 
                   i === 2 ? 'border-orange-300' : 'border-white'
                }`}>
                  <img src={c.avatar_url || `https://api.dicebear.com/8.x/adventurer/svg?seed=${c.name}`} className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`font-black uppercase italic truncate ${isTop3 ? 'text-gray-900' : 'text-slate-600'}`}>
                    {c.name || 'Cliente Pro'} {isMe && '(TÚ)'}
                  </p>
                  <div className="flex items-center gap-1">
                    <Star size={12} className={isTop3 ? 'text-orange-500 fill-orange-500' : 'text-slate-300'} />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Puntos de Honor</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`text-xl font-black leading-none ${isTop3 ? 'text-orange-600' : 'text-slate-900'}`}>
                    {c.points}
                  </p>
                  <p className="text-[8px] font-black text-slate-400">PTS</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 opacity-30 italic font-black uppercase">Esperando valientes...</div>
        )}
      </div>

      {/* --- 🏆 SALÓN DE LA FAMA (HISTORIAL) --- */}
      {seasons.filter(s => s.is_published).length > 0 && (
        <div className="mt-16 px-4 space-y-8">
          <div className="relative flex items-center justify-center py-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <div className="relative bg-gray-50 px-6 flex items-center gap-2">
              <Award className="text-orange-500" size={20} />
              <span className="text-xs font-black text-gray-400 uppercase italic tracking-[0.2em]">Salón de la Fama</span>
            </div>
          </div>

          {seasons.filter(s => s.is_published).map((season) => (
            <div key={season.id} className="bg-slate-900 rounded-[45px] p-6 shadow-2xl space-y-6 border border-white/5 animate-in slide-in-from-bottom-8 duration-700">
              <div className="text-center">
                <h3 className="text-orange-500 font-black text-2xl uppercase italic tracking-tighter leading-none mb-2">{season.name}</h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest italic">{season.prize}</p>
              </div>

              <div className="grid grid-cols-1 gap-8">
                {season.winners.map((winner: any, idx: number) => (
                  <div key={idx} className="relative">
                    {/* MARCO PREMIUM SEGÚN RANKING */}
                    <div className={`relative z-10 rounded-[32px] overflow-hidden border-[6px] shadow-2xl bg-slate-800 ${
                      idx === 0 ? 'border-yellow-400 ring-8 ring-yellow-400/10' : 
                      idx === 1 ? 'border-slate-300 ring-8 ring-slate-300/10' : 
                      'border-orange-700 ring-8 ring-orange-700/10'
                    }`}>
                      
                      {winner.photo_url ? (
                        <img src={winner.photo_url} className="w-full h-56 object-cover hover:scale-105 transition-transform duration-700" alt="Entrega de premio" />
                      ) : (
                        <div className="w-full h-48 flex flex-col items-center justify-center text-slate-600 gap-2">
                          <CameraOff size={32} />
                          <p className="text-[10px] font-black uppercase italic">Foto en camino...</p>
                        </div>
                      )}
                      
                      {/* Overlay con Info del Ganador */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/60 to-transparent p-5">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-white font-black uppercase italic text-xl leading-none">{winner.name}</p>
                            <p className="text-orange-400 font-bold text-[10px] uppercase mt-1 tracking-wider">{winner.points} Puntos acumulados</p>
                          </div>
                          <div className="text-right">
                             {idx === 0 ? <Crown className="text-yellow-400 mb-1" size={24}/> : <Award className="text-slate-300 mb-1" size={24}/>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ETIQUETA FLOTANTE DE PUESTO */}
                    <div className={`absolute -top-3 -right-2 z-20 px-5 py-2 rounded-2xl font-black text-xs uppercase italic shadow-2xl ${
                      idx === 0 ? 'bg-yellow-400 text-black' : 
                      idx === 1 ? 'bg-slate-200 text-slate-800' : 
                      'bg-orange-700 text-white'
                    }`}>
                      {idx === 0 ? '🏆 Campeón Absoluto' : idx === 1 ? '🥈 Subcampeón' : '🥉 3er Puesto'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🚀 RADAR DEL USUARIO (MANTENIDO) */}
      {myData && myRankIndex > 2 && (
        <div className="fixed bottom-20 left-4 right-4 z-50">
          <div className="bg-black/95 backdrop-blur-2xl border border-white/10 rounded-[28px] p-4 shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom duration-700">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-orange-500 shadow-lg shadow-orange-500/20">
                  <img src={myData.avatar_url} className="w-full h-full object-cover" />
               </div>
               <div>
                  <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest leading-none mb-1">Tu Rango Actual</p>
                  <p className="text-white font-black text-xl leading-none uppercase italic">Puesto #{myRankIndex + 1}</p>
               </div>
            </div>
            <div className="text-right">
               <p className="text-white font-black text-xl leading-none">{myData.points}</p>
               <p className="text-[8px] font-black text-orange-500 uppercase tracking-tighter">Pts Totales</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
