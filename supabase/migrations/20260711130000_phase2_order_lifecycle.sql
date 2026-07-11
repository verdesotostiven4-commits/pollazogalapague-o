-- Phase 2: strict order lifecycle and manual payment confirmation.
-- Reuses the proven Phase 1 sync_online_order_stock_v1 function so stock is
-- reserved/restored transactionally without introducing a second inventory system.

alter table public.orders
  add column if not exists payment_confirmed_at timestamptz,
  add column if not exists payment_confirmed_by text,
  add column if not exists payment_rejected_at timestamptz,
  add column if not exists payment_rejected_by text;

create or replace function public.transition_online_order_v3(
  p_order_id uuid,
  p_next_status text,
  p_actor text default 'admin',
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_now timestamptz := now();
  v_actor text := coalesce(nullif(btrim(p_actor), ''), 'admin');
  v_reason text := nullif(left(btrim(coalesce(p_reason, '')), 500), '');
  v_exp integer := 0;
  v_event_active boolean := true;
  v_customer public.customers%rowtype;
  v_stock_result jsonb;
begin
  if p_order_id is null then
    raise exception 'Pedido inválido.';
  end if;

  if v_actor not in ('admin', 'delivery') then
    raise exception 'Actor inválido.';
  end if;

  if p_next_status not in (
    'Por Confirmar',
    'Recibido',
    'Preparando',
    'Enviado',
    'Entregado',
    'Cancelado'
  ) then
    raise exception 'Estado de pedido inválido: %', p_next_status;
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Pedido no encontrado.';
  end if;

  if p_next_status = v_order.status then
    return jsonb_build_object(
      'status', 'ok',
      'unchanged', true,
      'order_id', v_order.id,
      'previous_status', v_order.status,
      'next_status', p_next_status
    );
  end if;

  if v_actor = 'delivery' and not (
    (v_order.status = 'Preparando' and p_next_status = 'Enviado')
    or (v_order.status = 'Enviado' and p_next_status = 'Entregado')
  ) then
    raise exception 'El repartidor no puede realizar esta transición.';
  end if;

  if not (
    (v_order.status = 'Por Confirmar' and p_next_status in ('Recibido', 'Cancelado'))
    or (v_order.status = 'Recibido' and p_next_status in ('Preparando', 'Cancelado'))
    or (v_order.status = 'Preparando' and p_next_status in ('Enviado', 'Cancelado'))
    or (v_order.status = 'Enviado' and p_next_status in ('Entregado', 'Cancelado'))
  ) then
    raise exception 'Transición no permitida: % -> %', v_order.status, p_next_status;
  end if;

  if p_next_status = 'Entregado'
     and coalesce(v_order.payment_status, '') <> 'confirmado' then
    raise exception 'Confirma el pago antes de marcar el pedido como entregado.';
  end if;

  v_stock_result := public.sync_online_order_stock_v1(
    p_order_id,
    p_next_status,
    v_actor
  );

  update public.orders
  set status = p_next_status,
      confirmed_at = case
        when p_next_status in ('Recibido', 'Preparando', 'Enviado', 'Entregado')
          then coalesce(confirmed_at, v_now)
        else confirmed_at
      end,
      delivered_at = case
        when p_next_status = 'Entregado' then v_now
        else delivered_at
      end,
      cancelled_at = case
        when p_next_status = 'Cancelado' then v_now
        else cancelled_at
      end,
      cancelled_reason = case
        when p_next_status = 'Cancelado'
          then coalesce(v_reason, cancelled_reason, 'Cancelado por el negocio')
        else cancelled_reason
      end,
      payment_status = case
        when p_next_status = 'Cancelado'
             and coalesce(payment_status, '') <> 'confirmado'
          then 'rechazado'
        else payment_status
      end,
      payment_rejected_at = case
        when p_next_status = 'Cancelado'
             and coalesce(payment_status, '') <> 'confirmado'
          then coalesce(payment_rejected_at, v_now)
        else payment_rejected_at
      end,
      payment_rejected_by = case
        when p_next_status = 'Cancelado'
             and coalesce(payment_status, '') <> 'confirmado'
          then coalesce(payment_rejected_by, v_actor)
        else payment_rejected_by
      end,
      updated_at = v_now
  where id = p_order_id;

  if p_next_status = 'Entregado'
     and coalesce(v_order.counted_in_metrics, false) = false
     and coalesce(v_order.is_test_order, false) = false then

    v_exp := greatest(1, floor(coalesce(v_order.total, 0))::integer);

    select coalesce(event_active, true)
    into v_event_active
    from public.settings
    where id = 'global';

    if not found then
      v_event_active := true;
    end if;

    v_customer.id := null;

    if v_order.customer_id is not null then
      select * into v_customer
      from public.customers
      where id = v_order.customer_id
      for update;
    elsif nullif(btrim(coalesce(v_order.customer_phone, '')), '') is not null then
      select * into v_customer
      from public.customers
      where phone = v_order.customer_phone
      limit 1
      for update;
    end if;

    if v_customer.id is not null then
      update public.customers
      set exp = greatest(0, coalesce(exp, 0) + v_exp),
          points = greatest(
            0,
            coalesce(points, 0) + case when v_event_active then v_exp else 0 end
          ),
          total_spent = greatest(
            0,
            coalesce(total_spent, 0) + coalesce(v_order.total, 0)
          ),
          total_orders = greatest(0, coalesce(total_orders, 0) + 1),
          last_order_at = v_now,
          updated_at = v_now
      where id = v_customer.id;
    end if;

    perform public.increment_metric('total_orders');

    update public.orders
    set counted_in_metrics = true,
        updated_at = v_now
    where id = p_order_id;
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'unchanged', false,
    'order_id', p_order_id,
    'previous_status', v_order.status,
    'next_status', p_next_status,
    'stock', v_stock_result
  );
