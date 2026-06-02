-- Inventario MVP: ajuste seguro de stock con historial/kardex.
-- Ejecutar después de 20260602080000_pos_cash_mvp.sql.

create or replace function public.adjust_product_stock_v1(
  p_product_id text,
  p_delta numeric,
  p_description text default null,
  p_created_by text default 'admin'
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_stock_before numeric(12,3);
  v_stock_after numeric(12,3);
  v_type public.stock_movement_type;
begin
  if p_product_id is null or btrim(p_product_id) = '' then
    raise exception 'Producto inválido.';
  end if;

  if p_delta is null or p_delta = 0 then
    raise exception 'La cantidad de ajuste no puede ser 0.';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'Producto no encontrado: %', p_product_id;
  end if;

  v_stock_before := coalesce(v_product.current_stock, 0);
  v_stock_after := v_stock_before + p_delta;

  if v_stock_after < 0 then
    raise exception 'No puedes dejar stock negativo. Stock actual: %, ajuste: %', v_stock_before, p_delta;
  end if;

  update public.products
  set current_stock = v_stock_after,
      track_stock = true,
      updated_at = now()
  where id = p_product_id;

  v_type := case
    when p_delta > 0 then 'adjustment_add'::public.stock_movement_type
    else 'adjustment_remove'::public.stock_movement_type
  end;

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
    p_product_id,
    v_type,
    abs(p_delta),
    v_stock_before,
    v_stock_after,
    'products',
    null,
    coalesce(nullif(btrim(p_description), ''), 'Ajuste manual de inventario'),
    coalesce(nullif(btrim(p_created_by), ''), 'admin')
  );

  return v_stock_after;
end;
$$;

comment on function public.adjust_product_stock_v1(text, numeric, text, text) is 'Ajusta stock de un producto y registra movimiento de inventario.';
