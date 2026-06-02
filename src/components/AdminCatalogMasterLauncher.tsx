import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Eye,
  EyeOff,
  ImageOff,
  Loader2,
  PackageCheck,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { products as seedProducts } from '../data/products';
import type { Category, Product } from '../types';

type CatalogProduct = Product & {
  barcode?: string | null;
  cost_price?: number | string | null;
  current_stock?: number | string | null;
  stock_minimum?: number | string | null;
  track_stock?: boolean | null;
  source?: 'base' | 'supabase';
};

type Draft = {
  id?: string;
  name: string;
  category: Category;
  subcategory: string;
  price: string;
  image: string;
  description: string;
  unit: string;
  barcode: string;
  cost_price: string;
  current_stock: string;
  stock_minimum: string;
  available: boolean;
  is_variable: boolean;
  track_stock: boolean;
};

const SUBS: Record<Category, string[]> = {
  Pollos: ['Enteros', 'Por Presas', 'Asados y Broaster', 'Menudencias'],
  Embutidos: ['Salchichas', 'Chorizos', 'Jamones', 'Mortadelas'],
  'Lácteos y refrigerados': ['Quesos', 'Leches', 'Yogures', 'Mantequillas y Cremas'],
  'Abarrotes y básicos': ['Arroz y Fideos', 'Aceites', 'Enlatados', 'Azúcar y Sal', 'Harinas'],
  'Salsas, aliños y aceites': ['Salsas Finas', 'Aliños Caseros', 'Vinagres y Aderezos'],
  Bebidas: ['Gaseosas', 'Jugos y Maltas', 'Aguas', 'Energizantes'],
  'Frutas y verduras': ['Frutas', 'Verduras', 'Hierbas y Legumbres'],
  'Snacks y dulces': ['Papas y Platanitos', 'Galletas', 'Chocolates y Caramelos'],
  'Cuidado personal': ['Champú y Jabón', 'Cremas', 'Desodorantes y Cuidado'],
  'Limpieza y hogar': ['Detergentes', 'Desinfectantes', 'Papel Higiénico y Toallas', 'Velas y Fósforos'],
};

const CATEGORIES = Object.keys(SUBS) as Category[];

const blankDraft = (): Draft => ({
  name: '',
  category: 'Abarrotes y básicos',
  subcategory: 'Arroz y Fideos',
  price: '',
  image: '',
  description: '',
  unit: '',
  barcode: '',
  cost_price: '',
  current_stock: '0',
  stock_minimum: '0',
  available: true,
  is_variable: false,
  track_stock: false,
});

const isAdminPath = () => typeof window !== 'undefined' && window.location.pathname.toLowerCase() === '/admin';

const n = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number.parseFloat(String(value || '').replace(',', '.').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value: unknown) => n(value).toFixed(2);

const normalized = (value: unknown) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const slug = (value: string) =>
  normalized(value).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `producto-${Date.now()}`;

const hasImage = (product: CatalogProduct) =>
  String(product.image || '').trim().length > 8 && !String(product.image || '').includes('logo-final');

const hasPrice = (product: CatalogProduct) =>
  Boolean(product.is_variable) || n(product.price) > 0 || String(product.price || '').toLowerCase().includes('consultar');

const lowStock = (product: CatalogProduct) =>
  Boolean(product.track_stock) && n(product.current_stock) <= n(product.stock_minimum);

const mergeCatalogProducts = (remoteProducts: CatalogProduct[]) => {
  const map = new Map<string, CatalogProduct>();

  seedProducts.forEach(product => {
    map.set(product.id, {
      ...product,
      available: product.available !== false,
      cost_price: 0,
      current_stock: 0,
      stock_minimum: 0,
      track_stock: false,
      source: 'base',
    });
  });

  remoteProducts.forEach(product => {
    map.set(product.id, {
      ...map.get(product.id),
      ...product,
      available: product.available !== false,
      source: 'supabase',
    });
  });

  return Array.from(map.values());
};

