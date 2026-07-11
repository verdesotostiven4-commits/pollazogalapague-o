type ApiRequest = {
  method?: string;
  body?: unknown;
};

type ApiResponse = {
  status: (code: number) => { json: (payload: unknown) => unknown };
  setHeader: (name: string, value: string | string[]) => void;
};

const MIN_SECRET_LENGTH = 32;

const validSecret = (value: unknown) => {
  const secret = String(value || '').trim();
  return secret.length >= MIN_SECRET_LENGTH ? secret : '';
};

const ensureOrderSecret = () => {
  const configured = [
    process.env.POLLAZO_ORDER_SECRET,
    process.env.POLLAZO_PANEL_SESSION_SECRET,
    process.env.CRON_SECRET,
  ]
    .map(validSecret)
    .find(Boolean);

  if (configured) {
    process.env.POLLAZO_ORDER_SECRET = configured;
    return;
  }

  const serviceRoleKey = validSecret(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (serviceRoleKey) {
    process.env.POLLAZO_ORDER_SECRET = `pollazo-orders:${serviceRoleKey}`;
  }
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  ensureOrderSecret();
  const module = await import('./create-order-v2.js');
  return module.default(req, res);
}
