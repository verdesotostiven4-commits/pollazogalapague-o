import { useState, useEffect, useMemo, useRef } from 'react';
import { Trophy, Star, Crown, Medal, Sparkles, Zap, History, ArrowDown, ArrowUp, Share2, Gift, X, Target, PartyPopper } from 'lucide-react';
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
  const { customers = [], extraSettings, seasons = [], loading, refreshData } = useAdmin();
  const { customerPhone } = useUser();
  const hallOfFameRef = useRef<HTMLDivElement>(null); 
  const myRowRef = useRef<HTMLDivElement>(null);
  
  const [timeLeft, setTimeLeft] = useState({ d: '0', h: '0', m: '0', s: '0' });
  const [showRadar, setShowRadar] = useState(false);
  const [isMyRowAbove, setIsMyRowAbove] = useState(false);
  const [isInHallOfFame, setIsInHallOfFame] = useState(false);
  const [showPrizeDetails, setShowPrizeDetails] = useState(false);
  
  // 🔥 ESTADO PARA EL EFECTO DE REBOTE DEL BOTÓN DE PREMIOS
  const [alertButton, setAlertButton] = useState(false);

  // 🚀 LÓGICA DE MODAL AUTOMÁTICO (NUEVA TEMPORADA)
  useEffect(() => {
    if (extraSettings?.ranking_end_date && !loading) {
      const lastSeen = localStorage.getItem('pollazo_last_prize_seen');
      if (lastSeen !== extraSettings.ranking_end_date) {
        setTimeout(() => setShowPrizeDetails(true), 1200);
      }
    }
  }, [extraSettings?.ranking_end_date, loading]);

  // 🎇 CERRAR Y DESTELLAR
  const handleClosePrizes = () => {
    setShowPrizeDetails(false);
    setAlertButton(true);
    localStorage.setItem('pollazo_last_prize_seen', extraSettings?.ranking_end_date || '');
    setTimeout(() => setAlertButton(false), 2400); // Se apaga tras 2.4s (3 destellos)
  };

  useEffect(() => {
    if (refreshData) refreshData();
  }, [refreshData]);

  // 📡 DETECTOR INTELIGENTE DE FLECHA (ARRIBA/ABAJO)
  useEffect(() => {
    const handleScroll = () => {
      if (!myRowRef.current) return;
      const rect = myRowRef.current.getBoundingClientRect();
      // Inteligencia espacial: Si la fila está arriba de la mitad de la pantalla, indica hacia arriba
      setIsMyRowAbove(rect.top < window.innerHeight / 2);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check inicial
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    const appUrl = window.location.origin;
    const text = `¡Mira! Soy el Guerrero #${myRankIndex + 1} en el Ranking VIP de Pollazo El Mirador 🍗🔥.\n¡Atrévete a superarme! 😎\n\n${appUrl}`;
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
      
      <div className="bg-gradient-to-b from-orange-500 to-orange-600 p-8 pt-10 rounded-b-[60px] shadow-2xl text-center text-white relative">
        <div className="absolute inset-0 opacity-10 pointer-events-none"><Trophy className="absolute -bottom-10 -right-10 rotate-12" size={150} /></div>
        <Trophy size={60} className="mx-auto mb-4 text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.6)] animate-bounce" />
        <h1 className="text-2xl font-black uppercase italic tracking-tighter mb-1">{extraSettings?.ranking_title || 'Ranking VIP'}</h1>
        
        {/* 🚨 BOTÓN DE PREMIOS (AQUÍ ESTÁ EL DESTELLO MÁGICO) 🚨 */}
        <button 
          onClick={() => setShowPrizeDetails(true)}
          className={`inline-flex flex-col items-center gap-1 bg-black/20 px-6 py-2.5 rounded-3xl mb-8 border border-white/10 transition-all shadow-inner hover:bg-black/30 ${
            alertButton ? 'animate-alert-glow' : 'active:scale-95'
          }`}
        >
          <div className="flex items-center gap-2">
            <Gift size={14} className="text-yellow-300 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[0.15em]">VER PREMIOS DE TEMPORADA</p>
          </div>
          <p className="text-white font-black italic text-[9px] uppercase opacity-70">Haz clic para descubrir</p>
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

      {/* 🏆 SALÓN DE LA FAMA DIAMANTE & BLUR */}
      <div ref={hallOfFameRef} className="mt-40 scroll-mt-10 px-5 pb-20">
        <div className="text-center mb-16 animate-in fade-in duration-1000">
          <Sparkles className="mx-auto text-orange-500 mb-4 animate-spin-slow" size={32} />
          <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter text-center">Salón de la Fama</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic text-center">Leyendas Inmortales 🏝️</p>
        </div>

        <div className="space-y-24">
          {publishedSeasons.map((season, sIdx) => (
            <div key={season.id} className="relative bg-slate-950 rounded-[60px] p-8 shadow-2xl border-2 border-orange-500/20">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-orange-600 text-white px-8 py-3 rounded-3xl font-black shadow-2xl z-30 border-2 border-slate-950 text-center flex flex-col items-center min-w-[140px]">
                <span className="text-[8px] uppercase tracking-widest opacity-80 leading-none mb-1">Temporada</span>
                <span className="text-lg italic tracking-widest leading-none">#{publishedSeasons.length - sIdx}</span>
              </div>
              <div className="text-center pt-8 mb-10">
                <h3 className="text-white font-black text-2xl uppercase italic tracking-tighter mb-2">{season.name}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {(season.winners || []).slice(0,3).map((winner: any, idx: number) => (
                  <div key={idx} className={`relative rounded-[40px] p-1 group ${
                    idx === 0 ? 'bg-gradient-to-tr from-yellow-300 via-yellow-600 to-yellow-300 animate-diamond-glow' : 
                    idx === 1 ? 'bg-gradient-to-tr from-slate-200 via-slate-400 to-slate-200 animate-silver-glow' : 
                    'bg-orange-900/50 border-2 border-orange-700'
                  }`}>
                    {/* CORONA FÍSICA FLOTANTE SOLO PARA EL 1ERO */}
                    {idx === 0 && <Crown className="absolute -top-8 left-1/2 -translate-x-1/2 text-yellow-400 fill-yellow-400 animate-crown-float drop-shadow-2xl z-30" size={42} />}
                    
                    {/* ✅ FOTO COMPLETA Y OVERLAY ELEGANTE PEQUEÑO */}
                    <div className="bg-slate-900 rounded-[38px] overflow-hidden flex flex-col h-full relative aspect-square shadow-inner">
                      
                      {/* FOTO FULL COVER */}
                      <img src={winner.photo_url || `https://api.dicebear.com/8.x/shapes/svg?seed=${winner.name}&backgroundColor=1e293b`} className="w-full h-full object-cover absolute inset-0 grayscale-[15%] group-hover:grayscale-0 transition-all duration-500 z-0" alt="Premio Ganador" />
                      
                      {/* ✅ DESTELLO VIP SOBRE LA IMAGEN (SOLO ORO) */}
                      {idx === 0 && (
                        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-[38px]">
                          <div className="absolute top-0 left-0 w-[150%] h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-25deg] animate-glass-shine"></div>
                        </div>
                      )}

                      {/* MEDALLA FLOTANTE */}
                      <div className={`absolute top-4 right-4 z-20 p-1.5 rounded-full shadow-lg ${idx === 0 ? 'bg-yellow-500 border border-yellow-300' : idx === 1 ? 'bg-slate-300 border border-slate-100' : 'bg-orange-700 border border-orange-500'}`}>
                         <Medal size={20} className={idx === 0 ? "text-slate-900" : idx === 1 ? "text-slate-800" : "text-white"} />
                      </div>
                      
                      {/* ✅ PÍLDORA DE TEXTO PEQUEÑA Y DIFUMINADA AL FONDO */}
                      <div className="absolute bottom-3 left-3 right-3 z-20">
                        <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl p-3 text-center shadow-xl">
                          <p className="text-white font-black italic text-sm tracking-tighter mb-0.5 truncate drop-shadow-md">{winner.name}</p>
                          <p className="text-orange-400 font-black text-[10px] uppercase drop-shadow-md">{winner.points?.toLocaleString()} PTS</p>
                          {winner.prize_won && <p className="text-[8px] font-bold uppercase text-white/70 mt-0.5 drop-shadow-md truncate">{winner.prize_won}</p>}
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 🎁 MODAL DE PREMIOS */}
      {showPrizeDetails && (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-sm rounded-[50px] overflow-hidden shadow-2xl border-4 border-orange-500 animate-in zoom-in-95 duration-300 relative">
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-8 text-center text-white relative">
                 <button onClick={handleClosePrizes} className="absolute top-6 right-6 p-2 bg-white/20 rounded-full active:scale-75 transition-all"><X size={20}/></button>
                 <PartyPopper size={48} className="mx-auto mb-4 text-yellow-300 animate-bounce" />
                 <h2 className="text-3xl font-black uppercase italic tracking-tighter">Premios</h2>
                 <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mt-1">Recompensas de Temporada</p>
              </div>
              
              <div className="p-8 space-y-6">
                 {/* PREMIO 1 */}
                 <div className="flex items-center gap-4 bg-yellow-50 p-4 rounded-[30px] border-2 border-yellow-200 shadow-sm">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-yellow-400 shrink-0 shadow-inner">
                      <img src="https://blogger.googleusercontent.com/img/a/AVvXsEhe_O03ML1U5KJjdg11ZSwLSJWTXIlnrUkUWzTL1awakYQYWuampHeETS45-2PahAGmlOJKp0W_l1hCvPRnIQn_fDpzcAnDVG3274RC3b_c4QE889BLkdkQfTRbUrrfUvqtw7xZPrjJJoS96AKMEVDJRmeXCH67_5z_LFpvNAEuOUzY2nCGYYI8JzTRk3s" className="w-full h-full object-cover" alt="Pollo Entero"/>
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-yellow-600 uppercase">Campeón Oro (#1)</p>
                       <p className="text-sm font-black text-slate-800 uppercase italic">¡Un Pollo Entero!</p>
                    </div>
                 </div>

                 {/* PREMIO 2 */}
                 <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-[30px] border-2 border-slate-200 shadow-sm">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-slate-300 shrink-0 shadow-inner">
                      <img src="https://blogger.googleusercontent.com/img/a/AVvXsEiWOnAiaBYLyCg1Xc1zipz5Yy6deZuiTmVlfXcfJCrxCOYDJ2abt67MrGcsbLLWjrHDFr_5rUnjhvB90hPSVRDu2ttSZJfHYunitnbExf9AakTdXpEZT_AV_EXAS20OZyNKx8B_RMJWkOfSvCJxMPMOZiiV-fCqXpolIEZxCVO50eJH-rtU_zLJde88fBE" className="w-full h-full object-cover" alt="Queso Fresco"/>
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-slate-500 uppercase">Guerrero Plata (#2)</p>
                       <p className="text-sm font-black text-slate-800 uppercase italic">¡Un Queso Fresco!</p>
                    </div>
                 </div>

                 {/* PREMIO 3 */}
                 <div className="flex items-center gap-4 bg-orange-50 p-4 rounded-[30px] border-2 border-orange-200 shadow-sm">
                    <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center shrink-0 border-2 border-orange-300 shadow-inner">
                      <p className="text-white font-black text-2xl italic">$5</p>
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-orange-600 uppercase">Guerrero Bronce (#3)</p>
                       <p className="text-sm font-black text-slate-800 uppercase italic">Bono Descuento</p>
                    </div>
                 </div>

                 <button onClick={handleClosePrizes} className="w-full bg-slate-950 text-white py-5 rounded-full font-black uppercase tracking-[0.2em] text-xs active:scale-95 transition-all mt-4 border-b-4 border-slate-700 shadow-xl">¡A por ellos! 🍗🔥</button>
              </div>
           </div>
        </div>
      )}

      {/* 🎯 RADAR DE POSICIÓN RESTAURADO Y CORREGIDO */}
      {myData && showRadar && !isInHallOfFame && (
        <div className="fixed bottom-3 right-4 z-[10001] flex flex-col items-end gap-2 animate-in slide-in-from-bottom-2 fade-in duration-500">
          
          {nextUp && (
            <div className="bg-slate-900 text-white text-[9px] font-black py-1.5 px-4 rounded-full border border-orange-500 shadow-2xl animate-bounce flex items-center gap-2">
              <Target size={10} className="text-orange-500" />
              <span>
                {myRankIndex === 1 
                  ? <>¡A solo <span className="text-yellow-400">{pointsToLeap} pts</span> de ganar a {nextUpName}!</>
                  : myRankIndex <= 4
                  ? <>¡A solo <span className="text-yellow-400">{pointsToLeap} pts</span> de estar entre los mejores!</>
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
              className="flex items-center bg-orange-400 backdrop-blur-md text-white rounded-full p-1.5 pr-5 shadow-2xl border-2 border-white active:scale-90 transition-transform"
            >
              <div className="relative shrink-0">
                <img src={myData.avatar_url || `https://api.dicebear.com/8.x/adventurer/svg?seed=${myData.name}`} className="w-8 h-8 rounded-full border border-white/80 object-cover" />
                <div className="absolute -top-1 -left-1 bg-white text-orange-600 text-[8px] font-black h-4 w-4 flex items-center justify-center rounded-full border border-orange-400">
                  {myRankIndex + 1}
                </div>
              </div>
              <div className="ml-2 text-left leading-none">
                <p className="text-[7px] font-black text-slate-900 uppercase tracking-widest mb-0.5 opacity-90">
                   {myRankIndex < 3 ? '¡ERES LEYENDA! 🎉' : 'Ver mi puesto'}
                </p>
                <div className="flex items-center gap-1.5">
                   <p className="text-white font-black text-xs italic">
                     {myData.points.toLocaleString()}
                   </p>
                   {/* ✅ FLECHA INTELIGENTE: ESPACIALMENTE CORRECTA */}
                   {isMyRowAbove ? <ArrowUp size={12} className="text-white animate-bounce" /> : <ArrowDown size={12} className="text-white animate-bounce" />}
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes alert-glow {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 rgba(250, 204, 21, 0); }
          25% { transform: scale(1.1) rotate(-2deg); box-shadow: 0 0 40px rgba(250, 204, 21, 1); }
          50% { transform: scale(1.1) rotate(2deg); box-shadow: 0 0 40px rgba(250, 204, 21, 1); }
          75% { transform: scale(1.1) rotate(-2deg); box-shadow: 0 0 40px rgba(250, 204, 21, 1); }
        }
        @keyframes diamond-glow { 0%, 100% { box-shadow: 0 0 20px rgba(234,179,8,0.4); border-color: #fbbf24; } 50% { box-shadow: 0 0 45px rgba(234,179,8,0.9); border-color: #fff; } }
        @keyframes silver-glow { 0%, 100% { box-shadow: 0 0 15px rgba(203,213,225,0.4); } 50% { box-shadow: 0 0 35px rgba(203,213,225,0.7); } }
        @keyframes crown-float { 0%, 100% { transform: translate(-50%, 0) rotate(-5deg); } 50% { transform: translate(-50%, -12px) rotate(5deg); } }
        @keyframes king-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes vip-shine { 0% { box-shadow: 0 0 15px rgba(250,204,21,0.2); } 50% { box-shadow: 0 0 35px rgba(250,204,21,0.5); } 100% { box-shadow: 0 0 15px rgba(250,204,21,0.2); } }
        
        /* 🔥 ANIMACIÓN DE DESTELLO DE VIDRIO (SOLO ORO) */
        @keyframes glass-shine {
          0%, 10% { transform: translateX(-150%) skewX(-25deg); }
          90%, 100% { transform: translateX(200%) skewX(-25deg); }
        }
        
        .animate-alert-glow { animation: alert-glow 0.8s ease-in-out 3; z-index: 50; position: relative; }
        .animate-diamond-glow { animation: diamond-glow 2s infinite ease-in-out; }
        .animate-silver-glow { animation: silver-glow 2s infinite ease-in-out; }
        .animate-crown-float { animation: crown-float 3s infinite ease-in-out; }
        .animate-king-bounce { animation: king-bounce 3s infinite ease-in-out; }
        .animate-vip-shine { animation: vip-shine 3s infinite ease-in-out; }
        .animate-spin-slow { animation: spin 15s linear infinite; }
        .animate-glass-shine { animation: glass-shine 4s ease-in-out infinite; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
