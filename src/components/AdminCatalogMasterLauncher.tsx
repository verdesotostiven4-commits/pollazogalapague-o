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
  ShoppingBag,
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
  show_in_app?: boolean | null;
  show_in_pos?: boolean | null;
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
  show_in_app: boolean;
  show_in_pos: boolean;
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
  show_in_app: true,
  show_in_pos: true,
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
      show_in_app: product.show_in_app !== false,
      show_in_pos: product.show_in_pos !== false,
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
      show_in_app: product.show_in_app !== false,
      show_in_pos: product.show_in_pos !== false,
      source: 'supabase',
    });
  });

  return Array.from(map.values());
};

const buildInsertPayloadFromBaseProduct = (product: CatalogProduct, now: string) => ({
  id: product.id,
  name: product.name,
  category: product.category,
  subcategory: product.subcategory || null,
  price: product.price || (product.is_variable ? 'Consultar precio' : '$0.00'),
  image: product.image || null,
  description: product.description || null,
  unit: product.unit || null,
  barcode: product.barcode || null,
  cost_price: n(product.cost_price),
  current_stock: Math.max(0, n(product.current_stock)),
  stock_minimum: Math.max(0, n(product.stock_minimum)),
  track_stock: Boolean(product.track_stock),
  is_variable: Boolean(product.is_variable),
  available: product.available !== false,
  show_in_app: product.show_in_app !== false,
  show_in_pos: product.show_in_pos !== false,
  created_at: now,
  updated_at: now,
});

const statusPill = (active: boolean, activeText: string, inactiveText: string) => active ? activeText : inactiveText;

