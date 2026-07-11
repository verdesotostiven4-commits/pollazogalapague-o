import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  AlertTriangle,
  Bike,
  Delete,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

type PanelType = 'admin' | 'delivery';
type GateStatus = 'checking' | 'locked' | 'authorized';

type PanelConfig = {
  panel: PanelType;
  eyebrow: string;
  title: string;
  subtitle: string;
  Icon: typeof ShieldCheck;
};

type VerifyPanelResponse = {
  ok?: boolean;
  error?: string;
  missingEnv?: boolean;
  sessionError?: boolean;
  retryAfterSeconds?: number;
  remainingAttempts?: number;
};

const AUTO_SUBMIT_LENGTH = 4;
const MAX_PIN_LENGTH = 12;

const PANEL_CONFIG: Record<PanelType, PanelConfig> = {
  admin: {
    panel: 'admin',
    eyebrow: 'Control del negocio',
    title: 'Administrador',
    subtitle: 'Pedidos, productos, clientes y configuración',
    Icon: ShieldCheck,
  },
  delivery: {
    panel: 'delivery',
    eyebrow: 'Ruta de entregas',
    title: 'Repartidor',
    subtitle: 'Pedidos asignados, cobros y entregas',
    Icon: Bike,
  },
};

const detectPanel = (): PanelType | null => {
  const pathname = window.location.pathname.toLowerCase();
  if (pathname === '/admin') return 'admin';
  if (pathname === '/repartidor') return 'delivery';
  return null;
};

const cleanPin = (value: string) =>
  value.replace(/\D/g, '').slice(0, MAX_PIN_LENGTH);

