import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getPanelSessionSecret, parseCookies } from '../panel-session.js';

type ApiRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type ApiResponse = {
  status: (code: number) => { json: (payload: unknown) => unknown };
  setHeader: (name: string, value: string | string[]) => void;
};

type ProductInput = {
  name?: unknown;
  category?: unknown;
  subcategory?: unknown;
  price?: unknown;
  unit?: unknown;
  description?: unknown;
  isVariable?: unknown;
};

type RequestBody = {
  product?: ProductInput;
  imageData?: unknown;
  imageName?: unknown;
  allowSimilar?: unknown;
};

type CatalogProduct = {
  id: string;
  name: string;
  category?: string | null;
  subcategory?: string | null;
  price?: string | null;
  unit?: string | null;
  description?: string | null;
  image?: string | null;
  badge?: string | null;
  available?: boolean | null;
  show_in_app?: boolean | null;
  show_in_pos?: boolean | null;
  is_variable?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const CATALOG_COOKIE = 'pollazo_cascada_catalog_session';
const CATALOG_SESSION_SECONDS = 30 * 24 * 60 * 60;
const IMAGE_BUCKET = 'product-images';
const MAX_IMAGE_BYTES = 1_800_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const PRODUCT_FIELDS = [
  'id',
  'name',
  'category',
  'subcategory',
  'price',
  'unit',
  'description',
  'image',
  'badge',
  'available',
  'show_in_app',
  'show_in_pos',
  'is_variable',
  'created_at',
  'updated_at',
].join(',');

const CATEGORIES = new Set([
  'Pollos',
  'Embutidos',
  'Lácteos y refrigerados',
  'Abarrotes y básicos',
  'Salsas, aliños y aceites',
  'Bebidas',
  'Frutas y verduras',
  'Snacks y dulces',
  'Cuidado personal',
  'Limpieza y hogar',
]);

const cleanText = (value: unknown, max = 240) =>
  String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, max);

const normalizeText = (value: unknown) =>
  cleanText(value, 300)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const slug = (value: unknown) =>
  normalizeText(value).replace(/\s+/g, '-').slice(0, 80) || 'producto';

const headerValue = (req: ApiRequest, name: string) => {
  const direct = req.headers?.[name] ?? req.headers?.[name.toLowerCase()];
  return Array.isArray(direct) ? direct[0] || '' : String(direct || '');
};

const bodyOf = (request: ApiRequest): RequestBody => {
  if (!request.body) return {};

  if (typeof request.body === 'string') {
    try {
      return JSON.parse(request.body) as RequestBody;
    } catch {
      return {};
    }
  }

  return typeof request.body === 'object' && !Array.isArray(request.body)
    ? (request.body as RequestBody)
    : {};
};

const bytesToBase64Url = (bytes: Uint8Array) => {
  let binary = '';
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

const base64UrlToBytes = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
};

