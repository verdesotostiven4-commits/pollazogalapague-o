-- POLLAZO APP - Fase 1
-- Compatibilidad preventiva para instalaciones que no tengan todos los
-- parches históricos aplicados en el mismo orden.

-- Columnas del catálogo utilizadas por create_online_order_v2.
alter table public.products
  add column if not exists subcategory text,
  add column if not exists is_variable boolean not null default false,
  add column if not exists current_stock numeric(12,3) not null default 0,
  add column if not exists track_stock boolean not null default false;

-- Datos seguros de ubicación que la RPC puede actualizar sin tocar puntos,
-- EXP, VIP ni otras propiedades administrativas.
alter table public.customers
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists reference text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- El normalizador debe procesar NULL como cadena vacía para devolver un error
-- de validación claro dentro de la RPC, no propagar NULL silenciosamente.
create or replace function public.pollazo_normalize_phone(p_phone text)
returns text
language plpgsql
immutable
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

revoke all on function public.pollazo_normalize_phone(text) from public;

-- El frontend administrativo usa customer_memberships. Algunas funciones
-- antiguas consultaban memberships. Si solo existe la tabla oficial actual,
-- se crea una vista privada de compatibilidad con la misma estructura.
do $$
begin
  if to_regclass('public.memberships') is null
     and to_regclass('public.customer_memberships') is not null then
    execute 'create view public.memberships as select * from public.customer_memberships';
    comment on view public.memberships is
      'Vista de compatibilidad interna. La fuente oficial es customer_memberships.';
  end if;
end $$;

-- No conceder lectura pública de la vista. Las funciones SECURITY DEFINER y
-- endpoints con service role pueden usarla sin exponer membresías al cliente.
revoke all on table public.memberships from public;
revoke all on table public.memberships from anon, authenticated;
