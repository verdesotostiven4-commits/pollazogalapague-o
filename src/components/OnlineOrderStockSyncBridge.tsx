import { useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { OrderStatus } from '../types';

type OrderRealtimePayload = {
  id?: string;
  status?: OrderStatus | string | null;
  order_code?: string | null;
};

const STOCK_SYNC_STATUSES = new Set<string>([
  'Recibido',
  'Preparando',
  'Enviado',
  'Entregado',
  'Cancelado',
]);

export default function OnlineOrderStockSyncBridge() {
  const syncingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    const syncOrderStock = async (order: OrderRealtimePayload) => {
      const orderId = String(order.id || '').trim();
      const status = String(order.status || '').trim();

      if (!orderId || !STOCK_SYNC_STATUSES.has(status)) return;

      const syncKey = `${orderId}:${status}`;
      if (syncingRef.current.has(syncKey)) return;

      syncingRef.current.add(syncKey);

      try {
        const { error } = await supabase.rpc('sync_online_order_stock_v1', {
          p_order_id: orderId,
          p_next_status: status,
          p_created_by: 'sistema',
        });

        if (error) {
          console.warn('No se pudo sincronizar stock del pedido online:', order.order_code || orderId, error);
        }
      } catch (error) {
        console.warn('No se pudo sincronizar stock del pedido online:', order.order_code || orderId, error);
      } finally {
        window.setTimeout(() => {
          syncingRef.current.delete(syncKey);
        }, 2500);
      }
    };

    const channel = supabase
      .channel('pollazo_online_order_stock_sync')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        payload => {
          void syncOrderStock((payload.new || {}) as OrderRealtimePayload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
}
