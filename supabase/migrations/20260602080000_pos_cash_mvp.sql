-- POS + Caja MVP para La Casa del Pollazo
-- Objetivo: preparar reemplazo gradual de Punto/VisualPlus sin tocar el flujo actual de pedidos online.
-- Seguro para aplicar varias veces: usa IF NOT EXISTS y columnas opcionales.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- 1) Tipos seguros
-- ─────────────────────────────────────────────────────────────

do $$
begin
  create type public.cash_register_status as enum ('open', 'closed');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.cash_transaction_type as enum ('income', 'expense');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.pos_payment_method as enum ('cash', 'card', 'transfer', 'deuna', 'mixed', 'other');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.stock_movement_type as enum ('pos_sale', 'online_order', 'purchase', 'adjustment_add', 'adjustment_remove', 'initial_stock');
exception
  when duplicate_object then null;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 2) Extensiones no destructivas a tablas existentes
-- ─────────────────────────────────────────────────────────────

alter table public.products
  add column if not exists barcode text,
  add column if not exists cost_price numeric(12,4) not null default 0,
  add column if not exists current_stock numeric(12,3) not null default 0,
  add column if not exists stock_minimum numeric(12,3) not null default 0,
  add column if not exists track_stock boolean not null default false,
  add column if not exists tax_rate numeric(5,2) not null default 0;

create unique index if not exists products_barcode_unique_idx
  on public.products (barcode)
  where barcode is not null and btrim(barcode) <> '';

create index if not exists products_barcode_search_idx on public.products (barcode);
create index if not exists products_track_stock_idx on public.products (track_stock);

alter table public.customers
  add column if not exists id_type text not null default '07',
  add column if not exists identification text,
  add column if not exists tax_name text,
  add column if not exists email text,
  add column if not exists address text;

create unique index if not exists customers_identification_unique_idx
  on public.customers (identification)
  where identification is not null and btrim(identification) <> '';

create index if not exists customers_identification_search_idx on public.customers (identification);

-- ─────────────────────────────────────────────────────────────
-- 3) Caja / turnos
-- ─────────────────────────────────────────────────────────────

