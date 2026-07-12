import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  ImagePlus,
  Loader2,
  PackagePlus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Upload,
  X,
} from 'lucide-react';
import { categories, products as seedProducts } from '../data/products';
import type { Category, Product } from '../types';

type CatalogResponse = {
  ok?: boolean;
  error?: string;
  products?: Product[];
};

type SaveResponse = {
  ok?: boolean;
  error?: string;
  code?: string;
  product?: Product;
  matches?: Product[];
};

type ProductDraft = {
  name: string;
  category: Category;
  subcategory: string;
  price: string;
  unit: string;
  description: string;
  imageData: string;
  imageName: string;
  isVariable: boolean;
};

const SUBCATEGORIES: Record<Category, string[]> = {
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

const UNITS = ['unidad', 'libra', 'kg', 'litro', 'paquete', 'caja', 'botella', 'funda'];
const CASCADA_PREFIX = 'cascada-';

const emptyDraft = (): ProductDraft => ({
  name: '',
  category: 'Abarrotes y básicos',
  subcategory: SUBCATEGORIES['Abarrotes y básicos'][0],
  price: '',
  unit: 'unidad',
  description: '',
  imageData: '',
  imageName: '',
  isVariable: false,
});

const normalizeText = (value: unknown) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const productKey = (product: Product) => normalizeText(product.name);

const isCascadaProduct = (product: Product) => String(product.id || '').startsWith(CASCADA_PREFIX);

const dedupeProducts = (list: Product[]) => {
  const map = new Map<string, Product>();

  list.forEach(product => {
    if (!product?.id || !product?.name) return;
    map.set(String(product.id), product);
  });

  return Array.from(map.values());
};

const similarityScore = (query: string, product: Product) => {
  const normalizedQuery = normalizeText(query);
  const normalizedName = productKey(product);

  if (!normalizedQuery || !normalizedName) return 0;
  if (normalizedName === normalizedQuery) return 100;
  if (normalizedName.startsWith(normalizedQuery) || normalizedQuery.startsWith(normalizedName)) return 90;
  if (normalizedName.includes(normalizedQuery) || normalizedQuery.includes(normalizedName)) return 80;

  const queryTokens = new Set(normalizedQuery.split(' ').filter(token => token.length > 1));
  const nameTokens = new Set(normalizedName.split(' ').filter(token => token.length > 1));
  const shared = Array.from(queryTokens).filter(token => nameTokens.has(token)).length;
  const union = new Set([...queryTokens, ...nameTokens]).size;

  return union > 0 ? Math.round((shared / union) * 70) : 0;
};

const moneyText = (value?: string | null) => {
  const raw = String(value || '').trim();
  return raw || 'Consultar precio';
};

const imageToCompressedDataUrl = async (file: File) => {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo seleccionado no es una imagen.');
  }

  if (file.size > 12 * 1024 * 1024) {
    throw new Error('La foto es demasiado pesada. Usa una imagen menor a 12 MB.');
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('No se pudo leer la foto.'));
      element.src = objectUrl;
    });

    const maxSide = 1280;
    const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * ratio));
    const height = Math.max(1, Math.round(image.height * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo preparar la foto.');

    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.78);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const playSuccessTone = () => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    [659.25, 783.99, 1046.5].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + index * 0.09;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.08, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.17);
    });

    window.setTimeout(() => void context.close(), 700);
  } catch {
    // El sonido es opcional.
  }
};