const importSigningKey = (secret: string) =>
  globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(`pollazo-cascada-catalog:${secret}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );

const createCatalogToken = async (secret: string) => {
  const now = Math.floor(Date.now() / 1000);
  const nonce = new Uint8Array(18);
  globalThis.crypto.getRandomValues(nonce);
  const payload = {
    version: 1,
    scope: 'cascada_catalog',
    issuedAt: now,
    expiresAt: now + CATALOG_SESSION_SECONDS,
    nonce: bytesToBase64Url(nonce),
  };
  const payloadSegment = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await importSigningKey(secret);
  const signature = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(payloadSegment));
  return `${payloadSegment}.${bytesToBase64Url(new Uint8Array(signature))}`;
};

const verifyCatalogToken = async (token: string, secret: string) => {
  const [payloadSegment, signatureSegment, extra] = String(token || '').split('.');
  if (!payloadSegment || !signatureSegment || extra) return false;

  try {
    const key = await importSigningKey(secret);
    const valid = await globalThis.crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlToBytes(signatureSegment),
      encoder.encode(payloadSegment)
    );

    if (!valid) return false;

    const payload = JSON.parse(
      decoder.decode(base64UrlToBytes(payloadSegment))
    ) as Record<string, unknown>;
    const now = Math.floor(Date.now() / 1000);
    const issuedAt = Number(payload.issuedAt || 0);
    const expiresAt = Number(payload.expiresAt || 0);

    return (
      payload.version === 1 &&
      payload.scope === 'cascada_catalog' &&
      Number.isInteger(issuedAt) &&
      Number.isInteger(expiresAt) &&
      issuedAt <= now + 60 &&
      expiresAt > now &&
      expiresAt - issuedAt <= CATALOG_SESSION_SECONDS
    );
  } catch {
    return false;
  }
};

const buildCatalogCookie = (token: string) => {
  const secure = process.env.NODE_ENV === 'development' ? '' : '; Secure';
  return `${CATALOG_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${CATALOG_SESSION_SECONDS}${secure}`;
};

const getServerClient = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

const similarityScore = (left: string, right: string) => {
  const a = normalizeText(left);
  const b = normalizeText(right);

  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.startsWith(b) || b.startsWith(a)) return 90;
  if (a.includes(b) || b.includes(a)) return 80;

  const aTokens = new Set(a.split(' ').filter(token => token.length > 1));
  const bTokens = new Set(b.split(' ').filter(token => token.length > 1));
  const shared = Array.from(aTokens).filter(token => bTokens.has(token)).length;
  const union = new Set([...aTokens, ...bTokens]).size;
  return union > 0 ? Math.round((shared / union) * 70) : 0;
};

const formatPrice = (value: unknown, isVariable: boolean) => {
  if (isVariable) return 'Consultar precio';

  const raw = cleanText(value, 40).replace(',', '.');
  const parsed = Number.parseFloat(raw.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) && parsed >= 0 ? `$${parsed.toFixed(2)}` : 'Consultar precio';
};

const decodeImageData = (value: unknown) => {
  const raw = String(value || '');
  if (!raw) return null;

  const match = raw.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error('Formato de imagen no válido.');

  const contentType = match[1];
  const binary = atob(match[2]);
  if (binary.length > MAX_IMAGE_BYTES) {
    throw new Error('La imagen comprimida todavía es demasiado pesada.');
  }

  return {
    contentType,
    bytes: Uint8Array.from(binary, character => character.charCodeAt(0)),
  };
};

const ensureImageBucket = async (supabase: SupabaseClient) => {
  const current = await supabase.storage.getBucket(IMAGE_BUCKET);
  if (!current.error && current.data) return;

  const created = await supabase.storage.createBucket(IMAGE_BUCKET, {
    public: true,
    fileSizeLimit: MAX_IMAGE_BYTES,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  });

  if (created.error && !String(created.error.message || '').toLowerCase().includes('already exists')) {
    throw created.error;
  }
};

const uploadProductImage = async (
  supabase: SupabaseClient,
  name: string,
  imageData: unknown
) => {
  const image = decodeImageData(imageData);
  if (!image) return null;

  await ensureImageBucket(supabase);

  const extension = image.contentType === 'image/png' ? 'png' : image.contentType === 'image/webp' ? 'webp' : 'jpg';
  const month = new Date().toISOString().slice(0, 7);
  const filePath = `cascada/${month}/${slug(name)}-${globalThis.crypto.randomUUID()}.${extension}`;
  const upload = await supabase.storage.from(IMAGE_BUCKET).upload(filePath, image.bytes, {
    contentType: image.contentType,
    cacheControl: '31536000',
    upsert: false,
  });

  if (upload.error) throw upload.error;

  const publicUrl = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(filePath);
  return publicUrl.data.publicUrl || null;
};

const loadProducts = async (supabase: SupabaseClient) => {
  const result = await supabase
    .from('products')
    .select(PRODUCT_FIELDS)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (result.error) throw result.error;
  return (result.data || []) as CatalogProduct[];
};

const safeProductList = (products: CatalogProduct[]) =>
  products.map(product => ({
    id: product.id,
    name: product.name,
    category: product.category || 'Abarrotes y básicos',
    subcategory: product.subcategory || null,
    price: product.price || null,
    unit: product.unit || null,
    description: product.description || null,
    image: product.image || null,
    badge: product.badge || null,
    available: product.available !== false,
    show_in_app: product.show_in_app !== false,
    show_in_pos: product.show_in_pos !== false,
    is_variable: product.is_variable === true,
    created_at: product.created_at || null,
    updated_at: product.updated_at || null,
  }));

const ensureSameSiteRequest = (req: ApiRequest) => {
  const fetchSite = headerValue(req, 'sec-fetch-site').toLowerCase();
  return !fetchSite || ['same-origin', 'same-site', 'none'].includes(fetchSite);
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (!ensureSameSiteRequest(req)) {
    return res.status(403).json({ ok: false, error: 'Solicitud no permitida.' });
  }

  const secret = getPanelSessionSecret();
  const supabase = getServerClient();

  if (!secret || !supabase) {
    return res.status(500).json({
      ok: false,
      error: 'La conexión del catálogo no está configurada.',
    });
  }

  const cookies = parseCookies(req.headers);
  const token = cookies[CATALOG_COOKIE] || '';
  const authorized = await verifyCatalogToken(token, secret);

  if (req.method === 'GET') {
    if (!authorized) {
      const nextToken = await createCatalogToken(secret);
      res.setHeader('Set-Cookie', buildCatalogCookie(nextToken));
    }

    try {
      const products = await loadProducts(supabase);
      return res.status(200).json({ ok: true, products: safeProductList(products) });
    } catch (error) {
      console.error('Cascada catalog load failed:', error);
      return res.status(500).json({ ok: false, error: 'No se pudo cargar el catálogo.' });
    }
  }

  if (!authorized) {
    return res.status(401).json({
      ok: false,
      error: 'La sesión del catálogo venció. Actualiza la página y vuelve a intentar.',
    });
  }

  const body = bodyOf(req);
  const productInput = body.product || {};
  const name = cleanText(productInput.name, 180);
  const category = cleanText(productInput.category, 100);
  const subcategory = cleanText(productInput.subcategory, 120) || null;
  const unit = cleanText(productInput.unit, 40) || 'unidad';
  const description = cleanText(productInput.description, 700) || null;
  const isVariable = productInput.isVariable === true;
  const allowSimilar = body.allowSimilar === true;

  if (name.length < 2) {
    return res.status(400).json({ ok: false, error: 'Escribe el nombre completo del producto.' });
  }

  if (!CATEGORIES.has(category)) {
    return res.status(400).json({ ok: false, error: 'Selecciona una categoría válida.' });
  }

  try {
    const existingProducts = await loadProducts(supabase);
    const canonicalName = normalizeText(name);
    const exact = existingProducts.filter(product => normalizeText(product.name) === canonicalName);

    if (exact.length > 0) {
      return res.status(409).json({
        ok: false,
        code: 'DUPLICATE_PRODUCT',
        error: `“${exact[0].name}” ya está en el catálogo.`,
        matches: safeProductList(exact.slice(0, 5)),
      });
    }

    const similar = existingProducts
      .map(product => ({ product, score: similarityScore(name, product.name) }))
      .filter(result => result.score >= 72)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(result => result.product);

    if (similar.length > 0 && !allowSimilar) {
      return res.status(409).json({
        ok: false,
        code: 'SIMILAR_PRODUCT',
        error: 'Encontramos productos parecidos. Confirma que sea otra presentación, tamaño o sabor.',
        matches: safeProductList(similar),
      });
    }

    const imageUrl = await uploadProductImage(supabase, name, body.imageData);
    const now = new Date().toISOString();
    const id = `cascada-${slug(name)}-${Date.now().toString(36).slice(-7)}`;
    const product = {
      id,
      name,
      category,
      subcategory,
      price: formatPrice(productInput.price, isVariable),
      unit,
      description,
      image: imageUrl,
      badge: null,
      available: true,
      show_in_app: true,
      show_in_pos: true,
      is_variable: isVariable,
      created_at: now,
      updated_at: now,
    };

    const inserted = await supabase
      .from('products')
      .insert(product)
      .select(PRODUCT_FIELDS)
      .single();

    if (inserted.error) throw inserted.error;

    return res.status(201).json({
      ok: true,
      product: safeProductList([inserted.data as CatalogProduct])[0],
    });
  } catch (error) {
    console.error('Cascada product creation failed:', {
      message: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      ok: false,
      error: 'No se pudo agregar el producto. Revisa la foto y vuelve a intentar.',
    });
  }
}
