import { useState, useEffect, useMemo, useRef } from 'react';
import { Trophy, Star, Crown, Medal, Award, CameraOff, Sparkles, Zap, History } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext';

export default function Ranking() {
  const { customers = [], extraSettings, seasons = [], loading } = useAdmin();
  const { customerPhone } = useUser();
  const hallOfFameRef = useRef<HTMLDivElement>(null); 
  const [timeLeft, setTimeLeft] = useState({ d: '0', h: '0', m: '0', s: '0' });

  // 🕒 CONTADOR (MANTENIDO)
  useEffect(() => {
    if (!extraSettings?.ranking_end_date) return;
    const timer = setInterval(() => {
      const target = new Date(extraSettings.ranking_end_date).getTime();
      const now = new Date().getTime();
      const diff = target - now;
      if (diff <= 0) { setTimeLeft({ d: '0', h: '0', m: '0', s: '0' }); clearInterval(timer); return; }
      setTimeLeft({
        d: Math.floor(diff / (1000 * 60 * 60 * 24)).toString(),
        h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString(),
        m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString(),
        s: Math.floor((diff % (1000 * 60)) / 1000).toString()
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [extraSettings?.ranking_end_date]);

  const ranking = useMemo(() => [...customers].sort((a, b) => b.points - a.points), [customers]);
  const myRankIndex = ranking.findIndex(c => c.phone.replace(/\D/g, '') === (customerPhone || '').replace(/\D/g, ''));
  const myData = myRankIndex !== -1 ? ranking[myRankIndex] : null;

  const publishedSeasons = useMemo(() => 
    seasons.filter(s => s.is_published).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  , [seasons]);

  const scrollToHall = () => {
    hallOfFameRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <Zap className="text-orange-500 animate-bounce mb-4" size={48} />
      <p className="font-black text-orange-500 animate-pulse uppercase italic tracking-widest text-center">Abriendo Arena de Pollazos...</p>
    </div>
  );

  return (
    <div className="relative pb-40 animate-in fade-in duration-1000 max-w-2xl mx-auto overflow-x-hidden bg-white">
      
      {/* --- HEADER --- */}
      <div className="bg-gradient-to-b from-orange-500 to-orange-600 p-8 rounded-b-[50px] shadow-2xl text-center text-white relative overflow-hidden">
        <Sparkles className="absolute top-4 left-4 opacity-20 animate-pulse" size={40} />
        <Trophy size={56} className="mx-auto mb-4 text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.6)] animate-pulse" />
        <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-2 drop-shadow-md">
          {extraSettings?.ranking_title || 'Ranking de Clientes'}
        </h1>
        <p className="text-orange-100 font-bold text-[10px] uppercase tracking-[0.2em] mb-8 italic">
           {extraSettings?.prize_description || '¡Compite por el primer lugar!'}
        </p>

        {/* RELOJ */}
        <div className="flex justify-center gap-3">
          {[
            { v: timeLeft.d, l: 'DÍAS' }, { v: timeLeft.h, l: 'HRS' },
            { v: timeLeft.m, l: 'MIN' }, { v: timeLeft.s, l: 'SEG' }
          ].map((t, i) => (
            <div key={i} className="bg-black/10 backdrop-blur-xl rounded-2xl p-3 min-w-[65px] border border-white/20">
              <p className="text-2xl font-black leading-none tabular-nums">{t.v.padStart(2, '0')}</p>
              <p className="text-[7px] font-black mt-1 opacity-60 tracking-widest">{t.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 📍 BOTÓN HISTORIAL MINIMALISTA (Ubicado a la derecha, entre reloj y ranking) */}
      {publishedSeasons.length > 0 && (
        <div className="px-6 mt-6 flex justify-end animate-in slide-in-from-right duration-700">
          <button 
            onClick={scrollToHall}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-full shadow-lg active:scale-90 transition-all border border-orange-500/20 group"
          >
            <History size={16} className="text-orange-500 group-hover:rotate-[-45deg] transition-transform" />
            <span className="text-[10px] font-black uppercase italic tracking-widest">Ver Ganadores</span>
          </button>
        </div>
      )}

      {/* LISTA ACTUAL CON ENTRADA ESCALONADA */}
      <div className="px-5 mt-4 space-y-4">
        {ranking.map((c, i) => {
          const isMe = c.phone.replace(/\D/g, '') === (customerPhone || '').replace(/\D/g, '');
          const isTop3 = i < 3;
          return (
            <div 
              key={c.id} 
              className={`relative flex items-center gap-4 p-4 rounded-[30px] border-2 transition-all duration-700 ${
                i === 0 ? 'bg-yellow-50 border-yellow-400 shadow-[0_10px_25px_-5px_rgba(250,204,21,0.3)] scale-[1.02] z-10' :
                i === 1 ? 'bg-slate-50 border-slate-300 shadow-sm' :
                i === 2 ? 'bg-orange-50 border-orange-200 shadow-sm' :
                'bg-white border-transparent shadow-sm'
              } ${isMe ? 'ring-[3px] ring-orange-500 ring-offset-2' : ''} 
              animate-in fade-in slide-in-from-bottom-5`}
              style={{ animationDelay: `${i * 100}ms` }} // Los nombres aparecen uno tras otro
            >
              <div className="w-10 flex justify-center">
                {i === 0 ? <Crown className="text-yellow-500 animate-bounce" size={32} /> :
                 i === 1 ? <Medal className="text-slate-400" size={28} /> :
                 i === 2 ? <Medal className="text-orange-400" size={28} /> :
                 <span className="font-black text-slate-300">#{i + 1}</span>}
              </div>
              <img src={c.avatar_url || `https://api.dicebear.com/8.x/adventurer/svg?seed=${c.name}`} className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md" />
              <div className="flex-1 min-w-0">
                <p className={`font-black uppercase italic truncate text-sm ${isTop3 ? 'text-gray-900' : 'text-slate-500'}`}>{c.name || 'Cliente'} {isMe && '(TÚ)'}</p>
                <div className="flex items-center gap-1 opacity-60"><Star size={10} className={isTop3 ? 'text-orange-500' : 'text-slate-400'} /><p className="text-[9px] font-bold uppercase italic">Competidor Mirador</p></div>
              </div>
              <div className="text-right">
                <p className={`text-xl font-black ${isTop3 ? 'text-orange-600' : 'text-slate-900'}`}>{c.points}</p>
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">PUNTOS</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- 🏆 SALÓN DE LA FAMA (BLACK VIP) --- */}
      <div ref={hallOfFameRef} className="mt-32">
        {publishedSeasons.length > 0 && (
          <div className="px-5 space-y-16">
            <div className="text-center space-y-2 animate-in fade-in duration-1000">
              <div className="flex justify-center gap-2 text-orange-500 mb-2">
                 <Star size={16} fill="currentColor" />
                 <Star size={24} fill="currentColor" className="animate-pulse" />
                 <Star size={16} fill="currentColor" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Salón de la Fama</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic">Leyendas de El Mirador</p>
            </div>

            {publishedSeasons.map((season, sIdx) => (
              <div key={season.id} className="bg-slate-950 rounded-[55px] p-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] space-y-10 border-2 border-orange-500/10 relative group">
                
                {/* ETIQUETA DE EVENTO */}
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-orange-600 text-white px-8 py-2 rounded-full font-black text-[10px] uppercase italic tracking-widest shadow-2xl border-2 border-slate-950 z-20">
                   Temporada #{publishedSeasons.length - sIdx}
                </div>

                <div className="text-center pt-2">
                  <h3 className="text-white font-black text-2xl uppercase italic tracking-tighter leading-none mb-2">{season.name}</h3>
                  <p className="text-orange-500 text-[10px] font-black uppercase mt-2 tracking-widest italic">{season.prize}</p>
                </div>

                <div className="grid grid-cols-1 gap-14">
                  {season.winners.map((winner: any, idx: number) => (
                    <div key={idx} className="relative animate-in fade-in slide-in-from-bottom-10 duration-1000" style={{ animationDelay: `${idx * 200}ms` }}>
                      
                      {/* MARCO PREMIUM CON EFECTOS DE LUZ */}
                      <div className={`relative z-10 rounded-[45px] overflow-hidden transition-all duration-1000 ${
                        idx === 0 ? 'border-[8px] border-yellow-400 shadow-gold-glow animate-gold-pulse' : // ORO BRILLANTE
                        idx === 1 ? 'border-[6px] border-slate-300 shadow-silver-glow animate-silver-pulse' : // PLATA DESTELLO
                        'border-[6px] border-orange-900 shadow-2xl'
                      }`}>
                        
                        {winner.photo_url ? (
                          <img src={winner.photo_url} className="w-full h-72 object-cover grayscale-[20%] hover:grayscale-0 transition-all duration-700" alt="Ganador" />
                        ) : (
                          <div className="w-full h-64 bg-slate-900 flex flex-col items-center justify-center text-slate-700 gap-2 italic">
                            <CameraOff size={40} className="opacity-10" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Foto en Proceso</p>
                          </div>
                        )}
                        
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 z-10">
                           <div className="flex justify-between items-end">
                              <div className="space-y-1">
                                <p className="text-white font-black uppercase italic text-2xl leading-none tracking-tighter">{winner.name}</p>
                                <p className="text-orange-500 font-black text-[11px] uppercase tracking-widest">{winner.points} Puntos Totales</p>
                              </div>
                              <div className={`p-3 rounded-2xl ${idx===0 ? 'bg-yellow-400 text-black' : 'bg-slate-800 text-white'}`}>
                                 {idx === 0 ? <Crown size={28}/> : <Medal size={28}/>}
                              </div>
                           </div>
                        </div>
                      </div>

                      {/* BADGE FLOTANTE */}
                      <div className={`absolute -top-4 -right-2 z-20 px-7 py-3 rounded-2xl font-black text-[11px] uppercase italic shadow-2xl rotate-3 ${
                        idx === 0 ? 'bg-yellow-400 text-black' : idx === 1 ? 'bg-slate-200 text-slate-800' : 'bg-orange-900 text-white'
                      }`}>
                        {idx === 0 ? '🥇 Campeón de Oro' : idx === 1 ? '🥈 Destello de Plata' : '🥉 Honor de Bronce'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-center text-[10px] font-black text-slate-400 uppercase italic tracking-widest opacity-50 pb-10">Fin del Salón de la Fama 🏆</p>
          </div>
        )}
      </div>

      {/* RADAR USUARIO (MANTENIDO) */}
      {myData && myRankIndex > 2 && (
        <div className="fixed bottom-20 left-4 right-4 z-">
          <div className="bg-slate-950/95 backdrop-blur-2xl border-2 border-orange-500/30 rounded-[35px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex items-center justify-between animate-in slide-in-from-bottom-10 duration-700">
            <div className="flex items-center gap-4">
               <img src={myData.avatar_url} className="w-14 h-14 rounded-2xl border-2 border-orange-500 object-cover shadow-lg" />
               <div className="text-left">
                  <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest leading-none mb-1">Tu Rango Actual</p>
                  <p className="text-white font-black text-xl italic uppercase tracking-tighter leading-none">Puesto #{myRankIndex + 1}</p>
               </div>
            </div>
            <div className="text-right">
               <p className="text-white font-black text-2xl leading-none tabular-nums">{myData.points}</p>
               <p className="text-[8px] font-black text-orange-500 uppercase tracking-widest">Total Pts</p>
            </div>
          </div>
        </div>
      )}

      {/* ESTILOS DE LUCES Y DESTELLOS PRO */}
      <style>{`
        @keyframes gold-glow {
          0%, 100% { box-shadow: 0 0 25px 2px rgba(250,204,21,0.3); border-color: #facc15; }
          50% { box-shadow: 0 0 50px 12px rgba(250,204,21,0.6); border-color: #fef08a; }
        }
        @keyframes silver-glow {
          0%, 100% { box-shadow: 0 0 15px 1px rgba(226,232,240,0.2); }
          50% { box-shadow: 0 0 35px 8px rgba(226,232,240,0.4); }
        }
        .animate-gold-pulse { animation: gold-glow 3s ease-in-out infinite; }
        .animate-silver-pulse { animation: silver-glow 4s ease-in-out infinite; }
        .shadow-gold-glow { box-shadow: 0 0 20px rgba(250,204,21,0.2); }
        .shadow-silver-glow { box-shadow: 0 0 20px rgba(226,232,240,0.2); }
      `}</style>
    </div>
  );
}
