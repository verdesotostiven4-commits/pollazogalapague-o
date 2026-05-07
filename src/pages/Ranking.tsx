import { useState, useEffect, useMemo, useRef } from 'react';
import { Trophy, Star, Crown, Medal, Award, CameraOff, Sparkles, Zap, History, ChevronRight } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext';

// 🛠️ HOOK PARA REVELAR AL SCROLL (Efecto Pin Pin que pediste)
function RevealOnScroll({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={ref} 
      className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

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
      <p className="font-black text-orange-500 animate-pulse uppercase italic tracking-widest text-center">Iniciando Arena de Campeones...</p>
    </div>
  );

  return (
    <div className="relative pb-40 max-w-4xl mx-auto overflow-x-hidden bg-white">
      
      {/* --- HEADER --- */}
      <div className="bg-gradient-to-b from-orange-500 to-orange-600 p-8 rounded-b-[60px] shadow-2xl text-center text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"><Trophy className="absolute -bottom-10 -right-10 rotate-12" size={150} /></div>
        <Trophy size={64} className="mx-auto mb-4 text-yellow-300 drop-shadow-[0_0_20px_rgba(253,224,71,0.8)] animate-bounce" />
        <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-2">{extraSettings?.ranking_title || 'Ranking de Clientes'}</h1>
        <p className="text-white font-black text-[10px] uppercase tracking-[0.25em] mb-8 bg-black/10 py-1 px-4 rounded-full inline-block animate-pulse">EL MIRADOR VIP</p>

        {/* RELOJ */}
        <div className="flex justify-center gap-3">
          {[{ v: timeLeft.d, l: 'DÍAS' }, { v: timeLeft.h, l: 'HRS' }, { v: timeLeft.m, l: 'MIN' }, { v: timeLeft.s, l: 'SEG' }].map((t, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-xl rounded-[24px] p-3 min-w-[70px] border border-white/20">
              <p className="text-2xl font-black leading-none tabular-nums text-yellow-300">{t.v.padStart(2, '0')}</p>
              <p className="text-[7px] font-black mt-1 opacity-70 tracking-widest uppercase">{t.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 📍 BOTÓN "VER GANADORES" - MINIMALISTA A LA DERECHA */}
      {publishedSeasons.length > 0 && (
        <div className="px-6 mt-8 flex justify-end">
          <button 
            onClick={scrollToHall}
            className="flex items-center gap-2 bg-white text-orange-600 px-4 py-2 rounded-full shadow-lg active:scale-95 transition-all border-2 border-orange-500 group"
          >
            <History size={14} className="group-hover:rotate-[-45deg] transition-transform duration-500" />
            <span className="text-[10px] font-black uppercase italic tracking-tighter">Historial Ganadores</span>
          </button>
        </div>
      )}

      {/* LISTA ACTUAL CON ENTRADA ESCALONADA */}
      <div className="px-5 mt-6 space-y-4">
        {ranking.map((c, i) => {
          const isMe = c.phone.replace(/\D/g, '') === (customerPhone || '').replace(/\D/g, '');
          const isTop3 = i < 3;
          return (
            <RevealOnScroll key={c.id} delay={i * 50}>
              <div className={`relative flex items-center gap-4 p-5 rounded-[35px] border-2 transition-all duration-700 ${
                i === 0 ? 'bg-yellow-50 border-yellow-400 shadow-[0_15px_35px_rgba(250,204,21,0.4)] scale-[1.03] z-10' :
                i === 1 ? 'bg-slate-50 border-slate-300 shadow-md' :
                i === 2 ? 'bg-orange-50 border-orange-200 shadow-md' :
                'bg-white border-transparent'
              } ${isMe ? 'ring-[4px] ring-orange-500 ring-offset-4' : ''}`}>
                <div className="w-10 flex justify-center">
                  {i === 0 ? <Crown className="text-yellow-500 animate-bounce" size={36} /> :
                   i === 1 ? <Medal className="text-slate-400 animate-silver-pulse" size={30} /> :
                   i === 2 ? <Medal className="text-orange-400" size={30} /> :
                   <span className="font-black text-slate-300 text-xl italic">#{i + 1}</span>}
                </div>
                <img src={c.avatar_url || `https://api.dicebear.com/8.x/adventurer/svg?seed=${c.name}`} className="w-16 h-14 rounded-2xl object-cover border-2 border-white shadow-lg" />
                <div className="flex-1 min-w-0">
                  <p className={`font-black uppercase italic truncate text-sm ${isTop3 ? 'text-gray-900' : 'text-slate-500'}`}>{c.name || 'Cliente'}</p>
                  <div className="flex items-center gap-1 opacity-70"><Star size={10} className={isTop3 ? 'text-orange-500' : 'text-slate-400'} /><p className="text-[9px] font-bold uppercase italic">Guerrero Mirador</p></div>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-black leading-none ${isTop3 ? 'text-orange-600' : 'text-slate-900'}`}>{c.points}</p>
                  <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Pollazo Puntos 🍗</p>
                </div>
              </div>
            </RevealOnScroll>
          );
        })}
      </div>

      {/* --- 🏆 SALÓN DE LA FAMA (PANORÁMICO VIP) --- */}
      <div ref={hallOfFameRef} className="mt-36">
        {publishedSeasons.length > 0 && (
          <div className="px-5 space-y-24">
            <div className="text-center space-y-2 animate-in fade-in duration-1000">
              <Sparkles className="mx-auto text-orange-500 mb-2 animate-spin-slow" size={32} />
              <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">Salón de la Fama</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] italic">Donde nacen las leyendas</p>
            </div>

            {publishedSeasons.map((season, sIdx) => (
              <RevealOnScroll key={season.id}>
                <div className="bg-slate-950 rounded-[60px] p-8 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] space-y-12 border-2 border-orange-500/20 relative group">
                  
                  {/* ETIQUETA CENTRADA Y EN MOVIMIENTO */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-orange-600 text-white px-10 py-3.5 rounded-full font-black text-xs uppercase italic tracking-widest shadow-2xl z-20 animate-float border-2 border-slate-950 text-center min-w-[200px]">
                     Temporada #{publishedSeasons.length - sIdx}
                  </div>

                  <div className="text-center pt-6">
                    <h3 className="text-white font-black text-3xl uppercase italic tracking-tighter leading-none mb-3 animate-pulse">{season.name}</h3>
                    <p className="text-orange-500 text-[10px] font-black uppercase tracking-widest italic">{season.prize}</p>
                  </div>

                  {/* DISEÑO PANORÁMICO (WIDER) */}
                  <div className="grid grid-cols-1 gap-16">
                    {season.winners.map((winner: any, idx: number) => (
                      <div key={idx} className="relative group/winner">
                        
                        {/* MARCO DIAMANTE-ORO / PLATA REAL */}
                        <div className={`relative z-10 rounded-[45px] overflow-hidden transition-all duration-1000 ${
                          idx === 0 ? 'border-[10px] border-yellow-400 animate-diamond-gold' : 
                          idx === 1 ? 'border-[7px] border-slate-100 animate-silver-pulse shadow-silver-glow' : 
                          'border-[7px] border-orange-900 shadow-2xl'
                        }`}>
                          
                          {idx === 0 && <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent animate-shimmer z-20 pointer-events-none"></div>}

                          {winner.photo_url ? (
                            <img src={winner.photo_url} className="w-full h-64 md:h-80 object-cover group-hover/winner:scale-110 transition-all duration-700" alt="Ganador" />
                          ) : (
                            <div className="w-full h-60 bg-slate-900 flex flex-col items-center justify-center text-slate-700 gap-3">
                              <CameraOff size={48} className="opacity-10" />
                              <p className="text-[10px] font-black uppercase tracking-widest">Foto en Proceso</p>
                            </div>
                          )}
                          
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-8 z-10">
                             <div className="flex justify-between items-end">
                                <div className="space-y-1">
                                  <p className="text-white font-black uppercase italic text-3xl leading-none tracking-tighter drop-shadow-md">{winner.name}</p>
                                  <p className="text-orange-500 font-black text-xs uppercase tracking-widest leading-none">
                                    <Zap size={14} fill="currentColor" className="inline mr-1" /> {winner.points} Pollazo Puntos 🍗
                                  </p>
                                </div>
                                <div className={`p-4 rounded-3xl ${idx===0 ? 'bg-yellow-400 text-black animate-bounce' : 'bg-slate-800 text-white'}`}>
                                   {idx === 0 ? <Crown size={32}/> : <Medal size={32}/>}
                                </div>
                             </div>
                          </div>
                        </div>

                        {/* BADGE DE PUESTO FLOTANTE */}
                        <div className={`absolute -top-5 -right-4 z-20 px-8 py-3.5 rounded-3xl font-black text-xs uppercase italic shadow-2xl animate-float ${
                          idx === 0 ? 'bg-yellow-400 text-black' : idx === 1 ? 'bg-slate-100 text-slate-800' : 'bg-orange-900 text-white'
                        }`}>
                          {idx === 0 ? '🥇 Campeón de Oro' : idx === 1 ? '🥈 Plata Destellante' : '🥉 Honor de Bronce'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </RevealOnScroll>
            ))}
            <p className="text-center text-[10px] font-black text-slate-400 uppercase italic tracking-widest opacity-30 pb-20">El Olimpo de El Mirador 🏆</p>
          </div>
        )}
      </div>

      {/* RADAR USUARIO (MANTENIDO) */}
      {myData && myRankIndex > 2 && (
        <div className="fixed bottom-20 left-4 right-4 z-">
          <div className="bg-slate-950/98 backdrop-blur-3xl border-2 border-orange-500/40 rounded-[40px] p-6 shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-20 duration-700">
            <div className="flex items-center gap-5">
               <img src={myData.avatar_url} className="w-16 h-16 rounded-2xl border-2 border-orange-500 object-cover" />
               <div className="text-left">
                  <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest leading-none mb-1">Tu Estatus Actual</p>
                  <p className="text-white font-black text-2xl italic uppercase tracking-tighter leading-none">Rango #{myRankIndex + 1}</p>
               </div>
            </div>
            <div className="text-right">
               <p className="text-3xl font-black text-white leading-none tabular-nums">{myData.points}</p>
               <p className="text-[8px] font-black text-orange-500 uppercase tracking-widest mt-1">Pollazo Puntos 🍗</p>
            </div>
          </div>
        </div>
      )}

      {/* --- ESTILOS CSS PRO --- */}
      <style>{`
        @keyframes diamond-gold {
          0%, 100% { border-color: #facc15; box-shadow: 0 0 30px 5px rgba(250,204,21,0.4); }
          50% { border-color: #ffffff; box-shadow: 0 0 50px 15px rgba(255,255,255,0.6); }
        }
        @keyframes silver-pulse {
          0%, 100% { border-color: #f1f5f9; box-shadow: 0 0 15px 1px rgba(241,245,249,0.3); }
          50% { border-color: #ffffff; box-shadow: 0 0 35px 8px rgba(255,255,255,0.5); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%) rotate(45deg); }
          100% { transform: translateX(200%) rotate(45deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(3deg); }
          50% { transform: translateY(-10px) rotate(-2deg); }
        }
        .animate-diamond-gold { animation: diamond-gold 3s infinite; }
        .animate-silver-pulse { animation: silver-pulse 3s infinite; }
        .animate-shimmer { animation: shimmer 2.5s infinite; }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .animate-spin-slow { animation: spin 8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
