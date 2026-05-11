import { useState, useEffect, useMemo, useRef } from 'react';
import { Trophy, Star, Crown, Medal, CameraOff, Sparkles, Zap, History, ShieldCheck, ArrowDown, Share2, Gift, X, Target, PartyPopper } from 'lucide-react';
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
  const { customers = [], extraSettings, seasons = [], loading, refreshData } = useAdmin(); // ✅ AGREGADO refreshData
  const { customerPhone } = useUser();
  const hallOfFameRef = useRef<HTMLDivElement>(null); 
  const myRowRef = useRef<HTMLDivElement>(null);
  
  const [timeLeft, setTimeLeft] = useState({ d: '0', h: '0', m: '0', s: '0' });
  const [showRadar, setShowRadar] = useState(false);
  const [isInHallOfFame, setIsInHallOfFame] = useState(false);
  const [showPrizeDetails, setShowPrizeDetails] = useState(false);

  // 🚀 RECARGA AUTOMÁTICA AL ENTRAR
  useEffect(() => {
    if (refreshData) {
        refreshData(); 
    }
  }, [refreshData]);

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

  const ranking = useMemo(() => [...customers].sort((a, b) => (b.points || 0) - (a.points || 0)), [customers]);
  const myRankIndex = ranking.findIndex(c => (c.phone || '').replace(/\D/g, '') === (customerPhone || '').replace(/\D/g, ''));
  const myData = myRankIndex !== -1 ? ranking[myRankIndex] : null;
  const publishedSeasons = useMemo(() => seasons.filter(s => s.is_published).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [seasons]);

  const nextUp = myRankIndex > 0 ? ranking[myRankIndex - 1] : null;
  const pointsToLeap = nextUp ? (nextUp.points - (myData?.points || 0)) + 1 : 0;
  const nextUpName = nextUp?.name?.split(' ')[0] || 'Líder';

  useEffect(() => {
    const rowObserver = new IntersectionObserver(([entry]) => {
      setShowRadar(!entry.isIntersecting && myRankIndex !== -1);
    }, { threshold: 0.1 });
    const hallObserver = new IntersectionObserver(([entry]) => {
      setIsInHallOfFame(entry.isIntersecting);
    }, { threshold: 0.05 });
    if (myRowRef.current) rowObserver.observe(myRowRef.current);
    if (hallOfFameRef.current) hallObserver.observe(hallOfFameRef.current);
    return () => { rowObserver.disconnect(); hallObserver.disconnect(); };
  }, [myRankIndex, ranking]);

  const shareMyRank = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `¡Mira! Soy el Guerrero #${myRankIndex + 1} en el Ranking VIP de Pollazo El Mirador 🍗🔥. ¡Atrévete a superarme! 😎`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-10">
      <Zap className="text-orange-500 animate-bounce mb-4" size={48} />
      <p className="font-black text-orange-500 animate-pulse uppercase italic tracking-widest text-center">Sincronizando puntos...</p>
    </div>
  );

  return (
    <div className="relative min-h-screen pb-44 max-w-4xl mx-auto bg-slate-50 overflow-x-hidden">
      
      {/* --- HEADER --- */}
      <div className="bg-gradient-to-b from-orange-500 to-orange-600 p-8 pt-10 rounded-b-[60px] shadow-2xl text-center text-white relative">
        <div className="absolute inset-0 opacity-10 pointer-events-none"><Trophy className="absolute -bottom-10 -right-10 rotate-12" size={150} /></div>
        <Trophy size={60} className="mx-auto mb-4 text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.6)] animate-bounce" />
        <h1 className="text-2xl font-black uppercase italic tracking-tighter mb-1">{extraSettings?.ranking_title || 'Ranking VIP'}</h1>
        
        <button 
          onClick={() => setShowPrizeDetails(true)}
          className="inline-flex flex-col items-center gap-1 bg-black/20 px-6 py-2.5 rounded-3xl mb-8 border border-white/10 active:scale-95 transition-all shadow-inner hover:bg-black/30"
        >
          <div className="flex items-center gap-2">
            <Gift size={14} className="text-yellow-300 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[0.15em]">Premios de Temporada</p>
          </div>
          <p className="text-white font-black italic text-xs uppercase pr-1">Pulsa para descubrir</p>
        </button>

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
          const isMe = (c.phone || '').replace(/\D/g, '') === (customerPhone || '').replace(/\D/g, '');
          return (
            <RevealOnScroll key={c.id} delay={i * 100}>
              <div 
                ref={isMe ? myRowRef : null}
                className={`relative flex items-center gap-3 p-5 rounded-[40px] border-4 transition-all overflow-hidden ${
                  i === 0 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-400 shadow-xl scale-[1.03] z-20 animate-vip-shine' :
                  i === 1 ? 'bg-white border-slate-200 shadow-lg' :
                  'bg-white border-orange-100 shadow-md'
                } ${isMe ? 'ring-4 ring-orange-500 ring-offset-4' : ''}`}
              >
                <div className="shrink-0 w-10 flex justify-center">
                  {i === 0 ? <Crown className="text-yellow-500 animate-king-bounce drop-shadow-md" size={40} /> :
                   i === 1 ? <Medal className="text-slate-400" size={32} /> :
                   <Medal className="text-orange-400" size={32} />}
                </div>

                <div className="relative shrink-0">
                  <img src={c.avatar_url || `https://api.dicebear.com/8.x/adventurer/svg?seed=${c.name}`} className="w-16 h-16 aspect-square rounded-[24px] object-cover border-2 border-white shadow-sm" />
                  <div className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded-lg border border-white italic shadow-md">#{i + 1}</div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-black italic text-base text-slate-900 leading-tight break-words">{c.name || 'Guerrero'}</p>
                  <div className="flex items-center gap-1 mt-1">
                     <Star size={10} className="text-orange-500 fill-orange-500" />
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{getGuerreroTitle(i)}</p>
                  </div>
                </div>

                <div className="text-right shrink-0 flex flex-col items-end gap-2">
                  <p className={`text-xl font-black leading-none ${i === 0 ? 'text-orange-600' : 'text-slate-900'}`}>{c.points.toLocaleString()}</p>
                  <p className="text-[7px] font-black text-slate-400 uppercase">Puntos</p>
                  {isMe && (
                    <button onClick={shareMyRank} className="p-1.5 bg-orange-500 text-white rounded-full active:scale-75 transition-all shadow-md">
                      <Share2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            </RevealOnScroll>
          );
        })}
      </div>

      {/* --- LISTA GENERAL --- */}
      <div className="px-4 mt-8 space-y-3">
        {ranking.slice(3).map((c, i) => {
          const actualIndex = i + 3;
          const isMe = (c.phone || '').replace(/\D/g, '') === (customerPhone || '').replace(/\D/g, '');
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
                <div className="text-right flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-black text-slate-900 text-lg leading-none">{c.points.toLocaleString()}</p>
                    <p className="text-[7px] font-black text-slate-400 uppercase mt-0.5">Puntos</p>
                  </div>
                  {isMe && (
                    <button onClick={shareMyRank} className="p-2 bg-orange-500 text-white rounded-xl active:scale-75 transition-all shadow-sm">
                      <Share2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </RevealOnScroll>
          );
        })}
      </div>

      {/* --- SALÓN DE LA FAMA --- */}
      <div ref={hallOfFameRef} className="mt-40 scroll-mt-10 px-5 pb-20">
        <div className="text-center mb-16 animate-in fade-in duration-1000">
          <Sparkles className="mx-auto text-orange-500 mb-4 animate-spin-slow" size={32} />
          <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter text-center">Salón de la Fama</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic text-center">Leyendas Inmortales 🏝️</p>
        </div>

        <div className="space-y-40 pb-20">
          {publishedSeasons.map((season, sIdx) => (
            <div key={season.id} className="relative bg-slate-950 rounded-[60px] p-8 shadow-2xl border-2 border-orange-500/20">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-orange-600 text-white px-8 py-3 rounded-3xl font-black shadow-2xl z-30 border-2 border-slate-950 text-center flex flex-col items-center min-w-[140px]">
                <span className="text-[8px] uppercase tracking-widest opacity-80 leading-none mb-1">Temporada</span>
                <span className="text-lg italic tracking-widest leading-none">#{publishedSeasons.length - sIdx}</span>
              </div>
              <div className="text-center pt-8 mb-12">
                <h3 className="text-white font-black text-2xl uppercase italic tracking-tighter mb-2">{season.name}</h3>
                <p className="text-yellow-400 text-[10px] font-black uppercase tracking-widest italic flex items-center justify-center gap-2">
                   🥇 Ganador: {season.winners?.[0]?.name || 'Guerrero VIP'}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {(season.winners || []).slice(0,3).map((winner: any, idx: number) => (
                  <div key={idx} className={`relative group/winner rounded-[40px] overflow-hidden border-4 ${idx === 0 ? 'border-yellow-400' : idx === 1 ? 'border-slate-300' : 'border-orange-900'}`}>
                    <img src={winner.photo_url} className="w-full aspect-square object-cover grayscale-[30%]" alt="Ganador" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-6">
                      <p className="text-white font-black italic text-xl tracking-tighter mb-1">{winner.name}</p>
                      <p className="text-orange-500 font-black text-sm">{winner.points?.toLocaleString()} PTS</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- 📡 RADAR BURBUJA INTELIGENTE --- */}
      {myData && showRadar && !isInHallOfFame && (
        <div className="fixed bottom-3 right-4 z-[10001] flex flex-col items-end gap-2 animate-in slide-in-from-bottom-2 fade-in duration-500">
          
          {nextUp && (
            <div className="bg-slate-900 text-white text-[9px] font-black py-1.5 px-4 rounded-full border border-orange-500 shadow-2xl animate-bounce flex items-center gap-2">
              <Target size={10} className="text-orange-500" />
              <span>
                {myRankIndex === 1 
                  ? <>¡A solo <span className="text-yellow-400">{pointsToLeap} pts</span> de ganar a {nextUpName}!</>
                  : myRankIndex <= 4
                  ? <>¡A solo <span className="text-yellow-400">{pointsToLeap} pts</span> de entrar al Podio!</>
                  : <>¡A solo <span className="text-yellow-400">{pointsToLeap} pts</span> de subir al puesto #{myRankIndex}!</>
                }
              </span>
            </div>
          )}

          <div className="flex gap-2 items-center">
            <button onClick={shareMyRank} className="bg-white text-orange-500 p-2.5 rounded-full shadow-2xl border border-orange-100 active:scale-75 transition-all">
              <Share2 size={16} />
            </button>

            <button 
              onClick={() => { myRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
              className="flex items-center bg-orange-300/90 backdrop-blur-md text-white rounded-full p-1.5 pr-5 shadow-2xl border border-white active:scale-90 transition-transform"
            >
              <div className="relative shrink-0">
                <img src={myData.avatar_url} className="w-8 h-8 rounded-full border border-white/80 object-cover" />
                <div className="absolute -top-1 -left-1 bg-white text-orange-600 text-[8px] font-black h-4 w-4 flex items-center justify-center rounded-full border border-orange-400">
                  {myRankIndex + 1}
                </div>
              </div>
              <div className="ml-2 text-left leading-none">
                <p className="text-[7px] font-black text-slate-900 uppercase tracking-widest mb-0.5 opacity-90">
                   {myRankIndex < 3 ? '¡ERES LEYENDA! 🎉' : 'Ver mi puesto'}
                </p>
                <p className="text-white font-black text-xs italic flex items-center gap-1">
                  {myData.points.toLocaleString()} <ArrowDown size={10} className="animate-bounce" />
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL PREMIOS --- */}
      {showPrizeDetails && (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-sm rounded-[50px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border-4 border-orange-500">
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-8 text-center text-white relative">
                 <button onClick={() => setShowPrizeDetails(false)} className="absolute top-6 right-6 p-2 bg-white/20 rounded-full active:scale-75 transition-all"><X size={20}/></button>
                 <PartyPopper size={48} className="mx-auto mb-4 text-yellow-300" />
                 <h2 className="text-3xl font-black uppercase italic tracking-tighter">Premios VIP</h2>
                 <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mt-1">Recompensas para los Mejores</p>
              </div>
              <div className="p-8 space-y-5">
                 <div className="flex items-center gap-4 bg-yellow-50 p-5 rounded-[30px] border-2 border-yellow-200 shadow-sm transform hover:scale-[1.02] transition-transform">
                    <Crown size={36} className="text-yellow-500 shrink-0" />
                    <div>
                       <p className="text-[9px] font-black text-yellow-600 uppercase tracking-widest">Campeón Oro (#1)</p>
                       <p className="text-base font-black text-slate-800 uppercase italic">{extraSettings?.ranking_prize || '¡Pollo Entero + Parrillada!'}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4 bg-slate-50 p-5 rounded-[30px] border-2 border-slate-200 shadow-sm">
                    <Medal size={36} className="text-slate-400 shrink-0" />
                    <div>
                       <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Guerrero Plata (#2)</p>
                       <p className="text-base font-black text-slate-800 uppercase italic">¡Medio Pollo + Papas!</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4 bg-orange-50 p-5 rounded-[30px] border-2 border-orange-200 shadow-sm">
                    <Medal size={36} className="text-orange-500 shrink-0" />
                    <div>
                       <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest">Guerrero Bronce (#3)</p>
                       <p className="text-base font-black text-slate-800 uppercase italic">¡Un Cuarto de Pollo!</p>
                    </div>
                 </div>
                 <button onClick={() => setShowPrizeDetails(false)} className="w-full bg-slate-950 text-white py-5 rounded-full font-black uppercase tracking-[0.2em] text-xs active:scale-95 transition-all mt-4 border-b-4 border-slate-700 shadow-xl">¡A por esos premios! 🍗🔥</button>
              </div>
           </div>
        </div>
      )}

      {/* --- ESTILOS --- */}
      <style>{`
        @keyframes king-bounce { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-12px) rotate(5deg); } }
        @keyframes vip-shine { 0% { box-shadow: 0 0 15px rgba(250,204,21,0.2); } 50% { box-shadow: 0 0 35px rgba(250,204,21,0.6); } 100% { box-shadow: 0 0 15px rgba(250,204,21,0.2); } }
        .animate-king-bounce { animation: king-bounce 3s infinite ease-in-out; }
        .animate-vip-shine { animation: vip-shine 3s infinite ease-in-out; }
        .animate-spin-slow { animation: spin 15s linear infinite; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
