import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

export type CustomerRequestLike = {
  headers?: Record<string, string | string[] | undefined>;
};

export const CUSTOMER_SESSION_COOKIE = '__Host-pollazo_customer_session';
export const CUSTOMER_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

const SESSION_VERSION = 1;
const MIN_SECRET_LENGTH = 32;

type CustomerSessionPayload = {
  version: number;
  phone: string;
  phoneTail: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

const getHeader = (req: CustomerRequestLike, name: string) => {
  const entry = Object.entries(req.headers || {}).find(
    ([key]) => key.toLowerCase() === name.toLowerCase()
  );

  if (!entry) return '';

  const value = entry[1];
  return Array.isArray(value) ? value[0] || '' : String(value || '');
};

export const normalizeCustomerPhone = (value: unknown) => {
  const digits = String(value || '').replace(/\D/g, '');

  if (digits.startsWith('593') && digits.length >= 11) {
    return digits.slice(0, 15);
  }

  if (digits.startsWith('0') && digits.length === 10) {
    return `593${digits.slice(1)}`;
  }

  if (digits.startsWith('9') && digits.length === 9) {
    return `593${digits}`;
  }

  return digits.slice(0, 15);
};

const readSecret = () => {
  const secret = String(
    process.env.POLLAZO_CUSTOMER_SESSION_SECRET || ''
  ).trim();

  return secret.length >= MIN_SECRET_LENGTH ? secret : null;
};

export const hasCustomerSessionSecret = () => Boolean(readSecret());

const sign = (payload: string, secret: string) => {
  return createHmac('sha256', secret)
    .update(payload)
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

export const createCustomerSessionToken = (phoneInput: unknown) => {
  const secret = readSecret();
  const phone = normalizeCustomerPhone(phoneInput);
  const phoneTail = phone.slice(-9);

  if (!secret) {
    throw new Error('POLLAZO_CUSTOMER_SESSION_SECRET is missing or too short');
  }

  if (phoneTail.length !== 9) {
    throw new Error('Invalid customer phone');
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: CustomerSessionPayload = {
    version: SESSION_VERSION,
    phone,
    phoneTail,
    issuedAt,
    expiresAt: issuedAt + CUSTOMER_SESSION_TTL_SECONDS,
    nonce: randomBytes(18).toString('base64url'),
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString(
    'base64url'
  );

  return {
    token: `${encoded}.${sign(encoded, secret)}`,
    expiresAt: payload.expiresAt,
    phone: payload.phone,
    phoneTail: payload.phoneTail,
  };
};

export const verifyCustomerSessionToken = (
  token: string | null | undefined
) => {
  const secret = readSecret();

  if (!secret || !token) return null;

  const [encoded, receivedSignature, ...extra] = token.split('.');

  if (!encoded || !receivedSignature || extra.length > 0) return null;

  const expectedSignature = sign(encoded, secret);

  if (!safeEqual(receivedSignature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as Partial<CustomerSessionPayload>;
    const now = Math.floor(Date.now() / 1000);
    const normalizedPhone = normalizeCustomerPhone(payload.phone);

    if (
      payload.version !== SESSION_VERSION ||
      typeof payload.phone !== 'string' ||
      normalizedPhone !== payload.phone ||
      typeof payload.phoneTail !== 'string' ||
      payload.phoneTail !== normalizedPhone.slice(-9) ||
      payload.phoneTail.length !== 9 ||
      typeof payload.issuedAt !== 'number' ||
      typeof payload.expiresAt !== 'number' ||
      typeof payload.nonce !== 'string' ||
      payload.nonce.length < 12 ||
      payload.issuedAt > now + 60 ||
      payload.expiresAt <= now ||
      payload.expiresAt - payload.issuedAt > CUSTOMER_SESSION_TTL_SECONDS
    ) {
      return null;
    }

    return payload as CustomerSessionPayload;
  } catch {
    return null;
  }
};

const parseCookies = (header: string) => {
  const cookies = new Map<string, string>();

  header.split(';').forEach(part => {
    const separator = part.indexOf('=');
    if (separator <= 0) return;

    const key = part.slice(0, separator).trim();
    const rawValue = part.slice(separator + 1).trim();

    try {
      cookies.set(key, decodeURIComponent(rawValue));
    } catch {
      cookies.set(key, rawValue);
    }
  });

  return cookies;
};

export const readCustomerSession = (req: CustomerRequestLike) => {
  const cookies = parseCookies(getHeader(req, 'cookie'));

  return verifyCustomerSessionToken(
    cookies.get(CUSTOMER_SESSION_COOKIE) || null
  );
};

const useSecureCookie = () => process.env.NODE_ENV !== 'development';

export const serializeCustomerSessionCookie = (token: string) => {
  const attributes = [
    `${CUSTOMER_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${CUSTOMER_SESSION_TTL_SECONDS}`,
  ];

  if (useSecureCookie()) attributes.push('Secure');

  return attributes.join('; ');
};

export const serializeClearedCustomerSessionCookie = () => {
  const attributes = [
    `${CUSTOMER_SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ];

  if (useSecureCookie()) attributes.push('Secure');

  return attributes.join('; ');
};
