-- Phase 1: remove permissive anonymous policies and expose only public catalog data.
-- All sensitive reads/writes now go through server APIs using service_role.

do $$
declare
  v_table text;
  v_policy record;
  v_tables text[] := array[
    'products',
    'product_overrides',
    'app_settings',
    'settings',
    'seasons',
    'product_promotions',
    'customers',
    'orders',
    'customer_memberships',
    'membership_payments',
    'order_bonus_items',
    'app_metrics',
    'testimonials',
    'push_subscriptions',
    'cash_registers',
    'cash_transactions',
    'pos_sales',
    'pos_sale_items',
    'pos_payment_splits',
    'stock_movements'
  ];
begin
  foreach v_table in array v_tables loop
    if to_regclass('public.' || v_table) is not null then
      execute format('alter table public.%I enable row level security', v_table);

      for v_policy in
        select policyname
        from pg_policies
        where schemaname = 'public'
          and tablename = v_table
      loop
        execute format(
          'drop policy if exists %I on public.%I',
          v_policy.policyname,
          v_table
        );
      end loop;

      execute format(
        'revoke all privileges on table public.%I from anon, authenticated',
        v_table
      );
    end if;
  end loop;
end;
$$;

-- Public catalog/configuration data remains read-only.
do $$
begin
  if to_regclass('public.products') is not null then
    grant select on public.products to anon, authenticated;
    create policy "Public read-only products"
      on public.products
      for select
      to anon, authenticated
      using (true);
  end if;

  if to_regclass('public.product_overrides') is not null then
    grant select on public.product_overrides to anon, authenticated;
    create policy "Public read-only product overrides"
      on public.product_overrides
      for select
      to anon, authenticated
      using (true);
  end if;

  if to_regclass('public.app_settings') is not null then
    grant select on public.app_settings to anon, authenticated;
    create policy "Public read-only app settings"
      on public.app_settings
      for select
      to anon, authenticated
      using (true);
  end if;

  if to_regclass('public.settings') is not null then
    grant select on public.settings to anon, authenticated;
    create policy "Public read-only settings"
      on public.settings
      for select
      to anon, authenticated
      using (true);
  end if;

  if to_regclass('public.seasons') is not null then
    grant select on public.seasons to anon, authenticated;
    create policy "Public read-only published seasons"
      on public.seasons
      for select
      to anon, authenticated
      using (is_published = true);
  end if;

  if to_regclass('public.product_promotions') is not null then
    grant select on public.product_promotions to anon, authenticated;
    create policy "Public read-only active promotions"
      on public.product_promotions
      for select
      to anon, authenticated
      using (
        active = true
        and (starts_at is null or starts_at <= now())
        and (ends_at is null or ends_at >= now())
      );
  end if;
end;
$$;

-- Never let browser roles execute business or money RPCs directly.
do $$
declare
  v_function record;
begin
  for v_function in
    select
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as identity_arguments
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    execute format(
      'revoke all privileges on function %I.%I(%s) from public, anon, authenticated',
      v_function.schema_name,
      v_function.function_name,
      v_function.identity_arguments
    );

    execute format(
      'grant execute on function %I.%I(%s) to service_role',
      v_function.schema_name,
      v_function.function_name,
      v_function.identity_arguments
    );
  end loop;
end;
$$;

-- Remove sequence access that could otherwise support direct inserts.
do $$
declare
  v_sequence record;
begin
  for v_sequence in
    select sequence_schema, sequence_name
    from information_schema.sequences
    where sequence_schema = 'public'
  loop
    execute format(
      'revoke all privileges on sequence %I.%I from anon, authenticated',
      v_sequence.sequence_schema,
      v_sequence.sequence_name
    );
  end loop;
end;
$$;
