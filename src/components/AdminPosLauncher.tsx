import { useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  Calculator,
  CheckCircle2,
  CreditCard,
  Loader2,
  Minus,
  PackageSearch,
  Plus,
  Printer,
  QrCode,
  ReceiptText,
  Search,
  ShoppingCart,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Product } from '../types';

type PaymentMethod = 'cash' | 'deuna' | 'transfer' | 'card';

type PosProduct = Product & {
  barcode?: string | null;
  current_stock?: number | string | null;
  track_stock?: boolean | null;
};

type PosItem = {
  product: PosProduct;
  quantity: number;
  unitPrice: number;
};

type ActiveRegister = {
  id: string;
  openingBalance: number;
  expectedCashSales: number;
};

type LastTicket = {
  saleId: string;
  date: string;
  items: PosItem[];
  total: number;
  paymentMethod: PaymentMethod;
  cashReceived: number;
  change: number;
};

type SessionSale = {
  saleId: string;
  total: number;
  paymentMethod: PaymentMethod;
  date: string;
  itemsCount: number;
};

const POS_OPERATOR = 'admin';

const parseMoney = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const raw = String(value || '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '')
    .trim();

  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value: unknown) => parseMoney(value).toFixed(2);

const getProductPrice = (product: Product) => {
  if (product.is_variable) return 0;
  return parseMoney(product.price);
};

const paymentLabel = (method: PaymentMethod) => {
  if (method === 'cash') return 'Efectivo';
  if (method === 'deuna') return 'DeUna';
  if (method === 'transfer') return 'Transferencia';
  return 'Tarjeta';
};

const paymentIcon = (method: PaymentMethod) => {
  if (method === 'cash') return Banknote;
  if (method === 'deuna') return QrCode;
  if (method === 'transfer') return Wallet;
  return CreditCard;
};

const isAdminPath = () => {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.toLowerCase() === '/admin';
};

