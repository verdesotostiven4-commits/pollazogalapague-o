-- POLLAZO APP - Fase 1
-- Creación segura e idempotente de pedidos online.
--
-- IMPORTANTE:
-- - Esta migración es aditiva y queda versionada para revisión.
-- - No se ejecuta automáticamente sobre Supabase desde GitHub.
-- - El frontend debe migrarse a create_online_order_v2 antes de revocar
--   definitivamente todas las escrituras públicas antiguas.

create extension if not exists pgcrypto;

-- =========================================================
-- 1) Columnas de auditoría, pago e idempotencia
-- =========================================================

alter table public.orders
  add column if not exists customer_name text,
  add column if not exists idempotency_key text,
  add column if not exists request_fingerprint text,
  add column if not exists payment_status text not null default 'pendiente',
  add column if not exists selected_bank text,
  add column if not exists service_fee numeric(10,2) not null default 0,
  add column if not exists card_fee numeric(10,2) not null default 0,
  add column if not exists delivery_fee_original numeric(10,2) not null default 0,
  add column if not exists delivery_fee_final numeric(10,2) not null default 0,
  add column if not exists membership_applied boolean not null default false,
  add column if not exists membership_id text,
  add column if not exists membership_plan text,
  add column if not exists bonus_items jsonb not null default '[]'::jsonb,
  add column if not exists vip_gift_message text,
  add column if not exists counted_in_metrics boolean not null default false,
  add column if not exists is_test_order boolean not null default false,
  add column if not exists confirmed_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_reason text;

create unique index if not exists orders_idempotency_key_unique_idx
  on public.orders (idempotency_key)
  where idempotency_key is not null and btrim(idempotency_key) <> '';

create index if not exists orders_customer_phone_tail_idx
  on public.orders ((right(regexp_replace(customer_phone, '\D', '', 'g'), 9)));

create index if not exists orders_payment_status_idx
  on public.orders (payment_status);

-- Se añade NOT VALID para no bloquear datos históricos incompatibles.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_payment_status_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_payment_status_check
      check (
        payment_status in (
          'pendiente',
          'validando',
          'confirmado',
          'rechazado',
          'contra_entrega'
        )
      ) not valid;
  end if;
end $$;

-- =========================================================
-- 2) Helpers de normalización y precios
-- =========================================================

create or replace function public.pollazo_normalize_phone(p_phone text)
returns text
language plpgsql
immutable
strict
as $$
declare
  v_phone text;
begin
  v_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

  if v_phone like '593%' and length(v_phone) >= 11 then
    return left(v_phone, 15);
  end if;

  if v_phone like '0%' and length(v_phone) = 10 then
    return '593' || substr(v_phone, 2);
  end if;

  if v_phone like '9%' and length(v_phone) = 9 then
    return '593' || v_phone;
  end if;

  return left(v_phone, 15);
end;
$$;

create or replace function public.pollazo_parse_money(p_value text)
returns numeric
language plpgsql
immutable
as $$
declare
  v_match text[];
  v_amount numeric;
begin
  if p_value is null or btrim(p_value) = '' then
    return 0;
  end if;

  v_match := regexp_match(
    replace(p_value, ',', '.'),
    '([0-9]+(?:\.[0-9]+)?)'
  );

  if v_match is null then
    return 0;
  end if;

  begin
    v_amount := v_match[1]::numeric;
  exception
    when invalid_text_representation or numeric_value_out_of_range then
      return 0;
  end;

  return round(greatest(coalesce(v_amount, 0), 0), 2);
end;
$$;

revoke all on function public.pollazo_normalize_phone(text) from public;
revoke all on function public.pollazo_parse_money(text) from public;

-- =========================================================
-- 3) RPC oficial para pedidos online
-- =========================================================