end;
$$;

create or replace function public.confirm_online_order_payment_v2(
  p_order_id uuid,
  p_next_status text,
  p_actor text default 'admin'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_now timestamptz := now();
  v_actor text := coalesce(nullif(btrim(p_actor), ''), 'admin');
begin
  if p_order_id is null then
    raise exception 'Pedido inválido.';
  end if;

  if v_actor not in ('admin', 'delivery') then
    raise exception 'Actor inválido.';
  end if;

  if p_next_status not in ('confirmado', 'rechazado', 'contra_entrega') then
    raise exception 'Estado de pago inválido.';
  end if;

  if v_actor = 'delivery' and p_next_status <> 'confirmado' then
    raise exception 'El repartidor solo puede confirmar un pago recibido.';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Pedido no encontrado.';
  end if;

  if v_order.status = 'Cancelado' then
    raise exception 'No se puede modificar el pago de un pedido cancelado.';
  end if;

  if v_order.status = 'Entregado' and p_next_status <> 'confirmado' then
    raise exception 'Un pedido entregado no puede quedar sin pago confirmado.';
  end if;

  if p_next_status = 'confirmado' then
    update public.orders
    set payment_status = 'confirmado',
        payment_confirmed_at = coalesce(payment_confirmed_at, v_now),
        payment_confirmed_by = coalesce(payment_confirmed_by, v_actor),
        payment_rejected_at = null,
        payment_rejected_by = null,
        updated_at = v_now
    where id = p_order_id;
  elsif p_next_status = 'rechazado' then
    update public.orders
    set payment_status = 'rechazado',
        payment_rejected_at = coalesce(payment_rejected_at, v_now),
        payment_rejected_by = coalesce(payment_rejected_by, v_actor),
        payment_confirmed_at = null,
        payment_confirmed_by = null,
        updated_at = v_now
    where id = p_order_id;
  else
    if v_actor <> 'admin' then
      raise exception 'Solo el administrador puede devolver el pago a contra entrega.';
    end if;

    update public.orders
    set payment_status = 'contra_entrega',
        payment_confirmed_at = null,
        payment_confirmed_by = null,
        payment_rejected_at = null,
        payment_rejected_by = null,
        updated_at = v_now
    where id = p_order_id;
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'order_id', p_order_id,
    'previous_payment_status', v_order.payment_status,
    'next_payment_status', p_next_status,
    'actor', v_actor
  );
end;
$$;

-- Keep old panel calls compatible while enforcing the new Phase 2 rules.
create or replace function public.transition_online_order_v2(
  p_order_id uuid,
  p_next_status text,
  p_actor text default 'admin'
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.transition_online_order_v3(
    p_order_id,
    p_next_status,
    p_actor,
    null
  );
$$;

revoke all on function public.transition_online_order_v3(uuid, text, text, text)
from public, anon, authenticated;
grant execute on function public.transition_online_order_v3(uuid, text, text, text)
to service_role;

revoke all on function public.confirm_online_order_payment_v2(uuid, text, text)
from public, anon, authenticated;
grant execute on function public.confirm_online_order_payment_v2(uuid, text, text)
to service_role;

revoke all on function public.transition_online_order_v2(uuid, text, text)
from public, anon, authenticated;
grant execute on function public.transition_online_order_v2(uuid, text, text)
to service_role;

comment on function public.transition_online_order_v3(uuid, text, text, text)
is 'Phase 2: validates sequential logistics, reuses transactional stock sync, and requires payment before delivery.';

comment on function public.confirm_online_order_payment_v2(uuid, text, text)
is 'Phase 2: manually confirms or rejects payment with admin/delivery authorization.';
