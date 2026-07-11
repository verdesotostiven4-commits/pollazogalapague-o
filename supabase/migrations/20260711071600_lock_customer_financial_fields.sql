-- POLLAZO APP - Fase 1
-- Solo el trigger financiero interno puede cambiar puntos, EXP y acumulados.
--
-- La service role por sí sola no basta: esto evita que un endpoint genérico o
-- código administrativo antiguo duplique recompensas desde el navegador.

create or replace function public.pollazo_guard_customer_financial_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_internal_financial_write boolean :=
    coalesce(current_setting('pollazo.trusted_customer_financial', true), '') = '1';
begin
  if v_internal_financial_write then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.points := 0;
    new.exp := 0;
    new.total_spent := 0;
    new.total_orders := 0;
    new.last_order_at := null;
    return new;
  end if;

  new.points := old.points;
  new.exp := old.exp;
  new.total_spent := old.total_spent;
  new.total_orders := old.total_orders;
  new.last_order_at := old.last_order_at;

  return new;
end;
$$;

revoke all on function public.pollazo_guard_customer_financial_fields()
  from public, anon, authenticated;

comment on function public.pollazo_guard_customer_financial_fields() is
  'Bloquea cambios externos de puntos, EXP y acumulados. Solo una transacción interna que active pollazo.trusted_customer_financial puede modificarlos.';
