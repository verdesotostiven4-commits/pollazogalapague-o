-- Reportes POS para panel admin.
-- Lee ventas/caja del rango solicitado usando security definer para evitar problemas de RLS.

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
    'sales_count', coalesce(count(*), 0),
    'gross_total', coalesce(round(sum(total)::numeric, 2), 0),
    'subtotal', coalesce(round(sum(subtotal)::numeric, 2), 0),
    'discount_total', coalesce(round(sum(discount_amount)::numeric, 2), 0),
    'average_ticket', coalesce(round(avg(total)::numeric, 2), 0)
  ) into v_summary
  from public.pos_sales
  where created_at >= v_start
    and created_at < v_end
    and coalesce(is_void, false) = false;

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
      s.created_at
    from public.pos_sales s
    where s.created_at >= v_start
      and s.created_at < v_end
      and coalesce(s.is_void, false) = false
    order by s.created_at desc
    limit 15
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

comment on function public.get_pos_report_v1(timestamptz, timestamptz) is 'Devuelve resumen de ventas POS, pagos, productos y cajas para el panel admin.';
