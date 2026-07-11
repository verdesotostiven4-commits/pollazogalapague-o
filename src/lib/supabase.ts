import { createClient } from '@supabase/supabase-js';
import { insertOrderSecurely } from '../services/secureOrderInsert';
import {
  createSecureOrderUpdateBuilder,
  isProtectedOrderUpdate,
} from '../services/secureOrderUpdate';

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn(
    '⚠️ Supabase no está configurado. Revisa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'
  );
}

const rawSupabase = createClient(
  supabaseUrl || 'https://example.supabase.co',
  supabaseAnonKey || 'public-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

type SecureInsertArgs = Parameters<typeof insertOrderSecurely>[0];

/**
 * Compatibilidad transicional de Fase 1:
 *
 * - INSERT sobre `orders` pasa por /api/create-order.
 * - UPDATE de estado/pago pasa por endpoints con sesión firmada y service role.
 * - Un cambio logístico nunca puede confirmar el pago en la misma petición.
 * - Otras operaciones y tablas conservan el cliente normal.
 * - El fallback de creación antiguo está desactivado en producción.
 */
export const supabase = new Proxy(rawSupabase, {
  get(target, property, receiver) {
    if (property === 'from') {
      return ((relation: string) => {
        const query = target.from(relation);

        if (relation !== 'orders') {
          return query;
        }

        return new Proxy(query, {
          get(queryTarget, queryProperty, queryReceiver) {
            if (queryProperty === 'insert') {
              const fallbackInsert = queryTarget.insert.bind(queryTarget);

              return (values: unknown, options?: unknown) =>
                insertOrderSecurely({
                  values,
                  options,
                  fallbackInsert:
                    fallbackInsert as unknown as SecureInsertArgs['fallbackInsert'],
                });
            }

            if (queryProperty === 'update') {
              const fallbackUpdate = queryTarget.update.bind(queryTarget);

              return (patch: unknown, options?: unknown) => {
                if (isProtectedOrderUpdate(patch)) {
                  return createSecureOrderUpdateBuilder(patch);
                }

                return fallbackUpdate(
                  patch as Parameters<typeof fallbackUpdate>[0],
                  options as Parameters<typeof fallbackUpdate>[1]
                );
              };
            }

            const value = Reflect.get(
              queryTarget,
              queryProperty,
              queryReceiver
            );

            return typeof value === 'function'
              ? value.bind(queryTarget)
              : value;
          },
        });
      }) as typeof target.from;
    }

    const value = Reflect.get(target, property, receiver);

    return typeof value === 'function' ? value.bind(target) : value;
  },
}) as typeof rawSupabase;
