import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

export type PanelRole = 'admin' | 'delivery';

export type RequestLike = {
  headers?: Record<string, string | string[] | undefined>;
};

export const PANEL_SESSION_COOKIE = '__Host-pollazo_panel_session';
export const PANEL_SESSION_TTL_SECONDS = 8 * 60 * 60;

const SESSION_VERSION = 1;
const MIN_SECRET_LENGTH = 32;

type PanelSessionPayload = {
  version: number;
  role: PanelRole;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

const getHeader = (req: RequestLike, name: string) => {
  const headers = req.headers || {};
  const entry = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === name.toLowerCase()
  );

  if (!entry) return '';

  const value = entry[1];
  return Array.isArray(value) ? value[0] || '' : String(value || '');
};

const readSecret = () => {
  const secret = String(process.env.POLLAZO_PANEL_SESSION_SECRET || '').trim();

  if (secret.length < MIN_SECRET_LENGTH) {
    return null;
  }

  return secret;
};

export const isPanelRole = (value: unknown): value is PanelRole => {
  return value === 'admin' || value === 'delivery';
};

export const hasPanelSessionSecret = () => Boolean(readSecret());

const encodePayload = (payload: PanelSessionPayload) => {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
};

const signPayload = (encodedPayload: string, secret: string) => {
  return createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');
};

const safeEqual = (left: string, right: string) => {
  try {
    const leftBuffer = Buffer.from(left, 'utf8');
    const rightBuffer = Buffer.from(right, 'utf8');

    if (leftBuffer.length !== rightBuffer.length) return false;

    return timingSafeEqual(leftBuffer, rightBuffer);
  } catch {
    return false;
  }
};

export const createPanelSessionToken = (role: PanelRole) => {
  const secret = readSecret();

  if (!secret) {
    throw new Error('POLLAZO_PANEL_SESSION_SECRET is missing or too short');
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: PanelSessionPayload = {
    version: SESSION_VERSION,
    role,
    issuedAt,
    expiresAt: issuedAt + PANEL_SESSION_TTL_SECONDS,
    nonce: randomBytes(18).toString('base64url'),
  };

  const encodedPayload = encodePayload(payload);
  const signature = signPayload(encodedPayload, secret);

  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt: payload.expiresAt,
  };
};

export const verifyPanelSessionToken = (token: string | null | undefined) => {
  const secret = readSecret();

  if (!secret || !token) return null;

  const [encodedPayload, receivedSignature, ...extraParts] = token.split('.');

  if (!encodedPayload || !receivedSignature || extraParts.length > 0) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload, secret);

  if (!safeEqual(receivedSignature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    ) as Partial<PanelSessionPayload>;

    const now = Math.floor(Date.now() / 1000);

    if (
      payload.version !== SESSION_VERSION ||
      !isPanelRole(payload.role) ||
      typeof payload.issuedAt !== 'number' ||
      typeof payload.expiresAt !== 'number' ||
      typeof payload.nonce !== 'string' ||
      payload.nonce.length < 12 ||
      payload.issuedAt > now + 60 ||
      payload.expiresAt <= now ||
      payload.expiresAt - payload.issuedAt > PANEL_SESSION_TTL_SECONDS
    ) {
      return null;
    }

    return payload as PanelSessionPayload;
  } catch {
    return null;
  }
};

const parseCookies = (cookieHeader: string) => {
  const cookies = new Map<string, string>();

  cookieHeader.split(';').forEach(part => {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex <= 0) return;

    const key = part.slice(0, separatorIndex).trim();
    const rawValue = part.slice(separatorIndex + 1).trim();

    try {
      cookies.set(key, decodeURIComponent(rawValue));
    } catch {
      cookies.set(key, rawValue);
    }
  });

  return cookies;
};

export const readPanelSession = (
  req: RequestLike,
  expectedRole?: PanelRole
) => {
  const cookies = parseCookies(getHeader(req, 'cookie'));
  const payload = verifyPanelSessionToken(
    cookies.get(PANEL_SESSION_COOKIE) || null
  );

  if (!payload) return null;
  if (expectedRole && payload.role !== expectedRole) return null;

  return payload;
};

const shouldUseSecureCookie = () => {
  return process.env.NODE_ENV !== 'development';
};

export const serializePanelSessionCookie = (token: string) => {
  const attributes = [
    `${PANEL_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${PANEL_SESSION_TTL_SECONDS}`,
  ];

  if (shouldUseSecureCookie()) {
    attributes.push('Secure');
  }

  return attributes.join('; ');
};

export const serializeClearedPanelSessionCookie = () => {
  const attributes = [
    `${PANEL_SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ];

  if (shouldUseSecureCookie()) {
    attributes.push('Secure');
  }

  return attributes.join('; ');
};
