import { useEffect, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';

interface Props {
  visible: boolean;
  onWhatsApp: () => void;
}

export default function OrderConfirmation({ visible, onWhatsApp }: Props) {
  const [animateCheck, setAnimateCheck] = useState(false);
  const [exiting, setExiting] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playSuccessSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioCtxRef.current = ctx;

      const playNote = (freq: number, start: number, duration: number, gain: number) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gainNode.gain.setValueAtTime(0, ctx.currentTime + start);
        gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      playNote(523.25, 0, 0.18, 0.12);
      playNote(659.25, 0.1, 0.18, 0.12);
      playNote(783.99, 0.2, 0.3, 0.1);
    } catch {
    }
  };

  const triggerRedirect = (onWA: () => void) => {
    setExiting(true);
    setTimeout(() => {
      onWA();
    }, 600);
  };

  useEffect(() => {
    if (visible) {
      setExiting(false);
      setAnimateCheck(false);
      setTimeout(() => setAnimateCheck(true), 100);
      playSuccessSound();
      redirectTimer.current = setTimeout(() => triggerRedirect(onWhatsApp), 2200);
    } else {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
      setAnimateCheck(false);
      setExiting(false);
    }
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, [visible]);

  if (!visible) return null;

  const handleGoNow = () => {
    if (redirectTimer.current) clearTimeout(redirectTimer.current);
    triggerRedirect(onWhatsApp);
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center px-4 transition-opacity duration-500 ${
        exiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className={`relative bg-white rounded-3xl shadow-2xl px-8 py-10 max-w-sm w-full text-center transition-all duration-500 ${
          animateCheck && !exiting
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-90 translate-y-6'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        <div className="flex justify-center mb-7">
          <div
            className={`w-24 h-24 rounded-full bg-green-50 border-4 border-green-400 flex items-center justify-center transition-all duration-500 ${
              animateCheck ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
            }`}
            style={{ transitionDelay: '100ms', transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          >
            <svg
              viewBox="0 0 52 52"
              className="w-12 h-12"
              fill="none"
              stroke="#22c55e"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="26" cy="26" r="24" stroke="#bbf7d0" strokeWidth="0" fill="none" />
              <path
                d="M14 26 L22 34 L38 18"
                className={`transition-all duration-500 ${animateCheck ? 'opacity-100' : 'opacity-0'}`}
                style={{
                  strokeDasharray: 36,
                  strokeDashoffset: animateCheck ? 0 : 36,
                  transition: 'stroke-dashoffset 0.45s ease 0.25s, opacity 0.1s ease 0.25s',
                }}
              />
            </svg>
          </div>
        </div>

        <h2
          className={`text-gray-900 font-black text-xl leading-tight mb-1 transition-all duration-500 ${
            animateCheck ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '300ms' }}
        >
          Gracias por realizar tu pedido
        </h2>

        <p
          className={`text-orange-500 font-bold text-sm mb-5 transition-all duration-500 ${
            animateCheck ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '380ms' }}
        >
          en Pollazo Galapagueño El Mirador
        </p>

        <p
          className={`text-gray-400 text-sm leading-relaxed mb-8 transition-all duration-500 ${
            animateCheck ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '460ms' }}
        >
          En breve te redirigiremos a WhatsApp para finalizar tu pedido.
        </p>

        <div
          className={`transition-all duration-500 ${
            animateCheck ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '540ms' }}
        >
          <button
            onClick={handleGoNow}
            className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-green-500 to-green-400 hover:from-green-400 hover:to-green-300 text-white font-bold py-3.5 rounded-2xl transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-green-500/25 text-sm"
          >
            <MessageCircle size={18} />
            Ir ahora a WhatsApp
          </button>
        </div>

        <div
          className={`mt-5 flex justify-center transition-all duration-500 ${
            animateCheck ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ transitionDelay: '600ms' }}
        >
          <div className="flex gap-1.5 items-center">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-gray-200 animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
            <span className="text-gray-300 text-xs ml-1">redirigiendo...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
