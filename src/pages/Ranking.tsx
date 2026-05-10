import { useState, useEffect, useMemo, useRef } from 'react';
import { Trophy, Star, Crown, Medal, CameraOff, Sparkles, Zap, History, ShieldCheck } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext';

// 🛠️ HOOK PARA REVELAR AL SCROLL
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

  const getGuerreroTitle = (index: number) => {
    if (index === 0) return "Guerrero Galapagueño";
    if (index === 1) return "Guerrero de Santa Cruz";
    if (index === 2) return "Guerrero del Mirador";
    return "Guerrero";
  };

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

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <Zap className="text-orange-500 animate-bounce mb-4" size={48} />
      <p className="font-black text-orange-500 animate-pulse uppercase italic tracking-widest text-center">Iniciando Arena de Campeones...</p>
    </div>
  );

  return (
    <div className="relative min-h-screen pb-44 max-w-4xl mx-auto bg-slate-50">
      
      {/* --- HEADER --- */}
      <div className="bg-gradient-to-b from-orange-500 to-orange-600 p-8 pt-12 rounded-b-[60px] shadow-2xl text-center text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"><Trophy className="absolute -bottom-10 -right-10 rotate-12" size={150} /></div>
        <div className="relative z-10">
          <Trophy size={64} className="mx-auto mb-4 text-yellow-300 drop-shadow-[0_0_20px_rgba(253,224,71,0.8)] animate-bounce" />
          <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-1">{extraSettings?.ranking_title || 'Arena VIP'}</h1>
          <div className="inline-flex items-center gap-2 bg-black/20 px-4 py-1 rounded-full mb-8">
            <Sparkles size={12} className="text-yellow-300 fill-yellow-300" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Temporada en Curso</p>
          </div>

          {/* RELOJ PRO */}
          <div className="flex justify-center gap-2 md:gap-4">
            {[{ v: timeLeft.d, l: 'DÍAS' }, { v: timeLeft.h, l: 'HRS' }, { v: timeLeft.m, l: 'MIN' }, { v: timeLeft.s, l: 'SEG' }].map((t, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-md rounded-3xl p-3 min-w-[75px] border border-white/20 shadow-xl group">
                <p className="text-2xl font-black leading-none text-yellow-300 tabular-nums">{t.v.padStart(2, '0')}</p>
                <p className="text-[7px] font-black mt-1 opacity-70 tracking-widest uppercase">{t.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 📍 BOTÓN HISTORIAL */}
      {publishedSeasons.length > 0 && (
        <div className="px-6 -mt-6 flex justify-center relative z-20">
          <button 
            onClick={() => hallOfFameRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center gap-2 bg-white text-orange-600 px-6 py-3 rounded-full shadow-xl active:scale-95 transition-all border-2 border-orange-500 group"
          >
            <History size={16} className="group-hover:rotate-[-45deg] transition-transform duration-500" />
            <span className="text-xs font-black uppercase italic tracking-tighter">Historial de Ganadores</span>
          </button>
        </div>
      )}

      {/* 🏆 SECCIÓN PODIO TOP 3 🏆 */}
      <div className="px-5 mt-12 space-y-6">
        <h2 className="text-center text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Los Mejores 3 de Galápagos</h2>
        
        <div className="grid grid-cols-1 gap-4">
          {ranking.slice(0, 3).map((c, i) => {
            const isMe = c.phone.replace(/\D/g, '') === (customerPhone || '').replace(/\D/g, '');
            return (
              <RevealOnScroll key={c.id} delay={i * 100}>
                <div className={`relative flex items-center gap-4 p-5 rounded-[40px] border-4 transition-all duration-500 ${
                  i === 0 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-400 shadow-[0_20px_40px_rgba(250,204,21,0.3)] scale-[1.05] z-30' :
                  i === 1 ? 'bg-white border-slate-200 shadow-xl z-20' :
                  'bg-white border-orange-100 shadow-lg z-10'
                } ${isMe ? 'ring-4 ring-orange-500 ring-offset-4' : ''}`}>
                  
                  {/* PUESTO E ICONO */}
                  <div className="flex flex-col items-center justify-center w-14 shrink-0">
                    {i === 0 ? (
                      <div className="relative">
                        <Crown className="text-yellow-500 animate-king-bounce drop-shadow-md" size={42} />
                        <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                           <ShieldCheck size={14} className="text-yellow-600 fill-yellow-100" />
                        </div>
                      </div>
                    ) : i === 1 ? (
                      <div className="bg-slate-100 p-2 rounded-2xl border-2 border-slate-200 shadow-inner">
                        <Medal className="text-slate-400 animate-pulse" size={32} />
                      </div>
                    ) : (
                      <div className="bg-orange-50 p-2 rounded-2xl border-2 border-orange-100 shadow-inner">
                        <Medal className="text-orange-500" size={32} />
                      </div>
                    )}
                  </div>

                  {/* FOTO 1:1 CUADRADA */}
                  <div className="relative shrink-0">
                    <img 
                      src={c.avatar_url || `https://api.dicebear.com/8.x/adventurer/svg?seed=${c.name}`} 
                      className={`w-20 h-20 aspect-square rounded-[30px] object-cover border-4 border-white shadow-md ${i === 0 ? 'animate-glow-gold' : ''}`}
                    />
                    <div className="absolute -bottom-2 -right-2 bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded-lg border-2 border-white italic">
                      #{i + 1}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-black italic text-base text-slate-900 truncate uppercase tracking-tighter leading-none mb-1">
                      {c.name || 'Cliente'}
                    </p>
                    <div className="flex items-center gap-1.5 bg-white/50 w-fit px-2 py-0.5 rounded-full border border-slate-100">
                      <Star size={10} className="text-orange-500 fill-orange-500" />
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">{getGuerreroTitle(i)}</p>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end shrink-0">
                    <p className={`text-3xl font-black leading-none ${i === 0 ? 'text-orange-600' : 'text-slate-900'}`}>
                      {c.points.toLocaleString()}
                    </p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mt-1">Pollazo Puntos 🍗</p>
                  </div>
                </div>
              </RevealOnScroll>
            );
          })}
        </div>
      </div>

      {/* --- LISTA DE CLASIFICACIÓN (4 EN ADELANTE) --- */}
      <div className="px-5 mt-12 space-y-3">
        <h2 className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic mb-6">Resto de Clasificación</h2>
        {ranking.slice(3).map((c, i) => {
          const actualIndex = i + 3;
          const isMe = c.phone.replace(/\D/g, '') === (customerPhone || '').replace(/\D/g, '');
          return (
            <RevealOnScroll key={c.id} delay={i * 50}>
              <div className={`flex items-center gap-4 p-4 rounded-3xl bg-white border border-slate-100 shadow-sm transition-all ${isMe ? 'ring-2 ring-orange-500' : ''}`}>
                <div className="w-8 text-center">
                  <span className="font-black text-slate-300 text-sm italic">#{actualIndex + 1}</span>
                </div>
                {/* FOTO 1:1 TAMBIÉN EN LISTA */}
                <img 
                  src={c.avatar_url || `https://api.dicebear.com/8.x/adventurer/svg?seed=${c.name}`} 
                  className="w-12 h-12 aspect-square rounded-2xl object-cover border border-slate-100 shadow-sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate uppercase tracking-tight">{c.name}</p>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">{getGuerreroTitle(actualIndex)}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-900 text-lg leading-none">{c.points.toLocaleString()}</p>
                  <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">Puntos</p>
                </div>
              </div>
            </RevealOnScroll>
          );
        })}
      </div>

      {/* --- 🏆 SALÓN DE LA FAMA --- */}
      <div ref={hallOfFameRef} className="mt-40 scroll-mt-10 px-5">
        <div className="text-center mb-16 animate-in fade-in duration-1000">
          <div className="bg-orange-500 w-16 h-1 w-16 mx-auto mb-6 rounded-full" />
          <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">Salón de la Fama</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic mt-2">Inmortalizados en el Sabor 🏝️</p>
        </div>

        <div className="space-y-40">
          {publishedSeasons.map((season, sIdx) => (
            <div key={season.id} className="relative bg-slate-950 rounded-[60px] p-8 shadow-2xl border-2 border-orange-500/20">
              
              {/* Etiqueta de Temporada */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-orange-600 text-white px-8 py-3 rounded-3xl font-black shadow-2xl z-30 border-2 border-slate-950 text-center flex flex-col items-center">
                <span className="text-[8px] uppercase tracking-widest opacity-80 leading-none mb-1">Temporada</span>
                <span className="text-lg italic tracking-widest leading-none">#{publishedSeasons.length - sIdx}</span>
              </div>

              <div className="text-center pt-8 mb-12">
                <h3 className="text-white font-black text-4xl uppercase italic tracking-tighter mb-2">{season.name}</h3>
                <div className="inline-block bg-white/10 px-4 py-1 rounded-full">
                   <p className="text-yellow-400 text-[10px] font-black uppercase tracking-widest italic">🏆 Premio: {season.prize}</p>
                </div>
              </div>

              {/* Grid Ganadores del Salón */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {season.winners.map((winner: any, idx: number) => (
                  <div key={idx} className={`relative group/winner rounded-[40px] overflow-hidden border-4 ${
                    idx === 0 ? 'border-yellow-400 ring-4 ring-yellow-400/20' : 
                    idx === 1 ? 'border-slate-300' : 'border-orange-900'
                  }`}>
                    {idx === 0 && <div className="absolute top-4 left-4 z-20 bg-yellow-400 text-black p-1.5 rounded-xl shadow-lg animate-bounce"><Crown size={24} /></div>}
                    
                    {/* Foto Ganador Histórico 1:1 */}
                    {winner.photo_url ? (
                      <img src={winner.photo_url} className="w-full aspect-square object-cover grayscale-[30%] group-hover/winner:grayscale-0 transition-all duration-700 group-hover/winner:scale-110" alt="Ganador" />
                    ) : (
                      <div className="w-full aspect-square bg-slate-900 flex flex-col items-center justify-center text-slate-700"><CameraOff size={40} className="opacity-20" /></div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-6">
                      <p className="text-white font-black italic text-xl tracking-tighter leading-none mb-1">{winner.name}</p>
                      <p className="text-orange-500 font-black text-base">{winner.points.toLocaleString()} <span className="text-[8px] text-white/50 uppercase tracking-widest">Puntos</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- RADAR USUARIO (STICKY FOOTER) --- */}
      {myData && myRankIndex > 2 && (
        <div className="fixed bottom-6 left-4 right-4 z- animate-in slide-in-from-bottom-10 duration-700">
          <div className="bg-slate-900/95 backdrop-blur-xl border-2 border-orange-500/50 rounded-[40px] p-5 shadow-[0_30px_70px_rgba(0,0,0,0.5)] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img src={myData.avatar_url} className="w-14 h-14 rounded-2xl border-2 border-orange-500 object-cover shadow-lg" />
                <div className="absolute -top-2 -left-2 bg-orange-600 text-white text-[9px] font-black h-6 w-6 flex items-center justify-center rounded-full border-2 border-slate-900">
                  {myRankIndex + 1}
                </div>
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest leading-none mb-1 italic">Tu Puesto Actual</p>
                <p className="text-white font-black text-xl italic uppercase tracking-tighter leading-none">A un paso del Top!</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-white leading-none tracking-tight">{myData.points.toLocaleString()}</p>
              <p className="text-[8px] font-black text-yellow-300 uppercase tracking-widest mt-1">Puntos 🍗</p>
            </div>
          </div>
        </div>
      )}

      {/* --- ESTILOS CSS PRO --- */}
      <style>{`
        @keyframes king-bounce {
          0%, 100% { transform: translateY(0) scale(1) rotate(0deg); }
          50% { transform: translateY(-12px) scale(1.1) rotate(5deg); }
        }
        @keyframes glow-gold {
          0%, 100% { box-shadow: 0 0 15px rgba(250,204,21,0.3); }
          50% { box-shadow: 0 0 30px rgba(250,204,21,0.6); }
        }
        .animate-king-bounce { animation: king-bounce 3s infinite ease-in-out; }
        .animate-glow-gold { animation: glow-gold 3s infinite ease-in-out; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
