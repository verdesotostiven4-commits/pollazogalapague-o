import {
  readPanelSession,
  serializeClearedPanelSessionCookie,
} from './_panel-session.js';

type ApiRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  setHeader: (name: string, value: string | string[]) => void;
  status: (code: number) => {
    json: (payload: unknown) => void;
  };
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'GET') {
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed',
    });
  }

  const session = readPanelSession(req);

  if (!session) {
    res.setHeader('Set-Cookie', serializeClearedPanelSessionCookie());

    return res.status(401).json({
      ok: false,
      error: 'Unauthorized',
    });
  }

  return res.status(200).json({
    ok: true,
    panel: session.role,
    expiresAt: session.expiresAt,
  });
}
