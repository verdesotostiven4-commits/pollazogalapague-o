import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ClipboardList,
  History,
  Loader2,
  Minus,
  PackageCheck,
  PackageSearch,
  Plus,
  Save,
  Search,
  Settings2,
  X,
} from 'lucide-react';
import { runAdminOperation } from '../utils/adminOperations';
import type { Product } from '../types';

type InventoryProduct = Product & {
  barcode?: string | null;
  cost_price?: number | string | null;
  current_stock?: number | string | null;
  stock_minimum?: number | string | null;
  track_stock?: boolean | null;
  tax_rate?: number | string | null;
};

type StockMovement = {
  id: string;
  product_id: string;
  type: string;
  quantity: number | string;
  stock_before: number | string;
  stock_after: number | string;
  reference_table?: string | null;
  reference_id?: string | null;
  description?: string | null;
  created_by?: string | null;
  created_at?: string | null;
};

type InventoryMode = 'add' | 'remove';

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

const movementLabel = (type: string) => {
  if (type === 'pos_sale') return 'Venta POS';
  if (type === 'online_order') return 'Pedido online';
  if (type === 'purchase') return 'Compra/entrada';
  if (type === 'adjustment_add') return 'Entrada manual';
  if (type === 'adjustment_remove') return 'Salida manual';
  if (type === 'initial_stock') return 'Stock inicial';
  return type || 'Movimiento';
};

const movementTone = (type: string) => {
  if (type === 'pos_sale' || type === 'adjustment_remove' || type === 'online_order') {
    return 'text-red-500 bg-red-50 border-red-100';
  }

  return 'text-green-600 bg-green-50 border-green-100';
};

