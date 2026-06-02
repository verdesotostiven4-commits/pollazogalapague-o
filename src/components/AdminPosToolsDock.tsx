import { useEffect, useState } from 'react';
import {
  Archive,
  BarChart3,
  Calculator,
  ChevronUp,
  PackageSearch,
  RotateCcw,
  X,
} from 'lucide-react';
import type { AdminPosToolKey } from '../utils/adminPosToolsEvents';

type ToolOption = {
  key: AdminPosToolKey;
  label: string;
  helper: string;
  icon: typeof Calculator;
  tone: string;
};

const isAdminPath = () => {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.toLowerCase() === '/admin';
};

const normalizeText = (value: string | null | undefined) =>
  String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();

const toolButtonLabel: Record<AdminPosToolKey, string> = {
  pos: 'pos',
  inventory: 'inventario',
  reports: 'reportes pos',
  corrections: 'correcciones pos',
};

const tools: ToolOption[] = [
  {
    key: 'pos',
    label: 'Vender / POS',
    helper: 'Ventas rápidas de mostrador',
    icon: Calculator,
    tone: 'bg-slate-950 text-white border-slate-900',
  },
  {
    key: 'inventory',
    label: 'Inventario',
    helper: 'Stock, costos y mínimos',
    icon: Archive,
    tone: 'bg-white text-slate-950 border-orange-100',
  },
  {
    key: 'reports',
    label: 'Reportes POS',
    helper: 'Ventas, caja y productos',
    icon: BarChart3,
    tone: 'bg-orange-500 text-white border-orange-500',
  },
  {
    key: 'corrections',
    label: 'Correcciones POS',
    helper: 'Corregir ventas de caja abierta',
    icon: RotateCcw,
    tone: 'bg-red-500 text-white border-red-500',
  },
];

export default function AdminPosToolsDock() {
  const [visibleInAdmin, setVisibleInAdmin] = useState(() => isAdminPath());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const refresh = () => setVisibleInAdmin(isAdminPath());
    refresh();

    window.addEventListener('popstate', refresh);
    window.addEventListener('hashchange', refresh);
    const interval = window.setInterval(refresh, 900);

    return () => {
      window.removeEventListener('popstate', refresh);
      window.removeEventListener('hashchange', refresh);
      window.clearInterval(interval);
    };
  }, []);

  const openTool = (tool: ToolOption) => {
    const expectedLabel = toolButtonLabel[tool.key];
    const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
    const target = buttons.find(button => normalizeText(button.textContent) === expectedLabel);

    if (!target) {
      window.alert(`No encontré la herramienta ${tool.label}. Refresca la página e intenta otra vez.`);
      return;
    }

    setOpen(false);
    target.click();
  };

  if (!visibleInAdmin) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9998] flex flex-col items-end gap-3">
      {open && (
        <div className="w-[min(92vw,360px)] rounded-[30px] bg-white/95 backdrop-blur-xl border border-white shadow-2xl shadow-orange-200/70 p-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center justify-between gap-3 px-2 py-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-500">Admin rápido</p>
              <h3 className="text-lg font-black uppercase italic text-slate-950 leading-none">Herramientas POS</h3>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-10 w-10 rounded-2xl bg-slate-950 text-white flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Cerrar herramientas POS"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2">
            {tools.map(tool => {
              const Icon = tool.icon;

              return (
                <button
                  key={tool.key}
                  type="button"
                  onClick={() => openTool(tool)}
                  className={`rounded-[22px] border p-4 text-left shadow-sm active:scale-[0.98] transition-transform ${tool.tone}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-white/18 border border-white/20 flex items-center justify-center flex-shrink-0">
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-wide truncate">{tool.label}</p>
                      <p className="mt-1 text-[10px] font-bold opacity-70 truncate">{tool.helper}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        className="rounded-[26px] bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 px-5 py-4 text-xs font-black uppercase tracking-widest text-white shadow-2xl shadow-orange-300/70 ring-4 ring-orange-200 active:scale-95 transition-transform flex items-center gap-3"
      >
        <PackageSearch size={19} className="text-orange-300" />
        Herramientas POS
        <ChevronUp size={17} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );
}
