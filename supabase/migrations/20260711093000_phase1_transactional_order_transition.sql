-- Phase 1: validated and transactional order transitions.

create or replace function public.transition_online_order_v2(
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
  v_exp integer := 0;
  v_event_active boolean := true;
  v_customer public.customers%rowtype;
  v_stock_result jsonb;
begin
  if p_order_id is null then
    raise exception 'Pedido inválido.';
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

  if not (
    (v_order.status = 'Por Confirmar' and p_next_status in ('Recibido', 'Cancelado'))
    or (v_order.status = 'Recibido' and p_next_status in ('Preparando', 'Cancelado'))
    or (v_order.status = 'Preparando' and p_next_status in ('Enviado', 'Cancelado'))
    or (v_order.status = 'Enviado' and p_next_status in ('Entregado', 'Cancelado'))
  ) then
    raise exception 'Transición no permitida: % -> %', v_order.status, p_next_status;
  end if;

  v_stock_result := public.sync_online_order_stock_v1(
    p_order_id,
    p_next_status,
    coalesce(nullif(btrim(p_actor), ''), 'admin')
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

    if found then
      update public.customers
      set exp = greatest(0, coalesce(exp, 0) + v_exp),
          points = greatest(
            0,
            coalesce(points, 0) + case when v_event_active then v_exp else 0 end
          ),
          total_spent = greatest(0, coalesce(total_spent, 0) + coalesce(v_order.total, 0)),
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

revoke all on function public.transition_online_order_v2(uuid, text, text) from public;
revoke all on function public.transition_online_order_v2(uuid, text, text) from anon;
revoke all on function public.transition_online_order_v2(uuid, text, text) from authenticated;
grant execute on function public.transition_online_order_v2(uuid, text, text) to service_role;

comment on function public.transition_online_order_v2(uuid, text, text)
is 'Valida la transición del pedido, sincroniza inventario y contabiliza una sola vez en una transacción.';