export default function AdminPosLauncher() {
  const [visibleInAdmin, setVisibleInAdmin] = useState(() => isAdminPath());
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [register, setRegister] = useState<ActiveRegister | null>(null);
  const [openingBalance, setOpeningBalance] = useState('50.00');
  const [closingCash, setClosingCash] = useState('');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<PosItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
  const [lastTicket, setLastTicket] = useState<LastTicket | null>(null);
  const [sessionSales, setSessionSales] = useState<SessionSale[]>([]);
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

  const expectedCash = useMemo(() => {
    if (!register) return 0;
    return register.openingBalance + register.expectedCashSales;
  }, [register]);

  const closeDifference = useMemo(() => {
    if (!closingCash.trim()) return 0;
    return parseMoney(closingCash) - expectedCash;
  }, [closingCash, expectedCash]);

  const shiftTotal = useMemo(() => {
    return sessionSales.reduce((sum, sale) => sum + sale.total, 0);
  }, [sessionSales]);

  const loadProducts = async () => {
    if (!isSupabaseConfigured) {
      setError('Supabase no está configurado.');
      return;
    }

    setLoadingProducts(true);
    setError(null);

    const { data, error: productsError } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (productsError) {
      setError('No pude cargar productos para el POS. Revisa políticas RLS de products.');
      console.error(productsError);
    } else {
      setProducts((data || []) as PosProduct[]);
      setProductsLoaded(true);
    }

    setLoadingProducts(false);
  };

  useEffect(() => {
    if (open && !productsLoaded) {
      loadProducts();
    }
  }, [open, productsLoaded]);

  const availableProducts = useMemo(() => {
    return products
      .filter(product => product.available !== false)
      .filter(product => !product.is_variable || getProductPrice(product) > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return availableProducts.slice(0, 10);

    return availableProducts
      .filter(product => {
        const barcode = product.barcode || '';
        return `${product.name} ${product.category} ${product.subcategory || ''} ${product.id} ${barcode}`
          .toLowerCase()
          .includes(clean);
      })
      .slice(0, 16);
  }, [availableProducts, query]);

  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }, [items]);

  const change = useMemo(() => {
    if (paymentMethod !== 'cash') return 0;
    return Math.max(0, parseMoney(cashReceived) - total);
  }, [cashReceived, paymentMethod, total]);

  const clearLastSaleNotice = () => {
    setLastSaleId(null);
    setLastTicket(null);
    setError(null);
    setQuery('');
  };

  const openCashRegister = async () => {
    if (!isSupabaseConfigured) {
      setError('Supabase no está configurado.');
      return;
    }

    setSaving(true);
    setError(null);

    const cleanOpeningBalance = parseMoney(openingBalance);

    const { data, error: rpcError } = await supabase.rpc('open_cash_register_v1', {
      p_opening_balance: cleanOpeningBalance,
      p_opened_by: POS_OPERATOR,
      p_notes: 'Caja abierta desde POS flotante del admin',
    });

    if (rpcError) {
      setError(rpcError.message || 'No se pudo abrir caja.');
      console.error(rpcError);
    } else if (data) {
      setRegister({
        id: String(data),
        openingBalance: cleanOpeningBalance,
        expectedCashSales: 0,
      });
      setClosingCash(money(cleanOpeningBalance));
      setLastSaleId(null);
      setLastTicket(null);
      setSessionSales([]);
    } else {
      setError('Supabase no devolvió ID de caja.');
    }

    setSaving(false);
  };

  const closeCashRegister = async () => {
    if (!register) return;

    if (items.length > 0) {
      setError('Vacía o confirma el carrito antes de cerrar caja.');
      return;
    }

    const realCash = parseMoney(closingCash || expectedCash);

    if (!window.confirm(`Cerrar turno de caja con $${money(realCash)} contados físicamente?`)) return;

    setClosing(true);
    setError(null);

    const { error: closeError } = await supabase.rpc('close_cash_register_v1', {
      p_cash_register_id: register.id,
      p_real_balance_cash: realCash,
      p_notes: `Cierre POS. Esperado $${money(expectedCash)}. Diferencia $${money(realCash - expectedCash)}`,
    });

    if (closeError) {
      setError(closeError.message || 'No se pudo cerrar caja.');
      console.error(closeError);
    } else {
      setRegister(null);
      setItems([]);
      setCashReceived('');
      setPaymentReference('');
      setClosingCash('');
      setLastSaleId(null);
      setLastTicket(null);
      window.alert('Turno de caja cerrado correctamente.');
    }

    setClosing(false);
  };

  const addProduct = (product: PosProduct) => {
    const unitPrice = getProductPrice(product);

    if (unitPrice <= 0) {
      setError('Este producto todavía no tiene precio fijo para vender en caja.');
      return;
    }

    const currentStock = parseMoney(product.current_stock);
    if (product.track_stock && currentStock <= 0) {
      setError(`Sin stock disponible para ${product.name}.`);
      return;
    }

    setError(null);
    setLastSaleId(null);
    setLastTicket(null);
    setItems(current => {
      const exists = current.find(item => item.product.id === product.id);
      if (exists) {
        return current.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [...current, { product, quantity: 1, unitPrice }];
    });

    setQuery('');
  };

  const updateQuantity = (productId: string, delta: number) => {
    setItems(current =>
      current
        .map(item =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter(item => item.quantity > 0)
    );
  };

  const removeItem = (productId: string) => setItems(current => current.filter(item => item.product.id !== productId));

  const printLastTicket = () => {
    if (!lastTicket) {
      window.alert('Todavía no hay un ticket para imprimir.');
      return;
    }

    const ticketRows = lastTicket.items
      .map(item => {
        const lineTotal = item.quantity * item.unitPrice;
        return `<tr><td>${item.quantity}x</td><td>${item.product.name}</td><td style="text-align:right">$${money(lineTotal)}</td></tr>`;
      })
      .join('');

    const popup = window.open('', 'pollazo-ticket', 'width=380,height=640');
    if (!popup) {
      window.alert('El navegador bloqueó la ventana de impresión.');
      return;
    }

    popup.document.write(`
      <html><head><title>Ticket Pollazo</title><style>
      body{font-family:Arial,sans-serif;margin:0;padding:18px;color:#111827}.ticket{max-width:320px;margin:0 auto}h1{font-size:18px;text-align:center;margin:0;font-weight:900}.sub{text-align:center;font-size:11px;color:#6b7280;margin:4px 0 12px}.meta{font-size:11px;border-top:1px dashed #aaa;border-bottom:1px dashed #aaa;padding:8px 0;margin-bottom:10px}table{width:100%;border-collapse:collapse;font-size:12px}td{padding:5px 0;vertical-align:top;border-bottom:1px solid #eee}.total{margin-top:12px;border-top:2px solid #111;padding-top:10px;font-size:15px;font-weight:900;display:flex;justify-content:space-between}.note{margin-top:14px;text-align:center;font-size:10px;color:#6b7280}@media print{button{display:none}body{padding:0}}
      </style></head><body><div class="ticket">
      <h1>LA CASA DEL POLLAZO</h1><p class="sub">Ticket interno de venta · No tributario</p>
      <div class="meta"><strong>Venta:</strong> ${lastTicket.saleId.slice(0, 8)}<br/><strong>Fecha:</strong> ${lastTicket.date}<br/><strong>Pago:</strong> ${paymentLabel(lastTicket.paymentMethod)}</div>
      <table>${ticketRows}</table><div class="total"><span>Total</span><span>$${money(lastTicket.total)}</span></div>
      ${lastTicket.paymentMethod === 'cash' ? `<div class="meta" style="margin-top:10px"><strong>Recibido:</strong> $${money(lastTicket.cashReceived)}<br/><strong>Cambio:</strong> $${money(lastTicket.change)}</div>` : ''}
      <p class="note">Gracias por tu compra. Pollazo Galapagueño.</p>
      <button onclick="window.print()" style="width:100%;margin-top:16px;padding:12px;border-radius:12px;border:0;background:#f97316;color:white;font-weight:900">IMPRIMIR</button>
      </div></body></html>
    `);
    popup.document.close();
  };

  const completeSale = async () => {
    if (!register) {
      setError('Primero abre caja.');
      return;
    }

    if (items.length === 0 || total <= 0) {
      setError('Agrega productos a la venta.');
      return;
    }

    const cleanCashReceived = parseMoney(cashReceived);

    if (paymentMethod === 'cash' && cleanCashReceived < total) {
      setError('El efectivo recibido no cubre el total.');
      return;
    }

    if (!isSupabaseConfigured) {
      setError('Supabase no está configurado.');
      return;
    }

    setSaving(true);
    setError(null);
    setLastSaleId(null);

    const payloadItems = items.map(item => ({
      product_id: item.product.id,
      product_name: item.product.name,
      quantity: item.quantity,
      unit_price: Number(item.unitPrice.toFixed(2)),
    }));

    const payments = [
      {
        method: paymentMethod,
        amount: Number(total.toFixed(2)),
        reference: paymentReference || null,
      },
    ];

    const soldItemsSnapshot = items.map(item => ({ ...item }));
    const soldTotal = Number(total.toFixed(2));
    const soldPaymentMethod = paymentMethod;
    const soldCashReceived = paymentMethod === 'cash' ? cleanCashReceived : soldTotal;
    const soldChange = paymentMethod === 'cash' ? Math.max(0, cleanCashReceived - soldTotal) : 0;

    const { data, error: rpcError } = await supabase.rpc('create_pos_sale_v1', {
      p_cash_register_id: register.id,
      p_customer_id: null,
      p_customer_name: 'Consumidor final',
      p_customer_phone: null,
      p_sold_by: POS_OPERATOR,
      p_items: payloadItems,
      p_payments: payments,
      p_discount_amount: 0,
      p_notes: 'Venta de mostrador desde POS MVP',
    });

    if (rpcError) {
      setError(rpcError.message || 'No se pudo guardar la venta.');
      console.error(rpcError);
    } else {
      const saleId = String(data);
      const saleDate = new Date().toLocaleString('es-EC');
      setLastSaleId(saleId);
      setLastTicket({
        saleId,
        date: saleDate,
        items: soldItemsSnapshot,
        total: soldTotal,
        paymentMethod: soldPaymentMethod,
        cashReceived: soldCashReceived,
        change: soldChange,
      });
      setSessionSales(current => [
        {
          saleId,
          total: soldTotal,
          paymentMethod: soldPaymentMethod,
          date: saleDate,
          itemsCount: soldItemsSnapshot.reduce((sum, item) => sum + item.quantity, 0),
        },
        ...current,
      ].slice(0, 6));
      setRegister(current => {
        if (!current) return current;
        const nextExpectedCashSales =
          soldPaymentMethod === 'cash'
            ? current.expectedCashSales + soldTotal
            : current.expectedCashSales;
        const nextExpectedCash = current.openingBalance + nextExpectedCashSales;
        setClosingCash(money(nextExpectedCash));
        return {
          ...current,
          expectedCashSales: nextExpectedCashSales,
        };
      });
      setItems([]);
      setCashReceived('');
      setPaymentReference('');
      setProductsLoaded(false);
      loadProducts();
    }

    setSaving(false);
  };

  if (!visibleInAdmin) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-[9998] flex items-center gap-2 rounded-[24px] bg-slate-950 px-5 py-4 text-xs font-black uppercase tracking-widest text-white shadow-2xl shadow-orange-300/60 ring-4 ring-orange-200 active:scale-95 transition-transform"
        >
          <Calculator size={18} className="text-orange-300" />
          POS
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/72 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto">
          <div className="mx-auto max-w-5xl rounded-[34px] bg-gray-50 shadow-2xl overflow-hidden border border-white/40">
            <header className="bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 text-white p-4 sm:p-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-12 w-12 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <ReceiptText size={24} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-300">Punto de venta</p>
                  <h2 className="text-xl sm:text-2xl font-black uppercase italic leading-none truncate">Mostrador Pollazo</h2>
                </div>
              </div>

              <button type="button" onClick={() => setOpen(false)} className="h-11 w-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center active:scale-90 transition-transform" aria-label="Cerrar POS">
                <X size={20} />
              </button>
            </header>

            <main className="p-4 sm:p-5 space-y-4">
              {error && <div className="rounded-3xl border border-red-100 bg-red-50 p-4 text-xs font-black uppercase tracking-wide text-red-600">{error}</div>}

              {lastSaleId && (
                <div className="rounded-3xl border border-green-100 bg-green-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-green-700">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={22} />
                    <div>
                      <p className="text-xs font-black uppercase">Venta guardada</p>
                      <p className="text-[10px] font-bold opacity-75">Puedes imprimir ticket o seguir vendiendo.</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button type="button" onClick={clearLastSaleNotice} className="rounded-2xl bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-700 border border-green-100">
                      Nueva venta
                    </button>
                    <button type="button" onClick={printLastTicket} className="rounded-2xl bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-green-700 border border-green-100 flex items-center justify-center gap-2">
                      <Printer size={14} /> Ticket
                    </button>
                  </div>
                </div>
              )}

              {!register ? (
                <section className="rounded-[32px] bg-white border border-orange-100 p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center"><Banknote size={24} /></div>
                    <div>
                      <p className="text-xs font-black uppercase text-gray-900">Abrir turno de caja</p>
                      <p className="text-[10px] font-bold text-gray-400">Haz esto al empezar a vender en el local.</p>
                    </div>
                  </div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Dinero inicial para dar cambio</label>
                  <input value={openingBalance} onChange={event => setOpeningBalance(event.target.value)} inputMode="decimal" className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 text-2xl font-black outline-none focus:border-orange-300" placeholder="50.00" />
                  <button type="button" onClick={openCashRegister} disabled={saving} className="mt-4 w-full rounded-2xl bg-orange-500 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-orange-200 disabled:opacity-60 active:scale-[0.98] transition-transform">
                    {saving ? 'Abriendo caja...' : 'Abrir caja y vender'}
                  </button>
                </section>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-4">
                  <section className="space-y-4">
                    <div className="rounded-[28px] bg-white border border-gray-100 p-4 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-green-600">Caja abierta: listo para vender</p>
                          <p className="text-xs font-bold text-gray-400">Dinero inicial ${money(register.openingBalance)} · Cobrado en efectivo ${money(register.expectedCashSales)} · Caja {register.id.slice(0, 8)}</p>
                        </div>
                        <Wallet size={22} className="text-green-500" />
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="rounded-2xl bg-orange-50 border border-orange-100 p-3"><p className="text-[8px] font-black uppercase text-orange-500">Dinero inicial</p><p className="text-sm font-black text-gray-900">${money(register.openingBalance)}</p></div>
                        <div className="rounded-2xl bg-green-50 border border-green-100 p-3"><p className="text-[8px] font-black uppercase text-green-600">Cobrado en efectivo</p><p className="text-sm font-black text-gray-900">${money(register.expectedCashSales)}</p></div>
                        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3"><p className="text-[8px] font-black uppercase text-slate-500">Debe haber en caja</p><p className="text-sm font-black text-gray-900">${money(expectedCash)}</p></div>
                      </div>

                      <div className="relative">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar producto o código..." className="w-full rounded-2xl border border-gray-100 bg-gray-50 py-4 pl-12 pr-4 text-sm font-bold outline-none focus:border-orange-300" autoFocus />
                      </div>
                    </div>

                    {loadingProducts ? (
                      <div className="rounded-3xl bg-white border border-gray-100 p-8 text-center text-orange-500 font-black uppercase animate-pulse">Cargando productos...</div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {filteredProducts.map(product => (
                          <button key={product.id} type="button" onClick={() => addProduct(product)} className="rounded-3xl border border-gray-100 bg-white p-4 text-left shadow-sm active:scale-[0.98] transition-transform">
                            <p className="text-xs font-black uppercase text-gray-900 leading-tight line-clamp-2">{product.name}</p>
                            <p className="mt-1 text-[10px] font-bold text-gray-400">{product.category}</p>
                            <p className="mt-3 text-lg font-black text-orange-600">${money(getProductPrice(product))}</p>
                          </button>
                        ))}
                        {filteredProducts.length === 0 && <div className="sm:col-span-2 rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center text-gray-400"><PackageSearch size={32} className="mx-auto mb-2 text-orange-300" /><p className="text-xs font-black uppercase">No encontré productos</p></div>}
                      </div>
                    )}

                    <section className="rounded-[28px] bg-white border border-gray-100 p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase text-gray-900">Ventas de este turno</p>
                          <p className="text-[10px] font-bold text-gray-400 mt-1">Resumen rápido de las ventas hechas desde que abriste caja.</p>
                        </div>
                        <div className="rounded-2xl bg-orange-50 border border-orange-100 px-4 py-2 text-right">
                          <p className="text-[8px] font-black uppercase text-orange-500">Total turno</p>
                          <p className="text-sm font-black text-gray-900">${money(shiftTotal)}</p>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        {sessionSales.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-[10px] font-black uppercase text-gray-400 text-center">Aún no hay ventas en este turno.</div>
                        ) : (
                          sessionSales.map(sale => (
                            <div key={sale.saleId} className="rounded-2xl border border-gray-100 bg-gray-50 p-3 flex items-center justify-between gap-3">
                              <div>
                                <p className="text-[10px] font-black uppercase text-gray-900">Venta {sale.saleId.slice(0, 8)}</p>
                                <p className="text-[9px] font-bold text-gray-400">{sale.itemsCount} productos · {paymentLabel(sale.paymentMethod)}</p>
                              </div>
                              <p className="text-sm font-black text-orange-600">${money(sale.total)}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </section>

                    <section className="rounded-[28px] bg-white border border-red-100 p-4 shadow-sm">
                      <p className="text-xs font-black uppercase text-gray-900">Cerrar turno de caja</p>
                      <p className="text-[10px] font-bold text-gray-400 mt-1">Al terminar el día o cambiar de cajero, cuenta el efectivo físico y cierra aquí.</p>
                      <div className="grid grid-cols-3 gap-2 mt-3 mb-3">
                        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3"><p className="text-[8px] font-black uppercase text-slate-500">Debe haber</p><p className="text-sm font-black text-gray-900">${money(expectedCash)}</p></div>
                        <div className="rounded-2xl bg-white border border-gray-100 p-3 col-span-2"><p className="text-[8px] font-black uppercase text-gray-400">Dinero contado físicamente</p><p className="text-sm font-black text-gray-900">${money(closingCash || expectedCash)}</p></div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 mt-3">
                        <input value={closingCash} onChange={event => setClosingCash(event.target.value)} inputMode="decimal" placeholder={money(expectedCash)} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-lg font-black outline-none focus:border-red-300" />
                        <button type="button" onClick={closeCashRegister} disabled={closing || !register} className="rounded-2xl bg-red-500 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50 active:scale-[0.98] transition-transform">{closing ? 'Cerrando...' : 'Cerrar turno'}</button>
                      </div>
                      <p className={`mt-2 text-[10px] font-black uppercase ${closeDifference < 0 ? 'text-red-500' : closeDifference > 0 ? 'text-green-600' : 'text-gray-400'}`}>Diferencia: ${money(closeDifference)}</p>
                    </section>
                  </section>

                  <aside className="rounded-[32px] bg-white border border-gray-100 shadow-sm overflow-hidden">
                    <div className="bg-slate-950 text-white p-4 flex items-center justify-between"><div className="flex items-center gap-2"><ShoppingCart size={19} className="text-orange-300" /><p className="text-xs font-black uppercase tracking-widest">Carrito</p></div><p className="text-xs font-black text-orange-300">{items.length}</p></div>
                    <div className="p-4 space-y-3 max-h-[44vh] overflow-y-auto">
                      {items.length === 0 ? (
                        <div className="rounded-3xl bg-gray-50 border border-gray-100 p-7 text-center text-gray-400"><ShoppingCart size={34} className="mx-auto mb-2 text-orange-200" /><p className="text-xs font-black uppercase">Toca un producto para agregarlo</p></div>
                      ) : (
                        items.map(item => (
                          <div key={item.product.id} className="rounded-3xl border border-gray-100 bg-gray-50 p-3">
                            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-black uppercase text-gray-900 line-clamp-2">{item.product.name}</p><p className="text-[10px] font-bold text-gray-400 mt-1">${money(item.unitPrice)} c/u</p></div><button type="button" onClick={() => removeItem(item.product.id)} className="h-9 w-9 rounded-xl bg-white text-red-500 flex items-center justify-center border border-red-50"><Trash2 size={15} /></button></div>
                            <div className="mt-3 flex items-center justify-between gap-2"><div className="flex items-center gap-2"><button type="button" onClick={() => updateQuantity(item.product.id, -1)} className="h-9 w-9 rounded-xl bg-white border flex items-center justify-center"><Minus size={14} /></button><span className="min-w-10 text-center text-sm font-black">{item.quantity}</span><button type="button" onClick={() => updateQuantity(item.product.id, 1)} className="h-9 w-9 rounded-xl bg-white border flex items-center justify-center"><Plus size={14} /></button></div><p className="text-sm font-black text-gray-900">${money(item.quantity * item.unitPrice)}</p></div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="border-t border-gray-100 p-4 space-y-3 bg-gray-50">
                      <div className="flex items-center justify-between"><span className="text-xs font-black uppercase text-gray-400">Total a cobrar</span><span className="text-3xl font-black text-gray-950">${money(total)}</span></div>
                      <div className="grid grid-cols-2 gap-2">
                        {(['cash', 'deuna', 'transfer', 'card'] as PaymentMethod[]).map(method => {
                          const Icon = paymentIcon(method);
                          const active = paymentMethod === method;
                          return <button key={method} type="button" onClick={() => setPaymentMethod(method)} className={`rounded-2xl border px-3 py-3 text-[10px] font-black uppercase flex items-center justify-center gap-2 ${active ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-100' : 'bg-white text-gray-500 border-gray-100'}`}><Icon size={14} />{paymentLabel(method)}</button>;
                        })}
                      </div>
                      {paymentMethod === 'cash' ? (
                        <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Efectivo recibido</label><input value={cashReceived} onChange={event => setCashReceived(event.target.value)} inputMode="decimal" placeholder={money(total)} className="mt-1 w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 text-lg font-black outline-none focus:border-orange-300" /><p className="mt-1 text-xs font-black text-green-600">Cambio a entregar: ${money(change)}</p></div>
                      ) : (
                        <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Referencia opcional</label><input value={paymentReference} onChange={event => setPaymentReference(event.target.value)} placeholder="N° comprobante / autorización" className="mt-1 w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-orange-300" /></div>
                      )}
                      <button type="button" onClick={completeSale} disabled={saving || items.length === 0 || total <= 0} className="w-full rounded-2xl bg-slate-950 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-slate-200 disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-2">{saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}Guardar venta</button>
                    </div>
                  </aside>
                </div>
              )}
            </main>
          </div>
        </div>
      )}
    </>
  );
}
