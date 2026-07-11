-- POLLAZO APP - Fase 1
-- Clientes accesibles únicamente mediante endpoints server-side.
--
-- Requiere que el frontend ya use:
-- - /api/customer-profile
-- - /api/public-leaderboard
-- - /api/admin-customers
-- - /api/admin-customer

alter table public.customers enable row level security;

-- Eliminar políticas históricas que exponían teléfonos, ubicaciones y puntos.
drop policy if exists customers_select_public on public.customers;
drop policy if exists customers_insert_public on public.customers;
drop policy if exists customers_update_public on public.customers;
drop policy if exists customers_delete_public on public.customers;

drop policy if exists "Allow public select customers" on public.customers;
drop policy if exists "Allow public insert customers" on public.customers;
drop policy if exists "Allow public update customers" on public.customers;
drop policy if exists "Allow public delete customers" on public.customers;
drop policy if exists "Public can read customers" on public.customers;
drop policy if exists "Public can create customers" on public.customers;
drop policy if exists "Public can update customers" on public.customers;
drop policy if exists "Public can delete customers" on public.customers;

revoke all on table public.customers from anon, authenticated;

comment on table public.customers is
  'Datos privados de clientes. El navegador solo accede mediante endpoints server-side y sesiones firmadas.';
