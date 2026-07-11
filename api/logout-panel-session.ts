import {
  buildExpiredPanelSessionCookie,
  isPanelType,
} from '../server/panel-session';

type ApiRequest = {
  method?: string;
  body?: unknown;
};

type ApiResponse = {
  status: (code: number) => {
    json: (payload: unknown) => void;
  };
  setHeader: (name: string, value: string | string[]) => void;
};

const getBody = (req: ApiRequest): Record<string, unknown> => {
  if (!req.body) return {};

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  return typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const panel = String(getBody(req).panel || '').trim();

  if (!isPanelType(panel)) {
    return res.status(400).json({ ok: false, error: 'Invalid panel' });
  }

  res.setHeader('Set-Cookie', buildExpiredPanelSessionCookie(panel));

  return res.status(200).json({ ok: true, panel });
}
