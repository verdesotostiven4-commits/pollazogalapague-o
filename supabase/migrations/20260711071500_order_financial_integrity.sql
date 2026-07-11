-- POLLAZO APP - Fase 1
-- Integridad financiera de pedidos, métricas y recompensas.
--
-- Esta migración queda versionada para revisión. No se ejecuta remotamente
-- desde este commit. Debe aplicarse junto con los endpoints server-side que
-- llaman set_order_status_v1 y set_order_payment_status_v1.

alter table public.customers
  add column if not exists points integer not null default 0,
  add column if not exists exp integer not null default 0,
  add column if not exists total_spent numeric(12,2) not null default 0,
  add column if not exists total_orders integer not null default 0,
  add column if not exists last_order_at timestamptz;

alter table public.orders
  add column if not exists payment_status text not null default 'pendiente',
  add column if not exists counted_in_metrics boolean not null default false,
  add column if not exists is_test_order boolean not null default false,
  add column if not exists confirmed_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_reason text;

create or replace function public.pollazo_is_trusted_server_request()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    or current_user in ('postgres', 'supabase_admin', 'service_role');
$$;

revoke all on function public.pollazo_is_trusted_server_request() from public;

-- Protege campos de fidelización y métricas de escrituras desde el navegador.
create or replace function public.pollazo_guard_customer_financial_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_trusted boolean :=
    public.pollazo_is_trusted_server_request()
    or coalesce(current_setting('pollazo.trusted_customer_financial', true), '') = '1';
begin
  if v_trusted then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.points := 0;
    new.exp := 0;
    new.total_spent := 0;
    new.total_orders := 0;
    new.last_order_at := null;
    return new;
  end if;

  new.points := old.points;
  new.exp := old.exp;
  new.total_spent := old.total_spent;
  new.total_orders := old.total_orders;
  new.last_order_at := old.last_order_at;

  return new;
end;
$$;

revoke all on function public.pollazo_guard_customer_financial_fields() from public;

drop trigger if exists pollazo_guard_customer_financial_fields_trigger
  on public.customers;

create trigger pollazo_guard_customer_financial_fields_trigger
before insert or update on public.customers
for each row
execute function public.pollazo_guard_customer_financial_fields();

-- Controla estado, pago y contabilización en una sola transacción.
create or replace function public.pollazo_guard_order_financial_state()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status_trusted boolean :=
    public.pollazo_is_trusted_server_request()
    or coalesce(current_setting('pollazo.trusted_order_status', true), '') = '1';
  v_payment_trusted boolean :=
    public.pollazo_is_trusted_server_request()
    or coalesce(current_setting('pollazo.trusted_order_payment', true), '') = '1';
  v_customer_id uuid;
  v_phone_tail text;
  v_exp_to_add integer;
  v_event_active boolean := true;
begin
  -- El navegador no puede mover el flujo logístico por su cuenta.
  if new.status is distinct from old.status and not v_status_trusted then
    new.status := old.status;
  end if;

  -- El pago solo cambia mediante la operación server-side específica.
  if new.payment_status is distinct from old.payment_status
     and not v_payment_trusted then
    new.payment_status := old.payment_status;
  end if;

  -- Incluso una operación confiable no puede confirmar pago y logística en
  -- el mismo UPDATE. Son eventos independientes y auditables.
  if new.status is distinct from old.status
     and new.payment_status is distinct from old.payment_status then
    new.payment_status := old.payment_status;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'Recibido' and new.confirmed_at is null then
      new.confirmed_at := now();
    end if;

    if new.status = 'Entregado' and new.delivered_at is null then
      new.delivered_at := now();
    end if;

    if new.status = 'Cancelado' and new.cancelled_at is null then
      new.cancelled_at := now();
    end if;
  end if;

  -- counted_in_metrics es exclusivamente administrado por este trigger.
  new.counted_in_metrics := coalesce(old.counted_in_metrics, false);

  if coalesce(old.counted_in_metrics, false) = false
     and coalesce(new.is_test_order, false) = false
     and new.status = 'Entregado'
     and new.payment_status = 'confirmado'
     and coalesce(new.total, 0) > 0 then

    insert into public.app_metrics (id, value, updated_at)
    values ('total_orders', 1, now())
    on conflict (id)
    do update set
      value = public.app_metrics.value + 1,
      updated_at = excluded.updated_at;

    v_phone_tail := right(
      regexp_replace(coalesce(new.customer_phone, ''), '\D', '', 'g'),
      9
    );
    v_exp_to_add := greatest(1, floor(coalesce(new.total, 0))::integer);

    if to_regclass('public.settings') is not null then
      begin
        execute $settings$
          select case
            when lower(coalesce(to_jsonb(s)->>'event_active', 'true')) = 'false'
              then false
            else true
          end
          from public.settings s
          where id = 'global'
          limit 1
        $settings$
        into v_event_active;
      exception
        when undefined_table or undefined_column then
          v_event_active := true;
      end;
    end if;

    if length(v_phone_tail) = 9 then
      select c.id
      into v_customer_id
      from public.customers c
      where right(regexp_replace(c.phone, '\D', '', 'g'), 9) = v_phone_tail
      order by c.updated_at desc nulls last, c.created_at desc
      limit 1
      for update;

      perform set_config('pollazo.trusted_customer_financial', '1', true);

      if found then
        update public.customers
        set exp = greatest(0, coalesce(exp, 0) + v_exp_to_add),
            points = greatest(
              0,
              coalesce(points, 0)
                + case when v_event_active then v_exp_to_add else 0 end
            ),
            total_spent = round(
              greatest(0, coalesce(total_spent, 0) + coalesce(new.total, 0)),
              2
            ),
            total_orders = greatest(0, coalesce(total_orders, 0) + 1),
            last_order_at = now(),
            updated_at = now()
        where id = v_customer_id;
      else
        insert into public.customers (
          phone,
          points,
          exp,
          total_spent,
          total_orders,
          last_order_at,
          updated_at
        ) values (
          public.pollazo_normalize_phone(new.customer_phone),
          case when v_event_active then v_exp_to_add else 0 end,
          v_exp_to_add,
          round(coalesce(new.total, 0), 2),
          1,
          now(),
          now()
        );
      end if;

      perform set_config('pollazo.trusted_customer_financial', '0', true);
    end if;

    new.counted_in_metrics := true;
  end if;

  return new;
