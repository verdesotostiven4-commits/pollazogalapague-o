import { createClient } from '@supabase/supabase-js';
import {
  createRejectedCustomerDeleteBuilder,
  createSecureCustomerMutationBuilder,
  createSecureCustomerReadBuilder,
} from '../services/secureCustomerGateway';
import { insertOrderSecurely } from '../services/secureOrderInsert';
import { createSecureOrderReadBuilder } from '../services/secureOrderRead';
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

const wrapCustomersQuery = (query: ReturnType<typeof rawSupabase.from>) => {
  return new Proxy(query, {
    get(queryTarget, queryProperty, queryReceiver) {
      if (queryProperty === 'select') {
        return () => createSecureCustomerReadBuilder();
      }

      if (queryProperty === 'upsert') {
        return (value: unknown) =>
          createSecureCustomerMutationBuilder('upsert', value);
      }

      if (queryProperty === 'insert') {
        return (value: unknown) =>
          createSecureCustomerMutationBuilder('insert', value);
      }

      if (queryProperty === 'update') {
        return (value: unknown) =>
          createSecureCustomerMutationBuilder('update', value);
      }

      if (queryProperty === 'delete') {
        return () => createRejectedCustomerDeleteBuilder();
      }

      const value = Reflect.get(queryTarget, queryProperty, queryReceiver);

      return typeof value === 'function' ? value.bind(queryTarget) : value;
    },
  });
};

const wrapOrdersQuery = (query: ReturnType<typeof rawSupabase.from>) => {
  return new Proxy(query, {
    get(queryTarget, queryProperty, queryReceiver) {
      if (queryProperty === 'select') {
        return () => createSecureOrderReadBuilder();
      }

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
        return (patch: unknown) => {
          if (isProtectedOrderUpdate(patch)) {
            return createSecureOrderUpdateBuilder(patch);
          }

          return createSecureOrderUpdateBuilder({});
        };
      }

      if (queryProperty === 'delete') {
        return () => createSecureOrderUpdateBuilder({});
      }

      const value = Reflect.get(queryTarget, queryProperty, queryReceiver);

      return typeof value === 'function' ? value.bind(queryTarget) : value;
    },
  });
};

/**
 * Compatibilidad transicional de Fase 1:
 *
 * - `customers` nunca usa acceso público directo: panel, perfil y ranking
 *   pasan por endpoints separados.
 * - SELECT de `orders` usa sesiones firmadas de panel o cliente.
 * - INSERT sobre `orders` pasa por /api/create-order.
 * - UPDATE de estado/pago/bonos pasa por endpoints con sesión firmada.
 * - DELETE directo de clientes y pedidos está bloqueado.
 * - El fallback de creación antiguo está desactivado en producción.
 */
export const supabase = new Proxy(rawSupabase, {
  get(target, property, receiver) {
    if (property === 'from') {
      return ((relation: string) => {
        const query = target.from(relation);

        if (relation === 'customers') {
          return wrapCustomersQuery(query);
        }

        if (relation === 'orders') {
          return wrapOrdersQuery(query);
        }

        return query;
      }) as typeof target.from;
    }

    const value = Reflect.get(target, property, receiver);

    return typeof value === 'function' ? value.bind(target) : value;
  },
}) as typeof rawSupabase;
