-- Helpers seguros para limpiar datos de prueba POS antes de producción.
-- IMPORTANTE: crear estas funciones NO borra nada.
-- Primero usa public.preview_pos_cleanup_v1().
-- Solo borra cuando llamas public.reset_pos_test_data_v1('BORRAR_PRUEBAS_POS', ...).

create or replace function public.preview_pos_cleanup_v1()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pos_sales int := 0;
  v_pos_sales_void int := 0;
  v_pos_sale_items int := 0;
  v_pos_payments int := 0;
  v_cash_registers int := 0;
  v_cash_registers_open int := 0;
  v_cash_transactions int := 0;
  v_pos_stock_movements int := 0;
  v_tracked_products int := 0;
begin
  select count(*), count(*) filter (where coalesce(is_void, false) = true)
  into v_pos_sales, v_pos_sales_void
  from public.pos_sales;

  select count(*) into v_pos_sale_items from public.pos_sale_items;
  select count(*) into v_pos_payments from public.pos_payment_splits;
  select count(*) into v_cash_registers from public.cash_registers;
  select count(*) filter (where status = 'open') into v_cash_registers_open from public.cash_registers;
  select count(*) into v_cash_transactions from public.cash_transactions;

  select count(*)
  into v_pos_stock_movements
  from public.stock_movements
  where reference_table = 'pos_sales'
     or description ilike 'Anulación POS%'
     or description ilike 'Venta en punto de venta%';

  select count(*) filter (where coalesce(track_stock, false) = true)
  into v_tracked_products
  from public.products;

  return jsonb_build_object(
    'pos_sales', v_pos_sales,
    'pos_sales_void', v_pos_sales_void,
    'pos_sale_items', v_pos_sale_items,
    'pos_payment_splits', v_pos_payments,
    'cash_registers', v_cash_registers,
    'cash_registers_open', coalesce(v_cash_registers_open, 0),
    'cash_transactions', v_cash_transactions,
    'pos_stock_movements', v_pos_stock_movements,
    'tracked_products', v_tracked_products,
    'warning', 'Esto es solo vista previa. No borra nada.'
  );
end;
$$;

comment on function public.preview_pos_cleanup_v1() is 'Vista previa de datos POS de prueba antes de limpiar producción.';

create or replace function public.reset_pos_test_data_v1(
  p_confirm text,
  p_reset_tracked_stock boolean default false,
  p_stock_value numeric default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before jsonb;
  v_after jsonb;
begin
  if p_confirm <> 'BORRAR_PRUEBAS_POS' then
    raise exception 'Confirmación inválida. Para borrar pruebas usa exactamente: BORRAR_PRUEBAS_POS';
  end if;

  v_before := public.preview_pos_cleanup_v1();

  -- Primero datos dependientes.
  delete from public.cash_transactions;
  delete from public.pos_payment_splits;
  delete from public.pos_sale_items;

  -- Movimientos de stock originados por POS/correcciones de prueba.
  delete from public.stock_movements
  where reference_table = 'pos_sales'
     or description ilike 'Anulación POS%'
     or description ilike 'Venta en punto de venta%';

  -- Ventas y cajas POS.
  delete from public.pos_sales;
  delete from public.cash_registers;

  -- Opcional: resetear stock de productos con control activo.
  -- Úsalo solo si vas a cargar inventario real desde cero.
  if coalesce(p_reset_tracked_stock, false) then
    update public.products
    set current_stock = greatest(coalesce(p_stock_value, 0), 0),
        updated_at = now()
    where coalesce(track_stock, false) = true;
  end if;

  v_after := public.preview_pos_cleanup_v1();

  return jsonb_build_object(
    'status', 'ok',
    'before', v_before,
    'after', v_after,
    'stock_reset_applied', coalesce(p_reset_tracked_stock, false),
    'stock_value', greatest(coalesce(p_stock_value, 0), 0)
  );
end;
$$;

comment on function public.reset_pos_test_data_v1(text, boolean, numeric) is 'Borra datos transaccionales POS de prueba con confirmación fuerte. Opcionalmente resetea stock controlado.';
