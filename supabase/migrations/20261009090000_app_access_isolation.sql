create table if not exists public.app_user_access (
  application text not null check (application in ('autos', 'inventarioescuela', 'controlhoras')),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  primary key (application, user_id)
);

alter table public.app_user_access enable row level security;

drop policy if exists "Users can read their own app access" on public.app_user_access;
create policy "Users can read their own app access"
  on public.app_user_access
  for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.app_user_access from anon, authenticated;
grant select on public.app_user_access to authenticated;

create or replace function public.has_app_role(
  requested_application text,
  allowed_roles text[] default array['user', 'admin']::text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.app_user_access app_access
    where app_access.application = requested_application
      and app_access.user_id = (select auth.uid())
      and app_access.role = any (allowed_roles)
  );
$$;

revoke all on function public.has_app_role(text, text[]) from public, anon;
grant execute on function public.has_app_role(text, text[]) to anon, authenticated;

do $$
declare
  configured_admin_id uuid;
begin
  select id into configured_admin_id
  from auth.users
  where lower(email) = 'rmonroyl@cendoj.ramajudicial.gov.co'
  limit 1;

  if configured_admin_id is null then
    raise exception 'Create the primary administrator in Supabase Auth before applying this migration.';
  end if;

  insert into public.app_user_access (application, user_id, role)
  select
    'controlhoras',
    auth_user.id,
    case when bool_or(metas.es_admin) then 'admin' else 'user' end
  from public.control_horas_metas metas
  join auth.users auth_user on lower(auth_user.email) = lower(metas.funcionario_email)
  where metas.periodo_anio = 2026
  group by auth_user.id
  on conflict (application, user_id) do update set role = excluded.role;

  insert into public.app_user_access (application, user_id, role)
  values
    ('autos', configured_admin_id, 'admin'),
    ('inventarioescuela', configured_admin_id, 'admin'),
    ('controlhoras', configured_admin_id, 'admin')
  on conflict (application, user_id) do update set role = excluded.role;
end;
$$;

do $$
declare
  table_name text;
  policy_name text;
  application_tables constant text[] := array[
    'autos_catalogo_maestro',
    'autos_mi_coleccion',
    'activos',
    'categorias',
    'funcionarios',
    'movimientos_activos',
    'control_horas_metas',
    'control_horas_registros'
  ];
begin
  foreach table_name in array application_tables loop
    if to_regclass(format('public.%I', table_name)) is null then
      raise exception 'Required application table public.% does not exist.', table_name;
    end if;

    for policy_name in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = table_name
    loop
      execute format('drop policy %I on public.%I', policy_name, table_name);
    end loop;

    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

do $$
declare
  target_function record;
begin
  for target_function in
    select
      namespace.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as identity_arguments
    from pg_proc p
    join pg_namespace namespace on namespace.oid = p.pronamespace
    where namespace.nspname = 'public'
      and p.proname = 'admin_cambiar_password_funcionario'
  loop
    execute format(
      'revoke execute on function %I.%I(%s) from public, anon, authenticated',
      target_function.schema_name,
      target_function.function_name,
      target_function.identity_arguments
    );
  end loop;
end;
$$;

create policy "Anyone can read autos catalog"
  on public.autos_catalogo_maestro
  for select
  to anon, authenticated
  using (true);

create policy "Autos admins can manage catalog"
  on public.autos_catalogo_maestro
  for all
  to authenticated
  using ((select public.has_app_role('autos', array['admin']::text[])))
  with check ((select public.has_app_role('autos', array['admin']::text[])));

create policy "Autos admins can access collection"
  on public.autos_mi_coleccion
  for all
  to authenticated
  using ((select public.has_app_role('autos', array['admin']::text[])))
  with check ((select public.has_app_role('autos', array['admin']::text[])));

create policy "Inventory admins can access assets"
  on public.activos
  for all
  to authenticated
  using ((select public.has_app_role('inventarioescuela', array['admin']::text[])))
  with check ((select public.has_app_role('inventarioescuela', array['admin']::text[])));

create policy "Inventory admins can access categories"
  on public.categorias
  for all
  to authenticated
  using ((select public.has_app_role('inventarioescuela', array['admin']::text[])))
  with check ((select public.has_app_role('inventarioescuela', array['admin']::text[])));

create policy "Inventory admins can access employees"
  on public.funcionarios
  for all
  to authenticated
  using ((select public.has_app_role('inventarioescuela', array['admin']::text[])))
  with check ((select public.has_app_role('inventarioescuela', array['admin']::text[])));

