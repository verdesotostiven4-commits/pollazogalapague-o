-- Phase 1: integrity and idempotency for online orders.
-- Non-destructive: adds missing columns and constraints used by the secure order API.

alter table public.orders
  add column if not exists idempotency_key text,
  add column if not exists tracking_token_hash text,
  add column if not exists payment_status text not null default 'pendiente',
  add column if not exists delivery_fee_original numeric(12,2) not null default 0,
  add column if not exists delivery_fee_final numeric(12,2) not null default 0,
  add column if not exists service_fee numeric(12,2) not null default 0,
  add column if not exists card_fee numeric(12,2) not null default 0,
  add column if not exists membership_applied boolean not null default false,
  add column if not exists membership_id uuid,
  add column if not exists membership_plan text,
  add column if not exists counted_in_metrics boolean not null default false,
  add column if not exists is_test_order boolean not null default false,
  add column if not exists confirmed_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_reason text,
  add column if not exists bonus_items jsonb not null default '[]'::jsonb,
  add column if not exists vip_gift_message text;

create unique index if not exists orders_idempotency_key_unique_idx
  on public.orders (idempotency_key)
  where idempotency_key is not null and btrim(idempotency_key) <> '';

create index if not exists orders_tracking_token_hash_idx
  on public.orders (tracking_token_hash)
  where tracking_token_hash is not null;

alter table public.orders
  drop constraint if exists orders_payment_status_check;

alter table public.orders
  add constraint orders_payment_status_check
  check (payment_status in ('pendiente', 'validando', 'confirmado', 'rechazado', 'contra_entrega'));

alter table public.orders
  drop constraint if exists orders_payment_method_check;

alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method is null or payment_method in ('efectivo', 'deuna', 'transferencia', 'tarjeta'));

alter table public.orders
  drop constraint if exists orders_amounts_nonnegative_check;

alter table public.orders
  add constraint orders_amounts_nonnegative_check
  check (
    subtotal >= 0
    and delivery_fee >= 0
    and delivery_fee_original >= 0
    and delivery_fee_final >= 0
    and service_fee >= 0
    and card_fee >= 0
    and total >= 0
  );