create table if not exists public.cash_registers (
  id uuid primary key default gen_random_uuid(),
  opened_by text not null default 'admin',
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opening_balance numeric(12,2) not null default 0,
  expected_cash_sales numeric(12,2) not null default 0,
  manual_income numeric(12,2) not null default 0,
  manual_expense numeric(12,2) not null default 0,
  real_balance_cash numeric(12,2),
  difference numeric(12,2),
  status public.cash_register_status not null default 'open',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cash_registers_status_idx on public.cash_registers (status);
create index if not exists cash_registers_opened_at_idx on public.cash_registers (opened_at desc);
create unique index if not exists cash_registers_one_open_per_operator_idx
  on public.cash_registers (opened_by)
  where status = 'open';

create table if not exists public.cash_transactions (
  id uuid primary key default gen_random_uuid(),
  cash_register_id uuid not null references public.cash_registers(id) on delete cascade,
  type public.cash_transaction_type not null,
  amount numeric(12,2) not null check (amount > 0),
  description text not null,
  created_by text not null default 'admin',
  created_at timestamptz not null default now()
);

create index if not exists cash_transactions_register_idx on public.cash_transactions (cash_register_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- 4) Ventas POS separadas de pedidos online
-- ─────────────────────────────────────────────────────────────

create sequence if not exists public.pos_sale_number_seq start 1;

create table if not exists public.pos_sales (
  id uuid primary key default gen_random_uuid(),
  sale_code text not null unique default ('POS-' || lpad(nextval('public.pos_sale_number_seq')::text, 6, '0')),
  cash_register_id uuid not null references public.cash_registers(id),
  customer_id uuid references public.customers(id),
  customer_name text,
  customer_phone text,
  sold_by text not null default 'admin',
  subtotal numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null check (total >= 0),
  payment_summary text,
  notes text,
  is_void boolean not null default false,
  void_reason text,
  voided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pos_sales_register_idx on public.pos_sales (cash_register_id, created_at desc);
create index if not exists pos_sales_created_at_idx on public.pos_sales (created_at desc);
create index if not exists pos_sales_customer_phone_idx on public.pos_sales (customer_phone);

create table if not exists public.pos_sale_items (
  id uuid primary key default gen_random_uuid(),
  pos_sale_id uuid not null references public.pos_sales(id) on delete cascade,
  product_id text not null references public.products(id),
  product_name text not null,
  quantity numeric(12,3) not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  unit_cost numeric(12,4) not null default 0,
  tax_rate numeric(5,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  subtotal numeric(12,2) not null default 0,
  total numeric(12,2) not null check (total >= 0),
  product_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists pos_sale_items_sale_idx on public.pos_sale_items (pos_sale_id);
create index if not exists pos_sale_items_product_idx on public.pos_sale_items (product_id);

create table if not exists public.pos_payment_splits (
  id uuid primary key default gen_random_uuid(),
  pos_sale_id uuid not null references public.pos_sales(id) on delete cascade,
  method public.pos_payment_method not null,
  amount numeric(12,2) not null check (amount > 0),
  reference text,
  created_at timestamptz not null default now()
);

create index if not exists pos_payment_splits_sale_idx on public.pos_payment_splits (pos_sale_id);
create index if not exists pos_payment_splits_method_idx on public.pos_payment_splits (method);

-- ─────────────────────────────────────────────────────────────
-- 5) Kardex / movimientos de stock
-- ─────────────────────────────────────────────────────────────

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id),
  type public.stock_movement_type not null,
  quantity numeric(12,3) not null check (quantity > 0),
  stock_before numeric(12,3) not null,
  stock_after numeric(12,3) not null,
  reference_table text,
  reference_id uuid,
  description text,
  created_by text not null default 'admin',
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_product_idx on public.stock_movements (product_id, created_at desc);
create index if not exists stock_movements_reference_idx on public.stock_movements (reference_table, reference_id);

-- ─────────────────────────────────────────────────────────────
-- 6) Helpers RPC para operar caja y venta de forma transaccional
-- ─────────────────────────────────────────────────────────────

create or replace function public.open_cash_register_v1(
  p_opening_balance numeric,
  p_opened_by text default 'admin',
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing uuid;
  v_register_id uuid;
begin
  select id into v_existing
  from public.cash_registers
  where opened_by = coalesce(nullif(btrim(p_opened_by), ''), 'admin')
    and status = 'open'
  limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  insert into public.cash_registers (opening_balance, opened_by, notes)
  values (
    greatest(coalesce(p_opening_balance, 0), 0),
    coalesce(nullif(btrim(p_opened_by), ''), 'admin'),
    p_notes
  )
  returning id into v_register_id;

  return v_register_id;
end;
$$;

create or replace function public.create_pos_sale_v1(
  p_cash_register_id uuid,
  p_customer_id uuid default null,
  p_customer_name text default null,
  p_customer_phone text default null,
  p_sold_by text default 'admin',
  p_items jsonb default '[]'::jsonb,
  p_payments jsonb default '[]'::jsonb,
  p_discount_amount numeric default 0,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_register_status public.cash_register_status;
  v_sale_id uuid;
  v_item record;
  v_payment record;
  v_product public.products%rowtype;
  v_stock_before numeric(12,3);
  v_stock_after numeric(12,3);
  v_subtotal numeric(12,2) := 0;
  v_tax_amount numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
  v_payments_total numeric(12,2) := 0;
  v_cash_total numeric(12,2) := 0;
  v_payment_summary text := '';
begin
  select status into v_register_status
  from public.cash_registers
  where id = p_cash_register_id
  for update;

  if v_register_status is distinct from 'open' then
    raise exception 'La caja no está abierta.';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene productos.';
  end if;

  if jsonb_typeof(p_payments) <> 'array' or jsonb_array_length(p_payments) = 0 then
    raise exception 'La venta no tiene pagos.';
  end if;

  -- Validar productos, stock opcional y calcular totales.
  for v_item in
    select *
    from jsonb_to_recordset(p_items) as x(
      product_id text,
      quantity numeric,
      unit_price numeric,
      product_name text
    )
  loop
    if v_item.product_id is null or v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'Producto o cantidad inválida.';
    end if;

    select * into v_product
    from public.products
    where id = v_item.product_id
    for update;

    if not found then
      raise exception 'Producto no encontrado: %', v_item.product_id;
    end if;

    if coalesce(v_product.available, true) = false then
      raise exception 'Producto no disponible: %', coalesce(v_product.name, v_item.product_id);
    end if;

    if coalesce(v_product.track_stock, false) and coalesce(v_product.current_stock, 0) < v_item.quantity then
      raise exception 'Stock insuficiente para: %', coalesce(v_product.name, v_item.product_id);
    end if;

    v_subtotal := v_subtotal + round((v_item.quantity * coalesce(v_item.unit_price, 0))::numeric, 2);
  end loop;

  v_total := greatest(round((v_subtotal - greatest(coalesce(p_discount_amount, 0), 0))::numeric, 2), 0);

  for v_payment in
    select *
    from jsonb_to_recordset(p_payments) as x(
      method text,
      amount numeric,
      reference text
    )
  loop
    if v_payment.amount is null or v_payment.amount <= 0 then
      raise exception 'Monto de pago inválido.';
    end if;

    v_payments_total := v_payments_total + round(v_payment.amount::numeric, 2);

    if v_payment.method = 'cash' then
      v_cash_total := v_cash_total + round(v_payment.amount::numeric, 2);
    end if;

    v_payment_summary := concat_ws(
      ', ',
      nullif(v_payment_summary, ''),
      concat(coalesce(v_payment.method, 'other'), ': $', round(v_payment.amount::numeric, 2)::text)
    );
  end loop;

  if abs(v_payments_total - v_total) > 0.01 then
    raise exception 'El total de pagos (%) no coincide con el total de venta (%).', v_payments_total, v_total;
  end if;

  insert into public.pos_sales (
    cash_register_id,
    customer_id,
    customer_name,
    customer_phone,
    sold_by,
    subtotal,
    discount_amount,
    tax_amount,
    total,
    payment_summary,
    notes
  ) values (
    p_cash_register_id,
    p_customer_id,
    nullif(btrim(coalesce(p_customer_name, '')), ''),
    nullif(btrim(coalesce(p_customer_phone, '')), ''),
    coalesce(nullif(btrim(p_sold_by), ''), 'admin'),
    v_subtotal,
    greatest(coalesce(p_discount_amount, 0), 0),
    v_tax_amount,
    v_total,
    nullif(v_payment_summary, ''),
    p_notes
  )
  returning id into v_sale_id;

  for v_item in
    select *
    from jsonb_to_recordset(p_items) as x(
      product_id text,
      quantity numeric,
      unit_price numeric,
      product_name text
    )
  loop
    select * into v_product
    from public.products
    where id = v_item.product_id
    for update;

    insert into public.pos_sale_items (
      pos_sale_id,
      product_id,
      product_name,
      quantity,
      unit_price,
      unit_cost,
      tax_rate,
      tax_amount,
      subtotal,
      total,
      product_snapshot
    ) values (
      v_sale_id,
      v_item.product_id,
      coalesce(nullif(btrim(coalesce(v_item.product_name, '')), ''), v_product.name, 'Producto'),
      v_item.quantity,
      round(coalesce(v_item.unit_price, 0)::numeric, 2),
      coalesce(v_product.cost_price, 0),
      coalesce(v_product.tax_rate, 0),
      0,
      round((v_item.quantity * coalesce(v_item.unit_price, 0))::numeric, 2),
      round((v_item.quantity * coalesce(v_item.unit_price, 0))::numeric, 2),
      to_jsonb(v_product)
    );

    if coalesce(v_product.track_stock, false) then
      v_stock_before := coalesce(v_product.current_stock, 0);
      v_stock_after := v_stock_before - v_item.quantity;

      update public.products
      set current_stock = v_stock_after,
          updated_at = now()
      where id = v_item.product_id;

      insert into public.stock_movements (
        product_id,
        type,
        quantity,
        stock_before,
        stock_after,
        reference_table,
        reference_id,
        description,
        created_by
      ) values (
        v_item.product_id,
        'pos_sale',
        v_item.quantity,
        v_stock_before,
        v_stock_after,
        'pos_sales',
        v_sale_id,
        'Venta en Punto de Venta Pollazo',
        coalesce(nullif(btrim(p_sold_by), ''), 'admin')
      );
    end if;
  end loop;

  for v_payment in
    select *
    from jsonb_to_recordset(p_payments) as x(
      method text,
      amount numeric,
      reference text
    )
  loop
    insert into public.pos_payment_splits (pos_sale_id, method, amount, reference)
    values (
      v_sale_id,
      case
        when v_payment.method in ('cash', 'card', 'transfer', 'deuna', 'mixed', 'other') then v_payment.method::public.pos_payment_method
        else 'other'::public.pos_payment_method
      end,
      round(v_payment.amount::numeric, 2),
      nullif(btrim(coalesce(v_payment.reference, '')), '')
    );
  end loop;

  if v_cash_total > 0 then
    update public.cash_registers
    set expected_cash_sales = expected_cash_sales + v_cash_total,
        updated_at = now()
    where id = p_cash_register_id;
  end if;

  return v_sale_id;
end;
$$;

create or replace function public.close_cash_register_v1(
  p_cash_register_id uuid,
  p_real_balance_cash numeric,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expected numeric(12,2);
  v_difference numeric(12,2);
begin
  select opening_balance + expected_cash_sales + manual_income - manual_expense
  into v_expected
  from public.cash_registers
  where id = p_cash_register_id and status = 'open'
  for update;

  if v_expected is null then
    raise exception 'La caja no existe o ya está cerrada.';
  end if;

  v_difference := round((coalesce(p_real_balance_cash, 0) - v_expected)::numeric, 2);

  update public.cash_registers
  set real_balance_cash = coalesce(p_real_balance_cash, 0),
      difference = v_difference,
      notes = coalesce(p_notes, notes),
      status = 'closed',
      closed_at = now(),
      updated_at = now()
  where id = p_cash_register_id;

  return p_cash_register_id;
end;
$$;

-- Comentarios útiles para mantenimiento
comment on table public.pos_sales is 'Ventas de mostrador/POS. Separado de orders para no tocar pedidos online.';
comment on table public.cash_registers is 'Turnos de caja para ventas de mostrador.';
comment on column public.products.track_stock is 'Cuando true, POS valida y descuenta current_stock. Por defecto false para no bloquear catálogo existente.';