create policy "Inventory admins can access asset movements"
  on public.movimientos_activos
  for all
  to authenticated
  using ((select public.has_app_role('inventarioescuela', array['admin']::text[])))
  with check ((select public.has_app_role('inventarioescuela', array['admin']::text[])));

create policy "Control Hours users can read own target"
  on public.control_horas_metas
  for select
  to authenticated
  using (
    (select public.has_app_role('controlhoras'))
    and (
      lower(funcionario_email) = lower((select auth.jwt() ->> 'email'))
      or (select public.has_app_role('controlhoras', array['admin']::text[]))
    )
  );

create policy "Control Hours admins can manage targets"
  on public.control_horas_metas
  for all
  to authenticated
  using ((select public.has_app_role('controlhoras', array['admin']::text[])))
  with check ((select public.has_app_role('controlhoras', array['admin']::text[])));

create policy "Control Hours users can read own records"
  on public.control_horas_registros
  for select
  to authenticated
  using (
    (select public.has_app_role('controlhoras'))
    and (
      lower(funcionario_email) = lower((select auth.jwt() ->> 'email'))
      or (select public.has_app_role('controlhoras', array['admin']::text[]))
    )
  );

create policy "Control Hours users can manage own records"
  on public.control_horas_registros
  for all
  to authenticated
  using (
    (select public.has_app_role('controlhoras'))
    and (
      lower(funcionario_email) = lower((select auth.jwt() ->> 'email'))
      or (select public.has_app_role('controlhoras', array['admin']::text[]))
    )
  )
  with check (
    (select public.has_app_role('controlhoras'))
    and (
      lower(funcionario_email) = lower((select auth.jwt() ->> 'email'))
      or (select public.has_app_role('controlhoras', array['admin']::text[]))
    )
  );

create or replace function public.require_inventory_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and not public.has_app_role('inventarioescuela', array['admin']::text[]) then
    raise exception 'Solo un administrador de Inventarios puede modificar estos datos.'
      using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.require_inventory_admin() from public, anon, authenticated;

drop trigger if exists "require_inventory_admin_on_assets" on public.activos;
create trigger "require_inventory_admin_on_assets"
  before insert or update or delete on public.activos
  for each row execute function public.require_inventory_admin();

drop trigger if exists "require_inventory_admin_on_employees" on public.funcionarios;
create trigger "require_inventory_admin_on_employees"
  before insert or update or delete on public.funcionarios
  for each row execute function public.require_inventory_admin();

drop trigger if exists "require_inventory_admin_on_movements" on public.movimientos_activos;
create trigger "require_inventory_admin_on_movements"
  before insert or update or delete on public.movimientos_activos
  for each row execute function public.require_inventory_admin();

drop policy if exists "Autos admin upload gallery images" on storage.objects;
create policy "Autos admin upload gallery images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'autos_galeria'
    and (select public.has_app_role('autos', array['admin']::text[]))
  );

drop policy if exists "Autos admin update gallery images" on storage.objects;
create policy "Autos admin update gallery images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'autos_galeria'
    and (select public.has_app_role('autos', array['admin']::text[]))
  )
  with check (
    bucket_id = 'autos_galeria'
    and (select public.has_app_role('autos', array['admin']::text[]))
  );

drop policy if exists "Autos admin delete gallery images" on storage.objects;
create policy "Autos admin delete gallery images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'autos_galeria'
    and (select public.has_app_role('autos', array['admin']::text[]))
  );

drop policy if exists "Restrict autos gallery uploads to autos admins" on storage.objects;
create policy "Restrict autos gallery uploads to autos admins"
  on storage.objects
  as restrictive
  for insert
  to public
  with check (
    bucket_id <> 'autos_galeria'
    or (select public.has_app_role('autos', array['admin']::text[]))
  );

drop policy if exists "Restrict autos gallery updates to autos admins" on storage.objects;
create policy "Restrict autos gallery updates to autos admins"
  on storage.objects
  as restrictive
  for update
  to public
  using (
    bucket_id <> 'autos_galeria'
    or (select public.has_app_role('autos', array['admin']::text[]))
  )
  with check (
    bucket_id <> 'autos_galeria'
    or (select public.has_app_role('autos', array['admin']::text[]))
  );

drop policy if exists "Restrict autos gallery deletes to autos admins" on storage.objects;
create policy "Restrict autos gallery deletes to autos admins"
  on storage.objects
  as restrictive
  for delete
  to public
  using (
    bucket_id <> 'autos_galeria'
    or (select public.has_app_role('autos', array['admin']::text[]))
  );
