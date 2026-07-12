-- Registro interno del origen real de cada producto de un pedido.
-- También mantiene sincronizadas las sesiones GPS cuando un pedido se cierra manualmente.
-- No elimina pedidos, productos ni recorridos existentes.

create table if not exists public.order_source_events (
  id uuid primary key default gen_random_uuid(),
  order_code text not null,
  product_id text,
  item_name text not null,
  planned_source text not null check (planned_source in ('mirador', 'cascada')),
  actual_source text not null check (actual_source in ('mirador', 'cascada')),
  reason text,
  changed_by text not null default 'admin',
  created_at timestamptz not null default now()
);

create index if not exists order_source_events_order_code_idx
  on public.order_source_events (order_code, created_at desc);

create index if not exists order_source_events_product_idx
  on public.order_source_events (product_id, created_at desc)
  where product_id is not null;

alter table public.order_source_events enable row level security;

create or replace function public.sync_delivery_sessions_from_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'Enviado' then
    update public.delivery_sessions
      set status = 'en_route',
          updated_at = now()
      where order_code = new.order_code
        and status = 'packing'
        and completed_at is null;
  elsif new.status = 'Entregado' then
    update public.delivery_sessions
      set status = 'delivered',
          completed_at = coalesce(completed_at, now()),
          updated_at = now()
      where order_code = new.order_code
        and status not in ('delivered', 'cancelled');
  elsif new.status = 'Cancelado' then
    update public.delivery_sessions
      set status = 'cancelled',
          completed_at = coalesce(completed_at, now()),
          updated_at = now()
      where order_code = new.order_code
        and status not in ('delivered', 'cancelled');
  end if;

  return new;
end;
$$;

drop trigger if exists orders_sync_delivery_sessions_trigger on public.orders;

create trigger orders_sync_delivery_sessions_trigger
after update of status on public.orders
for each row
execute function public.sync_delivery_sessions_from_order_status();
