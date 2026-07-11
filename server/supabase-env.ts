type EnvironmentCandidate = {
  name: string;
  value: string;
  projectRef: string | null;
  role: string | null;
};

export type SupabaseEnvironmentStatus = {
  url: string;
  urlSource: string | null;
  projectRef: string | null;
  serverKey: string;
  serverKeySource: string | null;
  serverKeyUsable: boolean;
  publicKey: string;
  publicKeySource: string | null;
  selectedKey: string;
  selectedKeyKind: 'server' | 'public' | 'none';
  selectedKeySource: string | null;
  selectedKeyProjectRef: string | null;
  projectMatch: boolean | null;
  hasServerKey: boolean;
  hasPublicKey: boolean;
};

const readEnvironment = (name: string) =>
  String(process.env[name] || '').trim();

const decodeJwtPayload = (value: string): Record<string, unknown> | null => {
  const parts = value.split('.');
  if (parts.length !== 3) return null;

  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = globalThis.atob(padded);
    const payload = JSON.parse(decoded);
    return payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

const projectRefFromUrl = (value: string): string | null => {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    if (!hostname.endsWith('.supabase.co')) return null;
    return hostname.split('.')[0] || null;
  } catch {
    return null;
  }
};

const projectRefFromKey = (value: string): string | null => {
  const payload = decodeJwtPayload(value);
  const directRef = String(payload?.ref || '').trim();
  if (directRef) return directRef;

  const issuer = String(payload?.iss || '').trim();
  if (!issuer) return null;

  try {
    return projectRefFromUrl(new URL(issuer).origin);
  } catch {
    return null;
  }
};

const roleFromKey = (value: string): string | null => {
  const payload = decodeJwtPayload(value);
  const role = String(payload?.role || '').trim();
  return role || null;
};

const uniqueCandidates = (names: string[], kind: 'url' | 'key') => {
  const seen = new Set<string>();
  const result: EnvironmentCandidate[] = [];

  names.forEach(name => {
    const value = readEnvironment(name);
    if (!value || seen.has(value)) return;
    seen.add(value);

    result.push({
      name,
      value,
      projectRef:
        kind === 'url' ? projectRefFromUrl(value) : projectRefFromKey(value),
      role: kind === 'key' ? roleFromKey(value) : null,
    });
  });

  return result;
};

const URL_VARIABLES = [
  'VITE_SUPABASE_URL',
  'SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
];

const SERVER_KEY_VARIABLES = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_SECRET',
];

const PUBLIC_KEY_VARIABLES = [
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_ANON_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
];

const matchingUrl = (
  urls: EnvironmentCandidate[],
  key?: EnvironmentCandidate
): EnvironmentCandidate | null => {
  if (!key?.projectRef) return null;
  return urls.find(candidate => candidate.projectRef === key.projectRef) || null;
};

export const resolveSupabaseEnvironment = (): SupabaseEnvironmentStatus => {
  const urls = uniqueCandidates(URL_VARIABLES, 'url');
  const serverKeys = uniqueCandidates(SERVER_KEY_VARIABLES, 'key');
  const publicKeys = uniqueCandidates(PUBLIC_KEY_VARIABLES, 'key');

  const serverKey = serverKeys[0] || null;
  const publicKey = publicKeys[0] || null;
  const serverUrl = matchingUrl(urls, serverKey || undefined);
  const publicUrl = matchingUrl(urls, publicKey || undefined);

  const serverKeyUsable = Boolean(
    serverKey && (!serverKey.projectRef || serverUrl)
  );

  let selectedKey = serverKeyUsable ? serverKey : publicKey;
  let selectedKeyKind: SupabaseEnvironmentStatus['selectedKeyKind'] =
    serverKeyUsable ? 'server' : publicKey ? 'public' : 'none';

  let selectedUrl =
    (selectedKeyKind === 'server' ? serverUrl : publicUrl) ||
    publicUrl ||
    serverUrl ||
    urls[0] ||
    null;

  if (!selectedKey && serverKey) {
    selectedKey = serverKey;
    selectedKeyKind = 'server';
  }

  const projectMatch =
    selectedUrl?.projectRef && selectedKey?.projectRef
      ? selectedUrl.projectRef === selectedKey.projectRef
      : null;

  return {
    url: selectedUrl?.value || '',
    urlSource: selectedUrl?.name || null,
    projectRef: selectedUrl?.projectRef || null,
    serverKey: serverKey?.value || '',
    serverKeySource: serverKey?.name || null,
    serverKeyUsable,
    publicKey: publicKey?.value || '',
    publicKeySource: publicKey?.name || null,
    selectedKey: selectedKey?.value || '',
    selectedKeyKind,
    selectedKeySource: selectedKey?.name || null,
    selectedKeyProjectRef: selectedKey?.projectRef || null,
    projectMatch,
    hasServerKey: Boolean(serverKey),
    hasPublicKey: Boolean(publicKey),
  };
};

export const installCanonicalSupabaseEnvironment = () => {
  const status = resolveSupabaseEnvironment();

  if (status.url) {
    process.env.SUPABASE_URL = status.url;
  }

  if (status.publicKey) {
    process.env.SUPABASE_ANON_KEY = status.publicKey;
  }

  if (status.serverKeyUsable && status.serverKey) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = status.serverKey;
  } else if (status.hasServerKey && status.projectMatch === false) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
  }

  return status;
};
