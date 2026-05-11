import { useState, useEffect, useMemo, useRef } from 'react';
import { Trophy, Star, Crown, Medal, CameraOff, Sparkles, Zap, History, ShieldCheck, ArrowDown } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useUser } from '../context/UserContext';

function RevealOnScroll({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setIsVisible(true); }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

export default function Ranking() {
  const { customers = [], extraSettings, seasons = [], loading } = useAdmin();
  const { customerPhone } = useUser();
  const hallOfFameRef = useRef<HTMLDivElement>(null); 
  const myRowRef = useRef<HTMLDivElement>(null);
  
  const [timeLeft, setTimeLeft] = useState({ d: '0', h: '0', m: '0', s: '0' });
  const [showRadar, setShowRadar] = useState(false);
  const [isInHallOfFame, setIsInHallOfFame] = useState(false);

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
      const diff = target - new Date().getTime();
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
  const publishedSeasons = useMemo(() => seasons.filter(s => s.is_published).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [seasons]);

  // 📡 SENSOR DE VISIBILIDAD (Radar + Salón de la Fama)
  useEffect(() => {
    // Observer para mi fila
    const rowObserver = new IntersectionObserver(([entry]) => {
      setShowRadar(!entry.isIntersecting && myRankIndex !== -1);
    }, { threshold: 0.1 });

    // Observer para el Salón de la Fama (para ocultar el radar)
    const hallObserver = new IntersectionObserver(([entry]) => {
      setIsInHallOfFame(entry.isIntersecting);
    }, { threshold: 0.05 });

    if (myRowRef.current) rowObserver.observe(myRowRef.current);
    if (hallOfFameRef.current) hallObserver.observe(hallOfFameRef.current);

    return () => {
      rowObserver.disconnect();
      hallObserver.disconnect();
    };
  }, [myRankIndex, ranking]);

  const scrollToMyRank = () => {
    myRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-10">
      <Zap className="text-orange-500 animate-bounce mb-4" size={48} />
      <p className="font-black text-orange-500 animate-pulse uppercase italic tracking-widest text-center">Iniciando Arena VIP...</p>
    </div>
  );

  return (
    <div className="relative min-h-screen pb-40 max-w-4xl mx-auto bg-slate-50 overflow-x-hidden">
      
      {/* --- HEADER --- */}
      <div className="bg-gradient-to-b from-orange-500 to-orange-600 p-8 pt-10 rounded-b-[60px] shadow-2xl text-center text-white relative">
        <div className="absolute inset-0 opacity-10 pointer-events-none"><Trophy className="absolute -bottom-10 -right-10 rotate-12" size={150} /></div>
        <Trophy size={60} className="mx-auto mb-4 text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.6)] animate-bounce" />
        <h1 className="text-2xl font-black uppercase italic tracking-tighter mb-1">{extraSettings?.ranking_title || 'Ranking VIP'}</h1>
        <div className="inline-flex items-center gap-2 bg-black/20 px-4 py-1 rounded-full mb-8">
          <Sparkles size={10} className="text-yellow-300 fill-yellow-300" />
          <p className="text-[9px] font-black uppercase tracking-[0.2em]">Temporada en Curso</p>
        </div>

        {/* RELOJ */}
        <div className="flex justify-center gap-2">
          {[{ v: timeLeft.d, l: 'DÍAS' }, { v: timeLeft.h, l: 'HRS' }, { v: timeLeft.m, l: 'MIN' }, { v: timeLeft.s, l: 'SEG' }].map((t, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-md rounded-2xl p-3 min-w-[70px] border border-white/20">
              <p className="text-xl font-black text-yellow-300 tabular-nums">{t.v.padStart(2, '0')}</p>
              <p className="text-[7px] font-black opacity-70 tracking-widest uppercase">{t.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 📍 BOTÓN HISTORIAL */}
      {publishedSeasons.length > 0 && (
        <div className="px-6 -mt-6 flex justify-center relative z-10">
          <button onClick={() => hallOfFameRef.current?.scrollIntoView({ behavior: 'smooth' })} className="flex items-center gap-2 bg-white text-orange-600 px-6 py-3 rounded-full shadow-xl active:scale-95 transition-all border-2 border-orange-500">
            <History size={16} className="group-hover:rotate-[-45deg] transition-transform duration-500" />
            <span className="text-xs font-black uppercase italic tracking-tighter">Historial Ganadores</span>
          </button>
        </div>
      )}

      {/* 🏆 TOP 3 🏆 */}
      <div className="px-4 mt-12 space-y-5">
        {ranking.slice(0, 3).map((c, i) => {
          const isMe = c.phone.replace(/\D/g, '') === (customerPhone || '').replace(/\D/g, '');
          return (
            <RevealOnScroll key={c.id} delay={i * 100}>
              <div 
                ref={isMe ? myRowRef : null}
                className={`relative flex items-center gap-3 p-5 rounded-[40px] border-4 transition-all ${
                  i === 0 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-400 shadow-xl scale-[1.02] z-20' :
                  i === 1 ? 'bg-white border-slate-200 shadow-lg' :
                  'bg-white border-orange-100 shadow-md'
                } ${isMe ? 'ring-4 ring-orange-500 ring-offset-2' : ''}`}
              >
                <div className="shrink-0 w-10 flex justify-center">
                  {i === 0 ? <Crown className="text-yellow-500 animate-king-bounce" size={40} /> :
                   i === 1 ? <Medal className="text-slate-400" size={32} /> :
                   <Medal className="text-orange-400" size={32} />}
                </div>

                <div className="relative shrink-0">
                  <img src={c.avatar_url || `https://api.dicebear.com/8.x/adventurer/svg?seed=${c.name}`} className="w-16 h-16 aspect-square rounded-[24px] object-cover border-2 border-white shadow-sm" />
                  <div className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded-lg border border-white italic shadow-md">#{i + 1}</div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-black italic text-base text-slate-900 leading-tight break-words">{c.name || 'Guerrero'}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{getGuerreroTitle(i)}</p>
                </div>

                <div className="text-right shrink-0">
                  <p className={`text-xl font-black leading-none ${i === 0 ? 'text-orange-600' : 'text-slate-900'}`}>{c.points.toLocaleString()}</p>
                  <p className="text-[7px] font-black text-slate-400 uppercase mt-0.5">Puntos 🍗</p>
                </div>
              </div>
            </RevealOnScroll>
          );
        })}
      </div>

      {/* --- LISTA GENERAL (4 EN ADELANTE) --- */}
      <div className="px-4 mt-8 space-y-3">
        {ranking.slice(3).map((c, i) => {
          const actualIndex = i + 3;
          const isMe = c.phone.replace(/\D/g, '') === (customerPhone || '').replace(/\D/g, '');
          return (
            <RevealOnScroll key={c.id} delay={i * 50}>
              <div 
                ref={isMe ? myRowRef : null}
                className={`flex items-center gap-3 p-4 rounded-3xl bg-white border border-slate-100 shadow-sm transition-all ${isMe ? 'ring-2 ring-orange-500 bg-orange-50' : ''}`}
              >
                <span className="w-7 text-center font-black text-slate-300 text-sm italic">#{actualIndex + 1}</span>
                <img src={c.avatar_url || `https://api.dicebear.com/8.x/adventurer/svg?seed=${c.name}`} className="w-12 h-12 aspect-square rounded-2xl object-cover border border-slate-100" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm break-words">{c.name}</p>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">{getGuerreroTitle(actualIndex)}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-900 text-lg leading-none">{c.points.toLocaleString()}</p>
                  <p className="text-[7px] font-black text-slate-400 uppercase mt-0.5">Puntos</p>
                </div>
              </div>
            </RevealOnScroll>
          );
        })}
      </div>

      {/* --- 🏆 SALÓN DE LA FAMA --- */}
      <div ref={hallOfFameRef} className="mt-40 scroll-mt-10 px-5">
        <div className="text-center mb-16">
          <div className="bg-orange-500 w-16 h-1.5 mx-auto mb-6 rounded-full" />
          <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">Salón de la Fama</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic mt-2">Inmortalizados en el Sabor 🏝️</p>
        </div>

        <div className="space-y-40 pb-20">
          {publishedSeasons.map((season, sIdx) => (
            <div key={season.id} className="relative bg-slate-950 rounded-[60px] p-8 shadow-2xl border-2 border-orange-500/20">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-orange-600 text-white px-8 py-3 rounded-3xl font-black shadow-2xl z-30 border-2 border-slate-950 text-center flex flex-col items-center">
                <span className="text-[8px] uppercase tracking-widest opacity-80 leading-none mb-1">Temporada</span>
                <span className="text-lg italic tracking-widest leading-none">#{publishedSeasons.length - sIdx}</span>
              </div>
              <div className="text-center pt-8 mb-12">
                <h3 className="text-white font-black text-3xl uppercase italic tracking-tighter mb-2">{season.name}</h3>
                <p className="text-yellow-400 text-[10px] font-black uppercase tracking-widest italic">🏆 Premio: {season.prize}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {season.winners.map((winner: any, idx: number) => (
                  <div key={idx} className={`relative group/winner rounded-[40px] overflow-hidden border-4 ${idx === 0 ? 'border-yellow-400 ring-4 ring-yellow-400/20' : idx === 1 ? 'border-slate-300' : 'border-orange-900'}`}>
                    {idx === 0 && <div className="absolute top-4 left-4 z-20 bg-yellow-400 text-black p-1.5 rounded-xl shadow-lg animate-bounce"><Crown size={24} /></div>}
                    {winner.photo_url ? <img src={winner.photo_url} className="w-full aspect-square object-cover grayscale-[30%] group-hover/winner:grayscale-0 transition-all duration-700" alt="Ganador" /> : <div className="w-full aspect-square bg-slate-900 flex flex-col items-center justify-center text-slate-700"><CameraOff size={40} className="opacity-20" /></div>}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-6">
                      <p className="text-white font-black italic text-xl tracking-tighter mb-1">{winner.name}</p>
                      <p className="text-orange-500 font-black text-base">{winner.points.toLocaleString()} <span className="text-[8px] text-white/50 uppercase tracking-widest pr-1">Pts</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- 📡 RADAR BURBUJA INTELIGENTE (VERSIÓN PEPA) --- */}
      {myData && showRadar && !isInHallOfFame && (
        <button 
          onClick={scrollToMyRank}
          className="fixed bottom-6 right-6 z- animate-in slide-in-from-bottom-10 fade-in duration-500 group"
        >
          <div className="relative flex items-center bg-orange-500 text-white rounded-full p-1.5 pr-5 shadow-[0_15px_40px_rgba(249,115,22,0.5)] border-2 border-white active:scale-90 transition-transform">
            <div className="relative shrink-0">
              <img src={myData.avatar_url} className="w-10 h-10 rounded-full border-2 border-white object-cover" />
              <div className="absolute -top-1 -left-1 bg-white text-orange-600 text-[9px] font-black h-5 w-5 flex items-center justify-center rounded-full border border-orange-500">
                {myRankIndex + 1}
              </div>
            </div>
            <div className="ml-3 text-left leading-none">
              <p className="text-[7px] font-black text-yellow-200 uppercase tracking-widest mb-0.5 italic">Ver mi puesto</p>
              <p className="text-white font-black text-[11px] italic uppercase tracking-tighter flex items-center gap-1">
                {myData.points.toLocaleString()} <ArrowDown size={10} className="animate-bounce" />
              </p>
            </div>
          </div>
        </button>
      )}

      {/* --- ESTILOS --- */}
      <style>{`
        @keyframes king-bounce { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-12px) rotate(5deg); } }
        .animate-king-bounce { animation: king-bounce 3s infinite ease-in-out; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
