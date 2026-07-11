import { createClient } from '@supabase/supabase-js';
import { insertOrderSecurely } from '../services/secureOrderInsert';

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
 * - Solo intercepta INSERT sobre `orders`.
 * - La creación real pasa por create_online_order_v2.
 * - SELECT/UPDATE/DELETE y todas las demás tablas conservan el cliente normal.
 * - El fallback antiguo está desactivado en builds de producción.
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
                  client: target as unknown as SecureInsertArgs['client'],
                  values,
                  options,
                  fallbackInsert:
                    fallbackInsert as unknown as SecureInsertArgs['fallbackInsert'],
                });
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
