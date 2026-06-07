-- Product promotions foundation for La Casa del Pollazo.
-- This migration is intentionally additive: it does not modify existing
-- products, orders, carts, payments, memberships, or inventory tables.

create table if not exists public.product_promotions (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,
  title text not null,
  label text not null default 'Oferta',
  description text,
  promo_type text not null default 'today_deal'
    check (promo_type in ('today_deal', 'plus_only', 'combo', 'clearance', 'featured')),
  normal_price numeric(10, 2),
  promo_price numeric(10, 2),
  starts_at timestamptz,
  ends_at timestamptz,
  days_of_week int[] default array[]::int[],
  plus_only boolean not null default false,
  active boolean not null default true,
  priority int not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint product_promotions_price_order check (
    promo_price is null
    or normal_price is null
    or promo_price <= normal_price
  ),
  constraint product_promotions_positive_normal_price check (
    normal_price is null or normal_price >= 0
  ),
  constraint product_promotions_positive_promo_price check (
    promo_price is null or promo_price >= 0
  )
);

create index if not exists product_promotions_product_id_idx
  on public.product_promotions (product_id);

create index if not exists product_promotions_active_priority_idx
  on public.product_promotions (active, priority, starts_at, ends_at);

create index if not exists product_promotions_plus_only_idx
  on public.product_promotions (plus_only)
  where active = true;

create or replace function public.set_product_promotions_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_product_promotions_updated_at on public.product_promotions;

create trigger set_product_promotions_updated_at
before update on public.product_promotions
for each row
execute function public.set_product_promotions_updated_at();

alter table public.product_promotions enable row level security;

-- Customers can read only active promotions. This is visual/marketing data.
drop policy if exists "Public can read active product promotions" on public.product_promotions;
create policy "Public can read active product promotions"
  on public.product_promotions
  for select
  using (active = true);

-- Writes should be performed through trusted admin tooling/service role.
-- No public insert/update/delete policy is created on purpose.