export default function AdminCatalogMasterLauncher() {
  const [visibleInAdmin, setVisibleInAdmin] = useState(() => isAdminPath());
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<CatalogProduct[]>(() => mergeCatalogProducts([]));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(() => blankDraft());
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
    if (!isSupabaseConfigured) {
      setProducts(mergeCatalogProducts([]));
      setError('No hay conexión con el catálogo. Mostrando lista guardada de respaldo.');
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: loadError } = await supabase
      .from('products')
      .select('*')
      .order('category')
      .order('name');

    if (loadError) {
      console.error(loadError);
      setError('No pude cargar los productos del sistema. Mostrando lista guardada de respaldo.');
      setProducts(mergeCatalogProducts([]));
    } else {
      setProducts(mergeCatalogProducts((data || []) as CatalogProduct[]));
    }

    setLoading(false);
  };

  useEffect(() => {
    if (open) loadProducts();
  }, [open]);

  const stats = useMemo(() => ({
    total: products.length,
    active: products.filter(p => p.available !== false).length,
    hidden: products.filter(p => p.available === false).length,
    noImage: products.filter(p => !hasImage(p)).length,
    noPrice: products.filter(p => !hasPrice(p)).length,
    stock: products.filter(p => p.track_stock).length,
    low: products.filter(lowStock).length,
  }), [products]);

  const filtered = useMemo(() => {
    const q = normalized(query).trim();
    return [...products]
      .filter(p => !q || normalized(`${p.name} ${p.category} ${p.subcategory || ''} ${p.barcode || ''} ${p.id}`).includes(q))
      .sort((a, b) => (a.category === b.category ? a.name.localeCompare(b.name) : a.category.localeCompare(b.category)));
  }, [products, query]);

  const selected = products.find(product => product.id === selectedId) || null;

  const selectProduct = (product: CatalogProduct) => {
    const category = (product.category || 'Abarrotes y básicos') as Category;
    setSelectedId(product.id);
    setDraft({
      id: product.id,
      name: product.name || '',
      category,
      subcategory: product.subcategory || SUBS[category]?.[0] || '',
      price: product.is_variable ? '' : String(product.price || '').replace(/^\$/, ''),
      image: product.image || '',
      description: product.description || '',
      unit: product.unit || '',
      barcode: product.barcode || '',
      cost_price: String(product.cost_price ?? ''),
      current_stock: String(product.current_stock ?? '0'),
      stock_minimum: String(product.stock_minimum ?? '0'),
      available: product.available !== false,
      is_variable: Boolean(product.is_variable),
      track_stock: Boolean(product.track_stock),
    });
    setMessage(null);
    setError(null);
  };

  const save = async () => {
    if (!draft.name.trim()) {
      setError('Falta el nombre del producto.');
      return;
    }

    if (!draft.is_variable && !draft.price.trim()) {
      setError('Falta el precio o activa valor variable.');
      return;
    }

    if (!isSupabaseConfigured) {
      setError('No hay conexión con el sistema de productos. Intenta nuevamente en unos segundos.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    const now = new Date().toISOString();
    const id = selectedId || draft.id || slug(draft.name);
    const payload: Record<string, unknown> = {
      id,
      name: draft.name.trim(),
      category: draft.category,
      subcategory: draft.subcategory || null,
      price: draft.is_variable ? 'Consultar precio' : `$${money(draft.price)}`,
      image: draft.image.trim() || null,
      description: draft.description.trim() || null,
      unit: draft.unit.trim() || null,
      barcode: draft.barcode.trim() || null,
      cost_price: n(draft.cost_price),
      current_stock: Math.max(0, n(draft.current_stock)),
      stock_minimum: Math.max(0, n(draft.stock_minimum)),
      available: draft.available,
      is_variable: draft.is_variable,
      track_stock: draft.track_stock,
      updated_at: now,
    };

    if (!selectedId || selected?.source === 'base') {
      payload.created_at = now;
    }

    const { error: saveError } = await supabase.from('products').upsert(payload);

    if (saveError) {
      console.error(saveError);
      setError(saveError.message || 'No pude guardar el producto.');
    } else {
      setMessage('Producto guardado. Ya está actualizado para clientes, caja e inventario.');
      await loadProducts();
      setSelectedId(id);
    }

    setSaving(false);
  };

  const toggleAvailability = async () => {
    if (!selected) return;

    if (!isSupabaseConfigured) {
      setError('No hay conexión con el sistema de productos. Intenta nuevamente en unos segundos.');
      return;
    }

    const next = selected.available === false;
    const now = new Date().toISOString();
    const payload = {
      id: selected.id,
      name: selected.name,
      category: selected.category,
      subcategory: selected.subcategory || null,
      price: selected.price || 'Consultar precio',
      image: selected.image || null,
      description: selected.description || null,
      unit: selected.unit || null,
      barcode: selected.barcode || null,
      cost_price: n(selected.cost_price),
      current_stock: Math.max(0, n(selected.current_stock)),
      stock_minimum: Math.max(0, n(selected.stock_minimum)),
      track_stock: Boolean(selected.track_stock),
      is_variable: Boolean(selected.is_variable),
      available: next,
      updated_at: now,
      created_at: selected.created_at || now,
    };

    const { error: toggleError } = await supabase.from('products').upsert(payload);

    if (toggleError) {
      setError('No pude cambiar disponibilidad.');
    } else {
      setMessage(next ? 'Producto visible nuevamente.' : 'Producto oculto para clientes y caja.');
      await loadProducts();
    }
  };

  if (!visibleInAdmin) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-44 right-5 z-[9995] flex items-center gap-2 rounded-[24px] bg-white px-5 py-4 text-xs font-black uppercase tracking-widest text-slate-950 shadow-2xl shadow-orange-100/70 ring-4 ring-white border border-orange-100 active:scale-95 transition-transform"
        >
          <ClipboardList size={18} /> Catálogo Maestro
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/72 backdrop-blur-sm p-2 sm:p-4 overflow-hidden">
          <div className="mx-auto max-w-7xl h-[calc(100dvh-16px)] sm:h-[calc(100dvh-32px)] rounded-[30px] bg-gray-50 shadow-2xl overflow-hidden border border-white/40 flex flex-col">
            <header className="shrink-0 bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 text-white px-4 py-3 sm:px-5 sm:py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-11 w-11 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <ClipboardList size={22} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-orange-300">Control del local</p>
                  <h2 className="text-lg sm:text-2xl font-black uppercase italic leading-none truncate">Catálogo Maestro</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-11 w-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center active:scale-90 transition-transform"
              >
                <X size={20} />
              </button>
            </header>

            <main className="flex-1 min-h-0 p-3 sm:p-4 flex flex-col gap-3 overflow-y-auto lg:overflow-hidden">
              <section className="shrink-0 rounded-[24px] bg-orange-50 border border-orange-100 px-4 py-3 flex items-start gap-3 text-orange-900">
                <Sparkles size={20} className="flex-shrink-0 text-orange-500" />
                <p className="text-[11px] font-bold leading-relaxed">
                  <b>Automático:</b> revisa, corrige y guarda productos desde aquí. Cada cambio queda listo para la app, la caja y el inventario.
                </p>
              </section>

              {(error || message) && (
                <section className="shrink-0">
                  {error && <div className="rounded-3xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-black uppercase tracking-wide text-red-600">{error}</div>}
                  {message && <div className="rounded-3xl border border-green-100 bg-green-50 px-4 py-3 text-xs font-black uppercase tracking-wide text-green-700">{message}</div>}
                </section>
              )}

              <section className="shrink-0 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {[
                  ['Catálogo', stats.total],
                  ['Activos', stats.active],
                  ['Ocultos', stats.hidden],
                  ['Sin imagen', stats.noImage],
                  ['Sin precio', stats.noPrice],
                  ['Con stock', stats.stock],
                  ['Stock bajo', stats.low],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-[22px] bg-white border border-gray-100 px-3 py-2.5 shadow-sm">
                    <p className="text-[8px] font-black uppercase text-gray-400">{label}</p>
                    <p className="text-xl sm:text-2xl font-black text-slate-950 leading-none mt-1">{value}</p>
                  </div>
                ))}
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-3 lg:flex-1 lg:min-h-0">
                <section className="rounded-[28px] bg-white border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[420px] lg:min-h-0 lg:h-full">
                  <div className="shrink-0 p-3 border-b border-gray-100 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase text-gray-900">Productos</p>
                      <p className="text-[10px] font-bold text-gray-400">Busca y selecciona para corregir.</p>
                    </div>
                    <button
                      type="button"
                      onClick={loadProducts}
                      disabled={loading}
                      className="h-11 w-11 rounded-2xl bg-slate-950 text-white flex items-center justify-center disabled:opacity-60"
                    >
                      {loading ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />}
                    </button>
                  </div>

                  <div className="shrink-0 p-3 border-b border-gray-100">
                    <div className="relative">
                      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                      <input
                        value={query}
                        onChange={event => setQuery(event.target.value)}
                        placeholder="Buscar nombre, categoría o código..."
                        className="w-full rounded-2xl border border-gray-100 bg-gray-50 py-3.5 pl-11 pr-4 text-sm font-bold outline-none focus:border-orange-300"
                      />
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
                    {filtered.map(product => {
                      const ready = hasImage(product) && hasPrice(product) && product.available !== false;
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => selectProduct(product)}
                          className={`w-full rounded-[22px] border p-3 text-left flex items-center gap-3 transition-all active:scale-[0.99] ${selectedId === product.id ? 'bg-orange-50 border-orange-200 ring-2 ring-orange-100' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                        >
                          <img src={product.image || '/logo-final.png'} alt={product.name} className="h-14 w-14 rounded-2xl object-cover border border-gray-100 bg-gray-50 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-black uppercase text-slate-950 truncate">{product.name}</p>
                              {ready ? <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" /> : <AlertTriangle size={14} className="text-orange-500 flex-shrink-0" />}
                              {product.source === 'base' && <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-[8px] font-black uppercase text-yellow-700 border border-yellow-100 flex-shrink-0">Por guardar</span>}
                            </div>
                            <p className="mt-1 text-[10px] font-bold text-gray-400 truncate">
                              {product.category} · {product.subcategory || 'Sin subcategoría'} · {product.is_variable ? 'Variable' : `$${money(product.price)}`}
                            </p>
                          </div>
                          {!hasImage(product) && <ImageOff size={16} className="text-yellow-600 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-[28px] bg-white border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[520px] lg:min-h-0 lg:h-full">
                  <div className="shrink-0 p-3 border-b border-gray-100 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase text-gray-900">Ficha del producto</p>
                      <p className="text-[10px] font-bold text-gray-400">Completa y guarda una sola vez.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedId(null); setDraft(blankDraft()); }}
                      className="rounded-2xl bg-orange-500 px-4 py-3 text-[10px] font-black uppercase text-white active:scale-95"
                    >
                      Nuevo
                    </button>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Nombre" className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3.5 text-sm font-bold outline-none" />
                      <input value={draft.price} disabled={draft.is_variable} onChange={e => setDraft({ ...draft, price: e.target.value })} placeholder="Precio Ej: 2.50" className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3.5 text-sm font-bold outline-none disabled:opacity-40" />
                      <select value={draft.category} onChange={e => { const category = e.target.value as Category; setDraft({ ...draft, category, subcategory: SUBS[category]?.[0] || '' }); }} className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3.5 text-sm font-bold outline-none">
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select value={draft.subcategory} onChange={e => setDraft({ ...draft, subcategory: e.target.value })} className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3.5 text-sm font-bold outline-none">
                        {(SUBS[draft.category] || []).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <input value={draft.unit} onChange={e => setDraft({ ...draft, unit: e.target.value })} placeholder="Unidad" className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3.5 text-sm font-bold outline-none" />
                      <input value={draft.barcode} onChange={e => setDraft({ ...draft, barcode: e.target.value })} placeholder="Código interno / barras" className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3.5 text-sm font-bold outline-none" />
                      <input value={draft.image} onChange={e => setDraft({ ...draft, image: e.target.value })} placeholder="Link imagen" className="md:col-span-2 rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3.5 text-sm font-bold outline-none" />
                      <textarea value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="Descripción corta" className="md:col-span-2 rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3.5 text-sm font-bold outline-none min-h-[78px] resize-none" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 rounded-[24px] bg-orange-50 border border-orange-100 p-3">
                      <input value={draft.cost_price} onChange={e => setDraft({ ...draft, cost_price: e.target.value })} placeholder="Costo" className="rounded-2xl bg-white border border-orange-100 px-4 py-3.5 text-sm font-bold outline-none" />
                      <input value={draft.current_stock} onChange={e => setDraft({ ...draft, current_stock: e.target.value })} placeholder="Stock actual" className="rounded-2xl bg-white border border-orange-100 px-4 py-3.5 text-sm font-bold outline-none" />
                      <input value={draft.stock_minimum} onChange={e => setDraft({ ...draft, stock_minimum: e.target.value })} placeholder="Stock mínimo" className="rounded-2xl bg-white border border-orange-100 px-4 py-3.5 text-sm font-bold outline-none" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <button type="button" onClick={() => setDraft({ ...draft, available: !draft.available })} className={`rounded-2xl border p-3 text-left ${draft.available ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                        {draft.available ? <Eye size={17} /> : <EyeOff size={17} />}
                        <p className="mt-2 text-[10px] font-black uppercase">{draft.available ? 'Visible' : 'Oculto'}</p>
                      </button>
                      <button type="button" onClick={() => setDraft({ ...draft, is_variable: !draft.is_variable })} className="rounded-2xl border p-3 text-left bg-gray-50 text-gray-600 border-gray-100">
                        <Sparkles size={17} />
                        <p className="mt-2 text-[10px] font-black uppercase">{draft.is_variable ? 'Variable' : 'Precio fijo'}</p>
                      </button>
                      <button type="button" onClick={() => setDraft({ ...draft, track_stock: !draft.track_stock })} className="rounded-2xl border p-3 text-left bg-gray-50 text-gray-600 border-gray-100">
                        <PackageCheck size={17} />
                        <p className="mt-2 text-[10px] font-black uppercase">{draft.track_stock ? 'Stock activo' : 'Sin stock'}</p>
                      </button>
                    </div>
                  </div>

                  <div className="shrink-0 bg-white/95 backdrop-blur border-t border-gray-100 p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selected && (
                      <button type="button" onClick={toggleAvailability} className="rounded-2xl bg-gray-100 px-5 py-4 text-[10px] font-black uppercase text-gray-600 active:scale-95">
                        {selected.available === false ? 'Mostrar producto' : 'Ocultar producto'}
                      </button>
                    )}
                    <button type="button" onClick={save} disabled={saving} className="rounded-2xl bg-slate-950 px-5 py-4 text-[10px] font-black uppercase tracking-widest text-white active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2">
                      <Save size={16} />
                      {saving ? 'Guardando...' : 'Guardar producto'}
                    </button>
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
