do $$
declare
  authorized_admins constant text[] := array[
    'rmonroyl@cendoj.ramajudicial.gov.co',
    'ojulesa@cendoj.ramajudicial.gov.co'
  ];
  existing_admin_count integer;
begin
  select count(distinct id)
  into existing_admin_count
  from auth.users
  where lower(email) = any (authorized_admins);

  if existing_admin_count <> cardinality(authorized_admins) then
    raise exception 'Both authorized Inventory administrators must exist in Supabase Auth before applying this migration.';
  end if;

  update public.app_user_access
  set role = 'user'
  where application = 'inventarioescuela'
    and user_id not in (
      select id
      from auth.users
      where lower(email) = any (authorized_admins)
    );

  insert into public.app_user_access (application, user_id, role)
  select 'inventarioescuela', id, 'admin'
  from auth.users
  where lower(email) = any (authorized_admins)
  on conflict (application, user_id) do update
    set role = excluded.role;
end;
$$;

do $$
declare
  table_name text;
  policy_name text;
  inventory_tables constant text[] := array[
    'activos',
    'categorias',
    'funcionarios',
    'movimientos_activos'
  ];
begin
  foreach table_name in array inventory_tables loop
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

create policy "Public can read inventory assets"
  on public.activos
  for select
  to anon, authenticated
  using (true);

create policy "Inventory admins can manage assets"
  on public.activos
  for all
  to authenticated
  using ((select public.has_app_role('inventarioescuela', array['admin']::text[])))
  with check ((select public.has_app_role('inventarioescuela', array['admin']::text[])));

create policy "Public can read inventory categories"
  on public.categorias
  for select
  to anon, authenticated
  using (true);

create policy "Inventory admins can manage categories"
  on public.categorias
  for all
  to authenticated
  using ((select public.has_app_role('inventarioescuela', array['admin']::text[])))
  with check ((select public.has_app_role('inventarioescuela', array['admin']::text[])));

create policy "Public can read inventory employee names"
  on public.funcionarios
  for select
  to anon, authenticated
  using (true);

create policy "Inventory admins can manage employees"
  on public.funcionarios
  for all
  to authenticated
  using ((select public.has_app_role('inventarioescuela', array['admin']::text[])))
  with check ((select public.has_app_role('inventarioescuela', array['admin']::text[])));

create policy "Public can read inventory movements"
  on public.movimientos_activos
  for select
  to anon, authenticated
  using (true);

create policy "Inventory admins can manage movements"
  on public.movimientos_activos
  for all
  to authenticated
  using ((select public.has_app_role('inventarioescuela', array['admin']::text[])))
  with check ((select public.has_app_role('inventarioescuela', array['admin']::text[])));

revoke all on table public.activos, public.categorias, public.funcionarios, public.movimientos_activos
  from public, anon, authenticated;

grant select on table public.activos, public.categorias, public.movimientos_activos
  to anon, authenticated;

grant insert, update, delete on table public.activos, public.categorias, public.funcionarios, public.movimientos_activos
  to authenticated;

grant select (id, nombre_completo) on table public.funcionarios
  to anon, authenticated;

create or replace view public.funcionarios_publicos
  with (security_barrier = true)
as
  select id, nombre_completo, dependencia
  from public.funcionarios;

create or replace view public.funcionarios_admin
  with (security_barrier = true)
as
  select id, cedula, nombre_completo, dependencia
  from public.funcionarios
  where public.has_app_role('inventarioescuela', array['admin']::text[]);

revoke all on public.funcionarios_publicos, public.funcionarios_admin from public;
grant select on public.funcionarios_publicos to anon, authenticated;
grant select on public.funcionarios_admin to authenticated;

notify pgrst, 'reload schema';
