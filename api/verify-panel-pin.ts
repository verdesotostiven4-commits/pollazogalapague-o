import {
  buildPanelSessionCookie,
  createPanelSessionToken,
  getPanelSessionSecret,
  isPanelType,
  type PanelType,
} from '../server/panel-session';

type ApiRequest = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => {
    json: (payload: unknown) => void;
  };
  setHeader: (name: string, value: string | string[]) => void;
};

type VerifyPinPayload = {
  panel?: string;
  pin?: string;
};

const MAX_PIN_LENGTH = 12;
const MAX_ATTEMPTS = 6;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

const getBody = (req: ApiRequest): VerifyPinPayload => {
  if (!req.body) return {};

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as VerifyPinPayload;
    } catch {
      return {};
    }
  }

  return typeof req.body === 'object' ? (req.body as VerifyPinPayload) : {};
};

const cleanPin = (pin?: string | null) => {
  return String(pin || '')
    .replace(/\D/g, '')
    .slice(0, MAX_PIN_LENGTH);
};

const getExpectedPin = (panel: PanelType) => {
  if (panel === 'admin') {
    return cleanPin(process.env.POLLAZO_ADMIN_PIN);
  }

  return cleanPin(process.env.POLLAZO_DELIVERY_PIN);
};

const getRateLimitKey = (req: ApiRequest, panel: PanelType) => {
  const forwardedFor =
    req.headers?.['x-forwarded-for'] || req.headers?.['X-Forwarded-For'];
  const rawIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  const ip = String(rawIp || 'unknown')
    .split(',')[0]
    .trim()
    .slice(0, 80);

  return `${panel}:${ip}`;
};

const attempts = new Map<string, { count: number; resetAt: number }>();

const checkRateLimit = (key: string) => {
  const now = Date.now();
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    attempts.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });

    return {
      allowed: true,
      remaining: MAX_ATTEMPTS - 1,
      retryAfterSeconds: 0,
    };
  }

  if (current.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
    };
  }

  current.count += 1;
  attempts.set(key, current);

  return {
    allowed: true,
    remaining: Math.max(0, MAX_ATTEMPTS - current.count),
    retryAfterSeconds: 0,
  };
};

const timingSafeEqualText = (a: string, b: string) => {
  if (!a || !b || a.length !== b.length) return false;

  let result = 0;

  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return result === 0;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const payload = getBody(req);
  const panel = String(payload.panel || '').trim();
  const pin = cleanPin(payload.pin);

  if (!isPanelType(panel)) {
    return res.status(400).json({ ok: false, error: 'Invalid panel' });
  }

  if (!pin) {
    return res.status(400).json({ ok: false, error: 'Missing pin' });
  }

  const expectedPin = getExpectedPin(panel);
  const sessionSecret = getPanelSessionSecret();

  if (!expectedPin || !sessionSecret) {
    return res.status(500).json({
      ok: false,
      error: !expectedPin
        ? panel === 'admin'
          ? 'Missing POLLAZO_ADMIN_PIN env var'
          : 'Missing POLLAZO_DELIVERY_PIN env var'
        : 'Missing or weak POLLAZO_PANEL_SESSION_SECRET',
      missingEnv: true,
    });
  }

  const rateLimitKey = getRateLimitKey(req, panel);
  const rateLimit = checkRateLimit(rateLimitKey);

  if (!rateLimit.allowed) {
    return res.status(429).json({
      ok: false,
      error: 'Too many attempts',
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
  }

  if (!timingSafeEqualText(pin, expectedPin)) {
    return res.status(401).json({
      ok: false,
      error: 'Invalid pin',
      remainingAttempts: rateLimit.remaining,
    });
  }

  attempts.delete(rateLimitKey);

  const { token, claims } = await createPanelSessionToken(panel, sessionSecret);
  res.setHeader('Set-Cookie', buildPanelSessionCookie(panel, token));

  return res.status(200).json({
    ok: true,
    panel,
    expiresAt: claims.expiresAt,
  });
}
