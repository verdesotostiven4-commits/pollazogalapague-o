import { useState, useEffect, useMemo, useRef } from 'react';
import { Trophy, Star, Crown, Medal, Award, CameraOff, ChevronRight, Zap, Sparkles } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext';

export default function Ranking() {
  const { customers = [], extraSettings, seasons = [], loading } = useAdmin();
  const { customerPhone } = useUser();
  const hallOfFameRef = useRef<HTMLDivElement>(null); 
  const [timeLeft, setTimeLeft] = useState({ d: '0', h: '0', m: '0', s: '0' });

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
      <p className="font-black text-orange-500 animate-pulse uppercase italic tracking-widest text-center">Abriendo Arena VIP de Pollazos...</p>
    </div>
  );

  return (
    <div className="relative pb-40 animate-in fade-in duration-700 max-w-2xl mx-auto overflow-x-hidden bg-gray-50/30">
      
      {/* --- HEADER PREMIUM --- */}
      <div className="bg-gradient-to-b from-orange-500 to-orange-600 p-8 rounded-b-[50px] shadow-2xl text-center text-white relative overflow-hidden">
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

        {/* RELOJ DIGITAL */}
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

      {/* 📍 ACCESO AL SALÓN DE LA FAMA (Ubicación estratégica) */}
      {publishedSeasons.length > 0 && (
        <div className="px-5 mt-6 mb-4">
          <button 
            onClick={scrollToHall}
            className="w-full bg-slate-900 border-2 border-orange-500/30 p-5 rounded-[28px] shadow-2xl flex items-center justify-between group active:scale-[0.98] transition-all relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-[26px]"></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="p-3 bg-slate-800 rounded-2xl text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-colors duration-500 shadow-inner">
                <Award size={24} className="group-hover:rotate-12 transition-transform" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-white/50 uppercase italic tracking-widest leading-none mb-1">Ver historia de</p>
                <p className="text-xl font-black text-orange-500 uppercase italic tracking-tighter leading-none">Ganadores Anteriores</p>
              </div>
            </div>
            <ChevronRight size={24} className="text-orange-500 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}

      {/* LISTA ACTUAL CON ANIMACIÓN EN CASCADA */}
      <div className="px-5 space-y-4">
        {ranking.length > 0 ? (
          ranking.map((c, i) => {
            const isMe = c.phone.replace(/\D/g, '') === (customerPhone || '').replace(/\D/g, '');
            const isTop3 = i < 3;

            return (
              <div 
                key={c.id} 
                className={`relative flex items-center gap-4 p-4 rounded-[30px] border-2 shadow-sm ${
                  i === 0 ? 'bg-yellow-50 border-yellow-400 shadow-[0_15px_40px_-5px_rgba(250,204,21,0.5)] scale-[1.03] z-10' :
                  i === 1 ? 'bg-slate-50 border-slate-300 shadow-lg' :
                  i === 2 ? 'bg-orange-50 border-orange-200 shadow-lg' :
                  'bg-white border-transparent'
                } ${isMe ? 'ring-[3px] ring-orange-500 ring-offset-2' : ''} 
                  animate-in fade-in slide-in-from-bottom-5 duration-500`}
                style={{ animationDelay: `${i * 60}ms` }}
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
                  <div className="flex items-center gap-1 opacity-60">
                    <Star size={10} className={isTop3 ? 'text-orange-500 fill-orange-500' : 'text-slate-400'} />
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Puntos Pollazo</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`text-xl font-black leading-none ${isTop3 ? 'text-orange-600' : 'text-slate-900'}`}>{c.points}</p>
                  <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">PUNTOS</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-20 bg-white rounded-[30px] border-2 border-dashed border-gray-100">
            <Trophy size={40} className="mx-auto text-gray-200 mb-3 animate-pulse" />
            <p className="text-gray-400 font-bold text-sm uppercase italic tracking-[0.2em]">Cargando Arena...</p>
          </div>
        )}
      </div>

      {/* --- 🏆 SALÓN DE LA FAMA CON DESTELLO PREMIUM --- */}
      <div ref={hallOfFameRef} className="mt-28 scroll-mt-6">
        {publishedSeasons.length > 0 && (
          <div className="px-5 space-y-16">
            <div className="text-center space-y-2">
              <div className="flex justify-center gap-2 text-orange-500 mb-2">
                 <Star size={16} fill="currentColor" className="animate-pulse" />
                 <Star size={20} fill="currentColor" className="animate-pulse delay-100" />
                 <Star size={16} fill="currentColor" className="animate-pulse delay-200" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Salón de la Fama</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic">Leyendas de El Mirador</p>
            </div>

            {publishedSeasons.map((season, sIdx) => (
              <div key={season.id} className="bg-slate-950 rounded-[50px] p-8 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)] space-y-10 border-2 border-orange-500/10 relative group animate-in slide-in-from-bottom duration-1000">
                
                {/* ETIQUETA DE EVENTO */}
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-orange-600 text-white px-8 py-2.5 rounded-full font-black text-xs uppercase italic tracking-widest shadow-2xl border-2 border-slate-950 z-20 group-hover:scale-110 transition-transform">
                   Evento #{publishedSeasons.length - sIdx}
                </div>

                <div className="text-center mb-10 pt-2">
                  <h3 className="text-white font-black text-2xl uppercase italic tracking-tighter leading-none mb-2">{season.name}</h3>
                  <p className="text-orange-500 text-[10px] font-black uppercase mt-2 tracking-widest">{season.prize}</p>
                </div>

                <div className="grid grid-cols-1 gap-14">
                  {season.winners.map((winner: any, idx: number) => (
                    <div key={idx} className="relative group/winner">
                      {/* MARCO PREMIUM CON EFECTO DESTELLO (GLOW) SOLO AL 1ER LUGAR */}
                      <div className={`relative z-10 rounded-[40px] overflow-hidden transition-all duration-700 ${
                        idx === 0 ? 'border-[7px] border-yellow-400 animate-vip-glow' : 
                        idx === 1 ? 'border-[6px] border-slate-300 shadow-2xl' : 
                        'border-[6px] border-orange-800 shadow-2xl'
                      } group-hover/winner:scale-[1.02]`}>
                        
                        {/* Brillo interno extra para el Campeón */}
                        {idx === 0 && <div className="absolute inset-0 rounded-[33px] shadow-[inset_0_0_30px_2px_rgba(250,204,21,0.5)] z-20 pointer-events-none"></div>}

                        {winner.photo_url ? (
                          <img src={winner.photo_url} className="w-full h-64 object-cover" alt="Ganador" />
                        ) : (
                          <div className="w-full h-56 bg-slate-800 flex flex-col items-center justify-center text-slate-600 gap-2">
                            <CameraOff size={40} className="opacity-20" />
                            <p className="text-[10px] font-black uppercase italic tracking-widest text-center px-4">Evidencia en Proceso...</p>
                          </div>
                        )}
                        
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 z-10">
                           <div className="flex justify-between items-end">
                              <div className="space-y-1">
                                <p className="text-white font-black uppercase italic text-2xl leading-none tracking-tighter drop-shadow-md">{winner.name}</p>
                                <p className="text-orange-500 font-black text-[11px] uppercase tracking-widest">{winner.points} Puntos Totales</p>
                              </div>
                              <div className={`p-3 rounded-2xl ${idx===0 ? 'bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'bg-white/10 text-white'}`}>
                                 {idx === 0 ? <Crown size={28}/> : <Medal size={28}/>}
                              </div>
                           </div>
                        </div>
                      </div>

                      {/* BADGE DE PUESTO */}
                      <div className={`absolute -top-4 -right-3 z-20 px-7 py-3 rounded-2xl font-black text-xs uppercase italic shadow-2xl rotate-3 ${
                        idx === 0 ? 'bg-yellow-400 text-black' : 
                        idx === 1 ? 'bg-slate-200 text-slate-800' : 
                        'bg-orange-800 text-white'
                      }`}>
                        {idx === 0 ? '👑 Campeón Oro' : idx === 1 ? '🥈 Plata' : '🥉 Bronce'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="text-center pt-5 pb-10 opacity-60">
               <Award className="text-gray-300 mx-auto mb-2" size={24} />
               <p className="text-[11px] font-black text-gray-400 uppercase italic tracking-wider">Toca la copa en el menú para volver arriba 🏆</p>
            </div>
          </div>
        )}
      </div>

      {/* 🚀 RADAR DEL USUARIO (STICKY) */}
      {myData && myRankIndex > 2 && (
        <div className="fixed bottom-20 left-4 right-4 z-">
          <div className="bg-slate-950/95 backdrop-blur-2xl border-2 border-orange-500/30 rounded-[35px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex items-center justify-between animate-in slide-in-from-bottom-10 duration-700">
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
               <p className="text-[8px] font-black text-orange-500 uppercase tracking-[0.2em]">Pts Totales</p>
            </div>
          </div>
        </div>
      )}

      {/* ESTILOS DESTELLO VIP */}
      <style>{`
        @keyframes vip-glow {
          0%, 100% { box-shadow: 0 0 25px 2px rgba(250,204,21,0.3); border-color: #facc15; }
          50% { box-shadow: 0 0 45px 10px rgba(250,204,21,0.6); border-color: #fef08a; }
        }
        .animate-vip-glow {
          animation: vip-glow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