create or replace function public.create_online_order_v2(
  p_customer_phone text,
  p_customer_name text default null,
  p_items jsonb default '[]'::jsonb,
  p_payment_method text default null,
  p_delivery_type text default 'domicilio',
  p_lat double precision default null,
  p_lng double precision default null,
  p_reference text default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_local_timestamp timestamp := timezone('America/Guayaquil', now());
  v_local_time time;
  v_local_dow integer;

  v_phone text;
  v_phone_tail text;
  v_customer_name text;
  v_reference text;
  v_payment_method text;
  v_delivery_type text;
  v_idempotency_key text;
  v_request_fingerprint text;

  v_existing_order public.orders%rowtype;
  v_customer_id uuid;
  v_customer_json jsonb;

  v_membership_id text;
  v_membership_plan text;
  v_has_plus boolean := false;

  v_has_previous_order boolean := false;
  v_first_delivery_free boolean := false;

  v_item jsonb;
  v_input_product_id text;
  v_quantity numeric(12,3);
  v_custom_price numeric(12,2);
  v_unit_price numeric(12,2);
  v_line_subtotal numeric(12,2);
  v_product public.products%rowtype;
  v_override_price text;
  v_override_available boolean;
  v_promo_price numeric(10,2);
  v_effective_available boolean;
  v_items_snapshot jsonb := '[]'::jsonb;
  v_seen_product_ids text[] := array[]::text[];

  v_subtotal numeric(10,2) := 0;
  v_delivery_fee_original numeric(10,2) := 0;
  v_delivery_fee_final numeric(10,2) := 0;
  v_total numeric(10,2) := 0;

  v_order_code text;
  v_created_order public.orders%rowtype;
begin
  v_local_time := v_local_timestamp::time;
  v_local_dow := extract(dow from v_local_timestamp)::integer;

  -- Identidad mínima del cliente.
  v_phone := public.pollazo_normalize_phone(p_customer_phone);
  v_phone_tail := right(v_phone, 9);
  v_customer_name := nullif(left(btrim(coalesce(p_customer_name, '')), 120), '');
  v_reference := nullif(left(btrim(coalesce(p_reference, '')), 500), '');

  if length(v_phone_tail) <> 9 then
    raise exception 'Número de WhatsApp inválido.' using errcode = '22023';
  end if;

  -- Solo los métodos aprobados para el piloto.
  v_payment_method := lower(btrim(coalesce(p_payment_method, '')));

  if v_payment_method not in ('efectivo', 'deuna') then
    raise exception 'Método de pago no disponible. Usa efectivo o DeUna al recibir.'
      using errcode = '22023';
  end if;

  v_delivery_type := lower(btrim(coalesce(p_delivery_type, 'domicilio')));

  if v_delivery_type not in ('domicilio', 'retiro') then
    raise exception 'Tipo de entrega inválido.' using errcode = '22023';
  end if;

  if v_delivery_type = 'domicilio' then
    if p_lat is null or p_lat < -90 or p_lat > 90 then
      raise exception 'Latitud de entrega inválida.' using errcode = '22023';
    end if;

    if p_lng is null or p_lng < -180 or p_lng > 180 then
      raise exception 'Longitud de entrega inválida.' using errcode = '22023';
    end if;

    if v_reference is null then
      raise exception 'Agrega una referencia para la entrega.' using errcode = '22023';
    end if;
  end if;

  -- Horario oficial de pedidos automáticos en Galápagos/Ecuador.
  if v_local_time < time '07:00:00' or v_local_time > time '20:45:00' then
    raise exception 'Los pedidos automáticos se reciben de 07:00 a 20:45.'
      using errcode = 'P0001';
  end if;

  if jsonb_typeof(coalesce(p_items, 'null'::jsonb)) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido no contiene productos.' using errcode = '22023';
  end if;

  if jsonb_array_length(p_items) > 50 then
    raise exception 'El pedido supera el máximo de 50 productos distintos.'
      using errcode = '22023';
  end if;

  -- La clave debe ser aleatoria y estable durante todos los reintentos.
  v_idempotency_key := nullif(btrim(coalesce(p_idempotency_key, '')), '');

  if v_idempotency_key is null
     or length(v_idempotency_key) < 16
     or length(v_idempotency_key) > 160 then
    raise exception 'Clave de idempotencia inválida.' using errcode = '22023';
  end if;

  v_request_fingerprint := encode(
    digest(
      concat_ws(
        '|',
        v_phone,
        coalesce(v_customer_name, ''),
        p_items::text,
        v_payment_method,
        v_delivery_type,
        coalesce(p_lat::text, ''),
        coalesce(p_lng::text, ''),
        coalesce(v_reference, '')
      ),
      'sha256'
    ),
    'hex'
  );

  -- Reintento seguro: devolver exactamente el pedido ya creado.
  select *
  into v_existing_order
  from public.orders
  where idempotency_key = v_idempotency_key
  limit 1;

  if found then
    if coalesce(v_existing_order.request_fingerprint, '') <> v_request_fingerprint
       or right(regexp_replace(v_existing_order.customer_phone, '\D', '', 'g'), 9) <> v_phone_tail then
      raise exception 'La clave de idempotencia ya pertenece a otra solicitud.'
        using errcode = '23505';
    end if;

    return jsonb_build_object(
      'ok', true,
      'idempotent_replay', true,
      'order_id', v_existing_order.id,
      'order_code', v_existing_order.order_code,
      'subtotal', v_existing_order.subtotal,
      'delivery_fee', v_existing_order.delivery_fee,
      'total', v_existing_order.total,
      'payment_method', v_existing_order.payment_method,
      'payment_status', v_existing_order.payment_status,
      'membership_applied', v_existing_order.membership_applied,
      'created_at', v_existing_order.created_at
    );
  end if;

  -- Verificar Pollazo Plus únicamente desde la base de datos.
  if to_regclass('public.memberships') is not null then
    begin
      execute $membership$
        select id::text, coalesce(nullif(plan_name, ''), 'Pollazo Plus')
        from public.memberships
        where right(regexp_replace(customer_phone, '\D', '', 'g'), 9) = right($1, 9)
          and lower(coalesce(status, '')) = 'active'
          and (expires_at is null or expires_at > now())
        order by expires_at desc nulls first
        limit 1
      $membership$
      into v_membership_id, v_membership_plan
      using v_phone;
    exception
      when undefined_table or undefined_column then
        v_membership_id := null;
        v_membership_plan := null;
    end;
  end if;

  v_has_plus := v_membership_id is not null;

  -- Buscar cliente existente por los últimos 9 dígitos, sin tocar puntos/EXP/VIP.
  select c.id, to_jsonb(c)
  into v_customer_id, v_customer_json
  from public.customers c
  where right(regexp_replace(c.phone, '\D', '', 'g'), 9) = v_phone_tail
  order by c.updated_at desc nulls last, c.created_at desc
  limit 1
  for update;

  if found then
    if lower(coalesce(v_customer_json->>'risk_level', '')) = 'bloqueado'
       or lower(coalesce(v_customer_json->>'blocked', 'false')) = 'true' then
      raise exception 'Este cliente no puede crear pedidos en este momento.'
        using errcode = '42501';
    end if;

    update public.customers
    set name = coalesce(v_customer_name, name),
        lat = case when v_delivery_type = 'domicilio' then p_lat else lat end,
        lng = case when v_delivery_type = 'domicilio' then p_lng else lng end,
        reference = case when v_delivery_type = 'domicilio' then v_reference else reference end,
        updated_at = v_now
    where id = v_customer_id;
  else
    insert into public.customers (
      phone,
      name,
      lat,
      lng,
      reference,
      updated_at
    ) values (
      v_phone,
      v_customer_name,
      case when v_delivery_type = 'domicilio' then p_lat else null end,
      case when v_delivery_type = 'domicilio' then p_lng else null end,
      case when v_delivery_type = 'domicilio' then v_reference else null end,
      v_now
    )
    returning id into v_customer_id;
  end if;

  -- El primer delivery gratis depende del historial real, no de localStorage.
  select exists (
    select 1
    from public.orders o
    where right(regexp_replace(o.customer_phone, '\D', '', 'g'), 9) = v_phone_tail
      and coalesce(o.is_test_order, false) = false
      and coalesce(o.status, '') <> 'Cancelado'
  )
  into v_has_previous_order;

  -- Releer catálogo, overrides y promociones; nunca confiar en precios del cliente.
  for v_item in
    select value
    from jsonb_array_elements(p_items)
  loop
    v_input_product_id := nullif(
      btrim(
        coalesce(
          v_item->>'product_id',
          v_item->>'id',
          v_item->>'cart_item_id',
          v_item#>>'{product,id}',
          ''
        )
      ),
      ''
    );

    if v_input_product_id is null or length(v_input_product_id) > 180 then
      raise exception 'Producto inválido dentro del pedido.' using errcode = '22023';
    end if;

    if coalesce(v_item->>'quantity', '') !~ '^[0-9]+(?:\.[0-9]{1,3})?$' then
      raise exception 'Cantidad inválida para el producto %.', v_input_product_id
        using errcode = '22023';
    end if;

    v_quantity := round((v_item->>'quantity')::numeric, 3);

    if v_quantity <= 0 or v_quantity > 1000 then
      raise exception 'Cantidad fuera de rango para el producto %.', v_input_product_id
        using errcode = '22023';
    end if;

    select p.*
    into v_product
    from public.products p
    where p.id = v_input_product_id
       or v_input_product_id like p.id || '-%'
    order by length(p.id) desc
    limit 1
    for update;

    if not found then
      raise exception 'Producto no encontrado: %.', v_input_product_id
        using errcode = '22023';
    end if;

    if v_product.id = any(v_seen_product_ids) then
      raise exception 'El producto % está repetido en el pedido.', v_product.name
        using errcode = '22023';
    end if;

    v_seen_product_ids := array_append(v_seen_product_ids, v_product.id);

    v_override_price := null;
    v_override_available := null;

    if to_regclass('public.product_overrides') is not null then
      select po.price, po.available
      into v_override_price, v_override_available
      from public.product_overrides po
      where po.id = v_product.id
      limit 1;
    end if;

    v_effective_available := coalesce(
      v_override_available,
      v_product.available,
      true
    );

    if not v_effective_available then
      raise exception 'Producto agotado o no disponible: %.', v_product.name
        using errcode = 'P0001';
    end if;

    if coalesce(v_product.track_stock, false)
       and coalesce(v_product.current_stock, 0) < v_quantity then
      raise exception 'Stock insuficiente para %. Disponible: %.',
        v_product.name,
        coalesce(v_product.current_stock, 0)
        using errcode = 'P0001';
    end if;

    v_promo_price := null;

    if to_regclass('public.product_promotions') is not null
       and coalesce(v_product.is_variable, false) = false then
      select pp.promo_price
      into v_promo_price
      from public.product_promotions pp
      where pp.product_id = v_product.id
        and pp.active = true
        and pp.promo_price is not null
        and (pp.starts_at is null or pp.starts_at <= v_now)
        and (pp.ends_at is null or pp.ends_at > v_now)
        and (
          coalesce(cardinality(pp.days_of_week), 0) = 0
          or v_local_dow = any(pp.days_of_week)
        )
        and (pp.plus_only = false or v_has_plus = true)
      order by pp.priority asc, pp.created_at asc
      limit 1;
    end if;

    if coalesce(v_product.is_variable, false) then
      if coalesce(v_item->>'custom_price', '') !~ '^[0-9]+(?:\.[0-9]{1,2})?$' then
        raise exception 'Selecciona un valor válido para %.', v_product.name
          using errcode = '22023';
      end if;

      v_custom_price := round((v_item->>'custom_price')::numeric, 2);

      if v_custom_price < 1 or v_custom_price > 1000 then
        raise exception 'El valor elegido para % debe estar entre $1 y $1000.', v_product.name
          using errcode = '22023';
      end if;

      v_unit_price := v_custom_price;
    else
      v_custom_price := null;

      if v_promo_price is not null then
        v_unit_price := round(greatest(v_promo_price, 0), 2);
      elsif v_override_price is not null and btrim(v_override_price) <> '' then
        v_unit_price := public.pollazo_parse_money(v_override_price);
      else
        v_unit_price := public.pollazo_parse_money(v_product.price);
      end if;

      if v_unit_price <= 0 then
        raise exception 'El producto % no tiene un precio oficial válido.', v_product.name
          using errcode = 'P0001';
      end if;
    end if;

    v_line_subtotal := round(v_unit_price * v_quantity, 2);
    v_subtotal := round(v_subtotal + v_line_subtotal, 2);

    v_items_snapshot := v_items_snapshot || jsonb_build_array(
      jsonb_build_object(
        'id', v_product.id,
        'product_id', v_product.id,
        'cart_item_id', v_product.id,
        'name', v_product.name,
        'quantity', v_quantity,
        'price', v_unit_price,
        'price_text', '$' || to_char(v_unit_price, 'FM999999990.00'),
        'custom_price', v_custom_price,
        'subtotal', v_line_subtotal,
        'line_subtotal', v_line_subtotal,
        'category', v_product.category,
        'image', v_product.image,
        'unit', v_product.unit,
        'product', jsonb_build_object(
          'id', v_product.id,
          'name', v_product.name,
          'category', v_product.category,
          'subcategory', v_product.subcategory,
          'price', '$' || to_char(v_unit_price, 'FM999999990.00'),
          'unit', v_product.unit,
          'description', v_product.description,
          'image', v_product.image,
          'badge', v_product.badge,
          'available', v_effective_available,
          'is_variable', coalesce(v_product.is_variable, false),
          'custom_price', v_custom_price
        )
      )
    );
  end loop;

  if v_delivery_type = 'domicilio' then
    if v_has_plus and v_subtotal < 8 then
      raise exception 'Con Pollazo Plus el pedido mínimo para delivery es $8.'
        using errcode = 'P0001';
    elsif not v_has_plus and v_subtotal < 5 then
      raise exception 'El pedido mínimo para delivery es $5.'
        using errcode = 'P0001';
    end if;

    if v_subtotal < 8 then
      v_delivery_fee_original := 2;
    else
      v_delivery_fee_original := 1.50;
    end if;

    v_first_delivery_free :=
      not v_has_plus
      and not v_has_previous_order
      and v_subtotal >= 10;

    if v_has_plus or v_first_delivery_free then
      v_delivery_fee_final := 0;
    else
      v_delivery_fee_final := v_delivery_fee_original;
    end if;
  else
    v_delivery_fee_original := 0;
    v_delivery_fee_final := 0;
    v_first_delivery_free := false;
  end if;

  v_total := round(v_subtotal + v_delivery_fee_final, 2);
  v_order_code := 'PZ-'
    || to_char(v_local_timestamp, 'DDMM')
    || '-'
    || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10));

  begin
    insert into public.orders (
      order_code,
      customer_id,
      customer_phone,
      customer_name,
      items,
      subtotal,
      delivery_fee,
      delivery_fee_original,
      delivery_fee_final,
      service_fee,
      card_fee,
      total,
      status,
      provider,
      preorder,
      payment_method,
      payment_status,
      delivery_type,
      payment_proof_url,
      selected_bank,
      lat,
      lng,
      reference,
      membership_applied,
      membership_id,
      membership_plan,
      counted_in_metrics,
      is_test_order,
      idempotency_key,
      request_fingerprint,
      created_at,
      updated_at
    ) values (
      v_order_code,
      v_customer_id,
      v_phone,
      v_customer_name,
      v_items_snapshot,
      v_subtotal,
      v_delivery_fee_final,
      v_delivery_fee_original,
      v_delivery_fee_final,
      0,
      0,
      v_total,
      'Por Confirmar',
      false,
      false,
      v_payment_method,
      'contra_entrega',
      v_delivery_type,
      null,
      null,
      case when v_delivery_type = 'domicilio' then p_lat else null end,
      case when v_delivery_type = 'domicilio' then p_lng else null end,
      case when v_delivery_type = 'domicilio' then v_reference else null end,
      v_has_plus,
      v_membership_id,
      v_membership_plan,
      false,
      false,
      v_idempotency_key,
      v_request_fingerprint,
      v_now,
      v_now
    )
    returning * into v_created_order;
  exception
    when unique_violation then
      select *
      into v_existing_order
      from public.orders
      where idempotency_key = v_idempotency_key
      limit 1;

      if not found then
        raise;
      end if;

      if coalesce(v_existing_order.request_fingerprint, '') <> v_request_fingerprint
         or right(regexp_replace(v_existing_order.customer_phone, '\D', '', 'g'), 9) <> v_phone_tail then
        raise exception 'La clave de idempotencia ya pertenece a otra solicitud.'
          using errcode = '23505';
      end if;

      return jsonb_build_object(
        'ok', true,
        'idempotent_replay', true,
        'order_id', v_existing_order.id,
        'order_code', v_existing_order.order_code,
        'subtotal', v_existing_order.subtotal,
        'delivery_fee', v_existing_order.delivery_fee,
        'total', v_existing_order.total,
        'payment_method', v_existing_order.payment_method,
        'payment_status', v_existing_order.payment_status,
        'membership_applied', v_existing_order.membership_applied,
        'created_at', v_existing_order.created_at
      );
  end;

  return jsonb_build_object(
    'ok', true,
    'idempotent_replay', false,
    'order_id', v_created_order.id,
    'order_code', v_created_order.order_code,
    'subtotal', v_created_order.subtotal,
    'delivery_fee', v_created_order.delivery_fee,
    'delivery_fee_original', v_created_order.delivery_fee_original,
    'total', v_created_order.total,
    'payment_method', v_created_order.payment_method,
    'payment_status', v_created_order.payment_status,
    'membership_applied', v_created_order.membership_applied,
    'membership_plan', v_created_order.membership_plan,
    'first_delivery_free', v_first_delivery_free,
    'created_at', v_created_order.created_at
  );
end;
$$;

comment on function public.create_online_order_v2(
  text,
  text,
  jsonb,
  text,
  text,
  double precision,
  double precision,
  text,
  text
) is 'Crea pedidos online con precios, promociones, membresía, delivery e idempotencia calculados en servidor.';

revoke all on function public.create_online_order_v2(
  text,
  text,
  jsonb,
  text,
  text,
  double precision,
  double precision,
  text,
  text
) from public;

grant execute on function public.create_online_order_v2(
  text,
  text,
  jsonb,
  text,
  text,
  double precision,
  double precision,
  text,
  text
) to anon, authenticated;

-- La revocación de INSERT directo se activará al mismo tiempo que el frontend
-- cambie a create_online_order_v2. Se deja documentada y no se ejecuta todavía
-- para permitir un despliegue gradual sin perder pedidos.
--
-- revoke insert on public.orders from anon, authenticated;
