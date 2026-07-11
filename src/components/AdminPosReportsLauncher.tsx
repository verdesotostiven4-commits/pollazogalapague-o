import { useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  BarChart3,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Loader2,
  Package,
  ReceiptText,
  RefreshCw,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { runAdminOperation } from '../utils/adminOperations';

type PaymentRow = {
  method: string;
  count: number;
  amount: number | string;
};

type TopProductRow = {
  product_id: string;
  product_name: string;
  quantity: number | string;
  total: number | string;
};

type SaleRow = {
  id: string;
  sale_code: string;
  total: number | string;
  payment_summary?: string | null;
  customer_name?: string | null;
  created_at?: string | null;
};

type RegisterRow = {
  id: string;
  opened_by?: string | null;
  opened_at?: string | null;
  closed_at?: string | null;
  opening_balance: number | string;
  expected_cash_sales: number | string;
  manual_income: number | string;
  manual_expense: number | string;
  real_balance_cash?: number | string | null;
  difference?: number | string | null;
  status: string;
};

type PosReport = {
  summary?: {
    sales_count?: number;
    gross_total?: number | string;
    subtotal?: number | string;
    discount_total?: number | string;
    average_ticket?: number | string;
  };
  payments?: PaymentRow[];
  top_products?: TopProductRow[];
  sales?: SaleRow[];
  registers?: RegisterRow[];
};

const parseNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number.parseFloat(String(value || '').replace(',', '.').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value: unknown) => parseNumber(value).toFixed(2);
const qty = (value: unknown) => parseNumber(value).toFixed(3).replace(/\.000$/, '');

const isAdminPath = () => {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.toLowerCase() === '/admin';
};

const dateToInput = (date: Date) => date.toISOString().slice(0, 10);

const paymentLabel = (method: string) => {
  if (method === 'cash') return 'Efectivo';
  if (method === 'deuna') return 'DeUna';
  if (method === 'transfer') return 'Transferencia';
  if (method === 'card') return 'Tarjeta';
  if (method === 'mixed') return 'Mixto';
  return method || 'Otro';
};

const paymentIcon = (method: string) => {
  if (method === 'cash') return Banknote;
  if (method === 'card') return CreditCard;
  return Wallet;
};

export default function AdminPosReportsLauncher() {
  const [visibleInAdmin, setVisibleInAdmin] = useState(() => isAdminPath());
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => dateToInput(new Date()));
  const [report, setReport] = useState<PosReport | null>(null);
  const [loading, setLoading] = useState(false);
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

  const range = useMemo(() => {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }, [date]);

  const loadReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await runAdminOperation<{ report: PosReport }>('pos_report', {
        startDate: range.start.toISOString(),
        endDate: range.end.toISOString(),
      });
      setReport(result.report || {});
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : 'No pude cargar reporte POS.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadReport();
  }, [open, date]);

  if (!visibleInAdmin) return null;

  const summary = report?.summary || {};
  const payments = report?.payments || [];
  const topProducts = report?.top_products || [];
  const sales = report?.sales || [];
  const registers = report?.registers || [];

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-5 z-[9996] flex items-center gap-2 rounded-[24px] bg-orange-500 px-5 py-4 text-xs font-black uppercase tracking-widest text-white shadow-2xl shadow-orange-300/60 ring-4 ring-orange-100 active:scale-95 transition-transform"
        >
          <BarChart3 size={18} />
          Reportes POS
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/72 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto">
          <div className="mx-auto max-w-6xl rounded-[34px] bg-gray-50 shadow-2xl overflow-hidden border border-white/40">
            <header className="bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 text-white p-4 sm:p-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-12 w-12 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <BarChart3 size={24} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-300">Ventas y caja</p>
                  <h2 className="text-xl sm:text-2xl font-black uppercase italic leading-none truncate">Reportes POS</h2>
                </div>
              </div>

              <button type="button" onClick={() => setOpen(false)} className="h-11 w-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center active:scale-90 transition-transform" aria-label="Cerrar reportes POS">
                <X size={20} />
              </button>
            </header>

            <main className="p-4 sm:p-5 space-y-4">
              <section className="rounded-[28px] bg-white border border-gray-100 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-gray-900">Reporte diario</p>
                  <p className="text-[10px] font-bold text-gray-400 mt-1">Elige un día para revisar ventas de mostrador, pagos y caja.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <label className="relative">
                    <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={date} onChange={event => setDate(event.target.value)} type="date" className="rounded-2xl border border-gray-100 bg-gray-50 py-3 pl-10 pr-4 text-sm font-black outline-none focus:border-orange-300" />
                  </label>
                  <button type="button" onClick={loadReport} disabled={loading} className="rounded-2xl bg-slate-950 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-60 flex items-center justify-center gap-2">
                    {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                    Actualizar
                  </button>
                </div>
              </section>

              {error && <div className="rounded-3xl border border-red-100 bg-red-50 p-4 text-xs font-black uppercase tracking-wide text-red-600">{error}</div>}

              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-[28px] bg-white border border-gray-100 p-4 shadow-sm">
                  <TrendingUp size={22} className="text-green-500 mb-2" />
                  <p className="text-[9px] font-black uppercase text-gray-400">Ventas POS</p>
                  <p className="text-2xl font-black text-gray-950">${money(summary.gross_total)}</p>
                  <p className="text-[10px] font-bold text-gray-400">{summary.sales_count || 0} ventas</p>
                </div>
                <div className="rounded-[28px] bg-white border border-gray-100 p-4 shadow-sm">
                  <ReceiptText size={22} className="text-orange-500 mb-2" />
                  <p className="text-[9px] font-black uppercase text-gray-400">Ticket promedio</p>
                  <p className="text-2xl font-black text-gray-950">${money(summary.average_ticket)}</p>
                  <p className="text-[10px] font-bold text-gray-400">Promedio del día</p>
                </div>
                <div className="rounded-[28px] bg-white border border-gray-100 p-4 shadow-sm">
                  <Banknote size={22} className="text-green-500 mb-2" />
                  <p className="text-[9px] font-black uppercase text-gray-400">Efectivo POS</p>
                  <p className="text-2xl font-black text-gray-950">${money(payments.find(p => p.method === 'cash')?.amount)}</p>
                  <p className="text-[10px] font-bold text-gray-400">Cobrado en caja</p>
                </div>
                <div className="rounded-[28px] bg-white border border-gray-100 p-4 shadow-sm">
                  <ClipboardList size={22} className="text-blue-500 mb-2" />
                  <p className="text-[9px] font-black uppercase text-gray-400">Turnos de caja</p>
                  <p className="text-2xl font-black text-gray-950">{registers.length}</p>
                  <p className="text-[10px] font-bold text-gray-400">Abiertos en el día</p>
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <section className="rounded-[32px] bg-white border border-gray-100 shadow-sm p-4">
                  <p className="text-xs font-black uppercase text-gray-900 mb-3">Pago por método</p>
                  <div className="space-y-2">
                    {loading ? (
                      <div className="rounded-2xl bg-gray-50 p-5 text-center text-[10px] font-black uppercase text-orange-500 animate-pulse">Cargando pagos...</div>
                    ) : payments.length === 0 ? (
                      <div className="rounded-2xl bg-gray-50 border border-dashed border-gray-200 p-5 text-center text-[10px] font-black uppercase text-gray-400">Sin pagos POS en este día.</div>
                    ) : (
                      payments.map(payment => {
                        const Icon = paymentIcon(payment.method);
                        return (
                          <div key={payment.method} className="rounded-2xl bg-gray-50 border border-gray-100 p-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-orange-500"><Icon size={17} /></div>
                              <div>
                                <p className="text-xs font-black uppercase text-gray-900">{paymentLabel(payment.method)}</p>
                                <p className="text-[10px] font-bold text-gray-400">{payment.count} pagos</p>
                              </div>
                            </div>
                            <p className="text-lg font-black text-gray-950">${money(payment.amount)}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>

                <section className="rounded-[32px] bg-white border border-gray-100 shadow-sm p-4">
                  <p className="text-xs font-black uppercase text-gray-900 mb-3">Productos más vendidos POS</p>
                  <div className="space-y-2">
                    {loading ? (
                      <div className="rounded-2xl bg-gray-50 p-5 text-center text-[10px] font-black uppercase text-orange-500 animate-pulse">Cargando productos...</div>
                    ) : topProducts.length === 0 ? (
                      <div className="rounded-2xl bg-gray-50 border border-dashed border-gray-200 p-5 text-center text-[10px] font-black uppercase text-gray-400">Todavía no hay productos vendidos por POS.</div>
                    ) : (
                      topProducts.map(product => (
                        <div key={product.product_id} className="rounded-2xl bg-gray-50 border border-gray-100 p-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-orange-500"><Package size={17} /></div>
                            <div className="min-w-0">
                              <p className="text-xs font-black uppercase text-gray-900 line-clamp-1">{product.product_name}</p>
                              <p className="text-[10px] font-bold text-gray-400">Cantidad {qty(product.quantity)}</p>
                            </div>
                          </div>
                          <p className="text-lg font-black text-orange-600">${money(product.total)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <section className="rounded-[32px] bg-white border border-gray-100 shadow-sm p-4">
                  <p className="text-xs font-black uppercase text-gray-900 mb-3">Últimas ventas POS</p>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {sales.length === 0 ? (
                      <div className="rounded-2xl bg-gray-50 border border-dashed border-gray-200 p-5 text-center text-[10px] font-black uppercase text-gray-400">Sin ventas en este día.</div>
                    ) : (
                      sales.map(sale => (
                        <div key={sale.id} className="rounded-2xl bg-gray-50 border border-gray-100 p-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-black uppercase text-gray-900">{sale.sale_code}</p>
                            <p className="text-[10px] font-bold text-gray-400">{sale.created_at ? new Date(sale.created_at).toLocaleString('es-EC') : 'Sin fecha'} · {sale.payment_summary || 'Sin resumen'}</p>
                          </div>
                          <p className="text-lg font-black text-gray-950">${money(sale.total)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-[32px] bg-white border border-gray-100 shadow-sm p-4">
                  <p className="text-xs font-black uppercase text-gray-900 mb-3">Cierres de caja</p>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {registers.length === 0 ? (
                      <div className="rounded-2xl bg-gray-50 border border-dashed border-gray-200 p-5 text-center text-[10px] font-black uppercase text-gray-400">Sin turnos de caja en este día.</div>
                    ) : (
                      registers.map(register => (
                        <div key={register.id} className="rounded-2xl bg-gray-50 border border-gray-100 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-black uppercase text-gray-900">Caja {register.id.slice(0, 8)}</p>
                              <p className="text-[10px] font-bold text-gray-400">{register.opened_at ? new Date(register.opened_at).toLocaleString('es-EC') : 'Sin apertura'} · {register.status === 'closed' ? 'Cerrada' : 'Abierta'}</p>
                            </div>
                            <span className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase ${register.status === 'closed' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>{register.status === 'closed' ? 'Cerrada' : 'Abierta'}</span>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-2xl bg-white border border-gray-100 p-2"><p className="text-[8px] font-black uppercase text-gray-400">Inicial</p><p className="text-xs font-black text-gray-900">${money(register.opening_balance)}</p></div>
                            <div className="rounded-2xl bg-white border border-gray-100 p-2"><p className="text-[8px] font-black uppercase text-gray-400">Efectivo</p><p className="text-xs font-black text-gray-900">${money(register.expected_cash_sales)}</p></div>
                            <div className="rounded-2xl bg-white border border-gray-100 p-2"><p className="text-[8px] font-black uppercase text-gray-400">Dif.</p><p className={`text-xs font-black ${parseNumber(register.difference) === 0 ? 'text-gray-900' : parseNumber(register.difference) < 0 ? 'text-red-500' : 'text-green-600'}`}>${money(register.difference)}</p></div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            </main>
          </div>
        </div>
      )}
    </>
  );
}
