import { ensureTrackingPanel } from '../delivery-tracking-auth.js';
import {
  cleanTrackingText,
  getTrackingClient,
  missingTrackingSchema,
} from '../delivery-tracking-utils.js';
import {
  createTrackingDevice,
  listTrackingDevices,
  startTrackingSession,
} from './delivery-tracking-admin.js';
import {
  completeTrackingSession,
  trackingHeartbeat,
  updateTrackingLocation,
} from './delivery-tracking-device.js';
import {
  readPublicTracking,
  trackingSetupRequired,
} from './delivery-tracking-public.js';

type ApiRequest = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
  headers?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => { json: (payload: unknown) => unknown };
  setHeader: (name: string, value: string | string[]) => void;
};

type Body = {
  action?: string;
  [key: string]: unknown;
};

const bodyOf = (req: ApiRequest): Body => {
  if (!req.body) return {};

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as Body;
    } catch {
      return {};
    }
  }

  return typeof req.body === 'object' ? (req.body as Body) : {};
};

const queryValue = (req: ApiRequest, key: string) => {
  const value = req.query?.[key];
  return Array.isArray(value) ? value[0] || '' : String(value || '');
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');

  const supabase = getTrackingClient();
  if (!supabase) {
    return res.status(500).json({
      ok: false,
      error: 'Falta la conexión privada con Supabase.',
    });
  }

  if (req.method === 'GET') {
    const action = cleanTrackingText(queryValue(req, 'action'), 40) || 'public';

    if (action === 'public') {
      return readPublicTracking(req, res, supabase);
    }

    if (action === 'setup') {
      const result = await supabase
        .from('delivery_sessions')
        .select('id')
        .limit(1);

      if (result.error && missingTrackingSchema(result.error)) {
        return trackingSetupRequired(res);
      }

      return res.status(result.error ? 500 : 200).json({
        ok: !result.error,
        ready: !result.error,
      });
    }

    return res.status(404).json({
      ok: false,
      error: 'Acción no encontrada.',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed',
    });
  }

  const body = bodyOf(req);
  const action = cleanTrackingText(body.action, 50);

  if (action === 'heartbeat') {
    return trackingHeartbeat(body, res, supabase);
  }

  if (action === 'update_location') {
    return updateTrackingLocation(body, res, supabase);
  }

  if (action === 'complete_session') {
    return completeTrackingSession(body, res, supabase);
  }

  const allowedPanels =
    action === 'create_device'
      ? (['admin'] as const)
      : (['admin', 'delivery'] as const);
  const panel = await ensureTrackingPanel(req.headers, [...allowedPanels]);

  if (!panel) {
    return res.status(401).json({
      ok: false,
      error: 'Sesión de panel requerida.',
    });
  }

  if (action === 'list_devices') {
    return listTrackingDevices(res, supabase);
  }

  if (action === 'create_device') {
    return createTrackingDevice(body, res, supabase);
  }

  if (action === 'start_session') {
    return startTrackingSession(body, res, supabase);
  }

  return res.status(404).json({
    ok: false,
    error: 'Acción no encontrada.',
  });
}
