import { useMemo, useState, type ReactNode } from 'react';
import { Bike, Lock, ShieldCheck, AlertTriangle, Loader2, Delete } from 'lucide-react';

type PanelType = 'admin' | 'delivery';

type PanelConfig = {
  panel: PanelType;
  title: string;
  subtitle: string;
  sessionKey: string;
  fallbackPin: string;
  Icon: typeof ShieldCheck;
  accentClass: string;
  glowClass: string;
};

type VerifyPanelPinResponse = {
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
    sessionKey: 'pollazo_admin_auth',
    fallbackPin: '1328',
    Icon: ShieldCheck,
    accentClass: 'bg-orange-500 text-white shadow-orange-500/25',
    glowClass: 'shadow-orange-500/25',
  },
  delivery: {
    panel: 'delivery',
    title: 'Repartidor',
    subtitle: 'Acceso seguro para entregas',
    sessionKey: 'pollazo_delivery_auth',
    fallbackPin: '2580',
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

const canUseFallback = (
  config: PanelConfig,
  pin: string,
  response?: VerifyPanelPinResponse | null,
  requestFailed = false
) => {
  if (pin !== config.fallbackPin) return false;

  return requestFailed || response?.missingEnv === true;
};

export default function SecurePanelGate({ children }: { children: ReactNode }) {
  const panel = useMemo(() => detectPanel(), []);
  const config = panel ? PANEL_CONFIG[panel] : null;

  const [pin, setPin] = useState('');
  const [authorized, setAuthorized] = useState(() => {
    if (!config) return true;

    return sessionStorage.getItem(config.sessionKey) === '1';
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fallbackMode, setFallbackMode] = useState(false);

  if (!config || authorized) {
    return <>{children}</>;
  }

  const Icon = config.Icon;

  const grantAccess = (usedFallback = false) => {
    sessionStorage.setItem(config.sessionKey, '1');
    setFallbackMode(usedFallback);
    setAuthorized(true);
  };

  const submitPin = async (nextPin = pin) => {
    const safePin = cleanPin(nextPin);

    if (!safePin || loading) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/verify-panel-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          panel: config.panel,
          pin: safePin,
        }),
      });

      const result = (await response.json().catch(() => ({}))) as VerifyPanelPinResponse;

      if (response.ok && result.ok) {
        grantAccess(false);
        return;
      }

      if (canUseFallback(config, safePin, result, false)) {
        grantAccess(true);
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
      } else {
        setError('PIN incorrecto o no autorizado.');
      }

      setPin('');
    } catch {
      if (canUseFallback(config, safePin, null, true)) {
        grantAccess(true);
        return;
      }

      setError('No se pudo validar el acceso. Revisa conexión o variables de Vercel.');
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
            {Array.from({ length: Math.max(4, pin.length || 4) }).slice(0, 8).map((_, index) => (
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
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((digit, index) =>
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
            className="mt-4 w-full h-13 rounded-2xl bg-orange-500 text-white font-black uppercase tracking-[0.18em] text-[11px] shadow-xl shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={17} className="animate-spin" /> : <Lock size={16} />}
            {loading ? 'Validando' : 'Entrar seguro'}
          </button>
        </div>

        {error && (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/25 text-red-200 px-4 py-3 flex items-start gap-3 text-left">
            <AlertTriangle size={17} className="mt-0.5 flex-shrink-0" />
            <p className="text-[11px] font-bold leading-relaxed">
              {error}
            </p>
          </div>
        )}

        {fallbackMode && (
          <p className="text-[10px] font-bold text-yellow-200/80 leading-relaxed">
            Acceso temporal por respaldo local. Configura las variables de Vercel para seguridad completa.
          </p>
        )}

        <p className="text-[10px] font-bold text-white/35 leading-relaxed">
          El PIN se valida primero en servidor. El respaldo local evita quedarte fuera si Vercel aún no tiene variables configuradas.
        </p>
      </div>
    </div>
  );
}
