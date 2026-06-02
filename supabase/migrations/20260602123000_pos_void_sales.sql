-- Anulación de ventas POS.
-- Permite corregir errores de caja: marca venta como anulada, devuelve stock y descuenta efectivo de caja abierta.

alter table public.pos_sales
  add column if not exists voided_by text;

create or replace function public.void_pos_sale_v1(
  p_pos_sale_id uuid,
  p_reason text,
  p_voided_by text default 'admin'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.pos_sales%rowtype;
  v_register public.cash_registers%rowtype;
  v_item record;
  v_product public.products%rowtype;
  v_stock_before numeric(12,3);
  v_stock_after numeric(12,3);
  v_cash_total numeric(12,2) := 0;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if p_pos_sale_id is null then
    raise exception 'Venta inválida.';
  end if;

  if v_reason is null then
    raise exception 'Debes ingresar un motivo de anulación.';
  end if;

  select * into v_sale
  from public.pos_sales
  where id = p_pos_sale_id
  for update;

  if not found then
    raise exception 'Venta POS no encontrada.';
  end if;

  if coalesce(v_sale.is_void, false) then
    raise exception 'Esta venta ya está anulada.';
  end if;

  select * into v_register
  from public.cash_registers
  where id = v_sale.cash_register_id
  for update;

  if not found then
    raise exception 'Caja de la venta no encontrada.';
  end if;

  if v_register.status <> 'open' then
    raise exception 'No puedes anular una venta de una caja ya cerrada. Registra un ajuste manual o consulta al administrador.';
  end if;

  select coalesce(round(sum(amount)::numeric, 2), 0)
  into v_cash_total
  from public.pos_payment_splits
  where pos_sale_id = p_pos_sale_id
    and method = 'cash';

  for v_item in
    select *
    from public.pos_sale_items
    where pos_sale_id = p_pos_sale_id
  loop
    select * into v_product
    from public.products
    where id = v_item.product_id
    for update;

    if found and coalesce(v_product.track_stock, false) then
      v_stock_before := coalesce(v_product.current_stock, 0);
      v_stock_after := v_stock_before + v_item.quantity;

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
        'adjustment_add',
        v_item.quantity,
        v_stock_before,
        v_stock_after,
        'pos_sales',
        p_pos_sale_id,
        concat('Anulación POS ', v_sale.sale_code, ': ', v_reason),
        coalesce(nullif(btrim(p_voided_by), ''), 'admin')
      );
    end if;
  end loop;

  if v_cash_total > 0 then
    update public.cash_registers
    set expected_cash_sales = round((expected_cash_sales - v_cash_total)::numeric, 2),
        updated_at = now()
    where id = v_sale.cash_register_id;
  end if;

  update public.pos_sales
  set is_void = true,
      void_reason = v_reason,
      voided_by = coalesce(nullif(btrim(p_voided_by), ''), 'admin'),
      voided_at = now(),
      notes = concat_ws(E'\n', notes, concat('ANULADA: ', v_reason)),
      updated_at = now()
  where id = p_pos_sale_id;

  return p_pos_sale_id;
end;
$$;

comment on function public.void_pos_sale_v1(uuid, text, text) is 'Anula una venta POS de caja abierta, devuelve stock y descuenta efectivo esperado.';

-- Actualiza reporte POS para mostrar anuladas en listado y resumen, sin contarlas en totales válidos.
create or replace function public.get_pos_report_v1(
  p_start_date timestamptz default date_trunc('day', now()),
  p_end_date timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz := coalesce(p_start_date, date_trunc('day', now()));
  v_end timestamptz := coalesce(p_end_date, now());
  v_summary jsonb;
  v_payments jsonb;
  v_top_products jsonb;
  v_sales jsonb;
  v_registers jsonb;
begin
  if v_end <= v_start then
    v_end := v_start + interval '1 day';
  end if;

  select jsonb_build_object(
    'sales_count', coalesce(count(*) filter (where coalesce(is_void, false) = false), 0),
    'void_count', coalesce(count(*) filter (where coalesce(is_void, false) = true), 0),
    'gross_total', coalesce(round(sum(total) filter (where coalesce(is_void, false) = false)::numeric, 2), 0),
    'void_total', coalesce(round(sum(total) filter (where coalesce(is_void, false) = true)::numeric, 2), 0),
    'subtotal', coalesce(round(sum(subtotal) filter (where coalesce(is_void, false) = false)::numeric, 2), 0),
    'discount_total', coalesce(round(sum(discount_amount) filter (where coalesce(is_void, false) = false)::numeric, 2), 0),
    'average_ticket', coalesce(round(avg(total) filter (where coalesce(is_void, false) = false)::numeric, 2), 0)
  ) into v_summary
  from public.pos_sales
  where created_at >= v_start
    and created_at < v_end;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.amount desc), '[]'::jsonb)
  into v_payments
  from (
    select
      p.method::text as method,
      count(*)::int as count,
      coalesce(round(sum(p.amount)::numeric, 2), 0) as amount
    from public.pos_payment_splits p
    join public.pos_sales s on s.id = p.pos_sale_id
    where s.created_at >= v_start
      and s.created_at < v_end
      and coalesce(s.is_void, false) = false
    group by p.method
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.quantity desc, t.total desc), '[]'::jsonb)
  into v_top_products
  from (
    select
      i.product_id,
      i.product_name,
      coalesce(round(sum(i.quantity)::numeric, 3), 0) as quantity,
      coalesce(round(sum(i.total)::numeric, 2), 0) as total
    from public.pos_sale_items i
    join public.pos_sales s on s.id = i.pos_sale_id
    where s.created_at >= v_start
      and s.created_at < v_end
      and coalesce(s.is_void, false) = false
    group by i.product_id, i.product_name
    order by quantity desc, total desc
    limit 10
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.created_at desc), '[]'::jsonb)
  into v_sales
  from (
    select
      s.id,
      s.sale_code,
      s.total,
      s.payment_summary,
      s.customer_name,
      s.is_void,
      s.void_reason,
      s.voided_at,
      s.voided_by,
      s.created_at,
      cr.status::text as cash_register_status
    from public.pos_sales s
    join public.cash_registers cr on cr.id = s.cash_register_id
    where s.created_at >= v_start
      and s.created_at < v_end
    order by s.created_at desc
    limit 20
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.opened_at desc), '[]'::jsonb)
  into v_registers
  from (
    select
      r.id,
      r.opened_by,
      r.opened_at,
      r.closed_at,
      r.opening_balance,
      r.expected_cash_sales,
      r.manual_income,
      r.manual_expense,
      r.real_balance_cash,
      r.difference,
      r.status::text as status
    from public.cash_registers r
    where r.opened_at >= v_start
      and r.opened_at < v_end
    order by r.opened_at desc
    limit 15
  ) t;

  return jsonb_build_object(
    'range', jsonb_build_object('start', v_start, 'end', v_end),
    'summary', coalesce(v_summary, '{}'::jsonb),
    'payments', v_payments,
    'top_products', v_top_products,
    'sales', v_sales,
    'registers', v_registers
  );
end;
$$;
