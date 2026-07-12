from pathlib import Path
from textwrap import dedent


def read(path: str) -> str:
    return Path(path).read_text(encoding='utf-8')


def write(path: str, content: str) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding='utf-8')


def replace_once(path: str, old: str, new: str) -> None:
    source = read(path)
    if old not in source:
        raise RuntimeError(f'No se encontró el bloque esperado en {path}: {old[:120]!r}')
    write(path, source.replace(old, new, 1))


def replace_all(path: str, old: str, new: str) -> None:
    source = read(path)
    if old not in source:
        raise RuntimeError(f'No se encontró el texto esperado en {path}: {old[:120]!r}')
    write(path, source.replace(old, new))


# 1) Mapa de registro: usar tiles raster directos para evitar el lienzo gris.
replace_once(
    'src/components/LoginModal.tsx',
    "const MAP_STYLE_URL = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';",
    dedent("""
    const MAP_STYLE = {
      version: 8,
      sources: {
        'carto-voyager': {
          type: 'raster',
          tiles: [
            'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
            'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
            'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
            'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
          ],
          tileSize: 256,
          minzoom: 0,
          maxzoom: 20,
          attribution: '© OpenStreetMap contributors © CARTO',
        },
      },
      layers: [
        {
          id: 'map-background',
          type: 'background',
          paint: { 'background-color': '#eef2f7' },
        },
        {
          id: 'carto-voyager',
          type: 'raster',
          source: 'carto-voyager',
          minzoom: 0,
          maxzoom: 20,
        },
      ],
    } as any;
    """).strip(),
)
replace_once(
    'src/components/LoginModal.tsx',
    '      style: MAP_STYLE_URL,',
    '      style: MAP_STYLE,',
)
replace_once(
    'src/components/LoginModal.tsx',
    '      attributionControl: false,',
    '      attributionControl: true,',
)

# 2) Opiniones: mostrar 3 inicialmente, estado vacío y botón Ver más.
replace_once(
    'src/components/Testimonials.tsx',
    "  PartyPopper,\n} from 'lucide-react';",
    "  PartyPopper,\n  ChevronDown,\n  ChevronUp,\n} from 'lucide-react';",
)
replace_once(
    'src/components/Testimonials.tsx',
    "  const [adminMode, setAdminMode] = useState(false);\n  const [holdProgress, setHoldProgress] = useState(0);",
    "  const [adminMode, setAdminMode] = useState(false);\n  const [holdProgress, setHoldProgress] = useState(0);\n  const [showAll, setShowAll] = useState(false);",
)
replace_once(
    'src/components/Testimonials.tsx',
    "    } catch (error) {\n      console.warn('No se pudieron cargar opiniones:', error);\n    } finally {",
    "    } catch (error) {\n      console.warn('No se pudieron cargar opiniones:', error);\n      setError('No pudimos cargar las opiniones. Toca nuevamente en unos segundos.');\n    } finally {",
)
replace_once(
    'src/components/Testimonials.tsx',
    "  const showRewardBanner =\n    seasonActive &&\n    !hasReviewed &&\n    Boolean(customerName.trim()) &&\n    Boolean(customerPhone.trim());\n\n  return (",
    "  const showRewardBanner =\n    seasonActive &&\n    !hasReviewed &&\n    Boolean(customerName.trim()) &&\n    Boolean(customerPhone.trim());\n\n  const visibleTestimonials = showAll ? testimonials : testimonials.slice(0, 3);\n\n  return (",
)
replace_once(
    'src/components/Testimonials.tsx',
    "      <div className=\"divide-y divide-gray-50\">\n        {!loading &&\n          testimonials.map(t => (",
    "      <div className=\"divide-y divide-gray-50\">\n        {!loading && testimonials.length === 0 && !showForm && (\n          <div className=\"px-5 py-8 text-center\">\n            <MessageCircle className=\"mx-auto text-orange-300\" size={34} />\n            <p className=\"mt-3 text-sm font-black uppercase italic text-slate-800\">\n              Todavía no hay opiniones\n            </p>\n            <p className=\"mt-2 text-xs font-bold leading-relaxed text-slate-400\">\n              Sé la primera persona en contar cómo fue su experiencia.\n            </p>\n          </div>\n        )}\n\n        {!loading &&\n          visibleTestimonials.map(t => (",
)
replace_once(
    'src/components/Testimonials.tsx',
    "      </div>\n\n      <style>{`",
    "      </div>\n\n      {testimonials.length > 3 && !showForm && (\n        <div className=\"border-t border-gray-50 px-5 py-4\">\n          <button\n            type=\"button\"\n            onClick={() => setShowAll(value => !value)}\n            className=\"flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-orange-600 active:scale-[0.98]\"\n          >\n            {showAll ? <ChevronUp size={16} /> : <ChevronDown size={16} />}\n            {showAll ? 'Ver menos opiniones' : `Ver todas (${testimonials.length})`}\n          </button>\n        </div>\n      )}\n\n      <style>{`",
)

