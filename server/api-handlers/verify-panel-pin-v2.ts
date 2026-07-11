import {
  buildPanelSessionCookie,
  createPanelSessionToken,
  getPanelSessionSecret,
  isPanelType,
  type PanelType,
} from '../panel-session.js';

type ApiRequest = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => { json: (payload: unknown) => unknown };
  setHeader: (name: string, value: string | string[]) => void;
};

type VerifyPinPayload = {
  panel?: string;
  pin?: string;
};

const MAX_PIN_LENGTH = 12;
const MAX_ATTEMPTS = 6;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

const bodyOf = (req: ApiRequest): VerifyPinPayload => {
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

const cleanPin = (value?: string | null) =>
  String(value || '')
    .replace(/\D/g, '')
    .slice(0, MAX_PIN_LENGTH);

const expectedPinOf = (panel: PanelType) =>
  cleanPin(
    panel === 'admin'
      ? process.env.POLLAZO_ADMIN_PIN
      : process.env.POLLAZO_DELIVERY_PIN
  );

const requestKeyOf = (req: ApiRequest, panel: PanelType) => {
  const forwarded =
    req.headers?.['x-forwarded-for'] || req.headers?.['X-Forwarded-For'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const ip = String(raw || 'unknown').split(',')[0].trim().slice(0, 80);
  return `${panel}:${ip}`;
};

const takeAttempt = (key: string) => {
  const now = Date.now();
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    const next = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    attempts.set(key, next);
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, retryAfterSeconds: 0 };
  }

  if (current.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
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

const equalPins = (a: string, b: string) => {
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

  const payload = bodyOf(req);
  const panel = String(payload.panel || '').trim();
  const pin = cleanPin(payload.pin);

  if (!isPanelType(panel)) {
    return res.status(400).json({ ok: false, error: 'Invalid panel' });
  }

  if (!pin) {
    return res.status(400).json({ ok: false, error: 'Missing pin' });
  }

  const expectedPin = expectedPinOf(panel);
  const sessionSecret = getPanelSessionSecret();

  if (!expectedPin || !sessionSecret) {
    return res.status(500).json({
      ok: false,
      error: !expectedPin ? 'Missing panel PIN' : 'Missing panel session secret',
      missingEnv: true,
    });
  }

  const rateLimitKey = requestKeyOf(req, panel);
  const attempt = takeAttempt(rateLimitKey);

  if (!attempt.allowed) {
    return res.status(429).json({
      ok: false,
      error: 'Too many attempts',
      retryAfterSeconds: attempt.retryAfterSeconds,
    });
  }

  if (!equalPins(pin, expectedPin)) {
    return res.status(401).json({
      ok: false,
      error: 'Invalid pin',
      remainingAttempts: attempt.remaining,
    });
  }

  attempts.delete(rateLimitKey);

  try {
    const { token, claims } = await createPanelSessionToken(panel, sessionSecret);
    res.setHeader('Set-Cookie', buildPanelSessionCookie(panel, token));

    return res.status(200).json({
      ok: true,
      panel,
      expiresAt: claims.expiresAt,
    });
  } catch (error) {
    console.error('Panel session creation failed:', error);
    return res.status(500).json({
      ok: false,
      error: 'Could not create panel session',
      sessionError: true,
    });
  }
}
