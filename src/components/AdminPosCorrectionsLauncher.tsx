import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw, RotateCcw, X } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

type SaleRow = {
  id: string;
  sale_code: string;
  total: number | string;
  payment_summary?: string | null;
  is_void?: boolean | null;
  void_reason?: string | null;
  created_at?: string | null;
  cash_register_status?: string | null;
};

type PosReport = {
  sales?: SaleRow[];
};

const parseNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number.parseFloat(String(value || '').replace(',', '.').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value: unknown) => parseNumber(value).toFixed(2);

const isAdminPath = () => {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.toLowerCase() === '/admin';
};

const dateToInput = (date: Date) => date.toISOString().slice(0, 10);

export default function AdminPosCorrectionsLauncher() {
  const [visibleInAdmin, setVisibleInAdmin] = useState(() => isAdminPath());
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => dateToInput(new Date()));
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const loadSales = async () => {
    if (!isSupabaseConfigured) {
      setError('Supabase no está configurado.');
      return;
    }

    setLoading(true);
    setError(null);

    const start = new Date(`${date}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const { data, error: reportError } = await supabase.rpc('get_pos_report_v1', {
      p_start_date: start.toISOString(),
      p_end_date: end.toISOString(),
    });

    if (reportError) {
      console.error(reportError);
      setError(reportError.message || 'No pude cargar ventas POS.');
      setSales([]);
    } else {
      const report = (data || {}) as PosReport;
      setSales(report.sales || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (open) loadSales();
  }, [open, date]);

  const correctSale = async (sale: SaleRow) => {
    if (sale.is_void) return;

    if (sale.cash_register_status !== 'open') {
      window.alert('Esta venta pertenece a una caja cerrada. Por seguridad no se puede corregir desde aquí.');
      return;
    }

    const reason = window.prompt(`Motivo de corrección para ${sale.sale_code}:`, 'Error de cajero / venta de prueba');
    if (!reason || !reason.trim()) return;

    const confirmed = window.confirm(
      `Corregir ${sale.sale_code}\n\nTotal: $${money(sale.total)}\nMotivo: ${reason}\n\nSe marcará como corregida, se devolverá stock y se descontará el efectivo esperado de la caja abierta. ¿Confirmas?`
    );

    if (!confirmed) return;

    setCorrectingId(sale.id);
    setError(null);
    setMessage(null);

    const { error: correctionError } = await supabase.rpc('void_pos_sale_v1', {
      p_pos_sale_id: sale.id,
      p_reason: reason.trim(),
      p_voided_by: 'admin',
    });

    if (correctionError) {
      console.error(correctionError);
      setError(correctionError.message || 'No pude corregir la venta.');
    } else {
      setMessage(`Venta ${sale.sale_code} corregida correctamente.`);
      await loadSales();
    }

    setCorrectingId(null);
  };

  if (!visibleInAdmin) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-56 z-[9995] flex items-center gap-2 rounded-[24px] bg-white px-5 py-4 text-xs font-black uppercase tracking-widest text-red-600 shadow-2xl shadow-red-100/70 ring-4 ring-white border border-red-100 active:scale-95 transition-transform"
        >
          <RotateCcw size={18} />
          Correcciones POS
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/72 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto">
          <div className="mx-auto max-w-4xl rounded-[34px] bg-gray-50 shadow-2xl overflow-hidden border border-white/40">
            <header className="bg-gradient-to-r from-slate-950 via-slate-900 to-red-950 text-white p-4 sm:p-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-12 w-12 rounded-2xl bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30">
                  <RotateCcw size={24} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200">Control de errores</p>
                  <h2 className="text-xl sm:text-2xl font-black uppercase italic leading-none truncate">Correcciones POS</h2>
                </div>
              </div>

              <button type="button" onClick={() => setOpen(false)} className="h-11 w-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center active:scale-90 transition-transform" aria-label="Cerrar correcciones POS">
                <X size={20} />
              </button>
            </header>

            <main className="p-4 sm:p-5 space-y-4">
              <section className="rounded-[28px] bg-white border border-gray-100 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-gray-900">Ventas del día</p>
                  <p className="text-[10px] font-bold text-gray-400 mt-1">Solo se pueden corregir ventas de cajas abiertas.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input value={date} onChange={event => setDate(event.target.value)} type="date" className="rounded-2xl border border-gray-100 bg-gray-50 py-3 px-4 text-sm font-black outline-none focus:border-red-300" />
                  <button type="button" onClick={loadSales} disabled={loading} className="rounded-2xl bg-slate-950 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-60 flex items-center justify-center gap-2">
                    {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                    Actualizar
                  </button>
                </div>
              </section>

              {error && <div className="rounded-3xl border border-red-100 bg-red-50 p-4 text-xs font-black uppercase tracking-wide text-red-600">{error}</div>}
              {message && <div className="rounded-3xl border border-green-100 bg-green-50 p-4 text-xs font-black uppercase tracking-wide text-green-700">{message}</div>}

              <section className="rounded-[32px] bg-white border border-gray-100 shadow-sm p-4">
                <div className="rounded-2xl bg-yellow-50 border border-yellow-100 p-3 text-yellow-800 flex items-start gap-2 mb-3">
                  <AlertTriangle size={18} className="flex-shrink-0" />
                  <p className="text-[10px] font-bold">Usa esto solo cuando el cajero se equivocó. La corrección queda registrada y aparece en reportes/historial.</p>
                </div>

                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {loading ? (
                    <div className="rounded-2xl bg-gray-50 p-5 text-center text-[10px] font-black uppercase text-red-500 animate-pulse">Cargando ventas...</div>
                  ) : sales.length === 0 ? (
                    <div className="rounded-2xl bg-gray-50 border border-dashed border-gray-200 p-5 text-center text-[10px] font-black uppercase text-gray-400">Sin ventas POS en este día.</div>
                  ) : (
                    sales.map(sale => (
                      <div key={sale.id} className={`rounded-2xl border p-3 ${sale.is_void ? 'bg-red-50 border-red-100 opacity-80' : 'bg-gray-50 border-gray-100'}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`text-xs font-black uppercase ${sale.is_void ? 'text-red-600 line-through' : 'text-gray-900'}`}>{sale.sale_code}</p>
                              {sale.is_void && <span className="rounded-full bg-red-100 border border-red-200 px-2 py-1 text-[8px] font-black uppercase text-red-600">Corregida</span>}
                              {!sale.is_void && sale.cash_register_status !== 'open' && <span className="rounded-full bg-gray-100 border border-gray-200 px-2 py-1 text-[8px] font-black uppercase text-gray-500">Caja cerrada</span>}
                            </div>
                            <p className="text-[10px] font-bold text-gray-400">{sale.created_at ? new Date(sale.created_at).toLocaleString('es-EC') : 'Sin fecha'} · {sale.payment_summary || 'Sin resumen'}</p>
                            {sale.is_void && <p className="mt-1 text-[9px] font-bold text-red-500">Motivo: {sale.void_reason || 'Sin motivo'}</p>}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`text-lg font-black ${sale.is_void ? 'text-red-400 line-through' : 'text-gray-950'}`}>${money(sale.total)}</p>
                            {!sale.is_void && sale.cash_register_status === 'open' && (
                              <button type="button" onClick={() => correctSale(sale)} disabled={correctingId === sale.id} className="mt-2 rounded-xl bg-red-500 px-3 py-2 text-[9px] font-black uppercase text-white disabled:opacity-60 inline-flex items-center gap-1">
                                {correctingId === sale.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                                Corregir
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </main>
          </div>
        </div>
      )}
    </>
  );
}
