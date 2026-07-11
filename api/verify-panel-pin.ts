import { timingSafeEqual } from 'node:crypto';
import {
  createPanelSessionToken,
  hasPanelSessionSecret,
  isPanelRole,
  serializePanelSessionCookie,
  type PanelRole,
} from './_panel-session.js';

type ApiRequest = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  setHeader: (name: string, value: string | string[]) => void;
  status: (code: number) => {
    json: (payload: unknown) => void;
  };
};

type VerifyPinPayload = {
  panel?: unknown;
  pin?: unknown;
};

const MAX_PIN_LENGTH = 12;
const MAX_ATTEMPTS = 6;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

const attempts = new Map<string, { count: number; resetAt: number }>();

const getBody = (req: ApiRequest): VerifyPinPayload => {
  if (!req.body) return {};

  if (typeof req.body === 'string') {
    try {
      const parsed = JSON.parse(req.body) as unknown;
      return parsed && typeof parsed === 'object'
        ? (parsed as VerifyPinPayload)
        : {};
    } catch {
      return {};
    }
  }

  return typeof req.body === 'object'
    ? (req.body as VerifyPinPayload)
    : {};
};

const cleanPin = (pin: unknown) => {
  return String(pin || '')
    .replace(/\D/g, '')
    .slice(0, MAX_PIN_LENGTH);
};

const getExpectedPin = (panel: PanelRole) => {
  if (panel === 'admin') {
    return cleanPin(process.env.POLLAZO_ADMIN_PIN);
  }

  return cleanPin(process.env.POLLAZO_DELIVERY_PIN);
};

const getHeader = (req: ApiRequest, name: string) => {
  const match = Object.entries(req.headers || {}).find(
    ([key]) => key.toLowerCase() === name.toLowerCase()
  );

  if (!match) return '';

  const value = match[1];
  return Array.isArray(value) ? value[0] || '' : String(value || '');
};

const getRateLimitKey = (req: ApiRequest, panel: PanelRole) => {
  const rawIp =
    getHeader(req, 'x-forwarded-for') ||
    getHeader(req, 'x-real-ip') ||
    'unknown';
  const ip = rawIp.split(',')[0].trim().slice(0, 80);

  return `${panel}:${ip}`;
};

const checkRateLimit = (key: string) => {
  const now = Date.now();
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    const next = {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    };
    attempts.set(key, next);

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
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((current.resetAt - now) / 1000)
      ),
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

const resetRateLimit = (key: string) => {
  attempts.delete(key);
};

const safePinEqual = (left: string, right: string) => {
  if (!left || !right) return false;

  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');

  if (leftBuffer.length !== rightBuffer.length) return false;

  return timingSafeEqual(leftBuffer, rightBuffer);
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed',
    });
  }

  const payload = getBody(req);
  const panel = String(payload.panel || '').trim();
  const pin = cleanPin(payload.pin);

  if (!isPanelRole(panel)) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid panel',
    });
  }

  if (!pin) {
    return res.status(400).json({
      ok: false,
      error: 'Missing pin',
    });
  }

  if (!hasPanelSessionSecret()) {
    return res.status(503).json({
      ok: false,
      error: 'Panel session is not configured',
      missingEnv: true,
    });
  }

  const expectedPin = getExpectedPin(panel);

  if (!expectedPin) {
    return res.status(503).json({
      ok: false,
      error:
        panel === 'admin'
          ? 'Missing POLLAZO_ADMIN_PIN env var'
          : 'Missing POLLAZO_DELIVERY_PIN env var',
      missingEnv: true,
    });
  }

  const rateLimitKey = getRateLimitKey(req, panel);
  const rateLimit = checkRateLimit(rateLimitKey);

  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));

    return res.status(429).json({
      ok: false,
      error: 'Too many attempts',
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
  }

  if (!safePinEqual(pin, expectedPin)) {
    return res.status(401).json({
      ok: false,
      error: 'Invalid pin',
      remainingAttempts: rateLimit.remaining,
    });
  }

  resetRateLimit(rateLimitKey);

  const session = createPanelSessionToken(panel);
  res.setHeader('Set-Cookie', serializePanelSessionCookie(session.token));

  return res.status(200).json({
    ok: true,
    panel,
    expiresAt: session.expiresAt,
  });
}
