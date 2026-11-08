-- Orden financiero · esquema para Supabase (ejecutar en SQL Editor)

create table public.movimientos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fecha       date not null,
  tipo        text not null check (tipo in ('Ingreso','Inversión','Costo','Gasto')),
  descripcion text not null check (length(btrim(descripcion)) > 0),
  monto       numeric(14,2) not null check (monto >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index movimientos_user_fecha_idx on public.movimientos (user_id, fecha);

create table public.parametros (
  user_id         uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  saldo_ahorro    numeric(14,2) not null default 0 check (saldo_ahorro >= 0),
  tasa_anual      numeric(6,3)  not null default 0,
  meses_fondo     int           not null default 3 check (meses_fondo >= 0),
  inversion_auto  boolean       not null default true,
  updated_at      timestamptz   not null default now()
);

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

create trigger movimientos_updated before update on public.movimientos
  for each row execute function public.set_updated_at();
create trigger parametros_updated before update on public.parametros
  for each row execute function public.set_updated_at();

-- Seguridad: cada usuario solo ve y modifica sus propias filas.
alter table public.movimientos enable row level security;
alter table public.parametros  enable row level security;

create policy "movimientos: dueño" on public.movimientos
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "parametros: dueño" on public.parametros
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.movimientos, public.parametros from anon;
grant select, insert, update, delete on public.movimientos, public.parametros to authenticated;
