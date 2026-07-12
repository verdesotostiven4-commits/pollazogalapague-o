import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getPanelSessionSecret,
  readPanelSessionToken,
  verifyPanelSessionToken,
  type PanelType,
} from './panel-session.js';
import { cleanTrackingText, trackingHash } from './delivery-tracking-utils.js';

type Headers = Record<string, string | string[] | undefined> | undefined;

export type DeliveryDeviceRow = {
  id: string;
  name: string;
  token_hash: string;
  enabled: boolean;
  max_orders: number;
  last_seen_at?: string | null;
};

export const ensureTrackingPanel = async (
  headers: Headers,
  allowed: PanelType[]
): Promise<PanelType | null> => {
  const secret = getPanelSessionSecret();

  for (const panel of allowed) {
    const token = readPanelSessionToken(headers, panel);
    if (!token) continue;

    const claims = await verifyPanelSessionToken(token, panel, secret);
    if (claims) return panel;
  }

  return null;
};

export const getDeliveryDeviceByToken = async (
  supabase: SupabaseClient,
  rawToken: string
) => {
  const token = cleanTrackingText(rawToken, 400);

  if (token.length < 20) {
    return { device: null as DeliveryDeviceRow | null, error: null };
  }

  const tokenHash = await trackingHash(token);
  const result = await supabase
    .from('delivery_devices')
    .select('*')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  return {
    device: (result.data || null) as DeliveryDeviceRow | null,
    error: result.error,
  };
};
