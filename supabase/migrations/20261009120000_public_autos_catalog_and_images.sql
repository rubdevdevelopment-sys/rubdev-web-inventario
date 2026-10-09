do $$
declare
  configured_admin_id uuid;
  table_name text;
  policy_name text;
begin
  select id
  into configured_admin_id
  from auth.users
  where lower(email) = 'rmonroyl@cendoj.ramajudicial.gov.co'
  limit 1;

  if configured_admin_id is null then
    raise exception 'The authorized Autos administrator must exist in Supabase Auth before applying this migration.';
  end if;

  if not exists (
    select 1
    from storage.buckets
    where id = 'autos_galeria'
  ) then
    raise exception 'Required storage bucket autos_galeria does not exist.';
  end if;

  update public.app_user_access
  set role = 'user'
  where application = 'autos'
    and user_id <> configured_admin_id;

  insert into public.app_user_access (application, user_id, role)
  values ('autos', configured_admin_id, 'admin')
  on conflict (application, user_id) do update
    set role = excluded.role;

  foreach table_name in array array['autos_catalogo_maestro', 'autos_mi_coleccion'] loop
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

create policy "Autos admins can manage collection"
  on public.autos_mi_coleccion
  for all
  to authenticated
  using ((select public.has_app_role('autos', array['admin']::text[])))
  with check ((select public.has_app_role('autos', array['admin']::text[])));

revoke all on table public.autos_catalogo_maestro from public, anon, authenticated;
grant select on table public.autos_catalogo_maestro to anon, authenticated;
grant insert, update, delete on table public.autos_catalogo_maestro to authenticated;

revoke all on table public.autos_mi_coleccion from public, anon, authenticated;
grant select, insert, update, delete on table public.autos_mi_coleccion to authenticated;

update storage.buckets
set public = true
where id = 'autos_galeria';

drop policy if exists "Anyone can read autos gallery images" on storage.objects;
create policy "Anyone can read autos gallery images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'autos_galeria');

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

notify pgrst, 'reload schema';
