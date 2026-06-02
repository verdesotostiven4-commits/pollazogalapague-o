-- Stock automático para pedidos online.
-- Crear primero esta función en Supabase antes de activar la llamada desde la app.
-- Objetivo: cuando un pedido online se confirma, descuenta inventario una sola vez.
-- Si el pedido confirmado se cancela, devuelve stock una sola vez.

alter table public.orders
  add column if not exists online_stock_deducted boolean not null default false,
  add column if not exists online_stock_deducted_at timestamptz,
  add column if not exists online_stock_returned_at timestamptz;

create index if not exists orders_online_stock_deducted_idx
  on public.orders (online_stock_deducted);

create or replace function public.sync_online_order_stock_v1(
  p_order_id uuid,
  p_next_status text,
  p_created_by text default 'admin'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item jsonb;
  v_product public.products%rowtype;
  v_candidate_id text;
  v_candidate_name text;
  v_quantity numeric(12,3);
  v_stock_before numeric(12,3);
  v_stock_after numeric(12,3);
  v_deduct_count int := 0;
  v_return_count int := 0;
  v_should_deduct boolean := false;
  v_should_return boolean := false;
begin
  if p_order_id is null then
    raise exception 'Pedido inválido.';
  end if;

  v_should_deduct := p_next_status in ('Recibido', 'Preparando', 'Enviado', 'Entregado');
  v_should_return := p_next_status = 'Cancelado';

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Pedido no encontrado: %', p_order_id;
  end if;

  if coalesce(v_order.is_test_order, false) then
    return jsonb_build_object(
      'status', 'ok',
      'action', 'ignored_test_order',
      'deducted_items', 0,
      'returned_items', 0
    );
  end if;

  if jsonb_typeof(coalesce(v_order.items, '[]'::jsonb)) <> 'array' then
    raise exception 'El pedido no tiene productos válidos.';
  end if;

  -- 1) Confirmar / reservar stock online una sola vez.
  if v_should_deduct and coalesce(v_order.online_stock_deducted, false) = false then
    -- Primero validar todo para evitar descuentos parciales.
    for v_item in
      select value from jsonb_array_elements(coalesce(v_order.items, '[]'::jsonb))
    loop
      v_candidate_id := coalesce(
        nullif(v_item->>'product_id', ''),
        nullif(v_item->>'id', ''),
        nullif(v_item->>'cart_item_id', ''),
        nullif(v_item#>>'{product,id}', '')
      );

      v_candidate_name := coalesce(
        nullif(v_item->>'name', ''),
        nullif(v_item#>>'{product,name}', '')
      );

      v_quantity := case
        when coalesce(v_item->>'quantity', '') ~ '^[0-9]+(\.[0-9]+)?$' then (v_item->>'quantity')::numeric
        else 1
      end;

      if v_quantity <= 0 then
        continue;
      end if;

      select * into v_product
      from public.products p
      where (
          v_candidate_id is not null
          and (
            p.id = v_candidate_id
            or v_candidate_id like p.id || '-%'
          )
        )
        or (
          v_candidate_name is not null
          and lower(p.name) = lower(v_candidate_name)
        )
      order by length(p.id) desc
      limit 1
      for update;

      if not found then
        continue;
      end if;

      if coalesce(v_product.track_stock, false)
         and coalesce(v_product.current_stock, 0) < v_quantity then
        raise exception 'Stock insuficiente para %. Disponible: %, pedido: %',
          coalesce(v_product.name, v_candidate_name, v_candidate_id),
          coalesce(v_product.current_stock, 0),
          v_quantity;
      end if;
    end loop;

    -- Si todo validó, descontar y registrar kardex.
    for v_item in
      select value from jsonb_array_elements(coalesce(v_order.items, '[]'::jsonb))
    loop
      v_candidate_id := coalesce(
        nullif(v_item->>'product_id', ''),
        nullif(v_item->>'id', ''),
        nullif(v_item->>'cart_item_id', ''),
        nullif(v_item#>>'{product,id}', '')
      );

      v_candidate_name := coalesce(
        nullif(v_item->>'name', ''),
        nullif(v_item#>>'{product,name}', '')
      );

      v_quantity := case
        when coalesce(v_item->>'quantity', '') ~ '^[0-9]+(\.[0-9]+)?$' then (v_item->>'quantity')::numeric
        else 1
      end;

      if v_quantity <= 0 then
        continue;
      end if;

      select * into v_product
      from public.products p
      where (
          v_candidate_id is not null
          and (
            p.id = v_candidate_id
            or v_candidate_id like p.id || '-%'
          )
        )
        or (
          v_candidate_name is not null
          and lower(p.name) = lower(v_candidate_name)
        )
      order by length(p.id) desc
      limit 1
      for update;

      if not found or coalesce(v_product.track_stock, false) = false then
        continue;
      end if;

      v_stock_before := coalesce(v_product.current_stock, 0);
      v_stock_after := v_stock_before - v_quantity;

      update public.products
      set current_stock = v_stock_after,
          available = case when v_stock_after <= 0 then false else available end,
          updated_at = now()
      where id = v_product.id;

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
        v_product.id,
        'online_order'::public.stock_movement_type,
        v_quantity,
        v_stock_before,
        v_stock_after,
        'orders',
        p_order_id,
        concat('Pedido online confirmado ', coalesce(v_order.order_code, p_order_id::text)),
        coalesce(nullif(btrim(p_created_by), ''), 'admin')
      );

      v_deduct_count := v_deduct_count + 1;
    end loop;

    update public.orders
    set online_stock_deducted = true,
        online_stock_deducted_at = now(),
        online_stock_returned_at = null,
        updated_at = now()
    where id = p_order_id;
  end if;

  -- 2) Si se cancela después de haber descontado, devolver una sola vez.
  if v_should_return
     and coalesce(v_order.online_stock_deducted, false) = true
     and v_order.online_stock_returned_at is null then
    for v_item in
      select value from jsonb_array_elements(coalesce(v_order.items, '[]'::jsonb))
    loop
      v_candidate_id := coalesce(
        nullif(v_item->>'product_id', ''),
        nullif(v_item->>'id', ''),
        nullif(v_item->>'cart_item_id', ''),
        nullif(v_item#>>'{product,id}', '')
      );

      v_candidate_name := coalesce(
        nullif(v_item->>'name', ''),
        nullif(v_item#>>'{product,name}', '')
      );

      v_quantity := case
        when coalesce(v_item->>'quantity', '') ~ '^[0-9]+(\.[0-9]+)?$' then (v_item->>'quantity')::numeric
        else 1
      end;

      if v_quantity <= 0 then
        continue;
      end if;

      select * into v_product
      from public.products p
      where (
          v_candidate_id is not null
          and (
            p.id = v_candidate_id
            or v_candidate_id like p.id || '-%'
          )
        )
        or (
          v_candidate_name is not null
          and lower(p.name) = lower(v_candidate_name)
        )
      order by length(p.id) desc
      limit 1
      for update;

      if not found or coalesce(v_product.track_stock, false) = false then
        continue;
      end if;

      v_stock_before := coalesce(v_product.current_stock, 0);
      v_stock_after := v_stock_before + v_quantity;

      update public.products
      set current_stock = v_stock_after,
          updated_at = now()
      where id = v_product.id;

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
        v_product.id,
        'online_order'::public.stock_movement_type,
        v_quantity,
        v_stock_before,
        v_stock_after,
        'orders',
        p_order_id,
        concat('Devolución por cancelación de pedido online ', coalesce(v_order.order_code, p_order_id::text)),
        coalesce(nullif(btrim(p_created_by), ''), 'admin')
      );

      v_return_count := v_return_count + 1;
    end loop;

    update public.orders
    set online_stock_returned_at = now(),
        updated_at = now()
    where id = p_order_id;
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'next_status', p_next_status,
    'deducted_items', v_deduct_count,
    'returned_items', v_return_count,
    'already_deducted', coalesce(v_order.online_stock_deducted, false),
    'already_returned', v_order.online_stock_returned_at is not null
  );
end;
$$;

comment on function public.sync_online_order_stock_v1(uuid, text, text) is 'Sincroniza stock de pedidos online al confirmar/cancelar, evitando doble descuento o doble devolución.';
