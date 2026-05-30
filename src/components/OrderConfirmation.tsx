import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Banknote,
  Building,
  CheckCircle2,
  Clock3,
  MessageCircle,
  PackageSearch,
  QrCode,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';

interface Props {
  visible: boolean;
  onWhatsApp: () => void;
  onContinueInApp?: () => void;
}

type StoredPaymentMethod =
  | 'efectivo'
  | 'deuna'
  | 'transferencia'
  | 'tarjeta'
  | null;

const getStoredPaymentMethod = (): StoredPaymentMethod => {
  const value = localStorage.getItem('selectedPaymentMethod');

  if (
    value === 'efectivo' ||
    value === 'deuna' ||
    value === 'transferencia' ||
    value === 'tarjeta'
  ) {
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

const triggerSoftVibration = () => {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate([22, 35, 22]);
    }
  } catch {
    // La vibración es opcional.
  }
};

export default function OrderConfirmation({
  visible,
  onWhatsApp,
  onContinueInApp,
}: Props) {
  const [animateCheck, setAnimateCheck] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<StoredPaymentMethod>(null);
  const [selectedBank, setSelectedBank] = useState('');

  const audioCtxRef = useRef<AudioContext | null>(null);

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

  useEffect(() => {
    if (visible) {
      setExiting(false);
      setAnimateCheck(false);
      setPaymentMethod(getStoredPaymentMethod());
      setSelectedBank(getStoredBank());

      window.setTimeout(() => setAnimateCheck(true), 100);
      triggerSoftVibration();
      playSoftReadySound();
    } else {
      closeAudioContext();
      setAnimateCheck(false);
      setExiting(false);
      setPaymentMethod(null);
      setSelectedBank('');
    }

    return () => {
      closeAudioContext();
    };
  }, [closeAudioContext, playSoftReadySound, visible]);

  const closeInsideApp = useCallback(() => {
    setExiting(true);

    window.setTimeout(() => {
      if (onContinueInApp) {
        onContinueInApp();
      }
    }, 280);
  }, [onContinueInApp]);

  const goWhatsApp = useCallback(() => {
    setExiting(true);

    window.setTimeout(() => {
      onWhatsApp();
    }, 280);
  }, [onWhatsApp]);

  const confirmationCopy = useMemo(() => {
    if (paymentMethod === 'efectivo') {
      return {
        icon: <Banknote size={42} className="relative text-orange-500" strokeWidth={2.8} />,
        title: 'Pedido recibido',
        subtitle: 'Pago contra entrega',
        boxTitle: 'Tu pedido quedó registrado en la app',
        boxText:
          'El negocio revisará disponibilidad. Si todo está correcto, el pedido pasará a confirmado y verás el avance desde el rastreo.',
        finalText:
          'No necesitas salir de la app. Mantente pendiente del rastreo y de tu teléfono por si necesitamos coordinar la entrega.',
        primaryButtonText: 'Ver rastreo en la app',
        whatsappButtonText: 'Escribir por WhatsApp',
        tone: 'orange',
        showWhatsAppHint: false,
      };
    }

    if (paymentMethod === 'deuna') {
      return {
        icon: <QrCode size={42} className="relative text-purple-600" strokeWidth={2.8} />,
        title: 'Pedido registrado',
        subtitle: 'Pago Deuna en validación',
        boxTitle: 'Falta validar el comprobante',
        boxText:
          'Tu pedido ya quedó guardado. Por ahora, envía el comprobante por WhatsApp para que el negocio pueda validar el pago.',
        finalText:
          'En la siguiente fase podrás subir el comprobante dentro de la app y luego automatizaremos la validación.',
        primaryButtonText: 'Ver rastreo en la app',
        whatsappButtonText: 'Enviar comprobante por WhatsApp',
        tone: 'purple',
        showWhatsAppHint: true,
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
          'Tu pedido ya quedó guardado. Por ahora, envía el comprobante por WhatsApp para que el negocio pueda validar la transferencia.',
        finalText:
          'En la siguiente fase podrás subir el comprobante dentro de la app y luego automatizaremos la validación.',
        primaryButtonText: 'Ver rastreo en la app',
        whatsappButtonText: 'Enviar comprobante por WhatsApp',
        tone: 'blue',
        showWhatsAppHint: true,
      };
    }

    if (paymentMethod === 'tarjeta') {
      return {
        icon: <ShieldCheck size={42} className="relative text-green-600" strokeWidth={2.8} />,
        title: 'Pedido registrado',
        subtitle: 'Pago con tarjeta',
        boxTitle: 'Pago pendiente de aprobación',
        boxText:
          'Tu pedido quedó registrado. El negocio podrá confirmarlo cuando el pago sea aprobado.',
        finalText:
          'Cuando el pago sea aprobado, el pedido pasará a confirmado y se activará el tiempo estimado.',
        primaryButtonText: 'Ver rastreo en la app',
        whatsappButtonText: 'Contactar por WhatsApp',
        tone: 'green',
        showWhatsAppHint: true,
      };
    }

    return {
      icon: <Clock3 size={42} className="relative text-orange-500" strokeWidth={2.8} />,
      title: 'Pedido recibido',
      subtitle: 'Pendiente de confirmación',
      boxTitle: 'Tu pedido quedó guardado',
      boxText:
        'El negocio revisará disponibilidad, método de pago y datos de entrega antes de preparar.',
      finalText:
        'Puedes revisar el estado desde la app. Si necesitas ayuda, también puedes escribir por WhatsApp.',
      primaryButtonText: 'Ver rastreo en la app',
      whatsappButtonText: 'Escribir por WhatsApp',
      tone: 'orange',
      showWhatsAppHint: false,
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
        legalBox: 'bg-purple-50 border-purple-100 text-purple-700',
        primary:
          'from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 shadow-purple-500/25',
        secondary: 'bg-green-50 text-green-700 border-green-100',
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
        legalBox: 'bg-blue-50 border-blue-100 text-blue-700',
        primary:
          'from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-blue-500/25',
        secondary: 'bg-green-50 text-green-700 border-green-100',
        dots: 'bg-blue-300',
      };
    }

    if (confirmationCopy.tone === 'green') {
      return {
        iconBg: 'bg-green-50 border-green-200 shadow-green-100',
        ping: 'bg-green-400/10',
        subtitle: 'text-green-600',
        box: 'bg-green-50 border-green-100',
        boxIcon: 'text-green-600',
        boxText: 'text-green-800',
        legalBox: 'bg-green-50 border-green-100 text-green-700',
        primary:
          'from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 shadow-green-500/25',
        secondary: 'bg-green-50 text-green-700 border-green-100',
        dots: 'bg-green-300',
      };
    }

    return {
      iconBg: 'bg-orange-50 border-orange-200 shadow-orange-100',
      ping: 'bg-orange-400/10',
      subtitle: 'text-orange-500',
      box: 'bg-orange-50 border-orange-100',
      boxIcon: 'text-orange-500',
      boxText: 'text-orange-700',
      legalBox: 'bg-orange-50 border-orange-100 text-orange-700',
      primary:
        'from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 shadow-orange-500/25',
      secondary: 'bg-green-50 text-green-700 border-green-100',
      dots: 'bg-orange-300',
    };
  }, [confirmationCopy.tone]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center px-4 transition-opacity duration-300 ${
        exiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />

      <div
        className={`relative bg-white rounded-[40px] shadow-2xl px-7 py-8 max-w-sm w-full text-center border border-white/60 overflow-hidden transition-all duration-500 ${
          animateCheck && !exiting
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-90 translate-y-6'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        <button
          type="button"
          onClick={closeInsideApp}
          className="absolute top-5 right-5 z-20 w-9 h-9 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Cerrar confirmación"
        >
          <X size={17} />
        </button>

        <div className="absolute -top-24 -right-24 w-52 h-52 rounded-full bg-orange-400/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-52 h-52 rounded-full bg-yellow-300/20 blur-3xl" />

        <div className="relative flex justify-center mb-6">
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

            <div className="absolute -bottom-2 -right-2 bg-green-500 text-white w-9 h-9 rounded-2xl border-4 border-white flex items-center justify-center shadow-lg">
              <CheckCircle2 size={18} strokeWidth={3} />
            </div>
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
          className={`relative border rounded-[28px] p-4 mb-4 text-left transition-all duration-500 ${toneClasses.box} ${
            animateCheck ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '460ms' }}
        >
          <div className="flex gap-3">
            <div className={`w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm flex-shrink-0 ${toneClasses.boxIcon}`}>
              <PackageSearch size={21} />
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

        {confirmationCopy.showWhatsAppHint && (
          <div
            className={`relative border rounded-[24px] p-3 mb-4 text-left transition-all duration-500 ${toneClasses.legalBox} ${
              animateCheck ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '500ms' }}
          >
            <div className="flex gap-2.5 items-start">
              <MessageCircle size={16} className="mt-0.5 flex-shrink-0" />
              <p className="text-[9px] font-black uppercase leading-relaxed">
                Por ahora el comprobante se sigue enviando por WhatsApp. Luego agregaremos subida de comprobante y validación automática.
              </p>
            </div>
          </div>
        )}

        <div
          className={`relative border rounded-[24px] p-3 mb-5 text-left transition-all duration-500 bg-slate-50 border-slate-100 text-slate-500 ${
            animateCheck ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '540ms' }}
        >
          <div className="flex gap-2.5 items-start">
            <ShieldCheck size={16} className="mt-0.5 flex-shrink-0" />
            <p className="text-[9px] font-black uppercase leading-relaxed">
              Al registrar tu pedido aceptas términos, privacidad, reglas de entrega,
              confirmación de disponibilidad, pagos y uso de tus datos para coordinar el pedido.
            </p>
          </div>
        </div>

        <p
          className={`relative text-gray-400 text-sm leading-relaxed mb-6 transition-all duration-500 ${
            animateCheck ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '580ms' }}
        >
          {confirmationCopy.finalText}
        </p>

        <div
          className={`relative space-y-3 transition-all duration-500 ${
            animateCheck ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '640ms' }}
        >
          <button
            type="button"
            onClick={closeInsideApp}
            className={`w-full flex items-center justify-center gap-2.5 bg-gradient-to-r text-white font-black py-4 rounded-2xl transition-all duration-300 hover:scale-[1.02] shadow-lg text-sm uppercase tracking-wide active:scale-95 ${toneClasses.primary}`}
          >
            <PackageSearch size={19} />
            {confirmationCopy.primaryButtonText}
          </button>

          <button
            type="button"
            onClick={goWhatsApp}
            className={`w-full flex items-center justify-center gap-2.5 border font-black py-3.5 rounded-2xl transition-all duration-300 text-xs uppercase tracking-wide active:scale-95 ${toneClasses.secondary}`}
          >
            <MessageCircle size={17} />
            {confirmationCopy.whatsappButtonText}
          </button>
        </div>

        <div
          className={`relative mt-5 flex justify-center transition-all duration-500 ${
            animateCheck ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ transitionDelay: '700ms' }}
        >
          <div className="flex gap-1.5 items-center bg-gray-50 border border-gray-100 rounded-full px-4 py-2">
            <Sparkles size={12} className="text-orange-400" />
            <span className="text-gray-400 text-[11px] font-bold">
              Pedido guardado en la app
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
