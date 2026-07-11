import {
  buildPanelSessionCookie,
  createPanelSessionToken,
  getPanelSessionSecret,
  isPanelType,
} from '../panel-session.js';

type ApiRequest = {
  method?: string;
  body?: unknown;
};

type ApiResponse = {
  status: (code: number) => { json: (payload: unknown) => unknown };
  setHeader: (name: string, value: string | string[]) => void;
};

type OpenPanelPayload = {
  panel?: string;
};

const bodyOf = (req: ApiRequest): OpenPanelPayload => {
  if (!req.body) return {};

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as OpenPanelPayload;
    } catch {
      return {};
    }
  }

  return typeof req.body === 'object' ? (req.body as OpenPanelPayload) : {};
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const payload = bodyOf(req);
  const panel = String(payload.panel || '').trim();

  if (!isPanelType(panel)) {
    return res.status(400).json({ ok: false, error: 'Invalid panel' });
  }

  const sessionSecret = getPanelSessionSecret();

  if (!sessionSecret) {
    return res.status(500).json({
      ok: false,
      error: 'Missing panel session secret',
      missingEnv: true,
    });
  }

  try {
    const { token, claims } = await createPanelSessionToken(panel, sessionSecret);
    res.setHeader('Set-Cookie', buildPanelSessionCookie(panel, token));

    return res.status(200).json({
      ok: true,
      panel,
      automaticAccess: true,
      expiresAt: claims.expiresAt,
    });
  } catch (error) {
    console.error('Automatic panel session creation failed:', error);

    return res.status(500).json({
      ok: false,
      error: 'Could not create panel session',
      sessionError: true,
    });
  }
}
