import { useCallback, useEffect, useRef, useState } from 'react';
import { Clock3, MessageCircle, ShieldCheck } from 'lucide-react';

interface Props {
  visible: boolean;
  onWhatsApp: () => void;
}

export default function OrderConfirmation({ visible, onWhatsApp }: Props) {
  const [animateCheck, setAnimateCheck] = useState(false);
  const [exiting, setExiting] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRedirectedRef = useRef(false);

  const clearRedirectTimer = () => {
    if (redirectTimer.current) {
      clearTimeout(redirectTimer.current);
      redirectTimer.current = null;
    }
  };

  const playSoftReadySound = () => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
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

      playNote(440, 0, 0.16, 0.08);
      playNote(554.37, 0.11, 0.2, 0.08);
      playNote(659.25, 0.22, 0.28, 0.07);
    } catch {
      // El sonido es opcional. Si el navegador lo bloquea, el flujo sigue normal.
    }
  };

  const triggerRedirect = useCallback(() => {
    if (hasRedirectedRef.current) return;

    hasRedirectedRef.current = true;
    clearRedirectTimer();
    setExiting(true);

    window.setTimeout(() => {
      onWhatsApp();
    }, 550);
  }, [onWhatsApp]);

  useEffect(() => {
    if (visible) {
      hasRedirectedRef.current = false;
      setExiting(false);
      setAnimateCheck(false);

      window.setTimeout(() => setAnimateCheck(true), 100);
      playSoftReadySound();

      redirectTimer.current = window.setTimeout(() => {
        triggerRedirect();
      }, 2600);
    } else {
      clearRedirectTimer();
      setAnimateCheck(false);
      setExiting(false);
      hasRedirectedRef.current = false;
    }

    return () => {
      clearRedirectTimer();
    };
  }, [visible, triggerRedirect]);

  if (!visible) return null;

  const handleGoNow = () => {
    triggerRedirect();
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center px-4 transition-opacity duration-500 ${
        exiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />

      <div
        className={`relative bg-white rounded-[40px] shadow-2xl px-7 py-9 max-w-sm w-full text-center border border-white/60 overflow-hidden transition-all duration-500 ${
          animateCheck && !exiting
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-90 translate-y-6'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        <div className="absolute -top-24 -right-24 w-52 h-52 rounded-full bg-orange-400/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-52 h-52 rounded-full bg-yellow-300/20 blur-3xl" />

        <div className="relative flex justify-center mb-7">
          <div
            className={`relative w-24 h-24 rounded-[32px] bg-orange-50 border-4 border-orange-200 flex items-center justify-center transition-all duration-500 shadow-xl shadow-orange-100 ${
              animateCheck ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
            }`}
            style={{
              transitionDelay: '100ms',
              transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <div className="absolute inset-0 rounded-[28px] bg-orange-400/10 animate-ping" />
            <Clock3 size={42} className="relative text-orange-500" strokeWidth={2.8} />
          </div>
        </div>

        <h2
          className={`relative text-gray-900 font-black text-2xl leading-tight mb-2 uppercase italic tracking-tight transition-all duration-500 ${
            animateCheck ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '300ms' }}
        >
          Pedido registrado
        </h2>

        <p
          className={`relative text-orange-500 font-black text-xs mb-5 uppercase tracking-widest transition-all duration-500 ${
            animateCheck ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '380ms' }}
        >
          Pendiente de confirmación
        </p>

        <div
          className={`relative bg-orange-50 border border-orange-100 rounded-[28px] p-4 mb-5 text-left transition-all duration-500 ${
            animateCheck ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '460ms' }}
        >
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-orange-500 shadow-sm flex-shrink-0">
              <ShieldCheck size={21} />
            </div>

            <div>
              <p className="text-[11px] font-black text-orange-700 uppercase leading-tight">
                Aún no está aprobado automáticamente
              </p>
              <p className="text-[11px] font-bold text-orange-700/75 leading-relaxed mt-1.5">
                Te enviaremos a WhatsApp para finalizar el envío del pedido. El negocio validará disponibilidad y/o pago antes de prepararlo.
              </p>
            </div>
          </div>
        </div>

        <p
          className={`relative text-gray-400 text-sm leading-relaxed mb-7 transition-all duration-500 ${
            animateCheck ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '540ms' }}
        >
          Cuando el pedido sea confirmado, el rastreo mostrará el tiempo estimado de entrega.
        </p>

        <div
          className={`relative transition-all duration-500 ${
            animateCheck ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '620ms' }}
        >
          <button
            onClick={handleGoNow}
            className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-green-500 to-green-400 hover:from-green-400 hover:to-green-300 text-white font-black py-4 rounded-2xl transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-green-500/25 text-sm uppercase tracking-wide active:scale-95"
          >
            <MessageCircle size={19} />
            Ir ahora a WhatsApp
          </button>
        </div>

        <div
          className={`relative mt-5 flex justify-center transition-all duration-500 ${
            animateCheck ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ transitionDelay: '700ms' }}
        >
          <div className="flex gap-1.5 items-center bg-gray-50 border border-gray-100 rounded-full px-4 py-2">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-orange-300 animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
            <span className="text-gray-400 text-[11px] font-bold ml-1">
              redirigiendo...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
