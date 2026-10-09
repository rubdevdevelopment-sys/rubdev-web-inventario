'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getApplicationRole } from '@/lib/applicationAccess';
import { supabaseControlHoras as supabase } from '@/lib/supabaseControlHoras';
import * as XLSX from 'xlsx';
import {
  ArrowLeft, FileSpreadsheet, Printer, Search, Calendar
} from 'lucide-react';

export default function ReportesControlHoras() {
  const router = useRouter();
  const [registros, setRegistros] = useState<any[]>([]);
  const [metas, setMetas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessChecked, setAccessChecked] = useState(false);

  // Filtros
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    let active = true;

    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setAccessChecked(true);
        router.replace('/controlhoras/login?next=/controlhoras/reportes');
        return;
      }

      try {
        const role = await getApplicationRole(supabase, 'controlhoras', session.user.id);
        if (!role) {
          await supabase.auth.signOut();
          setAccessChecked(true);
          router.replace('/controlhoras/login?next=/controlhoras/reportes');
          return;
        }
        await cargarReporte();
      } catch (error) {
        console.error('No se pudo verificar el acceso a los reportes de Control Horas:', error);
        if (active) router.replace('/controlhoras/login?next=/controlhoras/reportes');
      } finally {
        if (active) setAccessChecked(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [router]);

  async function cargarReporte() {
    setLoading(true);
    const { data: metasData } = await supabase.from('control_horas_metas').select('*').eq('periodo_anio', 2026);
    if (metasData) setMetas(metasData);

    const { data: regData } = await supabase.from('control_horas_registros').select('*').eq('periodo_anio', 2026).order('fecha_registro', { ascending: false });
    if (regData) setRegistros(regData);

    setLoading(false);
  }

  const registrosFiltrados = registros.filter((reg) => {
    const coincideBusqueda = reg.funcionario_email.toLowerCase().includes(busqueda.toLowerCase()) ||
      (reg.descripcion_actividad && reg.descripcion_actividad.toLowerCase().includes(busqueda.toLowerCase()));

    const coincideDesde = !fechaDesde || reg.fecha_registro >= fechaDesde;
    const coincideHasta = !fechaHasta || reg.fecha_registro <= fechaHasta;

    return coincideBusqueda && coincideDesde && coincideHasta;
  });

  const exportarExcel = () => {
    const dataExcel = registrosFiltrados.map((r, i) => ({
      'N°': i + 1,
      'Funcionario': r.funcionario_email,
      'Fecha': r.fecha_registro,
      'Jornada Mañana (7-8 am)': r.compensado_manana ? 'SI' : 'NO',
      'Jornada Tarde (5-6 pm)': r.compensado_tarde ? 'SI' : 'NO',
      'Actividad Especial': r.es_actividad_especial ? 'SI' : 'NO',
      'Horas Compensadas': r.horas_totales_dia,
      'Descripción / Justificación': r.descripcion_actividad || 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte_Compensaciones');
    XLSX.writeFile(workbook, `Reporte_ControlHoras_2026.xlsx`);
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
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition"
          >
            <FileSpreadsheet className="w-4 h-4" /> Exportar a Excel
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
            <label className="text-slate-400 mb-1 block">Buscar por Funcionario / Descripción</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
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
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
            />
          </div>

          <div>
            <label className="text-slate-400 mb-1 block">Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
            />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl print:bg-white print:border-none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 print:text-black">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 print:bg-slate-100 print:text-black">
                <tr>
                  <th className="px-6 py-3">N°</th>
                  <th className="px-6 py-3">Funcionario</th>
                  <th className="px-6 py-3">Fecha</th>
                  <th className="px-6 py-3">Detalle Jornada</th>
                  <th className="px-6 py-3">Horas</th>
                  <th className="px-6 py-3">Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-slate-300">
                {registrosFiltrados.map((reg, idx) => (
                  <tr key={reg.id}>
                    <td className="px-6 py-3 text-slate-500">{idx + 1}</td>
                    <td className="px-6 py-3 font-medium text-white print:text-black">{reg.funcionario_email}</td>
                    <td className="px-6 py-3 font-mono">{reg.fecha_registro}</td>
                    <td className="px-6 py-3">
                      {reg.es_actividad_especial ? 'Actividad Especial' : 'Jornada Ordinaria'}
                    </td>
                    <td className="px-6 py-3 font-bold text-emerald-400 print:text-black">+{reg.horas_totales_dia} hrs</td>
                    <td className="px-6 py-3 text-slate-400 print:text-slate-800">{reg.descripcion_actividad || 'N/A'}</td>
                  </tr>
                ))}
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