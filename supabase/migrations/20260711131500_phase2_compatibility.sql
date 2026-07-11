-- Phase 2 compatibility: existing clients calling transition_online_order_v2
-- are routed through the strict v3 lifecycle.

create or replace function public.transition_online_order_v2(
  p_order_id uuid,
  p_next_status text,
  p_actor text default 'admin'
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.transition_online_order_v3(
    p_order_id,
    p_next_status,
    p_actor,
    null
  );
$$;

revoke all on function public.transition_online_order_v2(uuid, text, text)
from public, anon, authenticated;
grant execute on function public.transition_online_order_v2(uuid, text, text)
to service_role;

do $$
begin
  if to_regclass('public.online_order_stock_events_id_seq') is not null then
    revoke all privileges on sequence public.online_order_stock_events_id_seq
    from anon, authenticated;
    grant all privileges on sequence public.online_order_stock_events_id_seq
    to service_role;
  end if;
end;
$$;
