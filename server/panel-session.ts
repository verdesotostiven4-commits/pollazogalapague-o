export type PanelType = 'admin' | 'delivery';

export type PanelSessionClaims = {
  version: 1;
  panel: PanelType;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

const SESSION_TTL_SECONDS = 8 * 60 * 60;
const MAX_CLOCK_SKEW_SECONDS = 60;
const MIN_SECRET_LENGTH = 32;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const cookieNameOf = (panel: PanelType) => `pollazo_${panel}_session`;

const bytesToBase64Url = (bytes: Uint8Array) => {
  let binary = '';

  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

const textToBase64Url = (value: string) => {
  return bytesToBase64Url(encoder.encode(value));
};

const base64UrlToBytes = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);

  return Uint8Array.from(binary, character => character.charCodeAt(0));
};

const importSigningKey = (secret: string) => {
  return globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
};

const sign = async (payloadSegment: string, secret: string) => {
  const key = await importSigningKey(secret);
  const signature = await globalThis.crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payloadSegment)
  );

  return bytesToBase64Url(new Uint8Array(signature));
};

export const isPanelType = (value?: string | null): value is PanelType => {
  return value === 'admin' || value === 'delivery';
};

export const getPanelSessionSecret = () => {
  const secret = String(
    process.env.POLLAZO_PANEL_SESSION_SECRET || process.env.CRON_SECRET || ''
  ).trim();

  if (secret.length < MIN_SECRET_LENGTH) return null;

  return secret;
};

export const createPanelSessionToken = async (
  panel: PanelType,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000)
) => {
  const nonceBytes = new Uint8Array(18);
  globalThis.crypto.getRandomValues(nonceBytes);

  const claims: PanelSessionClaims = {
    version: 1,
    panel,
    issuedAt: nowSeconds,
    expiresAt: nowSeconds + SESSION_TTL_SECONDS,
    nonce: bytesToBase64Url(nonceBytes),
  };

  const payloadSegment = textToBase64Url(JSON.stringify(claims));
  const signature = await sign(payloadSegment, secret);

  return {
    token: `${payloadSegment}.${signature}`,
    claims,
  };
};

export const verifyPanelSessionToken = async (
  token: string,
  expectedPanel: PanelType,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): Promise<PanelSessionClaims | null> => {
  const [payloadSegment, signature, extra] = String(token || '').split('.');

  if (!payloadSegment || !signature || extra) return null;

  try {
    const key = await importSigningKey(secret);
    const validSignature = await globalThis.crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlToBytes(signature),
      encoder.encode(payloadSegment)
    );

    if (!validSignature) return null;

    const claims = JSON.parse(
      decoder.decode(base64UrlToBytes(payloadSegment))
    ) as Partial<PanelSessionClaims>;

    if (claims.version !== 1 || claims.panel !== expectedPanel) return null;
    if (typeof claims.issuedAt !== 'number' || !Number.isInteger(claims.issuedAt)) {
      return null;
    }
    if (typeof claims.expiresAt !== 'number' || !Number.isInteger(claims.expiresAt)) {
      return null;
    }
    if (typeof claims.nonce !== 'string' || claims.nonce.length < 12) return null;

    const issuedAt = claims.issuedAt;
    const expiresAt = claims.expiresAt;

    if (issuedAt > nowSeconds + MAX_CLOCK_SKEW_SECONDS) return null;
    if (expiresAt <= nowSeconds) return null;
    if (expiresAt - issuedAt > SESSION_TTL_SECONDS) return null;

    return claims as PanelSessionClaims;
  } catch {
    return null;
  }
};

export const parseCookies = (
  headers?: Record<string, string | string[] | undefined>
) => {
  const raw = headers?.cookie || headers?.Cookie;
  const value = Array.isArray(raw) ? raw.join(';') : String(raw || '');
  const cookies: Record<string, string> = {};

  value.split(';').forEach(part => {
    const separator = part.indexOf('=');
    if (separator <= 0) return;

    const key = part.slice(0, separator).trim();
    const cookieValue = part.slice(separator + 1).trim();

    if (key) cookies[key] = decodeURIComponent(cookieValue);
  });

  return cookies;
};

export const readPanelSessionToken = (
  headers: Record<string, string | string[] | undefined> | undefined,
  panel: PanelType
) => {
  return parseCookies(headers)[cookieNameOf(panel)] || '';
};

const secureAttribute = () => {
  return process.env.NODE_ENV === 'development' ? '' : '; Secure';
};

export const buildPanelSessionCookie = (
  panel: PanelType,
  token: string,
  maxAgeSeconds = SESSION_TTL_SECONDS
) => {
  return `${cookieNameOf(panel)}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${secureAttribute()}`;
};

export const buildExpiredPanelSessionCookie = (panel: PanelType) => {
  return `${cookieNameOf(panel)}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secureAttribute()}`;
};
