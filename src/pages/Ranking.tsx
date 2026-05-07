import { useState, useEffect, useMemo, useRef } from 'react';
import { Trophy, User, Star, Crown, Medal, Award, CameraOff, ChevronDown, Sparkles, Zap } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext';

export default function Ranking() {
  const { customers = [], extraSettings, seasons = [], loading } = useAdmin();
  const { customerPhone } = useUser();
  const [timeLeft, setTimeLeft] = useState({ d: '0', h: '0', m: '0', s: '0' });
  const hallOfFameRef = useRef<HTMLDivElement>(null); // Para el salto automático

  // 🕒 CONTADOR CON SEGUNDOS
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

  // 🏆 LÓGICA DE POSICIONES
  const ranking = useMemo(() => [...customers].sort((a, b) => b.points - a.points), [customers]);
  const myRankIndex = ranking.findIndex(c => c.phone.replace(/\D/g, '') === (customerPhone || '').replace(/\D/g, ''));
  const myData = myRankIndex !== -1 ? ranking[myRankIndex] : null;

  // 🕰️ TEMPORADAS ORDENADAS (Más reciente primero)
  const publishedSeasons = useMemo(() => 
    seasons.filter(s => s.is_published).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  , [seasons]);

  // 🚀 FUNCIÓN DE SALTO AL SALÓN DE LA FAMA
  const scrollToHall = () => {
    hallOfFameRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <Zap className="text-orange-500 animate-bounce mb-4" size={48} />
      <p className="font-black text-orange-500 animate-pulse uppercase italic tracking-widest">Abriendo Arena VIP...</p>
    </div>
  );

  return (
    <div className="relative pb-40 animate-in fade-in duration-700 max-w-2xl mx-auto overflow-x-hidden">
      
      {/* 📍 BOTÓN FLOTANTE DE ACCESO RÁPIDO */}
      {publishedSeasons.length > 0 && (
        <button 
          onClick={scrollToHall}
          className="fixed bottom-24 right-4 z- bg-slate-900 text-orange-500 p-4 rounded-full shadow-[0_0_20px_rgba(249,115,22,0.4)] animate-bounce border-2 border-orange-500/50 flex flex-col items-center group active:scale-90 transition-all"
        >
          <Award size={24} className="group-hover:rotate-12 transition-transform" />
          <span className="text-[7px] font-black uppercase tracking-tighter mt-1">Hitorial</span>
        </button>
      )}

      {/* --- EVENTO ACTUAL --- */}
      <div className="bg-gradient-to-b from-orange-500 to-orange-600 p-8 rounded-b-[50px] shadow-2xl text-center text-white mb-10 relative overflow-hidden">
        {/* Efecto de destellos de fondo */}
        <Sparkles className="absolute top-4 left-4 opacity-20 animate-pulse" size={40} />
        <Sparkles className="absolute bottom-4 right-4 opacity-20 animate-pulse delay-700" size={30} />
        
        <Trophy size={56} className="mx-auto mb-4 text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.6)] animate-pulse" />
        <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-2 drop-shadow-md">
          {extraSettings?.ranking_title || 'Temporada de Pollazos'}
        </h1>
        <div className="inline-block bg-black/20 backdrop-blur-md px-6 py-1.5 rounded-full border border-white/10 mb-8">
           <p className="text-orange-100 font-bold text-[10px] uppercase tracking-[0.2em]">
             {extraSettings?.prize_description || '¡Compite por el primer lugar!'}
           </p>
        </div>

        {/* RELOJ DIGITAL PREMIUM */}
        <div className="flex justify-center gap-3">
          {[
            { v: timeLeft.d, l: 'DÍAS' },
            { v: timeLeft.h, l: 'HRS' },
            { v: timeLeft.m, l: 'MIN' },
            { v: timeLeft.s, l: 'SEG' }
          ].map((t, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-xl rounded-2xl p-3 min-w-[65px] border border-white/20 shadow-inner">
              <p className="text-2xl font-black leading-none tabular-nums">{t.v.padStart(2, '0')}</p>
              <p className="text-[7px] font-black mt-1 opacity-60 tracking-widest">{t.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* LISTA DE COMPETIDORES EN VIVO */}
      <div className="px-5 space-y-4">
        {ranking.length > 0 ? (
          ranking.map((c, i) => {
            const isMe = c.phone.replace(/\D/g, '') === (customerPhone || '').replace(/\D/g, '');
            const isTop3 = i < 3;

            return (
              <div 
                key={c.id} 
                className={`relative flex items-center gap-4 p-4 rounded-[30px] transition-all duration-500 border-2 ${
                  i === 0 ? 'bg-yellow-50 border-yellow-400 shadow-[0_10px_30px_-10px_rgba(250,204,21,0.4)] scale-[1.03] z-10' :
                  i === 1 ? 'bg-slate-50 border-slate-300 shadow-lg' :
                  i === 2 ? 'bg-orange-50 border-orange-200 shadow-lg' :
                  'bg-white border-transparent shadow-sm'
                } ${isMe ? 'ring-[3px] ring-orange-500 ring-offset-2' : ''}`}
              >
                <div className="w-10 flex justify-center items-center">
                  {i === 0 ? <Crown className="text-yellow-500 drop-shadow-md animate-bounce" size={32} /> :
                   i === 1 ? <Medal className="text-slate-400" size={28} /> :
                   i === 2 ? <Medal className="text-orange-400" size={28} /> :
                   <span className="font-black text-slate-300 text-lg">#{i + 1}</span>}
                </div>

                <div className={`relative w-14 h-14 rounded-2xl overflow-hidden border-4 shadow-md ${
                   i === 0 ? 'border-yellow-400' : i === 1 ? 'border-slate-300' : i === 2 ? 'border-orange-300' : 'border-white'
                }`}>
                  <img src={c.avatar_url || `https://api.dicebear.com/8.x/adventurer/svg?seed=${c.name}`} className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`font-black uppercase italic truncate text-sm ${isTop3 ? 'text-gray-900' : 'text-slate-500'}`}>
                    {c.name || 'Cliente Pro'} {isMe && '(TÚ)'}
                  </p>
                  <div className="flex items-center gap-1">
                    <Star size={10} className={isTop3 ? 'text-orange-500 fill-orange-500' : 'text-slate-300'} />
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Nivel Pollazo</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`text-xl font-black leading-none ${isTop3 ? 'text-orange-600' : 'text-slate-900'}`}>{c.points}</p>
                  <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">PTS</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-20 opacity-30 italic font-black uppercase tracking-[0.3em]">Cargando Arena...</div>
        )}
      </div>

      {/* --- 🏆 SALÓN DE LA FAMA (HISTORIAL) --- */}
      <div ref={hallOfFameRef} className="mt-24">
        {publishedSeasons.length > 0 && (
          <div className="px-5 space-y-16">
            <div className="text-center space-y-2">
              <div className="flex justify-center gap-2 text-orange-500 mb-2">
                 <Star size={16} fill="currentColor" className="animate-pulse" />
                 <Star size={20} fill="currentColor" className="animate-pulse delay-100" />
                 <Star size={16} fill="currentColor" className="animate-pulse delay-200" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Salón de la Fama</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic">Leyendas Inmortales</p>
            </div>

            {publishedSeasons.map((season, sIdx) => (
              <div key={season.id} className="bg-slate-900 rounded-[50px] p-8 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5)] space-y-10 border border-white/5 relative group animate-in slide-in-from-bottom-10 duration-1000">
                
                {/* ETIQUETA DE EVENTO AUTOMÁTICA */}
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-orange-600 text-white px-8 py-2.5 rounded-full font-black text-xs uppercase italic tracking-widest shadow-2xl border-2 border-slate-900 z-20 group-hover:scale-110 transition-transform">
                   Evento #{publishedSeasons.length - sIdx}
                </div>

                <div className="text-center">
                  <h3 className="text-orange-500 font-black text-2xl uppercase italic tracking-tighter leading-none mb-2">{season.name}</h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] italic">{season.prize}</p>
                </div>

                <div className="grid grid-cols-1 gap-12">
                  {season.winners.map((winner: any, idx: number) => (
                    <div key={idx} className="relative">
                      {/* MARCO PREMIUM CON EFECTO GLOW */}
                      <div className={`relative z-10 rounded-[40px] overflow-hidden border-[6px] shadow-2xl bg-slate-800 transition-all duration-700 group-hover:scale-[1.02] ${
                        idx === 0 ? 'border-yellow-400 ring-[12px] ring-yellow-400/5' : 
                        idx === 1 ? 'border-slate-300 ring-[12px] ring-slate-300/5' : 
                        'border-orange-700 ring-[12px] ring-orange-700/5'
                      }`}>
                        
                        {winner.photo_url ? (
                          <img src={winner.photo_url} className="w-full h-64 object-cover" alt="Ganador" />
                        ) : (
                          <div className="w-full h-56 flex flex-col items-center justify-center text-slate-600 gap-2">
                            <CameraOff size={40} className="opacity-20" />
                            <p className="text-[10px] font-black uppercase italic tracking-widest">Evidencia en Proceso...</p>
                          </div>
                        )}
                        
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/70 to-transparent p-6">
                           <div className="flex justify-between items-end">
                              <div className="space-y-1">
                                <p className="text-white font-black uppercase italic text-2xl leading-none tracking-tighter">{winner.name}</p>
                                <p className="text-orange-500 font-black text-[11px] uppercase tracking-widest">{winner.points} Puntos Totales</p>
                              </div>
                              <div className={`p-3 rounded-2xl ${idx===0 ? 'bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'bg-white/10 text-white'}`}>
                                 {idx === 0 ? <Crown size={28}/> : <Medal size={28}/>}
                              </div>
                           </div>
                        </div>
                      </div>

                      {/* BADGE FLOTANTE DE PUESTO */}
                      <div className={`absolute -top-4 -right-2 z-20 px-6 py-2.5 rounded-2xl font-black text-xs uppercase italic shadow-2xl rotate-3 transition-transform group-hover:-rotate-3 ${
                        idx === 0 ? 'bg-yellow-400 text-black' : 
                        idx === 1 ? 'bg-slate-200 text-slate-800' : 
                        'bg-orange-800 text-white'
                      }`}>
                        {idx === 0 ? '👑 Campeón' : idx === 1 ? '🥈 2do Lugar' : '🥉 3er Lugar'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🚀 RADAR DEL USUARIO (STICKY) */}
      {myData && myRankIndex > 2 && (
        <div className="fixed bottom-20 left-4 right-4 z-">
          <div className="bg-black/95 backdrop-blur-2xl border border-white/10 rounded-[35px] p-5 shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex items-center justify-between animate-in slide-in-from-bottom-10 duration-700">
            <div className="flex items-center gap-4">
               <div className="relative">
                 <img src={myData.avatar_url} className="w-14 h-14 rounded-2xl border-2 border-orange-500 object-cover shadow-lg" />
                 <div className="absolute -top-2 -left-2 bg-orange-500 text-white p-1 rounded-lg"><Zap size={12} fill="currentColor"/></div>
               </div>
               <div>
                  <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest leading-none mb-1 italic">Tu Clasificación</p>
                  <p className="text-white font-black text-2xl leading-none uppercase italic tracking-tighter">Puesto #{myRankIndex + 1}</p>
               </div>
            </div>
            <div className="text-right">
               <p className="text-white font-black text-2xl leading-none tabular-nums">{myData.points}</p>
               <p className="text-[8px] font-black text-orange-500 uppercase tracking-[0.2em]">Pts Acumulados</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
