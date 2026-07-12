type ApiRequest = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  setHeader: (name: string, value: string) => void;
  send: (payload: Buffer | Uint8Array | string) => unknown;
  json: (payload: unknown) => unknown;
};

const COVERAGE = {
  latMin: -0.79,
  latMax: -0.70,
  lngMin: -90.39,
  lngMax: -90.25,
};

const readInteger = (value: string | string[] | undefined) => {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  return Number.isInteger(parsed) ? parsed : null;
};

const tileLongitude = (x: number, z: number) => (x / 2 ** z) * 360 - 180;

const tileLatitude = (y: number, z: number) => {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (180 / Math.PI) * Math.atan(Math.sinh(n));
};

const tileTouchesCoverage = (z: number, x: number, y: number) => {
  const west = tileLongitude(x, z);
  const east = tileLongitude(x + 1, z);
  const north = tileLatitude(y, z);
  const south = tileLatitude(y + 1, z);

  return (
    east >= COVERAGE.lngMin &&
    west <= COVERAGE.lngMax &&
    north >= COVERAGE.latMin &&
    south <= COVERAGE.latMax
  );
};

const fetchWithTimeout = async (url: string, timeoutMs = 5500) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'User-Agent': 'PollazoGalapagueno/1.0',
      },
    });
  } finally {
    clearTimeout(timer);
  }
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const z = readInteger(req.query?.z);
  const x = readInteger(req.query?.x);
  const y = readInteger(req.query?.y);

  if (z === null || x === null || y === null || z < 4 || z > 20) {
    return res.status(400).json({ ok: false, error: 'Invalid tile coordinates' });
  }

  const totalTiles = 2 ** z;
  if (x < 0 || x >= totalTiles || y < 0 || y >= totalTiles) {
    return res.status(400).json({ ok: false, error: 'Tile outside world bounds' });
  }

  if (!tileTouchesCoverage(z, x, y)) {
    return res.status(404).json({ ok: false, error: 'Tile outside delivery coverage' });
  }

  const subdomain = ['a', 'b', 'c', 'd'][(x + y) % 4];
  const providers = [
    `https://${subdomain}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`,
    `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${x}`,
    `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
  ];

  for (const provider of providers) {
    try {
      const upstream = await fetchWithTimeout(provider);
      const contentType = upstream.headers.get('content-type') || '';

      if (!upstream.ok || !contentType.startsWith('image/')) continue;

      const bytes = Buffer.from(await upstream.arrayBuffer());
      if (bytes.length < 100) continue;

      res.setHeader('Content-Type', contentType);
      res.setHeader(
        'Cache-Control',
        'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800'
      );
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.status(200).send(bytes);
    } catch (error) {
      console.warn('Map tile provider failed:', {
        provider,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return res.status(502).json({ ok: false, error: 'Map tile unavailable' });
}