function ProductResult({ product }: { product: Product }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl bg-slate-100">
        <img
          src={product.image || '/logo-final.png'}
          alt=""
          className="h-full w-full object-contain p-1"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-sm font-black text-slate-900">{product.name}</p>
          <span
            className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase ${
              isCascadaProduct(product)
                ? 'bg-red-50 text-red-600'
                : 'bg-blue-50 text-blue-600'
            }`}
          >
            {isCascadaProduct(product) ? 'Cascada' : 'Ya existe'}
          </span>
        </div>
        <p className="mt-1 truncate text-[10px] font-bold text-slate-400">
          {product.category} · {moneyText(product.price)}
        </p>
      </div>
      <CheckCircle2 size={20} className="flex-shrink-0 text-emerald-500" />
    </div>
  );
}

export default function CascadaCatalogPortal() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [remoteProducts, setRemoteProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'search' | 'form'>('search');
  const [draft, setDraft] = useState<ProductDraft>(() => emptyDraft());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [allowSimilar, setAllowSimilar] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const catalog = useMemo(
    () => dedupeProducts([...seedProducts, ...remoteProducts]),
    [remoteProducts]
  );

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];

    return catalog
      .map(product => ({ product, score: similarityScore(query, product) }))
      .filter(result => result.score >= 28)
      .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name))
      .slice(0, 8)
      .map(result => result.product);
  }, [catalog, query]);

  const formMatches = useMemo(() => {
    if (!draft.name.trim()) return [];

    return catalog
      .map(product => ({ product, score: similarityScore(draft.name, product) }))
      .filter(result => result.score >= 55)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [catalog, draft.name]);

  const exactDuplicate = useMemo(() => {
    const canonical = normalizeText(draft.name);
    return canonical
      ? catalog.find(product => productKey(product) === canonical) || null
      : null;
  }, [catalog, draft.name]);

  const similarProducts = useMemo(
    () => formMatches.filter(result => result.score < 100).map(result => result.product),
    [formMatches]
  );

  const cascadaProducts = useMemo(
    () => remoteProducts.filter(isCascadaProduct).slice(0, 12),
    [remoteProducts]
  );

  const loadCatalog = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await fetch('/api/cascada-products', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const result = (await response.json().catch(() => ({}))) as CatalogResponse;

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'No se pudo cargar el catálogo.');
      }

      setRemoteProducts(Array.isArray(result.products) ? result.products : []);
    } catch (error) {
      setNotice({
        type: 'error',
        message: error instanceof Error ? error.message : 'No se pudo conectar con el catálogo.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
    const interval = window.setInterval(() => void loadCatalog(true), 30_000);
    return () => window.clearInterval(interval);
  }, [loadCatalog]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), notice.type === 'error' ? 6000 : 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const startNewProduct = () => {
    const next = emptyDraft();
    next.name = query.trim();
    setDraft(next);
    setAllowSimilar(false);
    setNotice(null);
    setMode('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCategory = (category: Category) => {
    setDraft(previous => ({
      ...previous,
      category,
      subcategory: SUBCATEGORIES[category]?.[0] || '',
    }));
  };

  const handlePhoto = async (file?: File | null) => {
    if (!file) return;
    setImageLoading(true);
    setNotice(null);

    try {
      const imageData = await imageToCompressedDataUrl(file);
      setDraft(previous => ({ ...previous, imageData, imageName: file.name }));
    } catch (error) {
      setNotice({
        type: 'error',
        message: error instanceof Error ? error.message : 'No se pudo preparar la foto.',
      });
    } finally {
      setImageLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const canSave = Boolean(
    draft.name.trim().length >= 2 &&
      draft.category &&
      !exactDuplicate &&
      (similarProducts.length === 0 || allowSimilar) &&
      !saving
  );

  const saveProduct = async () => {
    if (!canSave) return;
    setSaving(true);
    setNotice(null);

    try {
      const response = await fetch('/api/cascada-products', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: {
            name: draft.name.trim(),
            category: draft.category,
            subcategory: draft.subcategory || null,
            price: draft.isVariable || !draft.price.trim() ? 'Consultar precio' : draft.price.trim(),
            unit: draft.unit || null,
            description: draft.description.trim() || null,
            isVariable: draft.isVariable || !draft.price.trim(),
          },
          imageData: draft.imageData || null,
          imageName: draft.imageName || null,
          allowSimilar,
        }),
      });

      const result = (await response.json().catch(() => ({}))) as SaveResponse;

      if (!response.ok || !result.ok || !result.product) {
        if (Array.isArray(result.matches) && result.matches.length > 0) {
          setRemoteProducts(previous => dedupeProducts([...result.matches!, ...previous]));
        }
        throw new Error(result.error || 'No se pudo guardar el producto.');
      }

      setRemoteProducts(previous => dedupeProducts([result.product!, ...previous]));
      setQuery('');
      setDraft(emptyDraft());
      setAllowSimilar(false);
      setMode('search');
      setNotice({
        type: 'success',
        message: `${result.product.name} ya fue agregado y aparecerá en la app.`,
      });
      playSuccessTone();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setNotice({
        type: 'error',
        message: error instanceof Error ? error.message : 'No se pudo guardar el producto.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 px-5 text-white">
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-red-500/15 text-red-400">
            <Loader2 size={38} className="animate-spin" />
          </div>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.24em] text-white/60">
            Preparando catálogo
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-100 pb-28 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-red-500/20 bg-slate-950/95 text-white shadow-xl backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
          {mode === 'form' ? (
            <button
              type="button"
              onClick={() => setMode('search')}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white/10 active:scale-90"
              aria-label="Volver a buscar"
            >
              <ArrowLeft size={20} />
            </button>
          ) : (
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-red-950/30">
              <Store size={22} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-red-300">
              La Casa del Pollazo
            </p>
            <h1 className="truncate text-base font-black uppercase italic">
              {mode === 'form' ? 'Nuevo producto' : 'Catálogo La Cascada'}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => void loadCatalog(true)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 active:scale-90"
            aria-label="Actualizar catálogo"
          >
            <RefreshCw size={19} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {notice && (
        <div className="fixed inset-x-0 top-[78px] z-50 px-4">
          <div
            className={`mx-auto flex max-w-2xl items-start gap-3 rounded-[24px] border p-4 shadow-2xl animate-in slide-in-from-top-3 ${
              notice.type === 'success'
                ? 'border-emerald-200 bg-emerald-500 text-white'
                : notice.type === 'error'
                  ? 'border-red-200 bg-red-500 text-white'
                  : 'border-blue-200 bg-blue-500 text-white'
            }`}
          >
            {notice.type === 'success' ? <CheckCircle2 size={21} /> : <AlertCircle size={21} />}
            <p className="flex-1 text-xs font-black leading-relaxed">{notice.message}</p>
            <button type="button" onClick={() => setNotice(null)} aria-label="Cerrar aviso">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        {mode === 'search' ? (
          <>
            <section className="overflow-hidden rounded-[32px] bg-gradient-to-br from-red-600 via-red-500 to-orange-500 p-5 text-white shadow-xl shadow-red-200/60">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15">
                  <Search size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/70">
                    Paso obligatorio
                  </p>
                  <h2 className="mt-1 text-xl font-black uppercase italic leading-tight">
                    Busca antes de agregar
                  </h2>
                  <p className="mt-2 text-xs font-bold leading-relaxed text-white/80">
                    Así evitamos repetir productos que ya están visibles en la aplicación.
                  </p>
                </div>
              </div>

              <div className="relative mt-5">
                <Search
                  size={19}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Ejemplo: Yogurt Toni 1 litro"
                  autoComplete="off"
                  className="h-14 w-full rounded-2xl border-0 bg-white pl-12 pr-11 text-sm font-black text-slate-900 outline-none ring-4 ring-white/10 placeholder:text-slate-300"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl bg-slate-100 text-slate-400"
                    aria-label="Limpiar búsqueda"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </section>

            {query.trim() && (
              <section className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      Resultados
                    </p>
                    <h3 className="text-sm font-black text-slate-900">
                      {searchResults.length > 0
                        ? `${searchResults.length} parecido${searchResults.length !== 1 ? 's' : ''}`
                        : 'No encontramos ese producto'}
                    </h3>
                  </div>
                  {searchResults.length === 0 && <Sparkles size={22} className="text-orange-500" />}
                </div>

                <div className="space-y-2">
                  {searchResults.map(product => (
                    <ProductResult key={product.id} product={product} />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={startNewProduct}
                  className={`mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl font-black uppercase tracking-wide text-white shadow-lg active:scale-[0.98] ${
                    searchResults.some(product => productKey(product) === normalizeText(query))
                      ? 'cursor-not-allowed bg-slate-300 shadow-none'
                      : 'bg-gradient-to-r from-red-600 to-orange-500 shadow-red-200'
                  }`}
                  disabled={searchResults.some(product => productKey(product) === normalizeText(query))}
                >
                  {searchResults.some(product => productKey(product) === normalizeText(query)) ? (
                    <>
                      <Check size={18} /> Ya está agregado
                    </>
                  ) : (
                    <>
                      <PackagePlus size={18} /> No aparece: agregarlo
                    </>
                  )}
                </button>
              </section>
            )}

            {!query.trim() && (
              <section className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase text-slate-900">Solo catálogo</h3>
                    <p className="mt-1 text-xs font-bold leading-relaxed text-slate-500">
                      Este enlace no muestra pedidos, clientes, caja ni información del administrador. Solo permite revisar y agregar productos.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {cascadaProducts.length > 0 && (
              <section className="rounded-[30px] border border-red-100 bg-red-50/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-red-400">
                      La Cascada
                    </p>
                    <h3 className="text-sm font-black text-slate-900">Agregados recientemente</h3>
                  </div>
                  <span className="rounded-full bg-red-500 px-3 py-1 text-[9px] font-black text-white">
                    {cascadaProducts.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {cascadaProducts.slice(0, 5).map(product => (
                    <ProductResult key={product.id} product={product} />
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <>
            <section className="rounded-[32px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                  <Camera size={22} />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Foto del producto
                  </p>
                  <h2 className="text-sm font-black text-slate-900">Cámara o galería</h2>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={event => void handlePhoto(event.target.files?.[0])}
              />

              {draft.imageData ? (
                <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-slate-100">
                  <img src={draft.imageData} alt="Vista previa" className="h-64 w-full object-contain" />
                  <div className="absolute inset-x-3 bottom-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950/90 text-[10px] font-black uppercase text-white backdrop-blur"
                    >
                      <Camera size={16} /> Cambiar foto
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraft(previous => ({ ...previous, imageData: '', imageName: '' }))}
                      className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500 text-white"
                      aria-label="Quitar foto"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageLoading}
                  className="flex min-h-44 w-full flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-red-200 bg-red-50/50 p-5 text-red-600 active:scale-[0.99]"
                >
                  {imageLoading ? (
                    <Loader2 size={34} className="animate-spin" />
                  ) : (
                    <ImagePlus size={38} />
                  )}
                  <span className="mt-3 text-xs font-black uppercase">
                    {imageLoading ? 'Preparando foto' : 'Tomar o elegir foto'}
                  </span>
                  <span className="mt-1 text-[10px] font-bold text-red-400">
                    La imagen se comprime automáticamente
                  </span>
                </button>
              )}
            </section>

            <section className="space-y-4 rounded-[32px] border border-slate-200 bg-white p-4 shadow-sm">
              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Nombre exacto
                </span>
                <input
                  value={draft.name}
                  onChange={event => {
                    setDraft(previous => ({ ...previous, name: event.target.value }));
                    setAllowSimilar(false);
                  }}
                  placeholder="Ejemplo: Yogurt Toni frutilla 1 L"
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black outline-none focus:border-red-400 focus:bg-white"
                />
              </label>

              {exactDuplicate && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={19} className="mt-0.5 flex-shrink-0 text-red-600" />
                    <div>
                      <p className="text-[10px] font-black uppercase text-red-700">Producto repetido</p>
                      <p className="mt-1 text-xs font-bold text-red-600">
                        “{exactDuplicate.name}” ya está en el catálogo. No se puede volver a agregar.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!exactDuplicate && similarProducts.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={19} className="mt-0.5 flex-shrink-0 text-amber-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase text-amber-700">Revisa estos parecidos</p>
                      <div className="mt-2 space-y-1">
                        {similarProducts.slice(0, 3).map(product => (
                          <p key={product.id} className="truncate text-xs font-bold text-amber-700">
                            • {product.name}
                          </p>
                        ))}
                      </div>
                      <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-xl bg-white/80 p-2">
                        <input
                          type="checkbox"
                          checked={allowSimilar}
                          onChange={event => setAllowSimilar(event.target.checked)}
                          className="mt-0.5 h-4 w-4 accent-red-600"
                        />
                        <span className="text-[10px] font-black leading-relaxed text-amber-800">
                          Confirmo que es una presentación, tamaño o sabor diferente.
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Categoría
                  </span>
                  <select
                    value={draft.category}
                    onChange={event => handleCategory(event.target.value as Category)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black outline-none focus:border-red-400"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Subcategoría
                  </span>
                  <select
                    value={draft.subcategory}
                    onChange={event => setDraft(previous => ({ ...previous, subcategory: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black outline-none focus:border-red-400"
                  >
                    {(SUBCATEGORIES[draft.category] || []).map(subcategory => (
                      <option key={subcategory} value={subcategory}>
                        {subcategory}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Precio
                  </span>
                  <input
                    value={draft.price}
                    onChange={event => setDraft(previous => ({ ...previous, price: event.target.value }))}
                    disabled={draft.isVariable}
                    inputMode="decimal"
                    placeholder="$0.00"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black outline-none disabled:opacity-40 focus:border-red-400"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Unidad
                  </span>
                  <select
                    value={draft.unit}
                    onChange={event => setDraft(previous => ({ ...previous, unit: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black outline-none focus:border-red-400"
                  >
                    {UNITS.map(unit => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div>
                  <p className="text-xs font-black text-slate-900">Precio por confirmar</p>
                  <p className="mt-1 text-[10px] font-bold text-slate-400">
                    Úsalo cuando el precio cambia o todavía no está definido.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={draft.isVariable}
                  onChange={event => setDraft(previous => ({ ...previous, isVariable: event.target.checked }))}
                  className="h-5 w-5 flex-shrink-0 accent-red-600"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Descripción opcional
                </span>
                <textarea
                  value={draft.description}
                  onChange={event => setDraft(previous => ({ ...previous, description: event.target.value }))}
                  placeholder="Presentación, sabor, tamaño o detalle útil para el cliente"
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold outline-none focus:border-red-400 focus:bg-white"
                />
              </label>
            </section>

            <section className="rounded-[28px] border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck size={22} className="flex-shrink-0 text-blue-600" />
                <div>
                  <p className="text-xs font-black uppercase text-blue-800">Publicación automática</p>
                  <p className="mt-1 text-[11px] font-bold leading-relaxed text-blue-700/80">
                    Al guardar, el producto entra directamente al catálogo de clientes. No modifica pedidos, caja ni datos del administrador.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {mode === 'form' && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-12px_35px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-2xl gap-2">
            <button
              type="button"
              onClick={() => setMode('search')}
              className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 active:scale-95"
              aria-label="Cancelar"
            >
              <X size={21} />
            </button>
            <button
              type="button"
              onClick={() => void saveProduct()}
              disabled={!canSave}
              className={`flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl text-xs font-black uppercase tracking-wide text-white transition-all active:scale-[0.98] ${
                canSave
                  ? 'bg-gradient-to-r from-red-600 to-orange-500 shadow-lg shadow-red-200'
                  : 'cursor-not-allowed bg-slate-300'
              }`}
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Guardando
                </>
              ) : (
                <>
                  <Upload size={18} /> Agregar al catálogo <ChevronRight size={17} />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
