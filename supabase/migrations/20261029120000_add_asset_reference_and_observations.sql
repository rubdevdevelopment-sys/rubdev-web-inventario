alter table public.activos
  add column if not exists numeracion_fisica text,
  add column if not exists observaciones text;