# Mostrar opiniones antes de las secciones largas de Info.
replace_once(
    'src/components/InfoScreen.tsx',
    "      <LiveMetrics />\n\n      <LanguageSelectorCard />",
    "      <LiveMetrics />\n\n      <Testimonials />\n\n      <LanguageSelectorCard />",
)
replace_once(
    'src/components/InfoScreen.tsx',
    "      </div>\n\n      <Testimonials />\n\n      <div className=\"bg-white rounded-[32px] border border-orange-50 shadow-sm overflow-hidden\">",
    "      </div>\n\n      <div className=\"bg-white rounded-[32px] border border-orange-50 shadow-sm overflow-hidden\">",
)

# 3) Catálogo: menos tarjetas al primer render y fotos diferidas.
replace_once(
    'src/components/CatalogScreen.tsx',
    "const SORT_OPTIONS: Array<{",
    "const INITIAL_PRODUCT_LIMIT = 24;\nconst PRODUCT_LIMIT_STEP = 24;\n\nconst SORT_OPTIONS: Array<{",
)
replace_once(
    'src/components/CatalogScreen.tsx',
    "  const [showSortMenu, setShowSortMenu] = useState(false);\n  const [search, setSearch] = useState('');",
    "  const [showSortMenu, setShowSortMenu] = useState(false);\n  const [search, setSearch] = useState('');\n  const [visibleCount, setVisibleCount] = useState(INITIAL_PRODUCT_LIMIT);",
)
replace_once(
    'src/components/CatalogScreen.tsx',
    "  useEffect(() => {\n    setActiveCategory(initialCategory);\n    setActiveSubcategory(null);\n  }, [initialCategory]);",
    "  useEffect(() => {\n    setActiveCategory(initialCategory);\n    setActiveSubcategory(null);\n  }, [initialCategory]);\n\n  useEffect(() => {\n    setVisibleCount(INITIAL_PRODUCT_LIMIT);\n  }, [activeCategory, activeSubcategory, sortBy]);",
)
replace_once(
    'src/components/CatalogScreen.tsx',
    "          <div className=\"grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 flex-1\">\n            {displayedProducts.map(product => (\n              <div key={product.id} className=\"w-full min-w-0\">\n                <ProductCard product={product} />\n              </div>\n            ))}\n          </div>",
    "          <>\n            <div className=\"grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 flex-1\">\n              {displayedProducts.slice(0, visibleCount).map((product, index) => (\n                <div key={product.id} className=\"w-full min-w-0\">\n                  <ProductCard product={product} priority={index < 6} />\n                </div>\n              ))}\n            </div>\n\n            {visibleCount < displayedProducts.length && (\n              <button\n                type=\"button\"\n                onClick={() => setVisibleCount(value => value + PRODUCT_LIMIT_STEP)}\n                className=\"mx-auto mt-5 rounded-full border border-orange-200 bg-white px-6 py-3 text-[10px] font-black uppercase tracking-widest text-orange-600 shadow-sm active:scale-95\"\n              >\n                Ver más productos · {displayedProducts.length - visibleCount}\n              </button>\n            )}\n          </>",
)

replace_once(
    'src/components/ProductCard.tsx',
    "  compact?: boolean;\n}",
    "  compact?: boolean;\n  priority?: boolean;\n}",
)
replace_once(
    'src/components/ProductCard.tsx',
    "  className = '',\n  compact = false,\n}: Props)",
    "  className = '',\n  compact = false,\n  priority = false,\n}: Props)",
)
replace_once(
    'src/components/ProductCard.tsx',
    "        style={style}",
    "        style={{ contentVisibility: 'auto', containIntrinsicSize: '340px', ...style } as React.CSSProperties}",
)
replace_once(
    'src/components/ProductCard.tsx',
    "            loading=\"eager\"\n            decoding=\"async\"",
    "            loading={priority ? 'eager' : 'lazy'}\n            fetchPriority={priority ? 'high' : 'low'}\n            decoding=\"async\"",
)

