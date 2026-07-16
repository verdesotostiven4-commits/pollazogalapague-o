const LOGO_URL =
  'https://cdn.phototourl.com/free/2026-07-16-e4197884-cd6c-4cd6-a494-900356e0debf.png';

let cachedLogo: Buffer | null = null;
let pendingLogo: Promise<Buffer> | null = null;

type ApiRequest = {
  method?: string;
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  setHeader: (name: string, value: string) => void;
  send: (payload: Buffer | string) => unknown;
  json: (payload: unknown) => unknown;
};

const fetchLogo = async (): Promise<Buffer> => {
  if (cachedLogo) return cachedLogo;
  if (pendingLogo) return pendingLogo;

  pendingLogo = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);

    try {
      const response = await fetch(LOGO_URL, {
        signal: controller.signal,
        headers: {
          Accept: 'image/jpeg,image/*;q=0.9,*/*;q=0.5',
          'User-Agent': 'Pollazo-PWA-Icon/26',
        },
      });

      if (!response.ok) {
        throw new Error(`Logo download failed with status ${response.status}`);
      }

      const bytes = Buffer.from(await response.arrayBuffer());

      if (
        bytes.length < 10_000 ||
        bytes[0] !== 0xff ||
        bytes[1] !== 0xd8 ||
        bytes[2] !== 0xff
      ) {
        throw new Error('Logo response is not a valid JPEG image');
      }

      cachedLogo = bytes;
      return bytes;
    } finally {
      clearTimeout(timer);
    }
  })().catch(error => {
    pendingLogo = null;
    throw error;
  });

  return pendingLogo;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const logo = await fetchLogo();

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Cache-Control',
      'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable'
    );
    res.setHeader('Content-Length', String(logo.length));

    if (req.method === 'HEAD') {
      return res.status(200).send('');
    }

    return res.status(200).send(logo);
  } catch (error) {
    console.error('PWA icon proxy failed:', {
      message: error instanceof Error ? error.message : String(error),
    });

    return res.status(502).json({
      ok: false,
      error: 'PWA icon unavailable',
    });
  }
}
