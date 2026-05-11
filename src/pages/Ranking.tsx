import { useState, useEffect, useMemo, useRef } from 'react';
import { Trophy, Star, Crown, Medal, Sparkles, Zap, History, Gift, X, Target, PartyPopper, ArrowUp, ArrowDown, Share2 } from 'lucide-react';
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

  useEffect(() => { if (refreshData) refreshData(); }, [refreshData]);

  useEffect(() => {
    const handleScroll = () => {
      if (!myRowRef.current) return;
      const rect = myRowRef.current.getBoundingClientRect();
      setIsMyRowAbove(rect.bottom < 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  // ✅ ORDEN DEL SALÓN DE LA FAMA: El más nuevo arriba
  const publishedSeasons = useMemo(() => {
      return seasons
        .filter(s => s.is_published)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [seasons]);

  const shareMyRank = () => {
    const text = `¡Mira! Soy el Guerrero #${myRankIndex + 1} en el Ranking VIP de Pollazo El Mirador 🍗🔥.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><Zap className="text-orange-500 animate-bounce" size={48} /></div>;

  return (
    <div className="relative min-h-screen pb-44 max-w-4xl mx-auto bg-slate-50 overflow-x-hidden">
      <div className="bg-gradient-to-b from-orange-500 to-orange-600 p-8 pt-10 rounded-b-[60px] shadow-2xl text-center text-white relative">
        <Trophy size={60} className="mx-auto mb-4 text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.6)] animate-bounce" />
        <h1 className="text-2xl font-black uppercase italic tracking-tighter mb-1">{extraSettings?.ranking_title || 'Ranking VIP'}</h1>
        
        <button onClick={() => setShowPrizeDetails(true)} className="inline-flex flex-col items-center gap-1 bg-black/20 px-6 py-2.5 rounded-3xl mb-8 border border-white/10 active:scale-95 transition-all">
          <div className="flex items-center gap-2">
            <Gift size={14} className="text-yellow-300 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[0.15em]">VER PREMIOS DE TEMPORADA</p>
          </div>
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
        {ranking.slice(0, 3).map((c, i) => (
          <RevealOnScroll key={c.id} delay={i * 100}>
            <div className={`relative flex items-center gap-3 p-5 rounded-[40px] border-4 ${i === 0 ? 'bg-yellow-50 border-yellow-400 shadow-xl scale-[1.03]' : 'bg-white border-slate-100 shadow-md'}`}>
              <div className="shrink-0 w-10 flex justify-center">
                {i === 0 ? <Crown className="text-yellow-500" size={40} /> : <Medal className={i===1?'text-slate-400':'text-orange-400'} size={32} />}
              </div>
              <div className="flex-1 min-w-0"><p className="font-black italic text-base text-slate-900 truncate uppercase">{c.name || 'Guerrero'}</p></div>
              <div className="text-right shrink-0"><p className="text-xl font-black text-orange-600">{c.points.toLocaleString()}</p><p className="text-[7px] font-black text-slate-400 uppercase">Puntos</p></div>
            </div>
          </RevealOnScroll>
        ))}
      </div>

      <div ref={hallOfFameRef} className="mt-40 px-5 pb-20">
        <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter text-center mb-10">Salón de la Fama</h2>
        <div className="space-y-20">
          {publishedSeasons.map((season, sIdx) => (
            <div key={season.id} className="relative bg-slate-950 rounded-[60px] p-8 shadow-2xl border-2 border-orange-500/20">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-orange-600 text-white px-8 py-3 rounded-3xl font-black shadow-2xl z-30 border-2 border-slate-950 text-center flex flex-col items-center min-w-[140px]">
                <span className="text-[8px] uppercase tracking-widest opacity-80 mb-1">Temporada</span>
                <span className="text-lg italic">#{publishedSeasons.length - sIdx}</span>
              </div>
              <div className="text-center pt-8 mb-6">
                <h3 className="text-white font-black text-2xl uppercase italic tracking-tighter mb-2">{season.name}</h3>
                <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 px-4 py-1.5 rounded-full mb-4">
                    <Gift size={12} className="text-yellow-400" /><p className="text-yellow-400 text-[10px] font-black uppercase">Premio: {season.prize}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {(season.winners || []).slice(0,3).map((winner: any, idx: number) => (
                  <div key={idx} className={`relative rounded-[40px] overflow-hidden border-4 ${idx === 0 ? 'border-yellow-400' : idx === 1 ? 'border-slate-300' : 'border-orange-900'}`}>
                    <img src={winner.photo_url || '/logo-final.png'} className="w-full aspect-square object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-6 text-center">
                      <p className="text-white font-black italic text-xl tracking-tighter mb-1 uppercase">{winner.name}</p>
                      <p className="text-orange-500 font-black text-sm">{winner.points?.toLocaleString()} PTS</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showPrizeDetails && (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white w-full max-w-sm rounded-[50px] overflow-hidden shadow-2xl border-4 border-orange-500 animate-in zoom-in-95">
              <div className="bg-orange-500 p-8 text-center text-white relative">
                 <button onClick={() => setShowPrizeDetails(false)} className="absolute top-6 right-6 p-2 bg-white/20 rounded-full"><X size={20}/></button>
                 <PartyPopper size={48} className="mx-auto mb-4 text-yellow-300" />
                 <h2 className="text-3xl font-black uppercase italic tracking-tighter">Premios VIP</h2>
              </div>
              <div className="p-8 space-y-5">
                 {/* ✅ SINCRONIZACIÓN DE PREMIOS DEL ADMIN */}
                 <div className="flex items-center gap-4 bg-yellow-50 p-5 rounded-[30px] border-2 border-yellow-200">
                    <Crown size={36} className="text-yellow-500 shrink-0" />
                    <div>
                       <p className="text-[9px] font-black text-yellow-600 uppercase tracking-widest">Campeón Oro (#1)</p>
                       <p className="text-base font-black text-slate-800 uppercase italic">{extraSettings?.prize_1 || 'Por definir'}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4 bg-slate-50 p-5 rounded-[30px] border-2 border-slate-200">
                    <Medal size={36} className="text-slate-400 shrink-0" />
                    <div>
                       <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Guerrero Plata (#2)</p>
                       <p className="text-base font-black text-slate-800 uppercase italic">{extraSettings?.prize_2 || 'Por definir'}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4 bg-orange-50 p-5 rounded-[30px] border-2 border-orange-200">
                    <Medal size={36} className="text-orange-500 shrink-0" />
                    <div>
                       <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest">Guerrero Bronce (#3)</p>
                       <p className="text-base font-black text-slate-800 uppercase italic">{extraSettings?.prize_3 || 'Por definir'}</p>
                    </div>
                 </div>
                 <button onClick={() => setShowPrizeDetails(false)} className="w-full bg-slate-950 text-white py-5 rounded-full font-black uppercase text-xs active:scale-95">¡A por el pollo! 🍗🔥</button>
              </div>
           </div>
        </div>
      )}
      
      <style>{`
        @keyframes vip-shine { 0% { box-shadow: 0 0 15px rgba(250,204,21,0.2); } 50% { box-shadow: 0 0 35px rgba(250,204,21,0.6); } 100% { box-shadow: 0 0 15px rgba(250,204,21,0.2); } }
        .animate-vip-shine { animation: vip-shine 3s infinite ease-in-out; }
        .animate-spin-slow { animation: spin 15s linear infinite; }
      `}</style>
    </div>
  );
}