# 4) Animación curva y más lenta hacia el carrito.
write(
    'src/context/FlyToCartContext.tsx',
    dedent("""
    import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

    interface FlyParticle {
      id: number;
      startX: number;
      startY: number;
      image: string;
    }

    interface FlyToCartContextType {
      particles: FlyParticle[];
      triggerFly: (startX: number, startY: number, image: string) => void;
      cartPop: boolean;
      cartRef: React.RefObject<HTMLButtonElement> | null;
      setCartRef: (ref: React.RefObject<HTMLButtonElement>) => void;
    }

    const FlyToCartContext = createContext<FlyToCartContextType | null>(null);

    let nextId = 0;

    export function FlyToCartProvider({ children }: { children: ReactNode }) {
      const [particles, setParticles] = useState<FlyParticle[]>([]);
      const [cartPop, setCartPop] = useState(false);
      const [cartRef, setCartRefState] = useState<React.RefObject<HTMLButtonElement> | null>(null);

      const setCartRef = useCallback((ref: React.RefObject<HTMLButtonElement>) => {
        setCartRefState(ref);
      }, []);

      const triggerFly = useCallback((startX: number, startY: number, image: string) => {
        const id = nextId++;

        setParticles(previous => [...previous.slice(-2), { id, startX, startY, image }]);

        window.setTimeout(() => {
          setCartPop(true);
          window.setTimeout(() => setCartPop(false), 280);
        }, 640);

        window.setTimeout(() => {
          setParticles(previous => previous.filter(particle => particle.id !== id));
        }, 940);
      }, []);

      return (
        <FlyToCartContext.Provider value={{ particles, triggerFly, cartPop, cartRef, setCartRef }}>
          {children}
        </FlyToCartContext.Provider>
      );
    }

    export function useFlyToCart() {
      const context = useContext(FlyToCartContext);
      if (!context) throw new Error('useFlyToCart must be used within FlyToCartProvider');
      return context;
    }
    """).strip() + '\n',
)

write(
    'src/components/FlyParticleLayer.tsx',
    dedent("""
    import { useCallback, useEffect, useRef, useState } from 'react';
    import { useFlyToCart } from '../context/FlyToCartContext';

    interface ParticleProps {
      id: number;
      startX: number;
      startY: number;
      cartX: number;
      cartY: number;
      image: string;
    }

    function Particle({ startX, startY, cartX, cartY, image }: ParticleProps) {
      const ref = useRef<HTMLDivElement>(null);

      useEffect(() => {
        const element = ref.current;
        if (!element) return undefined;

        const dx = cartX - startX;
        const dy = cartY - startY;
        const arcX = dx * 0.46;
        const arcY = Math.min(-88, dy * 0.2 - 72);

        const animation = element.animate(
          [
            { transform: 'translate3d(0, 0, 0) scale(0.72) rotate(0deg)', opacity: 0 },
            { transform: 'translate3d(0, -10px, 0) scale(1.14) rotate(-4deg)', opacity: 1, offset: 0.12 },
            { transform: `translate3d(${arcX}px, ${arcY}px, 0) scale(1.02) rotate(-12deg)`, opacity: 1, offset: 0.5 },
            { transform: `translate3d(${dx * 0.9}px, ${dy * 0.84}px, 0) scale(0.5) rotate(12deg)`, opacity: 0.9, offset: 0.84 },
            { transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.08) rotate(22deg)`, opacity: 0 },
          ],
          {
            duration: 820,
            easing: 'cubic-bezier(0.22, 0.72, 0.2, 1)',
            fill: 'forwards',
          }
        );

        return () => animation.cancel();
      }, [cartX, cartY, startX, startY]);

      return (
        <div
          ref={ref}
          className="fixed pointer-events-none z-[9999]"
          style={{
            left: startX - 21,
            top: startY - 21,
            width: 42,
            height: 42,
            willChange: 'transform, opacity',
          }}
        >
          <div className="relative h-full w-full overflow-hidden rounded-full border-[3px] border-white bg-white shadow-[0_12px_28px_rgba(249,115,22,0.45)]">
            <img
              src={image || '/logo-final.png'}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
            />
            <div className="absolute inset-0 rounded-full ring-2 ring-orange-300/60" />
          </div>
        </div>
      );
    }

    export default function FlyParticleLayer() {
      const { particles, cartRef } = useFlyToCart();
      const [cartPos, setCartPos] = useState({ x: window.innerWidth - 60, y: 30 });

      const updateCartPosition = useCallback(() => {
        if (!cartRef?.current) return;
        const rect = cartRef.current.getBoundingClientRect();
        setCartPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }, [cartRef]);

      useEffect(() => {
        updateCartPosition();
        window.addEventListener('resize', updateCartPosition);
        window.addEventListener('scroll', updateCartPosition, true);
        return () => {
          window.removeEventListener('resize', updateCartPosition);
          window.removeEventListener('scroll', updateCartPosition, true);
        };
      }, [particles.length, updateCartPosition]);

      return (
        <>
          {particles.map(particle => (
            <Particle
              key={particle.id}
              id={particle.id}
              startX={particle.startX}
              startY={particle.startY}
              cartX={cartPos.x}
              cartY={cartPos.y}
              image={particle.image}
            />
          ))}
        </>
      );
    }
    """).strip() + '\n',
)