end;
$$;

revoke all on function public.pollazo_guard_order_financial_state() from public;

drop trigger if exists pollazo_guard_order_financial_state_trigger
  on public.orders;

create trigger pollazo_guard_order_financial_state_trigger
before update on public.orders
for each row
execute function public.pollazo_guard_order_financial_state();

-- Operación server-side para cambiar únicamente el flujo logístico.
create or replace function public.set_order_status_v1(
  p_order_id uuid,
  p_status text,
  p_cancelled_reason text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_status text := btrim(coalesce(p_status, ''));
begin
  if not public.pollazo_is_trusted_server_request() then
    raise exception 'Operación no autorizada.' using errcode = '42501';
  end if;

  if v_status not in (
    'Por Confirmar',
    'Recibido',
    'Preparando',
    'Enviado',
    'Entregado',
    'Cancelado'
  ) then
    raise exception 'Estado de pedido inválido.' using errcode = '22023';
  end if;

  perform set_config('pollazo.trusted_order_status', '1', true);

  update public.orders
  set status = v_status,
      cancelled_reason = case
        when v_status = 'Cancelado'
          then nullif(left(btrim(coalesce(p_cancelled_reason, '')), 500), '')
        else cancelled_reason
      end,
      updated_at = now()
  where id = p_order_id
  returning * into v_order;

  if not found then
    raise exception 'Pedido no encontrado.' using errcode = 'P0002';
  end if;

  return v_order;
end;
$$;

-- Operación independiente para registrar el resultado del cobro.
create or replace function public.set_order_payment_status_v1(
  p_order_id uuid,
  p_payment_status text
)
returns public.orders
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_status text := lower(btrim(coalesce(p_payment_status, '')));
begin
  if not public.pollazo_is_trusted_server_request() then
    raise exception 'Operación no autorizada.' using errcode = '42501';
  end if;

  if v_status not in (
    'pendiente',
    'validando',
    'confirmado',
    'rechazado',
    'contra_entrega'
  ) then
    raise exception 'Estado de pago inválido.' using errcode = '22023';
  end if;

  perform set_config('pollazo.trusted_order_payment', '1', true);

  update public.orders
  set payment_status = v_status,
      updated_at = now()
  where id = p_order_id
  returning * into v_order;

  if not found then
    raise exception 'Pedido no encontrado.' using errcode = 'P0002';
  end if;

  return v_order;
end;
$$;

revoke all on function public.set_order_status_v1(uuid, text, text) from public;
revoke all on function public.set_order_payment_status_v1(uuid, text) from public;

grant execute on function public.set_order_status_v1(uuid, text, text)
  to service_role;
grant execute on function public.set_order_payment_status_v1(uuid, text)
  to service_role;

-- La métrica genérica deja de estar disponible para el navegador. El conteo
-- de pedidos queda ligado al trigger idempotente anterior.
revoke execute on function public.increment_metric(text)
  from anon, authenticated;