export default function AdminInventoryLauncher() {
  const [visibleInAdmin, setVisibleInAdmin] = useState(() => isAdminPath());
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<InventoryMode>('add');
  const [amount, setAmount] = useState('1');
  const [reason, setReason] = useState('Entrada de mercadería');
  const [editBarcode, setEditBarcode] = useState('');
  const [editCost, setEditCost] = useState('0.00');
  const [editMinimum, setEditMinimum] = useState('0');
  const [editTrackStock, setEditTrackStock] = useState(false);
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

  const loadProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await runAdminOperation<{ products?: InventoryProduct[] }>('inventory_load');
      setProducts(Array.isArray(result?.products) ? result.products : []);
    } catch (loadError) {
      console.error(loadError);
      setProducts([]);
      setError(loadError instanceof Error ? loadError.message : 'No pude cargar productos.');
    } finally {
      setLoading(false);
    }
  };

  const loadMovements = async (productId: string) => {
    setLoadingMovements(true);

    try {
      const result = await runAdminOperation<{ movements?: StockMovement[] }>(
        'inventory_movements',
        { productId, limit: 12 }
      );
      setMovements(Array.isArray(result?.movements) ? result.movements : []);
    } catch (movementsError) {
      console.error(movementsError);
      setMovements([]);
    } finally {
      setLoadingMovements(false);
    }
  };

  useEffect(() => {
    if (open) loadProducts();
  }, [open]);

  const selectedProduct = useMemo(() => {
    return products.find(product => product.id === selectedId) || null;
  }, [products, selectedId]);

  const filteredProducts = useMemo(() => {
    const clean = query.trim().toLowerCase();

    return products
      .filter(product => {
        if (!clean) return true;
        const haystack = `${product.name} ${product.category} ${product.subcategory || ''} ${product.id} ${product.barcode || ''}`.toLowerCase();
        return haystack.includes(clean);
      })
      .sort((a, b) => {
        const aLow = a.track_stock && parseNumber(a.stock_minimum) > 0 && parseNumber(a.current_stock) <= parseNumber(a.stock_minimum) ? 0 : 1;
        const bLow = b.track_stock && parseNumber(b.stock_minimum) > 0 && parseNumber(b.current_stock) <= parseNumber(b.stock_minimum) ? 0 : 1;
        if (aLow !== bLow) return aLow - bLow;

        const aTracked = a.track_stock ? 0 : 1;
        const bTracked = b.track_stock ? 0 : 1;
        if (aTracked !== bTracked) return aTracked - bTracked;
        return a.name.localeCompare(b.name);
      });
  }, [products, query]);

  const lowStockProducts = useMemo(() => {
    return products.filter(product => {
      if (!product.track_stock) return false;
      const current = parseNumber(product.current_stock);
      const minimum = parseNumber(product.stock_minimum);
      return minimum > 0 && current <= minimum;
    });
  }, [products]);

  const selectProduct = (product: InventoryProduct) => {
    setSelectedId(product.id);
    setEditBarcode(product.barcode || '');
    setEditCost(money(product.cost_price));
    setEditMinimum(qty(product.stock_minimum));
    setEditTrackStock(Boolean(product.track_stock));
    setMessage(null);
    setError(null);
    loadMovements(product.id);
  };

  const refreshSelectedProduct = async (productId: string) => {
    await loadProducts();
    await loadMovements(productId);
  };

  const saveProductInventorySettings = async () => {
    if (!selectedProduct) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await runAdminOperation('inventory_settings', {
        productId: selectedProduct.id,
        barcode: editBarcode.trim() || null,
        costPrice: parseNumber(editCost),
        stockMinimum: parseNumber(editMinimum),
        trackStock: editTrackStock,
      });
      setMessage('Configuración de inventario guardada.');
      await refreshSelectedProduct(selectedProduct.id);
    } catch (updateError) {
      console.error(updateError);
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'No pude guardar configuración de inventario.'
      );
    } finally {
      setSaving(false);
    }
  };

  const adjustStock = async () => {
    if (!selectedProduct) return;

    const cleanAmount = parseNumber(amount);
    if (cleanAmount <= 0) {
      setError('Ingresa una cantidad mayor a 0.');
      return;
    }

    const delta = mode === 'add' ? cleanAmount : -cleanAmount;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const result = await runAdminOperation<{ stock?: number | string }>('inventory_adjust', {
        productId: selectedProduct.id,
        delta,
        description:
          reason ||
          (mode === 'add' ? 'Entrada de mercadería' : 'Salida/ajuste de inventario'),
      });
      setMessage(`Stock actualizado. Nuevo stock: ${qty(result?.stock)}.`);
      setAmount('1');
      await refreshSelectedProduct(selectedProduct.id);
    } catch (rpcError) {
      console.error(rpcError);
      setError(rpcError instanceof Error ? rpcError.message : 'No pude ajustar stock.');
    } finally {
      setSaving(false);
    }
  };

  if (!visibleInAdmin) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-32 z-[9997] flex items-center gap-2 rounded-[24px] bg-white px-5 py-4 text-xs font-black uppercase tracking-widest text-slate-900 shadow-2xl shadow-orange-200/70 ring-4 ring-white border border-orange-100 active:scale-95 transition-transform"
        >
          <Archive size={18} className="text-orange-500" />
          Inventario
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/72 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto">
          <div className="mx-auto max-w-6xl rounded-[34px] bg-gray-50 shadow-2xl overflow-hidden border border-white/40">
            <header className="bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 text-white p-4 sm:p-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-12 w-12 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <Archive size={24} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-300">Control de stock</p>
                  <h2 className="text-xl sm:text-2xl font-black uppercase italic leading-none truncate">Inventario Pollazo</h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-11 w-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center active:scale-90 transition-transform"
                aria-label="Cerrar inventario"
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

              {message && (
                <div className="rounded-3xl border border-green-100 bg-green-50 p-4 flex items-center gap-3 text-green-700">
                  <CheckCircle2 size={22} />
                  <p className="text-xs font-black uppercase">{message}</p>
                </div>
              )}

              {lowStockProducts.length > 0 && (
                <section className="rounded-[28px] bg-red-50 border border-red-100 p-4 text-red-600 flex items-start gap-3">
                  <AlertTriangle size={22} className="flex-shrink-0" />
                  <div>
                    <p className="text-xs font-black uppercase">Atención: productos con stock bajo</p>
                    <p className="mt-1 text-[10px] font-bold text-red-500/80">
                      {lowStockProducts.map(product => `${product.name} (${qty(product.current_stock)})`).join(' · ')}
                    </p>
                  </div>
                </section>
              )}

              <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-[28px] bg-white border border-gray-100 p-4 shadow-sm">
                  <PackageCheck size={22} className="text-green-500 mb-2" />
                  <p className="text-[9px] font-black uppercase text-gray-400">Productos con control</p>
                  <p className="text-2xl font-black text-gray-950">{products.filter(p => p.track_stock).length}</p>
                </div>
                <div className="rounded-[28px] bg-white border border-gray-100 p-4 shadow-sm">
                  <AlertTriangle size={22} className="text-red-500 mb-2" />
                  <p className="text-[9px] font-black uppercase text-gray-400">Stock bajo</p>
                  <p className="text-2xl font-black text-gray-950">{lowStockProducts.length}</p>
                </div>
                <div className="rounded-[28px] bg-white border border-gray-100 p-4 shadow-sm">
                  <ClipboardList size={22} className="text-orange-500 mb-2" />
                  <p className="text-[9px] font-black uppercase text-gray-400">Total catálogo</p>
                  <p className="text-2xl font-black text-gray-950">{products.length}</p>
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.9fr] gap-4">
                <section className="rounded-[32px] bg-white border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                      <input
                        value={query}
                        onChange={event => setQuery(event.target.value)}
                        placeholder="Buscar producto, categoría o código..."
                        className="w-full rounded-2xl border border-gray-100 bg-gray-50 py-4 pl-12 pr-4 text-sm font-bold outline-none focus:border-orange-300"
                      />
                    </div>
                  </div>

                  <div className="p-3 space-y-2 max-h-[62vh] overflow-y-auto">
                    {loading ? (
                      <div className="rounded-3xl bg-gray-50 p-8 text-center text-orange-500 font-black uppercase animate-pulse">Cargando inventario...</div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center text-gray-400">
                        <PackageSearch size={32} className="mx-auto mb-2 text-orange-300" />
                        <p className="text-xs font-black uppercase">No encontré productos</p>
                      </div>
                    ) : (
                      filteredProducts.map(product => {
                        const current = parseNumber(product.current_stock);
                        const minimum = parseNumber(product.stock_minimum);
                        const isLow = product.track_stock && minimum > 0 && current <= minimum;
                        const selected = selectedProduct?.id === product.id;

                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => selectProduct(product)}
                            className={`w-full rounded-3xl border p-4 text-left shadow-sm transition-transform active:scale-[0.99] ${
                              selected
                                ? 'bg-orange-50 border-orange-200 ring-2 ring-orange-100'
                                : isLow
                                  ? 'bg-red-50 border-red-100'
                                  : 'bg-white border-gray-100'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-black uppercase text-gray-900 line-clamp-2">{product.name}</p>
                                <p className="mt-1 text-[10px] font-bold text-gray-400">{product.category}</p>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {product.track_stock ? (
                                    <span className="rounded-full bg-green-50 border border-green-100 px-2 py-1 text-[8px] font-black uppercase text-green-600">Control activo</span>
                                  ) : (
                                    <span className="rounded-full bg-gray-50 border border-gray-100 px-2 py-1 text-[8px] font-black uppercase text-gray-400">Sin control</span>
                                  )}
                                  {isLow && (
                                    <span className="rounded-full bg-red-100 border border-red-200 px-2 py-1 text-[8px] font-black uppercase text-red-600">Stock bajo</span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-[8px] font-black uppercase text-gray-400">Stock</p>
                                <p className={`text-2xl font-black ${isLow ? 'text-red-500' : 'text-gray-950'}`}>{qty(current)}</p>
                                <p className="text-[9px] font-bold text-gray-400">mín. {qty(minimum)}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </section>

                <aside className="rounded-[32px] bg-white border border-gray-100 shadow-sm p-4 space-y-4">
                  {!selectedProduct ? (
                    <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-gray-400">
                      <PackageSearch size={34} className="mx-auto mb-3 text-orange-300" />
                      <p className="text-xs font-black uppercase">Selecciona un producto</p>
                      <p className="text-[10px] font-bold mt-2">Aquí podrás activar stock, poner mínimos y ajustar cantidades.</p>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-3xl bg-slate-950 text-white p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-300">Producto seleccionado</p>
                        <h3 className="mt-2 text-lg font-black uppercase italic leading-tight">{selectedProduct.name}</h3>
                        <p className="mt-1 text-xs font-bold text-white/50">Stock actual: {qty(selectedProduct.current_stock)} · Costo: ${money(selectedProduct.cost_price)}</p>
                      </div>

                      <section className="rounded-3xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Settings2 size={18} className="text-orange-500" />
                          <p className="text-xs font-black uppercase text-gray-900">Configuración</p>
                        </div>

                        <label className="block space-y-1">
                          <span className="text-[9px] font-black uppercase text-gray-400">Código de barras / código interno</span>
                          <input value={editBarcode} onChange={event => setEditBarcode(event.target.value)} className="w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-orange-300" placeholder="Ej: 7860001234567" />
                        </label>

                        <div className="grid grid-cols-2 gap-2">
                          <label className="block space-y-1">
                            <span className="text-[9px] font-black uppercase text-gray-400">Costo</span>
                            <input value={editCost} onChange={event => setEditCost(event.target.value)} inputMode="decimal" className="w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-orange-300" />
                          </label>
                          <label className="block space-y-1">
                            <span className="text-[9px] font-black uppercase text-gray-400">Stock mínimo</span>
                            <input value={editMinimum} onChange={event => setEditMinimum(event.target.value)} inputMode="decimal" className="w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-orange-300" />
                          </label>
                        </div>

                        <label className="flex items-center justify-between gap-3 rounded-2xl bg-white border border-gray-100 p-3">
                          <span className="text-[10px] font-black uppercase text-gray-600">Controlar stock en POS</span>
                          <input type="checkbox" checked={editTrackStock} onChange={event => setEditTrackStock(event.target.checked)} className="h-5 w-5 accent-orange-500" />
                        </label>

                        <button type="button" onClick={saveProductInventorySettings} disabled={saving} className="w-full rounded-2xl bg-slate-950 py-4 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-60 flex items-center justify-center gap-2">
                          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                          Guardar configuración
                        </button>
                      </section>

                      <section className="rounded-3xl border border-orange-100 bg-orange-50 p-4 space-y-3">
                        <p className="text-xs font-black uppercase text-gray-900">Ajustar cantidad</p>
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => { setMode('add'); setReason('Entrada de mercadería'); }} className={`rounded-2xl py-3 text-[10px] font-black uppercase flex items-center justify-center gap-2 ${mode === 'add' ? 'bg-green-500 text-white' : 'bg-white text-gray-500 border border-gray-100'}`}><Plus size={14} /> Sumar</button>
                          <button type="button" onClick={() => { setMode('remove'); setReason('Merma / ajuste de inventario'); }} className={`rounded-2xl py-3 text-[10px] font-black uppercase flex items-center justify-center gap-2 ${mode === 'remove' ? 'bg-red-500 text-white' : 'bg-white text-gray-500 border border-gray-100'}`}><Minus size={14} /> Restar</button>
                        </div>

                        <label className="block space-y-1">
                          <span className="text-[9px] font-black uppercase text-orange-700">Cantidad</span>
                          <input value={amount} onChange={event => setAmount(event.target.value)} inputMode="decimal" className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 text-lg font-black outline-none focus:border-orange-300" />
                        </label>

                        <label className="block space-y-1">
                          <span className="text-[9px] font-black uppercase text-orange-700">Motivo</span>
                          <input value={reason} onChange={event => setReason(event.target.value)} className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-orange-300" />
                        </label>

                        <button type="button" onClick={adjustStock} disabled={saving} className={`w-full rounded-2xl py-4 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-60 flex items-center justify-center gap-2 ${mode === 'add' ? 'bg-green-600' : 'bg-red-600'}`}>
                          {saving ? <Loader2 size={15} className="animate-spin" /> : mode === 'add' ? <Plus size={15} /> : <Minus size={15} />}
                          {mode === 'add' ? 'Sumar stock' : 'Restar stock'}
                        </button>
                      </section>

                      <section className="rounded-3xl border border-gray-100 bg-white p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <History size={18} className="text-orange-500" />
                            <p className="text-xs font-black uppercase text-gray-900">Historial de movimientos</p>
                          </div>
                          <button type="button" onClick={() => loadMovements(selectedProduct.id)} className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2 text-[9px] font-black uppercase text-gray-500">Actualizar</button>
                        </div>

                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                          {loadingMovements ? (
                            <div className="rounded-2xl bg-gray-50 p-4 text-center text-[10px] font-black uppercase text-orange-500 animate-pulse">Cargando historial...</div>
                          ) : movements.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-[10px] font-black uppercase text-gray-400">Aún no hay movimientos para este producto.</div>
                          ) : (
                            movements.map(movement => (
                              <div key={movement.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <span className={`inline-block rounded-full border px-2 py-1 text-[8px] font-black uppercase ${movementTone(movement.type)}`}>{movementLabel(movement.type)}</span>
                                    <p className="mt-2 text-[10px] font-black uppercase text-gray-800">{movement.description || 'Movimiento de inventario'}</p>
                                    <p className="mt-1 text-[9px] font-bold text-gray-400">
                                      {movement.created_at ? new Date(movement.created_at).toLocaleString('es-EC') : 'Sin fecha'} · {movement.created_by || 'admin'}
                                    </p>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="text-sm font-black text-gray-950">{qty(movement.stock_before)} → {qty(movement.stock_after)}</p>
                                    <p className="text-[9px] font-black uppercase text-gray-400">Cant. {qty(movement.quantity)}</p>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </section>
                    </>
                  )}
                </aside>
              </div>
            </main>
          </div>
        </div>
      )}
    </>
  );
}