# 5) Ranking público seguro para que el cliente vea sus puntos sin exponer teléfonos.
write(
    'server/api-handlers/public-ranking.ts',
    dedent("""
    import { createClient } from '@supabase/supabase-js';
    import {
      getCustomerSessionSecret,
      readCustomerSessionToken,
      verifyCustomerSessionToken,
    } from '../customer-session.js';

    type ApiRequest = {
      method?: string;
      headers?: Record<string, string | string[] | undefined>;
    };

    type ApiResponse = {
      status: (code: number) => { json: (payload: unknown) => unknown };
      setHeader: (name: string, value: string | string[]) => void;
    };

    type CustomerRow = {
      id?: string | null;
      name?: string | null;
      phone?: string | null;
      avatar_url?: string | null;
      points?: number | null;
      exp?: number | null;
      total_orders?: number | null;
      total_spent?: number | null;
      phone_verified?: boolean | null;
      created_at?: string | null;
      updated_at?: string | null;
    };

    const cleanPhone = (value?: string | null) => String(value || '').replace(/\D/g, '');

    const publicName = (value?: string | null) => {
      const parts = String(value || 'Guerrero Pollazo').trim().split(/\s+/).filter(Boolean);
      if (parts.length <= 1) return parts[0] || 'Guerrero Pollazo';
      return parts[0] + ' ' + parts[1].charAt(0).toUpperCase() + '.';
    };

    const publicCustomer = (row: CustomerRow, currentId: string) => ({
      id: row.id || '',
      name: publicName(row.name),
      phone: row.id === currentId ? cleanPhone(row.phone) : null,
      avatar_url: row.avatar_url || null,
      points: Number(row.points || 0),
      exp: Number(row.exp || 0),
      total_orders: Number(row.total_orders || 0),
      total_spent: Number(row.total_spent || 0),
      phone_verified: row.phone_verified === true,
      created_at: row.created_at || null,
      updated_at: row.updated_at || null,
    });

    export default async function handler(req: ApiRequest, res: ApiResponse) {
      res.setHeader('Cache-Control', 'private, no-store');

      if (req.method !== 'GET') {
        return res.status(405).json({ ok: false, error: 'Method not allowed' });
      }

      const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key) {
        return res.status(500).json({ ok: false, error: 'Missing server database configuration' });
      }

      const supabase = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const secret = getCustomerSessionSecret();
      const token = secret ? readCustomerSessionToken(req.headers) : '';
      const claims = secret && token ? await verifyCustomerSessionToken(token, secret) : null;

      const rankingResult = await supabase
        .from('customers')
        .select('id,name,phone,avatar_url,points,exp,total_orders,total_spent,phone_verified,created_at,updated_at')
        .or('points.gt.0,exp.gt.0,total_orders.gt.0,total_spent.gt.0')
        .order('points', { ascending: false })
        .order('total_spent', { ascending: false })
        .limit(100);

      if (rankingResult.error) {
        console.error('Public ranking load failed:', rankingResult.error);
        return res.status(500).json({ ok: false, error: 'No se pudo cargar el ranking.' });
      }

      let currentCustomer: CustomerRow | null = null;
      if (claims?.phone) {
        const currentResult = await supabase
          .from('customers')
          .select('id,name,phone,avatar_url,points,exp,total_orders,total_spent,phone_verified,created_at,updated_at')
          .eq('phone', claims.phone)
          .maybeSingle();

        if (!currentResult.error) currentCustomer = currentResult.data as CustomerRow | null;
      }

      const rows = (rankingResult.data || []) as CustomerRow[];
      if (currentCustomer?.id && !rows.some(row => row.id === currentCustomer?.id)) {
        rows.push(currentCustomer);
      }

      const currentId = String(currentCustomer?.id || '');
      const customers = rows
        .map(row => publicCustomer(row, currentId))
        .sort((a, b) => {
          const points = b.points - a.points;
          if (points !== 0) return points;
          const spent = b.total_spent - a.total_spent;
          if (spent !== 0) return spent;
          return b.exp - a.exp;
        });

      return res.status(200).json({
        ok: true,
        customers,
        currentCustomerId: currentId || null,
      });
    }
    """).strip() + '\n',
)

