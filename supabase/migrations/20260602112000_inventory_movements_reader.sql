-- Historial/Kardex de inventario para el admin.
-- Permite leer movimientos aunque stock_movements tenga RLS restringido.

create or replace function public.get_product_stock_movements_v1(
  p_product_id text,
  p_limit integer default 12
)
returns table (
  id uuid,
  product_id text,
  type public.stock_movement_type,
  quantity numeric,
  stock_before numeric,
  stock_after numeric,
  reference_table text,
  reference_id uuid,
  description text,
  created_by text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    sm.id,
    sm.product_id,
    sm.type,
    sm.quantity,
    sm.stock_before,
    sm.stock_after,
    sm.reference_table,
    sm.reference_id,
    sm.description,
    sm.created_by,
    sm.created_at
  from public.stock_movements sm
  where sm.product_id = p_product_id
  order by sm.created_at desc
  limit greatest(1, least(coalesce(p_limit, 12), 50));
$$;

comment on function public.get_product_stock_movements_v1(text, integer) is 'Lee los últimos movimientos de inventario de un producto para el panel admin.';
