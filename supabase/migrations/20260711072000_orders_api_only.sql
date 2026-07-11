-- POLLAZO APP - Fase 1
-- Pedidos accesibles únicamente mediante endpoints server-side.
--
-- Requiere que el frontend ya use:
-- - /api/create-order
-- - /api/customer-orders
-- - /api/admin-orders
-- - /api/admin-order-status
-- - /api/admin-order-payment
-- - /api/admin-order-metadata

alter table public.orders enable row level security;

-- Eliminar políticas históricas que abrían todos los pedidos al navegador.
drop policy if exists orders_select_public on public.orders;
drop policy if exists orders_insert_public on public.orders;
drop policy if exists orders_update_public on public.orders;
drop policy if exists orders_delete_public on public.orders;

-- También eliminar nombres alternativos que pudieron existir en despliegues
-- manuales o copias antiguas del proyecto.
drop policy if exists "Allow public select orders" on public.orders;
drop policy if exists "Allow public insert orders" on public.orders;
drop policy if exists "Allow public update orders" on public.orders;
drop policy if exists "Allow public delete orders" on public.orders;
drop policy if exists "Public can read orders" on public.orders;
drop policy if exists "Public can create orders" on public.orders;
drop policy if exists "Public can update orders" on public.orders;
drop policy if exists "Public can delete orders" on public.orders;

-- Sin privilegios de tabla, las políticas permisivas residuales no bastan para
-- consultar o modificar datos mediante la anon key.
revoke all on table public.orders from anon, authenticated;

-- La creación segura deja de estar disponible directamente por PostgREST.
revoke execute on function public.create_online_order_v2(
  text,
  text,
  jsonb,
  text,
  text,
  double precision,
  double precision,
  text,
  text
) from public, anon, authenticated;

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
) to service_role;

-- Las operaciones administrativas específicas siguen siendo exclusivas del
-- servidor. Se repiten los grants para que esta migración sea autocontenida.
revoke execute on function public.set_order_status_v1(uuid, text, text)
  from public, anon, authenticated;
revoke execute on function public.set_order_payment_status_v1(uuid, text)
  from public, anon, authenticated;

grant execute on function public.set_order_status_v1(uuid, text, text)
  to service_role;
grant execute on function public.set_order_payment_status_v1(uuid, text)
  to service_role;

comment on table public.orders is
  'Pedidos privados. El navegador accede exclusivamente mediante endpoints server-side con sesiones firmadas.';