replace_once(
    'api/[...route].ts',
    "  'public-data': () => import('../server/api-handlers/public-data.js'),",
    "  'public-data': () => import('../server/api-handlers/public-data.js'),\n  'public-ranking': () => import('../server/api-handlers/public-ranking.js'),",
)

replace_once(
    'src/pages/Ranking.tsx',
    "  const [showPrizeDetails, setShowPrizeDetails] = useState(false);\n  const [alertButton, setAlertButton] = useState(false);",
    "  const [showPrizeDetails, setShowPrizeDetails] = useState(false);\n  const [alertButton, setAlertButton] = useState(false);\n  const [publicCustomers, setPublicCustomers] = useState<CustomerRecord[]>([]);\n  const [publicCurrentCustomerId, setPublicCurrentCustomerId] = useState('');\n  const [publicRankingLoading, setPublicRankingLoading] = useState(true);",
)
replace_once(
    'src/pages/Ranking.tsx',
    "  useEffect(() => {\n    if (refreshData) refreshData();\n  }, [refreshData]);",
    "  useEffect(() => {\n    if (refreshData) refreshData();\n  }, [refreshData]);\n\n  useEffect(() => {\n    let cancelled = false;\n\n    const loadPublicRanking = async () => {\n      try {\n        const response = await fetch('/api/public-ranking', {\n          credentials: 'same-origin',\n          cache: 'no-store',\n        });\n        const payload = (await response.json().catch(() => ({}))) as {\n          ok?: boolean;\n          customers?: CustomerRecord[];\n          currentCustomerId?: string | null;\n        };\n\n        if (!cancelled && response.ok && payload.ok) {\n          setPublicCustomers(Array.isArray(payload.customers) ? payload.customers : []);\n          setPublicCurrentCustomerId(String(payload.currentCustomerId || ''));\n        }\n      } catch (error) {\n        console.warn('No se pudo cargar el ranking público:', error);\n      } finally {\n        if (!cancelled) setPublicRankingLoading(false);\n      }\n    };\n\n    void loadPublicRanking();\n    return () => {\n      cancelled = true;\n    };\n  }, []);",
)
replace_once(
    'src/pages/Ranking.tsx',
    "  const ranking = useMemo(() => {\n    return normalizeRankingCustomers(customers as CustomerRecord[]);\n  }, [customers]);",
    "  const ranking = useMemo(() => {\n    const source = customers.length > 0 ? customers : publicCustomers;\n    return normalizeRankingCustomers(source as CustomerRecord[]);\n  }, [customers, publicCustomers]);",
)
replace_once(
    'src/pages/Ranking.tsx',
    "  const myRankIndex = ranking.findIndex(customer => {\n    return cleanUserPhone && cleanPhoneTail(customer.phone) === cleanUserPhone;\n  });",
    "  const myRankIndex = ranking.findIndex(customer => {\n    if (publicCurrentCustomerId && customer.id === publicCurrentCustomerId) return true;\n    return Boolean(cleanUserPhone && cleanPhoneTail(customer.phone) === cleanUserPhone);\n  });",
)
replace_all(
    'src/pages/Ranking.tsx',
    "const isMe = cleanUserPhone && cleanPhoneTail(customer.phone) === cleanUserPhone;",
    "const isMe = Boolean(\n            (publicCurrentCustomerId && customer.id === publicCurrentCustomerId) ||\n              (cleanUserPhone && cleanPhoneTail(customer.phone) === cleanUserPhone)\n          );",
)
replace_once(
    'src/pages/Ranking.tsx',
    "        {ranking.length === 0 && (",
    "        {ranking.length === 0 && publicRankingLoading && (\n          <div className=\"bg-white rounded-[34px] border border-orange-100 p-8 text-center shadow-sm\">\n            <div className=\"mx-auto h-9 w-9 animate-spin rounded-full border-4 border-orange-100 border-t-orange-500\" />\n            <p className=\"mt-4 text-xs font-black uppercase text-slate-500\">Cargando puntos...</p>\n          </div>\n        )}\n\n        {ranking.length === 0 && !publicRankingLoading && (",
)

