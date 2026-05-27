import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Banknote,
  Building,
  Clock3,
  MessageCircle,
  QrCode,
  ShieldCheck,
} from 'lucide-react';

interface Props {
  visible: boolean;
  onWhatsApp: () => void;
}

type StoredPaymentMethod = 'efectivo' | 'deuna' | 'transferencia' | null;

const getStoredPaymentMethod = (): StoredPaymentMethod => {
  const value = localStorage.getItem('selectedPaymentMethod');

  if (value === 'efectivo' || value === 'deuna' || value === 'transferencia') {
    return value;
  }

  return null;
};

const getStoredBank = () => {
  return localStorage.getItem('selectedBank') || '';
};

const bankLabelMap: Record<string, string> = {
  pichincha: 'Banco Pichincha',
  guayaquil: 'Banco Guayaquil',
  pacifico: 'Banco del Pacífico',
  austro: 'Banco del Austro',
  otros: 'Produbanco / Otros Bancos',
};

export default function OrderConfirmation({ visible, onWhatsApp }: Props) {
  const [animateCheck, setAnimateCheck] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<StoredPaymentMethod>(null);
  const [selectedBank, setSelectedBank] = useState('');

  const audioCtxRef = useRef<AudioContext | null>(null);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRedirectedRef = useRef(false);

  const clearRedirectTimer = useCallback(() => {
    if (redirectTimer.current) {
      clearTimeout(redirectTimer.current);
      redirectTimer.current = null;
    }
  }, []);

  const closeAudioContext = useCallback(() => {
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => undefined);
      audioCtxRef.current = null;
    }
  }, []);

  const playSoftReadySound = useCallback(() => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextClass) return;

      closeAudioContext();

      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const playNote = (freq: number, start: number, duration: number, gain: number) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gainNode.gain.setValueAtTime(0.0001, ctx.currentTime + start);
        gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);

        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      playNote(440, 0, 0.16, 0.08);
      playNote(554.37, 0.11, 0.2, 0.08);
      playNote(659.25, 0.22, 0.28, 0.07);

      window.setTimeout(() => {
        closeAudioContext();
      }, 900);
    } catch {
      // El sonido es opcional. Si el navegador lo bloquea, el flujo sigue normal.
    }
  }, [closeAudioContext]);

  const triggerRedirect = useCallback(() => {
    if (hasRedirectedRef.current) return;

    hasRedirectedRef.current = true;
    clearRedirectTimer();
    setExiting(true);

    window.setTimeout(() => {
      onWhatsApp();
    }, 550);
  }, [clearRedirectTimer, onWhatsApp]);

  useEffect(() => {
    if (visible) {
      hasRedirectedRef.current = false;
      setExiting(false);
      setAnimateCheck(false);
      setPaymentMethod(getStoredPaymentMethod());
      setSelectedBank(getStoredBank());

      window.setTimeout(() => setAnimateCheck(true), 100);
      playSoftReadySound();

      redirectTimer.current = window.setTimeout(() => {
        triggerRedirect();
      }, 3000);
    } else {
      clearRedirectTimer();
      closeAudioContext();
      setAnimateCheck(false);
      setExiting(false);
      hasRedirectedRef.current = false;
      setPaymentMethod(null);
      setSelectedBank('');
    }

    return () => {
      clearRedirectTimer();
      closeAudioContext();
    };
  }, [clearRedirectTimer, closeAudioContext, playSoftReadySound, triggerRedirect, visible]);

  const confirmationCopy = useMemo(() => {
    if (paymentMethod === 'efectivo') {
      return {
        icon: <Banknote size={42} className="relative text-orange-500" strokeWidth={2.8} />,
        title: 'Pedido registrado',
        subtitle: 'Pago contra entrega',
        boxTitle: 'Pendiente de confirmación del negocio',
        boxText:
          'Tu pedido queda guardado, pero todavía debemos revisar disponibilidad y confirmar que podemos prepararlo. Pagarás en efectivo al recibir.',
        finalText:
          'Cuando el pedido sea aceptado, el rastreo mostrará el tiempo estimado de entrega.',
        buttonText: 'Enviar pedido por WhatsApp',
        tone: 'orange',
      };
    }

    if (paymentMethod === 'deuna') {
      return {
        icon: <QrCode size={42} className="relative text-purple-600" strokeWidth={2.8} />,
        title: 'Pedido registrado',
        subtitle: 'Pago Deuna en validación',
        boxTitle: 'Envía tu comprobante por WhatsApp',
        boxText:
          'Tu pedido quedó registrado. Ahora te enviaremos a WhatsApp para que envíes el comprobante y podamos validar el pago antes de preparar.',
        finalText:
          'Cuando el pago sea validado, el pedido pasará a confirmado y se activará el tiempo estimado.',
        buttonText: 'Enviar comprobante por WhatsApp',
        tone: 'purple',
      };
    }

    if (paymentMethod === 'transferencia') {
      const bankLabel = bankLabelMap[selectedBank] || selectedBank || 'tu banco';

      return {
        icon: <Building size={42} className="relative text-blue-600" strokeWidth={2.8} />,
        title: 'Pedido registrado',
        subtitle: 'Transferencia en validación',
        boxTitle: `Banco seleccionado: ${bankLabel}`,
        boxText:
          'Tu pedido quedó registrado. Te enviaremos a WhatsApp para que envíes el comprobante de transferencia y podamos validar el pago.',
        finalText:
          'Cuando el pago sea validado, el pedido pasará a confirmado y se activará el tiempo estimado.',
        buttonText: 'Enviar comprobante por WhatsApp',
        tone: 'blue',
      };
    }

    return {
      icon: <Clock3 size={42} className="relative text-orange-500" strokeWidth={2.8} />,
      title: 'Pedido registrado',
      subtitle: 'Pendiente de confirmación',
      boxTitle: 'Aún no está aprobado automáticamente',
      boxText:
        'Te enviaremos a WhatsApp para finalizar el envío del pedido. El negocio validará disponibilidad y/o pago antes de prepararlo.',
      finalText:
        'Cuando el pedido sea confirmado, el rastreo mostrará el tiempo estimado de entrega.',
      buttonText: 'Ir ahora a WhatsApp',
      tone: 'orange',
    };
  }, [paymentMethod, selectedBank]);

  const toneClasses = useMemo(() => {
    if (confirmationCopy.tone === 'purple') {
      return {
        iconBg: 'bg-purple-50 border-purple-200 shadow-purple-100',
        ping: 'bg-purple-400/10',
        subtitle: 'text-purple-600',
        box: 'bg-purple-50 border-purple-100',
        boxIcon: 'text-purple-600',
        boxText: 'text-purple-800',
        button:
          'from-green-500 to-green-400 hover:from-green-400 hover:to-green-300 shadow-green-500/25',
        dots: 'bg-purple-300',
      };
    }

    if (confirmationCopy.tone === 'blue') {
      return {
        iconBg: 'bg-blue-50 border-blue-200 shadow-blue-100',
        ping: 'bg-blue-400/10',
        subtitle: 'text-blue-600',
        box: 'bg-blue-50 border-blue-100',
        boxIcon: 'text-blue-600',
        boxText: 'text-blue-800',
        button:
          'from-green-500 to-green-400 hover:from-green-400 hover:to-green-300 shadow-green-500/25',
        dots: 'bg-blue-300',
      };
    }

    return {
      iconBg: 'bg-orange-50 border-orange-200 shadow-orange-100',
      ping: 'bg-orange-400/10',
      subtitle: 'text-orange-500',
      box: 'bg-orange-50 border-orange-100',
      boxIcon: 'text-orange-500',
      boxText: 'text-orange-700',
      button:
        'from-green-500 to-green-400 hover:from-green-400 hover:to-green-300 shadow-green-500/25',
      dots: 'bg-orange-300',
    };
  }, [confirmationCopy.tone]);

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
            className={`relative w-24 h-24 rounded-[32px] border-4 flex items-center justify-center transition-all duration-500 shadow-xl ${toneClasses.iconBg} ${
              animateCheck ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
            }`}
            style={{
              transitionDelay: '100ms',
              transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <div className={`absolute inset-0 rounded-[28px] animate-ping ${toneClasses.ping}`} />
            {confirmationCopy.icon}
          </div>
        </div>

        <h2
          className={`relative text-gray-900 font-black text-2xl leading-tight mb-2 uppercase italic tracking-tight transition-all duration-500 ${
            animateCheck ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '300ms' }}
        >
          {confirmationCopy.title}
        </h2>

        <p
          className={`relative font-black text-xs mb-5 uppercase tracking-widest transition-all duration-500 ${toneClasses.subtitle} ${
            animateCheck ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '380ms' }}
        >
          {confirmationCopy.subtitle}
        </p>

        <div
          className={`relative border rounded-[28px] p-4 mb-5 text-left transition-all duration-500 ${toneClasses.box} ${
            animateCheck ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '460ms' }}
        >
          <div className="flex gap-3">
            <div className={`w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm flex-shrink-0 ${toneClasses.boxIcon}`}>
              <ShieldCheck size={21} />
            </div>

            <div>
              <p className={`text-[11px] font-black uppercase leading-tight ${toneClasses.boxText}`}>
                {confirmationCopy.boxTitle}
              </p>
              <p className={`text-[11px] font-bold leading-relaxed mt-1.5 ${toneClasses.boxText} opacity-75`}>
                {confirmationCopy.boxText}
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
          {confirmationCopy.finalText}
        </p>

        <div
          className={`relative transition-all duration-500 ${
            animateCheck ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '620ms' }}
        >
          <button
            onClick={handleGoNow}
            className={`w-full flex items-center justify-center gap-2.5 bg-gradient-to-r text-white font-black py-4 rounded-2xl transition-all duration-300 hover:scale-[1.02] shadow-lg text-sm uppercase tracking-wide active:scale-95 ${toneClasses.button}`}
          >
            <MessageCircle size={19} />
            {confirmationCopy.buttonText}
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
                className={`w-1.5 h-1.5 rounded-full animate-pulse ${toneClasses.dots}`}
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
