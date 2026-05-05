import { useEffect, useState } from 'react';

interface Props {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: Props) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'out'>('enter');

  useEffect(() => {
    // 600ms enter animation, then hold, then fade at 2600ms, done at 3000ms
    const t1 = setTimeout(() => setPhase('hold'), 600);
    const t2 = setTimeout(() => setPhase('out'), 2600);
    const t3 = setTimeout(() => onDone(), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-[200]"
      style={{
        background: '#E67E22',
        opacity: phase === 'out' ? 0 : 1,
        transition: phase === 'out' ? 'opacity 0.4s ease' : 'none',
        pointerEvents: phase === 'out' ? 'none' : 'all',
      }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-yellow-300/10 blur-3xl" />
      </div>

      {/* Glow halo */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 240, height: 240, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(251,191,36,0.38) 0%, rgba(249,115,22,0.18) 50%, transparent 72%)',
          opacity: phase === 'enter' ? 0 : 1,
          transition: 'opacity 0.5s ease',
          animation: phase !== 'enter' ? 'logoGlowPulse 2.8s ease-in-out infinite' : 'none',
        }}
      />

      {/* Logo — drops from top with elastic bounce */}
      <div
        style={{
          animation: phase === 'enter'
            ? 'splashDrop 0.6s cubic-bezier(0.22, 1.5, 0.5, 1) forwards'
            : 'splashFloat 3.2s ease-in-out infinite',
        }}
      >
        <img
          src="/logo-final.png"
          alt="La Casa del Pollazo"
          className="w-40 h-40 object-contain"
          style={{ filter: 'drop-shadow(0 16px 48px rgba(0,0,0,0.3))' }}
        />
      </div>

      {/* Brand text */}
      <div
        className="mt-7 text-center"
        style={{
          opacity: phase === 'enter' ? 0 : 1,
          transform: phase === 'enter' ? 'translateY(12px)' : 'translateY(0)',
          transition: 'opacity 0.5s ease 0.1s, transform 0.5s ease 0.1s',
        }}
      >
        <p className="text-white font-black text-2xl tracking-tight drop-shadow-lg">La Casa del Pollazo</p>
        <p className="text-white/70 font-semibold text-sm tracking-[0.22em] uppercase mt-1.5">El Mirador</p>
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {[0, 150, 300].map(delay => (
            <div key={delay} className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