export default function SecurePanelGate({ children }: { children: ReactNode }) {
  const panel = useMemo(() => detectPanel(), []);
  const config = panel ? PANEL_CONFIG[panel] : null;

  const [pin, setPin] = useState('');
  const [status, setStatus] = useState<GateStatus>(config ? 'checking' : 'authorized');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const lastSubmittedRef = useRef('');

  const checkSession = useCallback(async () => {
    if (!config) return;

    setStatus('checking');
    setError('');

    try {
      const response = await fetch(
        `/api/verify-panel-session?panel=${encodeURIComponent(config.panel)}`,
        {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
        }
      );

      setStatus(response.ok ? 'authorized' : 'locked');
    } catch {
      setStatus('locked');
    }
  }, [config]);

  useEffect(() => {
    if (!config) return;

    sessionStorage.removeItem('pollazo_admin_auth');
    sessionStorage.removeItem('pollazo_delivery_auth');
    void checkSession();
  }, [checkSession, config]);

  const submitPin = useCallback(
    async (nextPin: string) => {
      if (!config || loading) return;

      const safePin = cleanPin(nextPin);
      if (safePin.length < AUTO_SUBMIT_LENGTH) return;

      setLoading(true);
      setError('');
      lastSubmittedRef.current = safePin;

      try {
        const response = await fetch('/api/verify-panel-pin', {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            panel: config.panel,
            pin: safePin,
          }),
        });

        const result = (await response.json().catch(() => ({}))) as VerifyPanelResponse;

        if (response.ok && result.ok) {
          setPin('');
          setStatus('authorized');
          return;
        }

        if (response.status === 429) {
          setError(
            result.retryAfterSeconds
              ? `Espera ${result.retryAfterSeconds} segundos antes de volver a intentar.`
              : 'Demasiados intentos. Espera un momento.'
          );
        } else if (result.remainingAttempts !== undefined) {
          setError(`PIN incorrecto. Quedan ${result.remainingAttempts} intentos.`);
        } else if (result.missingEnv) {
          setError('Falta configurar el acceso de este panel en Vercel.');
        } else if (result.sessionError) {
          setError('No se pudo crear la sesión segura. Intenta otra vez.');
        } else if (response.status >= 500) {
          setError('El servidor del panel no respondió correctamente.');
        } else {
          setError('PIN incorrecto o acceso no autorizado.');
        }
      } catch {
        setError('No se pudo conectar con el servidor del panel.');
      } finally {
        setPin('');
        lastSubmittedRef.current = '';
        setLoading(false);
      }
    },
    [config, loading]
  );

  useEffect(() => {
    if (
      status !== 'locked' ||
      loading ||
      pin.length !== AUTO_SUBMIT_LENGTH ||
      lastSubmittedRef.current === pin
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      void submitPin(pin);
    }, 140);

    return () => window.clearTimeout(timer);
  }, [loading, pin, status, submitPin]);

  useEffect(() => {
    if (!config || status !== 'locked') return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (loading) return;

      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        setError('');
        setPin(current => cleanPin(`${current}${event.key}`));
      } else if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        setError('');
        setPin(current => current.slice(0, -1));
      } else if (event.key === 'Enter' && pin.length >= AUTO_SUBMIT_LENGTH) {
        event.preventDefault();
        void submitPin(pin);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [config, loading, pin, status, submitPin]);

  if (!config || status === 'authorized') {
    return <>{children}</>;
  }

  if (status === 'checking') {
    return (
      <div className="min-h-[100dvh] bg-[#070b18] text-white flex items-center justify-center px-5">
        <div className="text-center">
          <Loader2 size={38} className="mx-auto text-orange-400 animate-spin" />
          <p className="mt-4 text-[11px] font-black uppercase tracking-[0.24em] text-white/55">
            Abriendo panel seguro
          </p>
        </div>
      </div>
    );
  }

  const Icon = config.Icon;

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
    <div className="min-h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_top,#422006_0%,#111827_38%,#030712_78%)] text-white flex items-center justify-center px-4 py-[max(14px,env(safe-area-inset-top))]">
      <main className="w-full max-w-[370px] rounded-[32px] border border-white/10 bg-slate-950/88 p-4 shadow-[0_28px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <header className="flex items-center gap-3 rounded-[24px] border border-orange-400/15 bg-white/[0.045] p-3.5 text-left">
          <div className="grid h-14 w-14 flex-none place-items-center rounded-[20px] bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg shadow-orange-950/35">
            <Icon size={29} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-orange-300">
              {config.eyebrow}
            </p>
            <h1 className="mt-1 text-[24px] font-black uppercase italic leading-none tracking-[-0.04em]">
              {config.title}
            </h1>
            <p className="mt-1.5 text-[10px] font-bold leading-snug text-white/45">
              {config.subtitle}
            </p>
          </div>
        </header>

        <section className="mt-3 rounded-[26px] border border-white/10 bg-white/[0.035] p-3.5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-left">
              <LockKeyhole size={16} className="text-orange-300" />
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em]">
                  Escribe tu PIN
                </p>
                <p className="text-[9px] font-bold text-white/40">
                  Se abre automáticamente con 4 dígitos
                </p>
              </div>
            </div>

            <div className="flex gap-1.5" aria-label={`${pin.length} dígitos escritos`}>
              {Array.from({ length: AUTO_SUBMIT_LENGTH }).map((_, index) => (
                <span
                  key={index}
                  className={`h-3 w-3 rounded-full transition-all ${
                    index < pin.length
                      ? 'scale-110 bg-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.8)]'
                      : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
              <button
                key={digit}
                type="button"
                disabled={loading}
                onClick={() => addDigit(digit)}
                className="h-12 rounded-[17px] border border-white/10 bg-white/[0.055] text-lg font-black transition active:scale-95 active:bg-orange-500 disabled:opacity-40"
              >
                {digit}
              </button>
            ))}

            <button
              type="button"
              disabled={loading}
              onClick={() => setPin('')}
              className="h-12 rounded-[17px] border border-white/10 bg-white/[0.035] text-[9px] font-black uppercase tracking-wider text-white/45 transition active:scale-95 disabled:opacity-40"
            >
              Limpiar
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => addDigit('0')}
              className="h-12 rounded-[17px] border border-white/10 bg-white/[0.055] text-lg font-black transition active:scale-95 active:bg-orange-500 disabled:opacity-40"
            >
              0
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={removeDigit}
              aria-label="Borrar último dígito"
              className="grid h-12 place-items-center rounded-[17px] border border-white/10 bg-white/[0.035] text-white/55 transition active:scale-95 disabled:opacity-40"
            >
              <Delete size={19} />
            </button>
          </div>

          <div className="mt-3 flex h-10 items-center justify-center rounded-[16px] bg-orange-500/10 text-[10px] font-black uppercase tracking-[0.16em] text-orange-200">
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 size={15} className="animate-spin" /> Validando acceso
              </span>
            ) : (
              'Sin botón: acceso automático'
            )}
          </div>
        </section>

        {error && (
          <div className="mt-3 rounded-[20px] border border-red-400/25 bg-red-500/10 px-3.5 py-3 text-left text-red-100">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={17} className="mt-0.5 flex-none" />
              <p className="text-[10px] font-bold leading-relaxed">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => void checkSession()}
              className="mt-2.5 flex h-9 w-full items-center justify-center gap-2 rounded-[14px] bg-white/10 text-[9px] font-black uppercase tracking-wider"
            >
              <RefreshCw size={13} /> Reintentar conexión
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
