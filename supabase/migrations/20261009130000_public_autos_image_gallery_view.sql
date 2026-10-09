create or replace view public.autos_imagenes_publicas
  with (security_barrier = true)
as
  select catalogo_id, foto_auto_real_url, foto_mi_pieza_url
  from public.autos_mi_coleccion
  where nullif(trim(foto_auto_real_url), '') is not null
     or nullif(trim(foto_mi_pieza_url), '') is not null;

revoke all on public.autos_imagenes_publicas from public;
grant select on public.autos_imagenes_publicas to anon, authenticated;

notify pgrst, 'reload schema';
