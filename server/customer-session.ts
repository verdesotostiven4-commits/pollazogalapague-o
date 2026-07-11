export type CustomerSessionClaims = {
  version: 1;
  phone: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const MAX_CLOCK_SKEW_SECONDS = 60;
const MIN_SECRET_LENGTH = 32;
const COOKIE_NAME = 'pollazo_customer_session';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

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

const base64UrlToBytes = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
};

const textToBase64Url = (value: string) => bytesToBase64Url(encoder.encode(value));

const importSigningKey = (secret: string) => {
  return globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
};

const sign = async (payload: string, secret: string) => {
  const key = await importSigningKey(secret);
  const signature = await globalThis.crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );
  return bytesToBase64Url(new Uint8Array(signature));
};

export const getCustomerSessionSecret = () => {
  const secret = String(
    process.env.POLLAZO_CUSTOMER_SESSION_SECRET ||
      process.env.POLLAZO_ORDER_SECRET ||
      process.env.POLLAZO_PANEL_SESSION_SECRET ||
      process.env.CRON_SECRET ||
      ''
  ).trim();

  return secret.length >= MIN_SECRET_LENGTH ? secret : null;
};

export const createCustomerSessionToken = async (
  phone: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000)
) => {
  const nonceBytes = new Uint8Array(18);
  globalThis.crypto.getRandomValues(nonceBytes);

  const claims: CustomerSessionClaims = {
    version: 1,
    phone,
    issuedAt: nowSeconds,
    expiresAt: nowSeconds + SESSION_TTL_SECONDS,
    nonce: bytesToBase64Url(nonceBytes),
  };
  const payload = textToBase64Url(JSON.stringify(claims));
  const signature = await sign(payload, secret);

  return { token: `${payload}.${signature}`, claims };
};

export const verifyCustomerSessionToken = async (
  token: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): Promise<CustomerSessionClaims | null> => {
  const [payload, signature, extra] = String(token || '').split('.');
  if (!payload || !signature || extra) return null;

  try {
    const key = await importSigningKey(secret);
    const valid = await globalThis.crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlToBytes(signature),
      encoder.encode(payload)
    );
    if (!valid) return null;

    const claims = JSON.parse(
      decoder.decode(base64UrlToBytes(payload))
    ) as Partial<CustomerSessionClaims>;

    if (claims.version !== 1 || typeof claims.phone !== 'string') return null;
    if (typeof claims.issuedAt !== 'number' || typeof claims.expiresAt !== 'number') {
      return null;
    }
    if (typeof claims.nonce !== 'string' || claims.nonce.length < 12) return null;
    if (claims.issuedAt > nowSeconds + MAX_CLOCK_SKEW_SECONDS) return null;
    if (claims.expiresAt <= nowSeconds) return null;
    if (claims.expiresAt - claims.issuedAt > SESSION_TTL_SECONDS) return null;

    return claims as CustomerSessionClaims;
  } catch {
    return null;
  }
};

const parseCookies = (
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

export const readCustomerSessionToken = (
  headers?: Record<string, string | string[] | undefined>
) => parseCookies(headers)[COOKIE_NAME] || '';

const secureAttribute = () =>
  process.env.NODE_ENV === 'development' ? '' : '; Secure';

export const buildCustomerSessionCookie = (token: string) =>
  `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}${secureAttribute()}`;

export const buildExpiredCustomerSessionCookie = () =>
  `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secureAttribute()}`;
