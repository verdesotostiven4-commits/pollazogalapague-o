import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const encoder = new TextEncoder();

export const TRACKING_LIMITS = {
  maxAccuracyM: 60,
  departureRadiusM: 130,
  nearbyRadiusM: 180,
  arrivalRadiusM: 45,
  minMovementM: 8,
  maxSpeedMps: 45,
  offlineAfterMs: 45_000,
} as const;

export const cleanTrackingText = (value: unknown, max = 180) =>
  String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);

export const finiteTrackingNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const validTrackingCoordinate = (lat: number | null, lng: number | null) =>
  lat !== null &&
  lng !== null &&
  lat >= -90 &&
  lat <= 90 &&
  lng >= -180 &&
  lng <= 180;

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

export const trackingHash = async (value: string) => {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
};

export const createTrackingToken = () => {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
};

export const getTrackingClient = (): SupabaseClient | null => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

export const missingTrackingSchema = (error: any) => {
  const code = String(error?.code || '').toUpperCase();
  const message = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    message.includes('delivery_sessions') ||
    message.includes('delivery_devices') ||
    message.includes('delivery_locations')
  );
};

const toRadians = (value: number) => (value * Math.PI) / 180;

export const trackingDistanceM = (
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number }
) => {
  const earthRadius = 6_371_000;
  const lat1 = toRadians(first.latitude);
  const lat2 = toRadians(second.latitude);
  const deltaLat = toRadians(second.latitude - first.latitude);
  const deltaLng = toRadians(second.longitude - first.longitude);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
