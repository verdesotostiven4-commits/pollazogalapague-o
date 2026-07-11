import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';

type PanelType = 'admin' | 'delivery';
type GateStatus = 'checking' | 'authorized' | 'error';

type OpenPanelResponse = {
  ok?: boolean;
  error?: string;
};

const detectPanel = (): PanelType | null => {
  const pathname = window.location.pathname.toLowerCase();

  if (pathname === '/admin') return 'admin';
  if (pathname === '/repartidor') return 'delivery';

  return null;
};

export default function SecurePanelGate({ children }: { children: ReactNode }) {
  const panel = useMemo(() => detectPanel(), []);
  const [status, setStatus] = useState<GateStatus>(panel ? 'checking' : 'authorized');
  const [error, setError] = useState('');

  const openPanel = useCallback(async () => {
    if (!panel) {
      setStatus('authorized');
      return;
    }

    setStatus('checking');
    setError('');

    try {
      const sessionResponse = await fetch(
        `/api/verify-panel-session?panel=${encodeURIComponent(panel)}`,
        {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
        }
      );

      if (sessionResponse.ok) {
        setStatus('authorized');
        return;
      }

      const openResponse = await fetch('/api/verify-panel-pin', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ panel }),
      });

      const result = (await openResponse.json().catch(() => ({}))) as OpenPanelResponse;

      if (openResponse.ok && result.ok) {
        setStatus('authorized');
        return;
      }

      setError(result.error || 'No se pudo abrir el panel automáticamente.');
      setStatus('error');
    } catch {
      setError('No se pudo conectar con el servidor del panel.');
      setStatus('error');
    }
  }, [panel]);

  useEffect(() => {
    sessionStorage.removeItem('pollazo_admin_auth');
    sessionStorage.removeItem('pollazo_delivery_auth');
    void openPanel();
  }, [openPanel]);

  if (!panel || status === 'authorized') {
    return <>{children}</>;
  }

  if (status === 'checking') {
    return (
      <div className="min-h-[100dvh] bg-[#070b18] text-white flex items-center justify-center px-5">
        <div className="text-center">
          <Loader2 size={38} className="mx-auto animate-spin text-orange-400" />
          <p className="mt-4 text-[11px] font-black uppercase tracking-[0.24em] text-white/55">
            Abriendo panel
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#070b18] text-white flex items-center justify-center p-5">
      <div className="w-full max-w-sm rounded-[28px] border border-red-400/25 bg-red-500/10 p-5 text-center">
        <AlertTriangle size={32} className="mx-auto text-red-200" />
        <h1 className="mt-3 text-lg font-black uppercase">No se pudo abrir el panel</h1>
        <p className="mt-2 text-sm font-semibold text-white/65">{error}</p>
        <button
          type="button"
          onClick={() => void openPanel()}
          className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 text-xs font-black uppercase tracking-wider text-white active:scale-95"
        >
          <RefreshCw size={16} /> Reintentar
        </button>
      </div>
    </div>
  );
}
