-- POLLAZO APP - Fase 1
-- Requisitos que deben existir antes de crear create_online_order_v2.
-- Esta migración se ejecuta antes de 20260711070000_secure_online_order_creation.sql.

alter table public.products
  add column if not exists subcategory text,
  add column if not exists is_variable boolean not null default false,
  add column if not exists current_stock numeric(12,3) not null default 0,
  add column if not exists track_stock boolean not null default false;

alter table public.customers
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists reference text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Algunas instalaciones usan customer_memberships y otras funciones antiguas
-- consultan memberships. La vista se crea antes de la RPC para que el contrato
-- sea consistente desde el primer momento.
do $$
begin
  if to_regclass('public.memberships') is null
     and to_regclass('public.customer_memberships') is not null then
    execute 'create view public.memberships as select * from public.customer_memberships';
    comment on view public.memberships is
      'Vista de compatibilidad interna. La fuente oficial es customer_memberships.';
  end if;
end $$;
