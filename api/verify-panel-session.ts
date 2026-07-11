import {
  getPanelSessionSecret,
  isPanelType,
  readPanelSessionToken,
  verifyPanelSessionToken,
} from '../server/panel-session';

type ApiRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => {
    json: (payload: unknown) => void;
  };
  setHeader: (name: string, value: string | string[]) => void;
};

const queryValue = (req: ApiRequest, key: string) => {
  const value = req.query?.[key];
  return Array.isArray(value) ? value[0] || '' : String(value || '');
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const panel = queryValue(req, 'panel');

  if (!isPanelType(panel)) {
    return res.status(400).json({ ok: false, error: 'Invalid panel' });
  }

  const secret = getPanelSessionSecret();

  if (!secret) {
    return res.status(500).json({
      ok: false,
      error: 'Missing or weak POLLAZO_PANEL_SESSION_SECRET',
      missingEnv: true,
    });
  }

  const token = readPanelSessionToken(req.headers, panel);
  const claims = await verifyPanelSessionToken(token, panel, secret);

  if (!claims) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  return res.status(200).json({
    ok: true,
    panel,
    expiresAt: claims.expiresAt,
  });
}
