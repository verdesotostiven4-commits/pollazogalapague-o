-- Registro interno del origen real de cada producto de un pedido.
-- No modifica ni elimina pedidos, productos o rastreos existentes.

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
