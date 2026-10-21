'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getApplicationRole } from '@/lib/applicationAccess';
import { supabaseControlHoras as supabase } from '@/lib/supabaseControlHoras';
import * as XLSX from 'xlsx';
import {
  ArrowLeft, ChevronDown, ChevronUp, FileSpreadsheet, Printer, Search
} from 'lucide-react';

type ResumenFuncionario = {
  funcionario_email: string;
  cantidad_registros: number;
  horas_totales: number;
};

type RegistroDetalle = {
  id: string | number;
  funcionario_email: string;
  fecha_registro: string;
  horas_totales_dia: number | null;
  compensado_manana: boolean;
  compensado_tarde: boolean;
  es_actividad_especial: boolean;
  descripcion_actividad: string | null;
};

const TAMANO_PAGINA = 1000;

export default function ReportesControlHoras() {
  const router = useRouter();
  const [resumenFuncionarios, setResumenFuncionarios] = useState<ResumenFuncionario[]>([]);
  const [detalles, setDetalles] = useState<Record<string, RegistroDetalle[]>>({});
  const [detallesAbiertos, setDetallesAbiertos] = useState<Set<string>>(new Set());
  const [detallesCargando, setDetallesCargando] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [errorReporte, setErrorReporte] = useState('');
  const solicitudReporte = useRef(0);

  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const cargarReporte = useCallback(async (desdeFecha: string, hastaFecha: string) => {
    const solicitudActual = ++solicitudReporte.current;
    setLoading(true);
    setErrorReporte('');
    try {
      const { data, error } = await supabase.rpc('control_horas_reporte_resumen', {
        p_periodo_anio: 2026,
        p_fecha_desde: desdeFecha || null,
        p_fecha_hasta: hastaFecha || null
      });
      if (error) throw error;
      if (solicitudActual === solicitudReporte.current) setResumenFuncionarios(data || []);
    } catch (error) {
      console.error('No se pudo cargar el consolidado de Control Horas:', error);
      if (solicitudActual === solicitudReporte.current) {
        setErrorReporte('No fue posible cargar el consolidado. Intenta nuevamente.');
      }
    } finally {
      if (solicitudActual === solicitudReporte.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/controlhoras/login?next=/controlhoras/reportes');
        return;
      }

      try {
        const role = await getApplicationRole(supabase, 'controlhoras', session.user.id);
        if (!role) {
          await supabase.auth.signOut();
          router.replace('/controlhoras/login?next=/controlhoras/reportes');
          return;
        }
        await cargarReporte('', '');
      } catch (error) {
        console.error('No se pudo verificar el acceso a los reportes de Control Horas:', error);
        if (active) router.replace('/controlhoras/login?next=/controlhoras/reportes');
      }
    })();

    return () => {
      active = false;
    };
  }, [cargarReporte, router]);

  function claveDetalle(funcionario: string) {
    return `${funcionario}|${fechaDesde}|${fechaHasta}`;
  }

  async function consultarDetalles(funcionario?: string) {
    const registros: RegistroDetalle[] = [];
    let desde = 0;
    let pagina: RegistroDetalle[];

    do {
      let query = supabase
        .from('control_horas_registros')
        .select('*')
        .eq('periodo_anio', 2026)
        .order('fecha_registro', { ascending: false });

      if (funcionario) query = query.eq('funcionario_email', funcionario);
      if (fechaDesde) query = query.gte('fecha_registro', fechaDesde);
      if (fechaHasta) query = query.lte('fecha_registro', fechaHasta);

      const { data, error } = await query.range(desde, desde + TAMANO_PAGINA - 1);
      if (error) throw error;
      pagina = data || [];
      registros.push(...pagina);
      desde += TAMANO_PAGINA;
    } while (pagina.length === TAMANO_PAGINA);

    return registros;
  }

  async function alternarDetalle(funcionario: string) {
    const key = claveDetalle(funcionario);
    if (detallesAbiertos.has(key)) {
      setDetallesAbiertos((actuales) => {
        const siguientes = new Set(actuales);
        siguientes.delete(key);
        return siguientes;
      });
      return;
    }

    setDetallesAbiertos((actuales) => new Set(actuales).add(key));
    if (detalles[key] || detallesCargando.has(key)) return;

    setDetallesCargando((actuales) => new Set(actuales).add(key));
    setErrorReporte('');
    try {
      const registros = await consultarDetalles(funcionario);
      setDetalles((actuales) => ({ ...actuales, [key]: registros }));
    } catch (error) {
      console.error(`No se pudo cargar el detalle de ${funcionario}:`, error);
      setErrorReporte(`No fue posible cargar el detalle de ${funcionario}. Intenta nuevamente.`);
      setDetallesAbiertos((actuales) => {
        const siguientes = new Set(actuales);
        siguientes.delete(key);
        return siguientes;
      });
    } finally {
      setDetallesCargando((actuales) => {
        const siguientes = new Set(actuales);
        siguientes.delete(key);
        return siguientes;
      });
    }
  }

  const resumenFiltrado = resumenFuncionarios
    .filter((grupo) => {
      const termino = busqueda.toLowerCase();
      if (!termino || grupo.funcionario_email.toLowerCase().includes(termino)) return true;
      const key = claveDetalle(grupo.funcionario_email);
      return (detalles[key] || []).some((registro) =>
        (registro.descripcion_actividad || '').toLowerCase().includes(termino)
      );
    })
    .sort((a, b) => a.funcionario_email.localeCompare(b.funcionario_email));

  const registrosDetalleFiltrados = (registros: RegistroDetalle[], funcionario: string) => {
    const termino = busqueda.toLowerCase();
    if (!termino || funcionario.toLowerCase().includes(termino)) return registros;
    return registros.filter((registro) =>
      (registro.descripcion_actividad || '').toLowerCase().includes(termino)
    );
  };

  const exportarExcel = async () => {
    setExportando(true);
    setErrorReporte('');
    try {
      const registros = (await consultarDetalles()).filter((registro) => {
        const termino = busqueda.toLowerCase();
        return !termino ||
          registro.funcionario_email.toLowerCase().includes(termino) ||
          (registro.descripcion_actividad || '').toLowerCase().includes(termino);
      });
      const dataExcel = registros.map((registro, indice) => ({
        'N°': indice + 1,
        'Funcionario': registro.funcionario_email,
        'Fecha': registro.fecha_registro,
        'Jornada Mañana (7-8 am)': registro.compensado_manana ? 'SI' : 'NO',
        'Jornada Tarde (5-6 pm)': registro.compensado_tarde ? 'SI' : 'NO',
        'Actividad Especial': registro.es_actividad_especial ? 'SI' : 'NO',
        'Horas Compensadas': registro.horas_totales_dia,
        'Descripción / Justificación': registro.descripcion_actividad || 'N/A'
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataExcel);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte_Compensaciones');
      XLSX.writeFile(workbook, 'Reporte_ControlHoras_2026.xlsx');
    } catch (error) {
      console.error('No se pudo exportar el reporte de Control Horas:', error);
      setErrorReporte('No fue posible exportar el reporte. Intenta nuevamente.');
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans print:bg-white print:text-black">
      <div className="w-full bg-[#001f54] py-3 px-6 flex justify-center items-center border-b border-amber-500/30 print:hidden">
        <img src="/header-ejrlb.png" alt="Escuela Judicial" className="h-12 object-contain" />
      </div>

      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4 flex justify-between items-center print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/controlhoras" className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            Reporte Consolidado de Horas Compensadas
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportarExcel}
            disabled={loading || exportando}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition"
          >
            <FileSpreadsheet className="w-4 h-4" /> {exportando ? 'Exportando...' : 'Exportar a Excel'}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition"
          >
            <Printer className="w-4 h-4" /> Imprimir PDF
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden text-xs">
          <div>
            <label className="text-slate-400 mb-1 block">Buscar funcionario o descripción en detalles abiertos</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Filtrar..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 mb-1 block">Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(event) => {
                setFechaDesde(event.target.value);
                void cargarReporte(event.target.value, fechaHasta);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
            />
          </div>

          <div>
            <label className="text-slate-400 mb-1 block">Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(event) => {
                setFechaHasta(event.target.value);
                void cargarReporte(fechaDesde, event.target.value);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
            />
          </div>
        </div>

        {errorReporte && (
          <div role="alert" className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {errorReporte}
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl print:bg-white print:border-none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 print:text-black">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 print:bg-slate-100 print:text-black">
                <tr>
                  <th className="px-6 py-3">N°</th>
                  <th className="px-6 py-3">Funcionario</th>
                  <th className="px-6 py-3">Ingresos</th>
                  <th className="px-6 py-3">Horas totales</th>
                  <th className="px-6 py-3 print:hidden">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-slate-300">
                {!loading && resumenFiltrado.map((grupo, indice) => {
                  const key = claveDetalle(grupo.funcionario_email);
                  const abierto = detallesAbiertos.has(key);
                  const detalleCargando = detallesCargando.has(key);
                  const detalleFiltrado = registrosDetalleFiltrados(detalles[key] || [], grupo.funcionario_email);

                  return (
                    <React.Fragment key={grupo.funcionario_email}>
                      <tr>
                        <td className="px-6 py-3 text-slate-500">{indice + 1}</td>
                        <td className="px-6 py-3 font-medium text-white print:text-black">{grupo.funcionario_email}</td>
                        <td className="px-6 py-3">{grupo.cantidad_registros}</td>
                        <td className="px-6 py-3 font-bold text-emerald-400 print:text-black">+{grupo.horas_totales} hrs</td>
                        <td className="px-6 py-3 print:hidden">
                          <button
                            type="button"
                            onClick={() => void alternarDetalle(grupo.funcionario_email)}
                            aria-expanded={abierto}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-2 text-slate-200 hover:bg-slate-700 transition"
                          >
                            {abierto ? 'Ocultar detalle' : 'Ver detalle'}
                            {abierto ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                        </td>
                      </tr>
                      {abierto && (
                        <tr>
                          <td colSpan={5} className="bg-slate-950/60 px-6 py-4">
                            {detalleCargando ? (
                              <p className="py-3 text-center text-slate-400">Cargando detalle...</p>
                            ) : detalleFiltrado.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-slate-300">
                                  <thead className="text-[10px] uppercase tracking-wider text-slate-500">
                                    <tr>
                                      <th className="px-3 py-2">Fecha</th>
                                      <th className="px-3 py-2">Detalle jornada</th>
                                      <th className="px-3 py-2">Horas</th>
                                      <th className="px-3 py-2">Descripción</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/60">
                                    {detalleFiltrado.map((registro) => (
                                      <tr key={registro.id}>
                                        <td className="px-3 py-2 font-mono">{registro.fecha_registro}</td>
                                        <td className="px-3 py-2">
                                          {registro.es_actividad_especial ? 'Actividad Especial' : 'Jornada Ordinaria'}
                                        </td>
                                        <td className="px-3 py-2 font-bold text-emerald-400">+{registro.horas_totales_dia || 0} hrs</td>
                                        <td className="px-3 py-2 text-slate-400">{registro.descripcion_actividad || 'N/A'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="py-3 text-center text-slate-400">
                                {busqueda ? 'No hay detalles que coincidan con la búsqueda.' : 'No hay registros para este período.'}
                              </p>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Cargando consolidado...</td>
                  </tr>
                )}
                {!loading && resumenFiltrado.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">No hay registros para los filtros seleccionados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <footer className="w-full py-6 border-t border-slate-800 bg-slate-950 text-slate-500 text-xs text-center print:hidden">
        <p>© {new Date().getFullYear()} <strong className="text-slate-300">RubDev.net</strong> ®. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
