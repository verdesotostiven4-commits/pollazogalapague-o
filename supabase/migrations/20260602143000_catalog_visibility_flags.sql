-- Catálogo Maestro: separar visibilidad para app cliente y caja/POS.
-- Seguro/idempotente: no borra datos.

alter table public.products
  add column if not exists show_in_app boolean not null default true,
  add column if not exists show_in_pos boolean not null default true;

update public.products
set show_in_app = coalesce(show_in_app, true),
    show_in_pos = coalesce(show_in_pos, true),
    updated_at = now()
where show_in_app is null
   or show_in_pos is null;

create index if not exists idx_products_show_in_app on public.products(show_in_app);
create index if not exists idx_products_show_in_pos on public.products(show_in_pos);

comment on column public.products.show_in_app is 'Indica si el producto aparece en la app del cliente.';
comment on column public.products.show_in_pos is 'Indica si el producto aparece en la caja/POS del local.';
