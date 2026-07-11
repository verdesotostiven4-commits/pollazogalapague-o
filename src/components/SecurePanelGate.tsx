import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Bike,
  Delete,
  Loader2,
  Lock,
  ShieldCheck,
} from 'lucide-react';

type PanelType = 'admin' | 'delivery';
type GateStatus = 'checking' | 'locked' | 'authorized';

type PanelConfig = {
  panel: PanelType;
  title: string;
  subtitle: string;
  Icon: typeof ShieldCheck;
  accentClass: string;
  glowClass: string;
};

type VerifyPanelResponse = {
  ok?: boolean;
  error?: string;
  missingEnv?: boolean;
  retryAfterSeconds?: number;
  remainingAttempts?: number;
};

const PANEL_CONFIG: Record<PanelType, PanelConfig> = {
  admin: {
    panel: 'admin',
    title: 'Admin VIP',
    subtitle: 'Panel seguro La Casa del Pollazo',
    Icon: ShieldCheck,
    accentClass: 'bg-orange-500 text-white shadow-orange-500/25',
    glowClass: 'shadow-orange-500/25',
  },
  delivery: {
    panel: 'delivery',
    title: 'Repartidor',
    subtitle: 'Acceso seguro para entregas',
    Icon: Bike,
    accentClass: 'bg-orange-500 text-white shadow-orange-500/25',
    glowClass: 'shadow-orange-500/25',
  },
};

const detectPanel = (): PanelType | null => {
  if (window.location.pathname === '/admin') return 'admin';
  if (window.location.pathname === '/repartidor') return 'delivery';

  return null;
};

const cleanPin = (value: string) => value.replace(/\D/g, '').slice(0, 12);

export default function SecurePanelGate({ children }: { children: ReactNode }) {
  const panel = useMemo(() => detectPanel(), []);
  const config = panel ? PANEL_CONFIG[panel] : null;

  const [pin, setPin] = useState('');
  const [status, setStatus] = useState<GateStatus>(config ? 'checking' : 'authorized');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!config) return;

    let active = true;

    sessionStorage.removeItem('pollazo_admin_auth');
    sessionStorage.removeItem('pollazo_delivery_auth');

    const validateSession = async () => {
      try {
        const response = await fetch(
          `/api/verify-panel-session?panel=${encodeURIComponent(config.panel)}`,
          {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
          }
        );

        if (!active) return;

        setStatus(response.ok ? 'authorized' : 'locked');
      } catch {
        if (active) setStatus('locked');
      }
    };

    void validateSession();

    return () => {
      active = false;
    };
  }, [config]);

  if (!config || status === 'authorized') {
    return <>{children}</>;
  }

  const Icon = config.Icon;

  const submitPin = async (nextPin = pin) => {
    const safePin = cleanPin(nextPin);

    if (!safePin || loading) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/verify-panel-pin', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          panel: config.panel,
          pin: safePin,
        }),
      });

      const result = (await response.json().catch(() => ({}))) as VerifyPanelResponse;

      if (response.ok && result.ok) {
        setStatus('authorized');
        setPin('');
        return;
      }

      if (response.status === 429) {
        setError(
          result.retryAfterSeconds
            ? `Demasiados intentos. Espera ${result.retryAfterSeconds} segundos.`
            : 'Demasiados intentos. Espera un momento.'
        );
      } else if (result.remainingAttempts !== undefined) {
        setError(`PIN incorrecto. Intentos restantes: ${result.remainingAttempts}.`);
      } else if (result.missingEnv) {
        setError('El acceso seguro todavía no está configurado en el servidor.');
      } else if (response.status >= 500) {
        setError('El servidor de acceso no está disponible. Inténtalo nuevamente.');
      } else {
        setError('PIN incorrecto o no autorizado.');
      }

      setPin('');
    } catch {
      setError('No se pudo validar el acceso. Revisa tu conexión e inténtalo otra vez.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const addDigit = (digit: string) => {
    if (loading) return;

    setError('');
    setPin(current => cleanPin(`${current}${digit}`));
  };

  const removeDigit = () => {
    if (loading) return;

    setError('');
    setPin(current => current.slice(0, -1));
  };

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <Loader2 size={38} className="mx-auto text-orange-500 animate-spin" />
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">
            Verificando sesión segura
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center space-y-7 animate-in fade-in zoom-in-95 duration-300">
        <div className={`w-24 h-24 rounded-[32px] mx-auto flex items-center justify-center shadow-2xl ${config.accentClass} ${config.glowClass}`}>
          <Icon size={44} />
        </div>

        <div>
          <p className="text-[10px] font-black text-orange-300 uppercase tracking-[0.32em] mb-3">
            Acceso protegido
          </p>
          <h1 className="font-black text-3xl uppercase italic tracking-tight leading-none">
            {config.title}
          </h1>
          <p className="text-white/45 text-[10px] font-black uppercase tracking-[0.22em] mt-3">
            {config.subtitle}
          </p>
        </div>

        <div className="rounded-[28px] bg-white/5 border border-white/10 p-5 shadow-2xl shadow-black/20">
          <div className="flex justify-center gap-3 mb-5">
            {Array.from({ length: Math.max(4, pin.length || 4) })
              .slice(0, 8)
              .map((_, index) => (
                <div
                  key={index}
                  className={`w-3.5 h-3.5 rounded-full transition-all ${
                    index < pin.length
                      ? 'bg-orange-500 scale-125 shadow-[0_0_12px_#f97316]'
                      : 'bg-white/10'
                  }`}
                />
              ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map(
              (digit, index) =>
                digit ? (
                  <button
                    key={index}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      if (digit === '⌫') {
                        removeDigit();
                        return;
                      }

                      addDigit(digit);
                    }}
                    className="aspect-square rounded-2xl bg-white/5 border border-white/10 text-xl font-black active:scale-90 transition-all hover:bg-white/10 disabled:opacity-40"
                  >
                    {digit === '⌫' ? <Delete size={20} className="mx-auto" /> : digit}
                  </button>
                ) : (
                  <div key={index} />
                )
            )}
          </div>

          <button
            type="button"
            disabled={loading || pin.length < 4}
            onClick={() => void submitPin()}
            className="mt-4 w-full h-12 rounded-2xl bg-orange-500 text-white font-black uppercase tracking-[0.18em] text-[11px] shadow-xl shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={17} className="animate-spin" /> : <Lock size={16} />}
            {loading ? 'Validando' : 'Entrar seguro'}
          </button>
        </div>

        {error && (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/25 text-red-200 px-4 py-3 flex items-start gap-3 text-left">
            <AlertTriangle size={17} className="mt-0.5 flex-shrink-0" />
            <p className="text-[11px] font-bold leading-relaxed">{error}</p>
          </div>
        )}

        <p className="text-[10px] font-bold text-white/35 leading-relaxed">
          El PIN se valida únicamente en el servidor. La sesión queda protegida en una cookie segura que JavaScript no puede leer.
        </p>
      </div>
    </div>
  );
}