# 6) Splash limpio, versión nueva y dominio actual.
write(
    'public/pollazo-splash-icon.svg',
    dedent("""
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <defs>
        <clipPath id="cleanLogoCircle">
          <circle cx="256" cy="256" r="214" />
        </clipPath>
      </defs>
      <rect width="512" height="512" fill="#ffffff" />
      <circle cx="256" cy="256" r="226" fill="#ffffff" />
      <image href="https://blogger.googleusercontent.com/img/a/AVvXsEj_z_wFD2fFBMGygHoeaB-BRAJFDaT7VY0VtWUcD2kOgCaXyLb7BCpVGNZC6any7SIqhUX4TL_MW7FGhHvX49fMsU8BULMMQcsO5QT2Ey7J1TDzGJ3gyzdA5cU7qNkB8322cPMt_IbW0hV6Dafp3DGfyGu3kmBnaCEd3QfvComUHLlqvWwXgqXnJBY077o" x="20" y="20" width="472" height="472" preserveAspectRatio="xMidYMid slice" clip-path="url(#cleanLogoCircle)" />
      <circle cx="256" cy="256" r="218" fill="none" stroke="#ffffff" stroke-width="14" />
    </svg>
    """).strip() + '\n',
)

write(
    'public/manifest.json',
    dedent("""
    {
      "name": "La Casa del Pollazo",
      "short_name": "Pollazo",
      "description": "Market local en Puerto Ayora con pollo fresco, productos del día, pedidos rápidos y entrega dentro de cobertura.",
      "id": "/?appVersion=9",
      "start_url": "/?appVersion=9",
      "scope": "/",
      "display": "standalone",
      "display_override": ["standalone", "minimal-ui"],
      "background_color": "#ffffff",
      "theme_color": "#f97316",
      "orientation": "portrait",
      "lang": "es-EC",
      "dir": "ltr",
      "categories": ["food", "shopping", "business", "lifestyle"],
      "prefer_related_applications": false,
      "icons": [
        {
          "src": "/pollazo-splash-icon.svg?v=9",
          "sizes": "512x512",
          "type": "image/svg+xml",
          "purpose": "any"
        },
        {
          "src": "/pollazo-splash-icon.svg?v=9",
          "sizes": "512x512",
          "type": "image/svg+xml",
          "purpose": "maskable"
        }
      ],
      "shortcuts": [
        {
          "name": "Catálogo",
          "short_name": "Catálogo",
          "description": "Ver productos disponibles",
          "url": "/catalogo",
          "icons": [{ "src": "/pollazo-splash-icon.svg?v=9", "sizes": "512x512", "type": "image/svg+xml" }]
        },
        {
          "name": "Carrito",
          "short_name": "Carrito",
          "description": "Revisar pedido",
          "url": "/carrito",
          "icons": [{ "src": "/pollazo-splash-icon.svg?v=9", "sizes": "512x512", "type": "image/svg+xml" }]
        }
      ]
    }
    """).strip() + '\n',
)

replace_all('index.html', 'pollazogalapague-o-psi.vercel.app', 'pollazogalapague-o-phi.vercel.app')
replace_once('index.html', '<link rel="manifest" href="/manifest.json?v=8" />', '<link rel="manifest" href="/manifest.json?v=9" />')
replace_once('index.html', '<link rel="preload" href="/pollazo-splash-icon.svg?v=7" as="image" type="image/svg+xml" />', '<link rel="preload" href="/pollazo-splash-icon.svg?v=9" as="image" type="image/svg+xml" />')
replace_all('public/sitemap.xml', 'pollazogalapague-o-psi.vercel.app', 'pollazogalapague-o-phi.vercel.app')
replace_all('public/sitemap.xml', '<lastmod>2026-07-01</lastmod>', '<lastmod>2026-07-12</lastmod>')
replace_once('public/sw.js', "const CACHE_VERSION = 'pollazo-cache-clean-v41';", "const CACHE_VERSION = 'pollazo-cache-clean-v42';")

print('Mejoras móviles aplicadas correctamente.')
