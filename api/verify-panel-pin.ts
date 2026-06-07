type ApiRequest = {
  method?: string;
  body?: any;
  headers?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => {
    json: (payload: unknown) => void;
  };
};

type PanelType = 'admin' | 'delivery';

type VerifyPinPayload = {
  panel?: string;
  pin?: string;
};

const MAX_PIN_LENGTH = 12;

const getBody = (req: ApiRequest): VerifyPinPayload => {
  if (!req.body) return {};

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return req.body;
};

const cleanPin = (pin?: string | null) => {
  return String(pin || '')
    .replace(/\D/g, '')
    .slice(0, MAX_PIN_LENGTH);
};

const isPanelType = (value?: string | null): value is PanelType => {
  return value === 'admin' || value === 'delivery';
};

const getExpectedPin = (panel: PanelType) => {
  if (panel === 'admin') {
    return cleanPin(process.env.POLLAZO_ADMIN_PIN);
  }

  return cleanPin(process.env.POLLAZO_DELIVERY_PIN);
};

const getRateLimitKey = (req: ApiRequest, panel: PanelType) => {
  const forwardedFor = req.headers?.['x-forwarded-for'] || req.headers?.['X-Forwarded-For'];
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
      resetAt: now + 10 * 60 * 1000,
    });

    return {
      allowed: true,
      remaining: 5,
      retryAfterSeconds: 0,
    };
  }

  if (current.count >= 6) {
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
    remaining: Math.max(0, 6 - current.count),
    retryAfterSeconds: 0,
  };
};

const resetRateLimit = (key: string) => {
  attempts.delete(key);
};

const timingSafeEqualText = (a: string, b: string) => {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;

  let result = 0;

  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return result === 0;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed',
    });
  }

  const payload = getBody(req);
  const panel = String(payload.panel || '').trim();
  const pin = cleanPin(payload.pin);

  if (!isPanelType(panel)) {
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

  const expectedPin = getExpectedPin(panel);

  if (!expectedPin) {
    return res.status(500).json({
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
    return res.status(429).json({
      ok: false,
      error: 'Too many attempts',
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
  }

  const valid = timingSafeEqualText(pin, expectedPin);

  if (!valid) {
    return res.status(401).json({
      ok: false,
      error: 'Invalid pin',
      remainingAttempts: rateLimit.remaining,
    });
  }

  resetRateLimit(rateLimitKey);

  return res.status(200).json({
    ok: true,
    panel,
  });
}