export default function AdminCatalogMasterLauncher() {
  const [visibleInAdmin, setVisibleInAdmin] = useState(() => isAdminPath());
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<CatalogProduct[]>(() => mergeCatalogProducts([]));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(() => blankDraft());
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncingCatalog, setSyncingCatalog] = useState(false);
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
    inApp: products.filter(p => p.show_in_app !== false).length,
    inPos: products.filter(p => p.show_in_pos !== false).length,
    hidden: products.filter(p => p.available === false).length,
    noImage: products.filter(p => !hasImage(p)).length,
    noPrice: products.filter(p => !hasPrice(p)).length,
    stock: products.filter(p => p.track_stock).length,
    low: products.filter(lowStock).length,
    pending: products.filter(p => p.source === 'base').length,
  }), [products]);

  const filtered = useMemo(() => {
    const q = normalized(query).trim();
    return [...products]
      .filter(p => !q || normalized(`${p.name} ${p.category} ${p.subcategory || ''} ${p.barcode || ''} ${p.id}`).includes(q))
      .sort((a, b) => {
        if ((a.source === 'base') !== (b.source === 'base')) return a.source === 'base' ? -1 : 1;
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.name.localeCompare(b.name);
      });
  }, [products, query]);

  const selected = products.find(product => product.id === selectedId) || null;

  const activateFullCatalog = async () => {
    if (!isSupabaseConfigured) {
      setError('No hay conexión con el sistema de productos. Intenta nuevamente en unos segundos.');
      return;
    }

    const pendingProducts = products.filter(product => product.source === 'base');

    if (pendingProducts.length === 0) {
      setMessage('Catálogo completo listo. No hay productos pendientes.');
      return;
    }

    const confirmed = window.confirm(`Se activarán ${pendingProducts.length} productos para que aparezcan en el sistema del local. No se tocarán productos que ya fueron editados. ¿Continuar?`);
    if (!confirmed) return;

    setSyncingCatalog(true);
    setError(null);
    setMessage(null);

    const now = new Date().toISOString();
    const payload = pendingProducts.map(product => buildInsertPayloadFromBaseProduct(product, now));

    const { error: syncError } = await supabase.from('products').upsert(payload);

    if (syncError) {
      console.error(syncError);
      setError(syncError.message || 'No pude activar el catálogo completo.');
    } else {
      setMessage(`Catálogo completo activado. ${pendingProducts.length} productos quedaron listos para clientes, caja e inventario.`);
      await loadProducts();
    }

    setSyncingCatalog(false);
  };

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
      show_in_app: product.show_in_app !== false,
      show_in_pos: product.show_in_pos !== false,
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
      show_in_app: draft.show_in_app,
      show_in_pos: draft.show_in_pos,
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
      show_in_app: selected.show_in_app !== false,
      show_in_pos: selected.show_in_pos !== false,
      updated_at: now,
      created_at: selected.created_at || now,
    };

    const { error: toggleError } = await supabase.from('products').upsert(payload);

    if (toggleError) {
      setError('No pude cambiar disponibilidad.');
    } else {
      setMessage(next ? 'Producto marcado como disponible.' : 'Producto marcado como agotado. Puede seguir visible, pero no se podrá comprar.');
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
            <header className="shrink-0 bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 text-white px-4 py-4 sm:px-5 sm:py-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-12 w-12 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <ClipboardList size={23} />
                </div>
                <div className="min-w-0 pb-0.5">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-orange-300">Control del local</p>
                  <h2 className="text-xl sm:text-3xl font-black uppercase italic leading-tight break-words">Catálogo Maestro</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-11 w-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center active:scale-90 transition-transform"
                aria-label="Cerrar catálogo maestro"
              >
                <X size={20} />
              </button>
            </header>

            <main className="flex-1 min-h-0 p-3 sm:p-4 flex flex-col gap-3 overflow-y-auto lg:overflow-hidden">
              <section className="shrink-0 rounded-[24px] bg-orange-50 border border-orange-100 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-orange-900">
                <div className="flex items-start gap-3">
                  <Sparkles size={20} className="flex-shrink-0 text-orange-500" />
                  <p className="text-[11px] font-bold leading-relaxed">
                    <b>Control rápido:</b> decide si un producto sale en la app, se vende en caja, está disponible y controla inventario.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={activateFullCatalog}
                  disabled={syncingCatalog || loading || stats.pending === 0}
                  className="shrink-0 rounded-2xl bg-slate-950 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:bg-gray-300 disabled:text-gray-500 active:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                  {syncingCatalog ? <Loader2 size={15} className="animate-spin" /> : <PackageCheck size={15} />}
                  {stats.pending > 0 ? `Activar catálogo (${stats.pending})` : 'Catálogo listo'}
                </button>
              </section>

              {(error || message) && (
                <section className="shrink-0">
                  {error && <div className="rounded-3xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-black uppercase tracking-wide text-red-600">{error}</div>}
                  {message && <div className="rounded-3xl border border-green-100 bg-green-50 px-4 py-3 text-xs font-black uppercase tracking-wide text-green-700">{message}</div>}
                </section>
              )}

              <section className="shrink-0 grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
                {[
                  ['Catálogo', stats.total],
                  ['Activos', stats.active],
                  ['En app', stats.inApp],
                  ['En caja', stats.inPos],
                  ['Pendientes', stats.pending],
                  ['Agotados', stats.hidden],
                  ['Sin imagen', stats.noImage],
                  ['Sin precio', stats.noPrice],
                  ['Control stock', stats.stock],
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
                      <p className="text-[10px] font-bold text-gray-400">Busca, selecciona y desliza para ver más.</p>
                    </div>
                    <button
                      type="button"
                      onClick={loadProducts}
                      disabled={loading}
                      className="h-11 w-11 rounded-2xl bg-slate-950 text-white flex items-center justify-center disabled:opacity-60"
                      aria-label="Actualizar productos"
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

                  <div className="relative flex-1 min-h-0">
                    <div className="h-full overflow-y-auto p-3 pb-12 space-y-2 [scrollbar-width:thin] [scrollbar-color:#fb923c_#f3f4f6]">
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
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-xs font-black uppercase text-slate-950 truncate max-w-[170px]">{product.name}</p>
                                {ready ? <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" /> : <AlertTriangle size={14} className="text-orange-500 flex-shrink-0" />}
                                {product.source === 'base' && <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-[8px] font-black uppercase text-yellow-700 border border-yellow-100 flex-shrink-0">Pendiente</span>}
                                {product.available === false && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[8px] font-black uppercase text-red-600 border border-red-100">Agotado</span>}
                                {product.show_in_app === false && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-black uppercase text-slate-500">No app</span>}
                                {product.show_in_pos === false && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-black uppercase text-slate-500">No caja</span>}
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
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/90 to-transparent px-3 pb-3 pt-8">
                      <p className="mx-auto w-fit rounded-full bg-orange-50 border border-orange-100 px-3 py-1 text-[9px] font-black uppercase text-orange-600 shadow-sm">↓ Desliza para ver más productos</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-[28px] bg-white border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[520px] lg:min-h-0 lg:h-full">
                  <div className="shrink-0 p-3 border-b border-gray-100 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase text-gray-900">Ficha del producto</p>
                      <p className="text-[10px] font-bold text-gray-400">Edita datos, estados y stock. Desliza si hay más abajo.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedId(null); setDraft(blankDraft()); }}
                      className="rounded-2xl bg-orange-500 px-4 py-3 text-[10px] font-black uppercase text-white active:scale-95"
                    >
                      Nuevo
                    </button>
                  </div>

                  <div className="relative flex-1 min-h-0">
                    <div className="h-full overflow-y-auto p-3 pb-16 space-y-3 [scrollbar-width:thin] [scrollbar-color:#fb923c_#f3f4f6]">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Nombre" className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3.5 text-sm font-bold outline-none" />
                        <input value={draft.price} disabled={draft.is_variable} onChange={e => setDraft({ ...draft, price: e.target.value })} placeholder="Precio Ej: 2.50" className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3.5 text-sm font-bold outline-none disabled:opacity-40" />
                        <select value={draft.category} onChange={e => { const category = e.target.value as Category; setDraft({ ...draft, category, subcategory: SUBS[category]?.[0] || '' }); }} className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3.5 text-sm font-bold outline-none">
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select value={draft.subcategory} onChange={e => setDraft({ ...draft, subcategory: e.target.value })} className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3.5 text-sm font-bold outline-none">
                          {(SUBS[draft.category] || []).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <input value={draft.unit} onChange={e => setDraft({ ...draft, unit: e.target.value })} placeholder="Unidad. Ej: libra, unidad, kg" className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3.5 text-sm font-bold outline-none" />
                        <input value={draft.barcode} onChange={e => setDraft({ ...draft, barcode: e.target.value })} placeholder="Código interno / código de barras" className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3.5 text-sm font-bold outline-none" />
                        <input value={draft.image} onChange={e => setDraft({ ...draft, image: e.target.value })} placeholder="Link imagen" className="md:col-span-2 rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3.5 text-sm font-bold outline-none" />
                        <textarea value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="Descripción corta" className="md:col-span-2 rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3.5 text-sm font-bold outline-none min-h-[78px] resize-none" />
                      </div>

                      <div className="rounded-[24px] bg-orange-50 border border-orange-100 p-3">
                        <p className="mb-2 text-[10px] font-black uppercase text-orange-700">Inventario y costo</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                          <input value={draft.cost_price} onChange={e => setDraft({ ...draft, cost_price: e.target.value })} placeholder="Costo para el local" className="rounded-2xl bg-white border border-orange-100 px-4 py-3.5 text-sm font-bold outline-none" />
                          <input value={draft.current_stock} onChange={e => setDraft({ ...draft, current_stock: e.target.value })} placeholder="Stock actual" className="rounded-2xl bg-white border border-orange-100 px-4 py-3.5 text-sm font-bold outline-none" />
                          <input value={draft.stock_minimum} onChange={e => setDraft({ ...draft, stock_minimum: e.target.value })} placeholder="Avisar cuando llegue a" className="rounded-2xl bg-white border border-orange-100 px-4 py-3.5 text-sm font-bold outline-none" />
                        </div>
                        <p className="mt-2 text-[9px] font-bold text-orange-700/80">Activa “Control stock” solo en productos que quieres descontar automáticamente.</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                        <button type="button" onClick={() => setDraft({ ...draft, show_in_app: !draft.show_in_app })} className={`rounded-2xl border p-3 text-left ${draft.show_in_app ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`} title="Controla si el cliente ve este producto en la app">
                          <Eye size={17} />
                          <p className="mt-2 text-[10px] font-black uppercase">{statusPill(draft.show_in_app, 'En app', 'No app')}</p>
                          <p className="mt-1 text-[8px] font-bold opacity-70">Visible para clientes</p>
                        </button>
                        <button type="button" onClick={() => setDraft({ ...draft, show_in_pos: !draft.show_in_pos })} className={`rounded-2xl border p-3 text-left ${draft.show_in_pos ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`} title="Controla si el cajero ve este producto en caja">
                          <ShoppingBag size={17} />
                          <p className="mt-2 text-[10px] font-black uppercase">{statusPill(draft.show_in_pos, 'En caja', 'No caja')}</p>
                          <p className="mt-1 text-[8px] font-bold opacity-70">Visible en POS</p>
                        </button>
                        <button type="button" onClick={() => setDraft({ ...draft, available: !draft.available })} className={`rounded-2xl border p-3 text-left ${draft.available ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`} title="Disponible vende normal; agotado se muestra bloqueado">
                          {draft.available ? <Eye size={17} /> : <EyeOff size={17} />}
                          <p className="mt-2 text-[10px] font-black uppercase">{statusPill(draft.available, 'Disponible', 'Agotado')}</p>
                          <p className="mt-1 text-[8px] font-bold opacity-70">Venta permitida</p>
                        </button>
                        <button type="button" onClick={() => setDraft({ ...draft, is_variable: !draft.is_variable })} className={`rounded-2xl border p-3 text-left ${draft.is_variable ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-gray-50 text-gray-600 border-gray-100'}`} title="Variable sirve para vender por valor o peso">
                          <Sparkles size={17} />
                          <p className="mt-2 text-[10px] font-black uppercase">{statusPill(draft.is_variable, 'Variable', 'Precio fijo')}</p>
                          <p className="mt-1 text-[8px] font-bold opacity-70">Precio al vender</p>
                        </button>
                        <button type="button" onClick={() => setDraft({ ...draft, track_stock: !draft.track_stock })} className={`rounded-2xl border p-3 text-left ${draft.track_stock ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-50 text-gray-600 border-gray-100'}`} title="Control stock descuenta unidades al vender">
                          <PackageCheck size={17} />
                          <p className="mt-2 text-[10px] font-black uppercase">{statusPill(draft.track_stock, 'Control stock', 'Sin control')}</p>
                          <p className="mt-1 text-[8px] font-bold opacity-70">Descuenta inventario</p>
                        </button>
                      </div>

                      <div className="rounded-[22px] bg-slate-50 border border-slate-100 p-3 text-[10px] font-bold text-slate-500 leading-relaxed">
                        <b className="text-slate-900">Guía rápida:</b> “En app” muestra al cliente. “En caja” muestra al cajero. “Disponible” permite comprar. “Agotado” puede seguir apareciendo, pero bloqueado. “Control stock” descuenta inventario al vender.
                      </div>
                    </div>

                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/90 to-transparent px-3 pb-3 pt-8">
                      <p className="mx-auto w-fit rounded-full bg-orange-50 border border-orange-100 px-3 py-1 text-[9px] font-black uppercase text-orange-600 shadow-sm">↓ Desliza para más opciones</p>
                    </div>
                  </div>

                  <div className="shrink-0 bg-white/95 backdrop-blur border-t border-gray-100 p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selected && (
                      <button type="button" onClick={toggleAvailability} className={`rounded-2xl px-5 py-4 text-[10px] font-black uppercase active:scale-95 ${selected.available === false ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                        {selected.available === false ? 'Marcar disponible' : 'Marcar agotado'}
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
