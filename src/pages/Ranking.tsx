import { useState, useEffect, useMemo, useRef } from 'react';
import { Trophy, Star, Crown, Medal, CameraOff, Sparkles, Zap, History, ShieldCheck, TrendingUp } from 'lucide-react';
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

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-10">
      <Zap className="text-orange-500 animate-bounce mb-4" size={48} />
      <p className="font-black text-orange-500 animate-pulse uppercase italic tracking-widest text-center">Abriendo la Arena de Campeones...</p>
    </div>
  );

  return (
    <div className="relative min-h-screen pb-56 max-w-4xl mx-auto bg-slate-50 overflow-x-hidden">
      
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
              <p className="text-[7px] font-black opacity-70 tracking-widest">{t.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 📍 BOTÓN HISTORIAL */}
      {publishedSeasons.length > 0 && (
        <div className="px-6 -mt-6 flex justify-center relative z-10">
          <button onClick={() => hallOfFameRef.current?.scrollIntoView({ behavior: 'smooth' })} className="flex items-center gap-2 bg-white text-orange-600 px-6 py-3 rounded-full shadow-xl active:scale-95 transition-all border-2 border-orange-500 group">
            <History size={16} className="group-hover:rotate-[-45deg] transition-transform" />
            <span className="text-xs font-black uppercase italic tracking-tighter">Ver Historial</span>
          </button>
        </div>
      )}

      {/* 🏆 TOP 3 - ESPACIADO MEJORADO 🏆 */}
      <div className="px-5 mt-10 space-y-6">
        <h2 className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Líderes de la Isla</h2>
        
        <div className="space-y-4">
          {ranking.slice(0, 3).map((c, i) => {
            const isMe = c.phone.replace(/\D/g, '') === (customerPhone || '').replace(/\D/g, '');
            return (
              <RevealOnScroll key={c.id} delay={i * 100}>
                <div className={`relative flex items-center gap-4 p-4 rounded-[35px] border-4 transition-all ${
                  i === 0 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-400 shadow-xl scale-[1.02] z-20' :
                  i === 1 ? 'bg-white border-slate-200 shadow-lg' :
                  'bg-white border-orange-100 shadow-md'
                } ${isMe ? 'ring-4 ring-orange-500 ring-offset-2' : ''}`}>
                  
                  {/* ICONO PUESTO */}
                  <div className="shrink-0 w-12 flex justify-center">
                    {i === 0 ? <Crown className="text-yellow-500 animate-king-bounce" size={38} /> :
                     i === 1 ? <Medal className="text-slate-400" size={30} /> :
                     <Medal className="text-orange-400" size={30} />}
                  </div>

                  {/* FOTO 1:1 */}
                  <div className="relative shrink-0">
                    <img src={c.avatar_url || `https://api.dicebear.com/8.x/adventurer/svg?seed=${c.name}`} className="w-16 h-16 aspect-square rounded-2xl object-cover border-2 border-white shadow-sm" />
                    <div className="absolute -top-2 -right-2 bg-slate-900 text-white text-[9px] font-black px-1.5 py-0.5 rounded-lg border border-white italic">#{i + 1}</div>
                  </div>

                  {/* DATOS - FLEX PARA DAR ESPACIO */}
                  <div className="flex-1 min-w-0">
                    <p className="font-black italic text-sm text-slate-900 truncate uppercase leading-none mb-1">{c.name || 'Invitado'}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{getGuerreroTitle(i)}</p>
                  </div>

                  {/* PUNTOS - TAMAÑO EQUILIBRADO */}
                  <div className="text-right shrink-0">
                    <p className={`text-xl font-black leading-none ${i === 0 ? 'text-orange-600' : 'text-slate-900'}`}>{c.points.toLocaleString()}</p>
                    <p className="text-[7px] font-black text-slate-400 uppercase mt-0.5">Puntos 🍗</p>
                  </div>
                </div>
              </RevealOnScroll>
            );
          })}
        </div>
      </div>

      {/* --- RESTO DE CLASIFICACIÓN --- */}
      <div className="px-5 mt-10 space-y-3">
        <h2 className="text-center text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4 italic">Guerreros del Ranking</h2>
        {ranking.slice(3, 10).map((c, i) => {
          const isMe = c.phone.replace(/\D/g, '') === (customerPhone || '').replace(/\D/g, '');
          return (
            <RevealOnScroll key={c.id} delay={i * 50}>
              <div className={`flex items-center gap-4 p-3 rounded-2xl bg-white border border-slate-100 shadow-sm ${isMe ? 'ring-2 ring-orange-500' : ''}`}>
                <span className="w-6 text-center font-black text-slate-300 text-xs italic">#{i + 4}</span>
                <img src={c.avatar_url || `https://api.dicebear.com/8.x/adventurer/svg?seed=${c.name}`} className="w-10 h-10 aspect-square rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-xs truncate uppercase">{c.name}</p>
                  <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">Guerrero</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-900 text-sm leading-none">{c.points.toLocaleString()}</p>
                </div>
              </div>
            </RevealOnScroll>
          );
        })}
      </div>

      {/* --- RADAR USUARIO (REDISEÑADO) --- */}
      {myData && (
        <div className="fixed bottom-6 left-4 right-4 z- animate-in slide-in-from-bottom-10 duration-700">
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-2 border-orange-500/40 rounded-[35px] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden group">
            {/* Brillo de fondo animado */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer pointer-events-none" />
            
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img src={myData.avatar_url} className="w-14 h-14 rounded-2xl border-2 border-orange-500 object-cover shadow-lg group-hover:scale-110 transition-transform" />
                  <div className="absolute -top-2 -left-2 bg-orange-600 text-white text-[10px] font-black h-6 w-6 flex items-center justify-center rounded-full border-2 border-slate-900 shadow-md">
                    {myRankIndex + 1}
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-0.5 flex items-center gap-1 italic">
                    <TrendingUp size={10} /> {myRankIndex < 3 ? '¡ERES UNA LEYENDA!' : '¡SIGUE SUBIENDO!'}
                  </p>
                  <p className="text-white font-black text-lg italic uppercase tracking-tighter leading-none">
                    {myRankIndex === 0 ? 'EL REY DEL POLLAZO' : `PUESTO ACTUAL #${myRankIndex + 1}`}
                  </p>
                </div>
              </div>

              <div className="text-right flex flex-col items-end">
                <div className="bg-orange-500/20 px-3 py-1 rounded-xl border border-orange-500/30">
                  <p className="text-2xl font-black text-white leading-none tracking-tight">{myData.points.toLocaleString()}</p>
                  <p className="text-[7px] font-black text-yellow-300 uppercase tracking-widest mt-0.5">Mis Puntos 🍗</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ESTILOS --- */}
      <style>{`
        @keyframes king-bounce { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-10px) rotate(5deg); } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .animate-king-bounce { animation: king-bounce 3s infinite ease-in-out; }
        .animate-shimmer { animation: shimmer 4s infinite linear; }
      `}</style>
    </div>
  );
}
