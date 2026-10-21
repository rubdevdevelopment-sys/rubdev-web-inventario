create or replace function public.control_horas_reporte_resumen(
  p_periodo_anio integer,
  p_fecha_desde date default null,
  p_fecha_hasta date default null
)
returns table (
  funcionario_email text,
  cantidad_registros bigint,
  horas_totales numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    registros.funcionario_email::text,
    count(*)::bigint,
    coalesce(sum(registros.horas_totales_dia), 0)::numeric
  from public.control_horas_registros as registros
  where registros.periodo_anio = p_periodo_anio
    and (p_fecha_desde is null or registros.fecha_registro >= p_fecha_desde)
    and (p_fecha_hasta is null or registros.fecha_registro <= p_fecha_hasta)
  group by registros.funcionario_email
  order by registros.funcionario_email;
$$;

revoke all on function public.control_horas_reporte_resumen(integer, date, date) from public, anon;
grant execute on function public.control_horas_reporte_resumen(integer, date, date) to authenticated;
