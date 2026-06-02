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

type PosItem = {
  product: Product;
  quantity: number;
  unitPrice: number;
};

type PosProduct = Product & {
  barcode?: string | null;
  current_stock?: number | string | null;
  track_stock?: boolean | null;
};

type ActiveRegister = {
  id: string;
  openingBalance: number;
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
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<PosItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
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
      setRegister({ id: String(data), openingBalance: cleanOpeningBalance });
      setLastSaleId(null);
    }

    setSaving(false);
  };

  const addProduct = (product: PosProduct) => {
    const unitPrice = getProductPrice(product);

    if (unitPrice <= 0) {
      setError('Este producto es variable o no tiene precio fijo. Configura precio antes de venderlo por POS.');
      return;
    }

    const currentStock = parseMoney(product.current_stock);
    if (product.track_stock && currentStock <= 0) {
      setError(`Sin stock disponible para ${product.name}.`);
      return;
    }

    setError(null);
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

  const removeItem = (productId: string) => {
    setItems(current => current.filter(item => item.product.id !== productId));
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

    if (paymentMethod === 'cash' && parseMoney(cashReceived) < total) {
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
      setLastSaleId(String(data));
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[9998] flex items-center gap-2 rounded-[24px] bg-slate-950 px-5 py-4 text-xs font-black uppercase tracking-widest text-white shadow-2xl shadow-orange-300/60 ring-4 ring-orange-200 active:scale-95 transition-transform"
      >
        <Calculator size={18} className="text-orange-300" />
        POS
      </button>

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

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-11 w-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center active:scale-90 transition-transform"
                aria-label="Cerrar POS"
              >
                <X size={20} />
              </button>
            </header>

            <main className="p-4 sm:p-5 space-y-4">
              {error && (
                <div className="rounded-3xl border border-red-100 bg-red-50 p-4 text-xs font-black uppercase tracking-wide text-red-600">
                  {error}
                </div>
              )}

              {lastSaleId && (
                <div className="rounded-3xl border border-green-100 bg-green-50 p-4 flex items-center gap-3 text-green-700">
                  <CheckCircle2 size={22} />
                  <div>
                    <p className="text-xs font-black uppercase">Venta guardada</p>
                    <p className="text-[10px] font-bold opacity-75">ID: {lastSaleId}</p>
                  </div>
                </div>
              )}

              {!register ? (
                <section className="rounded-[32px] bg-white border border-orange-100 p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
                      <Banknote size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase text-gray-900">Abrir caja</p>
                      <p className="text-[10px] font-bold text-gray-400">Necesario antes de vender en mostrador.</p>
                    </div>
                  </div>

                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                    Efectivo inicial para cambio
                  </label>
                  <input
                    value={openingBalance}
                    onChange={event => setOpeningBalance(event.target.value)}
                    inputMode="decimal"
                    className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 text-2xl font-black outline-none focus:border-orange-300"
                    placeholder="50.00"
                  />

                  <button
                    type="button"
                    onClick={openCashRegister}
                    disabled={saving}
                    className="mt-4 w-full rounded-2xl bg-orange-500 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-orange-200 disabled:opacity-60 active:scale-[0.98] transition-transform"
                  >
                    {saving ? 'Abriendo...' : 'Abrir caja y empezar'}
                  </button>
                </section>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-4">
                  <section className="space-y-4">
                    <div className="rounded-[28px] bg-white border border-gray-100 p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-green-600">Caja activa</p>
                          <p className="text-xs font-bold text-gray-400">Inicial ${money(register.openingBalance)} · ID {register.id.slice(0, 8)}</p>
                        </div>
                        <Wallet size={22} className="text-green-500" />
                      </div>

                      <div className="relative">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                        <input
                          value={query}
                          onChange={event => setQuery(event.target.value)}
                          placeholder="Buscar producto o código..."
                          className="w-full rounded-2xl border border-gray-100 bg-gray-50 py-4 pl-12 pr-4 text-sm font-bold outline-none focus:border-orange-300"
                          autoFocus
                        />
                      </div>
                    </div>

                    {loadingProducts ? (
                      <div className="rounded-3xl bg-white border border-gray-100 p-8 text-center text-orange-500 font-black uppercase animate-pulse">
                        Cargando productos...
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {filteredProducts.map(product => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => addProduct(product)}
                            className="rounded-3xl border border-gray-100 bg-white p-4 text-left shadow-sm active:scale-[0.98] transition-transform"
                          >
                            <p className="text-xs font-black uppercase text-gray-900 leading-tight line-clamp-2">{product.name}</p>
                            <p className="mt-1 text-[10px] font-bold text-gray-400">{product.category}</p>
                            <p className="mt-3 text-lg font-black text-orange-600">${money(getProductPrice(product))}</p>
                          </button>
                        ))}

                        {filteredProducts.length === 0 && (
                          <div className="sm:col-span-2 rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center text-gray-400">
                            <PackageSearch size={32} className="mx-auto mb-2 text-orange-300" />
                            <p className="text-xs font-black uppercase">No encontré productos</p>
                          </div>
                        )}
                      </div>
                    )}
                  </section>

                  <aside className="rounded-[32px] bg-white border border-gray-100 shadow-sm overflow-hidden">
                    <div className="bg-slate-950 text-white p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShoppingCart size={19} className="text-orange-300" />
                        <p className="text-xs font-black uppercase tracking-widest">Carrito</p>
                      </div>
                      <p className="text-xs font-black text-orange-300">{items.length}</p>
                    </div>

                    <div className="p-4 space-y-3 max-h-[44vh] overflow-y-auto">
                      {items.length === 0 ? (
                        <div className="rounded-3xl bg-gray-50 border border-gray-100 p-7 text-center text-gray-400">
                          <ShoppingCart size={34} className="mx-auto mb-2 text-orange-200" />
                          <p className="text-xs font-black uppercase">Agrega productos</p>
                        </div>
                      ) : (
                        items.map(item => (
                          <div key={item.product.id} className="rounded-3xl border border-gray-100 bg-gray-50 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-black uppercase text-gray-900 line-clamp-2">{item.product.name}</p>
                                <p className="text-[10px] font-bold text-gray-400 mt-1">${money(item.unitPrice)} c/u</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeItem(item.product.id)}
                                className="h-9 w-9 rounded-xl bg-white text-red-500 flex items-center justify-center border border-red-50"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => updateQuantity(item.product.id, -1)} className="h-9 w-9 rounded-xl bg-white border flex items-center justify-center">
                                  <Minus size={14} />
                                </button>
                                <span className="min-w-10 text-center text-sm font-black">{item.quantity}</span>
                                <button type="button" onClick={() => updateQuantity(item.product.id, 1)} className="h-9 w-9 rounded-xl bg-white border flex items-center justify-center">
                                  <Plus size={14} />
                                </button>
                              </div>
                              <p className="text-sm font-black text-gray-900">${money(item.quantity * item.unitPrice)}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="border-t border-gray-100 p-4 space-y-3 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-gray-400">Total</span>
                        <span className="text-3xl font-black text-gray-950">${money(total)}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {(['cash', 'deuna', 'transfer', 'card'] as PaymentMethod[]).map(method => {
                          const Icon = paymentIcon(method);
                          const active = paymentMethod === method;

                          return (
                            <button
                              key={method}
                              type="button"
                              onClick={() => setPaymentMethod(method)}
                              className={`rounded-2xl border px-3 py-3 text-[10px] font-black uppercase flex items-center justify-center gap-2 ${
                                active
                                  ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-100'
                                  : 'bg-white text-gray-500 border-gray-100'
                              }`}
                            >
                              <Icon size={14} />
                              {paymentLabel(method)}
                            </button>
                          );
                        })}
                      </div>

                      {paymentMethod === 'cash' ? (
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Recibido</label>
                          <input
                            value={cashReceived}
                            onChange={event => setCashReceived(event.target.value)}
                            inputMode="decimal"
                            placeholder={money(total)}
                            className="mt-1 w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 text-lg font-black outline-none focus:border-orange-300"
                          />
                          <p className="mt-1 text-xs font-black text-green-600">Cambio: ${money(change)}</p>
                        </div>
                      ) : (
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Referencia opcional</label>
                          <input
                            value={paymentReference}
                            onChange={event => setPaymentReference(event.target.value)}
                            placeholder="N° comprobante / autorización"
                            className="mt-1 w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-orange-300"
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={completeSale}
                        disabled={saving || items.length === 0 || total <= 0}
                        className="w-full rounded-2xl bg-slate-950 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-slate-200 disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                      >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                        Confirmar venta
                      </button>
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
