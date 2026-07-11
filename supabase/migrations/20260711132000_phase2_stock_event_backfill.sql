-- Phase 2: record stock already reserved by the Phase 1 lifecycle.
-- This does not change inventory amounts; it only creates the audit rows needed
-- to return stock exactly once if an existing active order is cancelled later.

insert into public.online_order_stock_events (
  order_id,
  product_id,
  quantity,
  event_type,
  actor,
  created_at
)
select
  o.id,
  parsed.product_id,
  sum(parsed.quantity)::numeric,
  'reserved',
  'phase2_backfill',
  coalesce(o.confirmed_at, o.updated_at, o.created_at, now())
from public.orders o
cross join lateral (
  select
    coalesce(
      nullif(item->>'product_id', ''),
      nullif(item->>'id', ''),
      nullif(item #>> '{product,id}', '')
    ) as product_id,
    case
      when coalesce(item->>'quantity', '') ~ '^[0-9]+([.][0-9]+)?$'
        then greatest((item->>'quantity')::numeric, 0)
      else 1::numeric
    end as quantity
  from jsonb_array_elements(coalesce(o.items, '[]'::jsonb)) item
) parsed
join public.products p
  on p.id = parsed.product_id
 and coalesce(p.track_stock, false) = true
where o.status in ('Recibido', 'Preparando', 'Enviado', 'Entregado')
  and parsed.product_id is not null
  and parsed.quantity > 0
group by
  o.id,
  parsed.product_id,
  coalesce(o.confirmed_at, o.updated_at, o.created_at, now())
on conflict (order_id, product_id, event_type) do nothing;

update public.orders
set stock_reserved = true,
    stock_released = false
where status in ('Recibido', 'Preparando', 'Enviado', 'Entregado');

-- Orders cancelled before acceptance never reserved stock.
update public.orders
set stock_reserved = false,
    stock_released = false
where status = 'Cancelado'
  and confirmed_at is null;

-- Orders cancelled after acceptance were already handled by the Phase 1 stock
-- function, so they must not be released again by the new lifecycle.
update public.orders
set stock_reserved = true,
    stock_released = true
where status = 'Cancelado'
  and confirmed_at is not null;
