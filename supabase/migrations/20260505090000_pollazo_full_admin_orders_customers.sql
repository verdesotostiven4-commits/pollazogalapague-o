-- La Casa del Pollazo - Tablas completas para catálogo, admin, clientes, puntos y pedidos

create table if not exists products (
  id text primary key,
  name text not null,
  category text not null,
  price text,
  unit text,
  description text,
  image text,
  badge text,
  available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table products enable row level security;

drop policy if exists "Anyone can read products" on products;
create policy "Anyone can read products" on products for select to anon, authenticated using (true);

drop policy if exists "Anon can insert products" on products;
create policy "Anon can insert products" on products for insert to anon, authenticated with check (true);

drop policy if exists "Anon can update products" on products;
create policy "Anon can update products" on products for update to anon, authenticated using (true) with check (true);

drop policy if exists "Anon can delete products" on products;
create policy "Anon can delete products" on products for delete to anon, authenticated using (true);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  name text,
  points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table customers enable row level security;

drop policy if exists "Anyone can read customers" on customers;
create policy "Anyone can read customers" on customers for select to anon, authenticated using (true);

drop policy if exists "Anon can insert customers" on customers;
create policy "Anon can insert customers" on customers for insert to anon, authenticated with check (true);

drop policy if exists "Anon can update customers" on customers;
create policy "Anon can update customers" on customers for update to anon, authenticated using (true) with check (true);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_code text unique not null,
  customer_id uuid references customers(id) on delete set null,
  customer_phone text not null,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(10,2) not null default 0,
  delivery_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  status text not null default 'Recibido' check (status in ('Recibido','Preparando','Enviado','Entregado','Cancelado')),
  preorder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table orders enable row level security;

drop policy if exists "Anyone can read orders" on orders;
create policy "Anyone can read orders" on orders for select to anon, authenticated using (true);

drop policy if exists "Anon can insert orders" on orders;
create policy "Anon can insert orders" on orders for insert to anon, authenticated with check (true);

drop policy if exists "Anon can update orders" on orders;
create policy "Anon can update orders" on orders for update to anon, authenticated using (true) with check (true);

insert into app_settings (key, value) values
  ('primary_color', '#E67E22'),
  ('banner_link', '')
on conflict (key) do nothing;
