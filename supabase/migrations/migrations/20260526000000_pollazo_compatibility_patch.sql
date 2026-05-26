-- La Casa del Pollazo
-- Compatibility Patch
-- Objetivo:
-- - No borrar datos existentes.
-- - Agregar columnas/tablas que el frontend actual ya usa.
-- - Permitir el estado "Por Confirmar" en orders.
-- - Mantener políticas abiertas como ya estaban para no romper el admin actual.

create extension if not exists "pgcrypto";

-- =========================================================
-- PRODUCTS
-- =========================================================

create table if not exists products (
  id text primary key,
  name text not null,
  category text not null,
  subcategory text,
  price text,
  unit text,
  description text,
  image text,
  badge text,
  available boolean not null default true,
  is_variable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table products
  add column if not exists subcategory text,
  add column if not exists is_variable boolean not null default false,
  add column if not exists available boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table products enable row level security;

drop policy if exists "Anyone can read products" on products;
create policy "Anyone can read products"
  on products for select
  to anon, authenticated
  using (true);

drop policy if exists "Anon can insert products" on products;
create policy "Anon can insert products"
  on products for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Anon can update products" on products;
create policy "Anon can update products"
  on products for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Anon can delete products" on products;
create policy "Anon can delete products"
  on products for delete
  to anon, authenticated
  using (true);


-- =========================================================
-- CUSTOMERS
-- =========================================================

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  name text,
  avatar_url text,
  points integer not null default 0,
  exp integer not null default 0,
  is_vip boolean not null default false,
  lat double precision,
  lng double precision,
  reference text,
  has_reviewed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table customers
  add column if not exists avatar_url text,
  add column if not exists points integer not null default 0,
  add column if not exists exp integer not null default 0,
  add column if not exists is_vip boolean not null default false,
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists reference text,
  add column if not exists has_reviewed boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table customers enable row level security;

drop policy if exists "Anyone can read customers" on customers;
create policy "Anyone can read customers"
  on customers for select
  to anon, authenticated
  using (true);

drop policy if exists "Anon can insert customers" on customers;
create policy "Anon can insert customers"
  on customers for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Anon can update customers" on customers;
create policy "Anon can update customers"
  on customers for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Anon can delete customers" on customers;
create policy "Anon can delete customers"
  on customers for delete
  to anon, authenticated
  using (true);


-- =========================================================
-- ORDERS
-- =========================================================

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_code text unique not null,
  customer_id uuid references customers(id) on delete set null,
  customer_phone text not null,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(10,2) not null default 0,
  delivery_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  status text not null default 'Recibido',
  provider boolean not null default false,
  preorder boolean not null default false,
  payment_method text,
  delivery_type text,
  payment_proof_url text,
  lat double precision,
  lng double precision,
  reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table orders
  add column if not exists customer_id uuid references customers(id) on delete set null,
  add column if not exists delivery_fee numeric(10,2) not null default 0,
  add column if not exists provider boolean not null default false,
  add column if not exists preorder boolean not null default false,
  add column if not exists payment_method text,
  add column if not exists delivery_type text,
  add column if not exists payment_proof_url text,
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists reference text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table orders
  drop constraint if exists orders_status_check;

alter table orders
  add constraint orders_status_check
  check (
    status in (
      'Por Confirmar',
      'Recibido',
      'Preparando',
      'Enviado',
      'Entregado',
      'Cancelado'
    )
  );

alter table orders enable row level security;

drop policy if exists "Anyone can read orders" on orders;
create policy "Anyone can read orders"
  on orders for select
  to anon, authenticated
  using (true);

drop policy if exists "Anon can insert orders" on orders;
create policy "Anon can insert orders"
  on orders for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Anon can update orders" on orders;
create policy "Anon can update orders"
  on orders for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Anon can delete orders" on orders;
create policy "Anon can delete orders"
  on orders for delete
  to anon, authenticated
  using (true);


-- =========================================================
-- SETTINGS GLOBAL
-- Esta tabla la usa AdminContext con:
-- supabase.from('settings').select('*').eq('id', 'global')
-- =========================================================

create table if not exists settings (
  id text primary key default 'global',
  logo_url text not null default '/logo-final.png',
  ranking_title text not null default 'Ranking de Clientes',
  prize_description text not null default '¡Gana un Combo Familiar!',
  ranking_end_date text not null default '',
  winner_photo_url text not null default '',
  event_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table settings
  add column if not exists logo_url text not null default '/logo-final.png',
  add column if not exists ranking_title text not null default 'Ranking de Clientes',
  add column if not exists prize_description text not null default '¡Gana un Combo Familiar!',
  add column if not exists ranking_end_date text not null default '',
  add column if not exists winner_photo_url text not null default '',
  add column if not exists event_active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

insert into settings (id)
values ('global')
on conflict (id) do nothing;

alter table settings enable row level security;

drop policy if exists "Anyone can read settings" on settings;
create policy "Anyone can read settings"
  on settings for select
  to anon, authenticated
  using (true);

drop policy if exists "Anon can insert settings" on settings;
create policy "Anon can insert settings"
  on settings for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Anon can update settings" on settings;
create policy "Anon can update settings"
  on settings for update
  to anon, authenticated
  using (true)
  with check (true);


-- =========================================================
-- SEASONS / SALÓN DE LA FAMA
-- =========================================================

create table if not exists seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  prize text not null default '',
  winners jsonb not null default '[]'::jsonb,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table seasons
  add column if not exists name text not null default '',
  add column if not exists prize text not null default '',
  add column if not exists winners jsonb not null default '[]'::jsonb,
  add column if not exists is_published boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table seasons enable row level security;

drop policy if exists "Anyone can read seasons" on seasons;
create policy "Anyone can read seasons"
  on seasons for select
  to anon, authenticated
  using (true);

drop policy if exists "Anon can insert seasons" on seasons;
create policy "Anon can insert seasons"
  on seasons for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Anon can update seasons" on seasons;
create policy "Anon can update seasons"
  on seasons for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Anon can delete seasons" on seasons;
create policy "Anon can delete seasons"
  on seasons for delete
  to anon, authenticated
  using (true);


-- =========================================================
-- APP SETTINGS
-- =========================================================

create table if not exists app_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

alter table app_settings enable row level security;

drop policy if exists "Anyone can read app settings" on app_settings;
create policy "Anyone can read app settings"
  on app_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "Anon can insert app settings" on app_settings;
create policy "Anon can insert app settings"
  on app_settings for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Anon can update app settings" on app_settings;
create policy "Anon can update app settings"
  on app_settings for update
  to anon, authenticated
  using (true)
  with check (true);

insert into app_settings (key, value) values
  ('announcement', ''),
  ('primary_color', '#E67E22'),
  ('banner_link', ''),
  ('prize_1', ''),
  ('prize_2', ''),
  ('prize_3', '')
on conflict (key) do nothing;


-- =========================================================
-- PRODUCT OVERRIDES
-- =========================================================

create table if not exists product_overrides (
  id text primary key,
  price text,
  available boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table product_overrides enable row level security;

drop policy if exists "Anyone can read product overrides" on product_overrides;
create policy "Anyone can read product overrides"
  on product_overrides for select
  to anon, authenticated
  using (true);

drop policy if exists "Anon can insert product overrides" on product_overrides;
create policy "Anon can insert product overrides"
  on product_overrides for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Anon can update product overrides" on product_overrides;
create policy "Anon can update product overrides"
  on product_overrides for update
  to anon, authenticated
  using (true)
  with check (true);


-- =========================================================
-- APP METRICS
-- =========================================================

create table if not exists app_metrics (
  id text primary key,
  value bigint not null default 0,
  updated_at timestamptz default now()
);

alter table app_metrics enable row level security;

drop policy if exists "Public can read metrics" on app_metrics;
create policy "Public can read metrics"
  on app_metrics for select
  to anon, authenticated
  using (true);

insert into app_metrics (id, value) values
  ('total_visits', 0),
  ('total_orders', 0)
on conflict (id) do nothing;


-- =========================================================
-- TESTIMONIALS
-- =========================================================

create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  author_name text not null default '',
  stars integer not null default 5 check (stars >= 1 and stars <= 5),
  comment text not null default '',
  photo_url text,
  created_at timestamptz default now()
);

alter table testimonials enable row level security;

drop policy if exists "Public can read testimonials" on testimonials;
create policy "Public can read testimonials"
  on testimonials for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can insert testimonials" on testimonials;
create policy "Anyone can insert testimonials"
  on testimonials for insert
  to anon, authenticated
  with check (
    length(author_name) > 0
    and length(comment) > 0
    and stars >= 1
    and stars <= 5
  );

drop policy if exists "Anyone can delete testimonials" on testimonials;
create policy "Anyone can delete testimonials"
  on testimonials for delete
  to anon, authenticated
  using (true);


-- =========================================================
-- RPC: increment_metric
-- =========================================================

create or replace function increment_metric(metric_id text)
returns void
language plpgsql
security definer
as $$
begin
  update app_metrics
  set value = value + 1,
      updated_at = now()
  where id = metric_id;
end;
$$;

grant execute on function increment_metric(text) to anon;
grant execute on function increment_metric(text) to authenticated;
