-- Phase 1: testimonial submission and reward are decided atomically on the server.

alter table public.customers
  add column if not exists has_reviewed boolean not null default false;

alter table public.testimonials
  add column if not exists customer_phone text;

create unique index if not exists testimonials_one_per_customer_phone_idx
  on public.testimonials (customer_phone)
  where customer_phone is not null and btrim(customer_phone) <> '';

create or replace function public.submit_customer_testimonial_v1(
  p_customer_phone text,
  p_author_name text,
  p_stars integer,
  p_comment text,
  p_photo_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text := regexp_replace(coalesce(p_customer_phone, ''), '\D', '', 'g');
  v_customer public.customers%rowtype;
  v_testimonial public.testimonials%rowtype;
  v_event_active boolean := true;
  v_awarded integer := 0;
begin
  if length(v_phone) < 9 then
    raise exception 'Número de cliente inválido.';
  end if;

  if nullif(btrim(coalesce(p_author_name, '')), '') is null then
    raise exception 'El nombre es obligatorio.';
  end if;

  if p_stars < 1 or p_stars > 5 then
    raise exception 'La calificación debe estar entre 1 y 5.';
  end if;

  if length(btrim(coalesce(p_comment, ''))) < 3 then
    raise exception 'El comentario es demasiado corto.';
  end if;

  select * into v_customer
  from public.customers
  where phone = v_phone
  for update;

  if not found then
    insert into public.customers (
      phone,
      name,
      avatar_url,
      points,
      exp,
      is_vip,
      has_reviewed,
      updated_at
    ) values (
      v_phone,
      left(btrim(p_author_name), 100),
      nullif(left(btrim(coalesce(p_photo_url, '')), 1000), ''),
      0,
      0,
      false,
      false,
      now()
    )
    returning * into v_customer;
  end if;

  if coalesce(v_customer.has_reviewed, false) then
    raise exception 'Este cliente ya publicó una opinión.';
  end if;

  select coalesce(event_active, true)
  into v_event_active
  from public.settings
  where id = 'global';

  if not found then
    v_event_active := true;
  end if;

  if v_event_active then
    v_awarded := 10;
  end if;

  insert into public.testimonials (
    author_name,
    stars,
    comment,
    photo_url,
    customer_phone,
    created_at
  ) values (
    left(btrim(p_author_name), 100),
    p_stars,
    left(btrim(p_comment), 1500),
    nullif(left(btrim(coalesce(p_photo_url, '')), 1000), ''),
    v_phone,
    now()
  )
  returning * into v_testimonial;

  update public.customers
  set has_reviewed = true,
      points = greatest(0, coalesce(points, 0) + v_awarded),
      updated_at = now()
  where id = v_customer.id;

  return jsonb_build_object(
    'testimonial', to_jsonb(v_testimonial),
    'awarded_points', v_awarded,
    'has_reviewed', true
  );
exception
  when unique_violation then
    raise exception 'Este cliente ya publicó una opinión.';
end;
$$;

revoke all on function public.submit_customer_testimonial_v1(text, text, integer, text, text) from public;
revoke all on function public.submit_customer_testimonial_v1(text, text, integer, text, text) from anon;
revoke all on function public.submit_customer_testimonial_v1(text, text, integer, text, text) from authenticated;
grant execute on function public.submit_customer_testimonial_v1(text, text, integer, text, text) to service_role;
