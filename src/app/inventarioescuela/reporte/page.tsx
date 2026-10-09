'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getApplicationRole } from '@/lib/applicationAccess';
import * as XLSX from 'xlsx';
import {
    ArrowLeft, Search, Printer, FileSpreadsheet
} from 'lucide-react';

export default function ReportePorResponsable() {
    const router = useRouter();
    const [funcionarios, setFuncionarios] = useState<any[]>([]);
    const [selectedFuncionarioId, setSelectedFuncionarioId] = useState('');
    const [funcionarioActual, setFuncionarioActual] = useState<any>(null);
    const [activosResponsable, setActivosResponsable] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchFunc, setSearchFunc] = useState('');
    const [accessChecked, setAccessChecked] = useState(false);

    useEffect(() => {
        let active = true;

        void (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setAccessChecked(true);
                router.replace('/inventarioescuela/login?next=/inventarioescuela/reporte');
                return;
            }

            try {
                const role = await getApplicationRole(supabase, 'inventarioescuela', session.user.id);
                if (role !== 'admin') {
                    await supabase.auth.signOut();
                    setAccessChecked(true);
                    router.replace('/inventarioescuela/login?next=/inventarioescuela/reporte');
                    return;
                }

                const { data, error } = await supabase
                    .from('funcionarios')
                    .select('id, nombre_completo, cedula, dependencia')
                    .order('nombre_completo', { ascending: true });
                if (error) throw error;

                if (active && data?.length) {
                    const funcsUnicos = data.filter((f, index, self) =>
                        index === self.findIndex((t) => t.nombre_completo === f.nombre_completo)
                    );
                    setFuncionarios(funcsUnicos);
                    setSelectedFuncionarioId(funcsUnicos[0].id);
                }
            } catch (error) {
                console.error('No se pudo verificar el acceso al reporte de Inventarios:', error);
                if (active) router.replace('/inventarioescuela/login?next=/inventarioescuela/reporte');
            } finally {
                if (active) setAccessChecked(true);
            }
        })();

        return () => {
            active = false;
        };
    }, [router]);

    useEffect(() => {
        if (!selectedFuncionarioId) return;

        const fetchActivosResponsable = async () => {
            setLoading(true);

            const func = funcionarios.find(f => f.id === selectedFuncionarioId);
            setFuncionarioActual(func);

            const { data } = await supabase
                .from('activos')
                .select(`
          *,
          categorias (nombre)
        `)
                .eq('funcionario_id', selectedFuncionarioId)
                .neq('estado_activo', 'ALMACEN')
                .order('descripcion', { ascending: true });

            if (data) setActivosResponsable(data);
            setLoading(false);
        };

        fetchActivosResponsable();
    }, [selectedFuncionarioId, funcionarios]);

    const exportarAExcel = () => {
        if (!funcionarioActual || activosResponsable.length === 0) {
            alert('No hay activos para exportar en este reporte.');
            return;
        }

        const datosExcel = activosResponsable.map((item, index) => ({
            'N°': index + 1,
            'Placa / Código': item.placa,
            'Código Contable': item.codigo_contable || 'S.C.',
            'Descripción del Activo': item.descripcion,
            'Marca': item.marca || 'N/A',
            'Modelo': item.modelo || 'N/A',
            'Serie': item.serie || 'N/A',
            'Categoría': item.categorias?.nombre || 'General',
            'Ubicación': item.ubicacion_actual,
            'Estado': item.estado_activo === 'DEVOLUCION' ? 'DEVOLUCIÓN' : item.estado_activo,
            'Valor Comercial ($)': item.valor || 0,
            'Documento Ingreso': item.num_documento || 'S.R.'
        }));

        const worksheet = XLSX.utils.json_to_sheet(datosExcel);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Cartera de Activos');

        const nombreLimpio = funcionarioActual.nombre_completo.replace(/[^a-zA-Z0-9 ]/g, '').trim();
        XLSX.writeFile(workbook, `Reporte_Inventario_${nombreLimpio}.xlsx`);
    };

    const funcionariosFiltrados = funcionarios.filter(f =>
        f.nombre_completo.toLowerCase().includes(searchFunc.toLowerCase())
    );

    const totalItems = activosResponsable.length;
    const valorTotal = activosResponsable.reduce((acc, item) => acc + (item.valor || 0), 0);
    const enServicio = activosResponsable.filter(a => a.estado_activo === 'EN_SERVICIO').length;
    const devoluciones = activosResponsable.filter(a => a.estado_activo === 'DEVOLUCION').length;

    if (!accessChecked) {
        return (
            <main className="min-h-screen bg-slate-950 flex items-center justify-center text-sm text-slate-400">
                Verificando permisos de Inventarios...
            </main>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col print:bg-white print:text-black">
            {/* Header Institucional Superior Adaptable */}
            <div className="w-full bg-[#001f54] border-b border-slate-800 px-4 sm:px-6 py-3 flex justify-center items-center print:hidden">
                <img
                    src="/header-ejrlb.png"
                    alt="Rama Judicial - Escuela Judicial Rodrigo Lara Bonilla"
                    className="h-9 sm:h-12 md:h-16 object-contain max-w-full"
                />
            </div>

            <header className="border-b border-slate-800 bg-slate-900 px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <Link href="/inventario" className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition shrink-0">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="font-bold text-base sm:text-lg text-slate-100">RubDev Asset Manager</h1>
                        <p className="text-xs text-slate-400">Reporte Consolidado por Servidor Responsable</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
                    <button
                        onClick={exportarAExcel}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-emerald-500/20"
                    >
                        <FileSpreadsheet className="w-4 h-4 shrink-0" />
                        <span>Excel (.xlsx)</span>
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-blue-500/20"
                    >
                        <Printer className="w-4 h-4 shrink-0" />
                        <span>Imprimir PDF</span>
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto w-full p-4 sm:p-8 flex-1">
                {/* Selector de Servidor */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 mb-6 sm:mb-8 print:hidden">
                    <label className="block text-xs font-medium text-slate-400 mb-2">
                        Seleccionar Servidor Responsable:
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Filtrar lista de servidores..."
                                value={searchFunc}
                                onChange={(e) => setSearchFunc(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <select
                            value={selectedFuncionarioId}
                            onChange={(e) => setSelectedFuncionarioId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-semibold"
                        >
                            {funcionariosFiltrados.map((f) => (
                                <option key={f.id} value={f.id}>
                                    {f.nombre_completo}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Ficha e Impresión */}
                {funcionarioActual && (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl print:bg-white print:border-none print:shadow-none mb-8">
                        {/* Header de impresión */}
                        <div className="hidden print:block mb-6">
                            <img
                                src="/header-ejrlb.png"
                                alt="Rama Judicial - Escuela Judicial Rodrigo Lara Bonilla"
                                className="w-full h-auto object-contain"
                            />
                        </div>

                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 print:border-slate-300 pb-6 mb-6 gap-4">
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 print:text-blue-700">
                                    Acta de Inventario Individual · RubDev Asset Manager
                                </span>
                                <h2 className="text-xl sm:text-2xl font-bold text-slate-100 print:text-black mt-1">
                                    {funcionarioActual.nombre_completo}
                                </h2>
                                <p className="text-xs sm:text-sm text-slate-400 print:text-slate-600">
                                    Dependencia: <strong className="text-slate-200 print:text-black">{funcionarioActual.dependencia || 'CONSEJO SUPERIOR DE LA JUDICATURA'}</strong>
                                </p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto print:hidden">
                                <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl text-center">
                                    <p className="text-[10px] text-slate-400 uppercase">Total Ítems</p>
                                    <p className="text-lg font-bold text-blue-400">{totalItems}</p>
                                </div>
                                <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl text-center">
                                    <p className="text-[10px] text-slate-400 uppercase">En Servicio</p>
                                    <p className="text-lg font-bold text-emerald-400">{enServicio}</p>
                                </div>
                                <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl text-center">
                                    <p className="text-[10px] text-slate-400 uppercase">Devoluciones</p>
                                    <p className="text-lg font-bold text-rose-400">{devoluciones}</p>
                                </div>
                                <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl text-center">
                                    <p className="text-[10px] text-slate-400 uppercase">Valor Total</p>
                                    <p className="text-sm sm:text-base font-bold text-slate-100">${valorTotal.toLocaleString('es-CO')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="w-full overflow-x-auto">
                            <table className="w-full text-left text-sm min-w-[700px] print:min-w-full print:text-xs">
                                <thead className="bg-slate-950/80 print:bg-slate-100 text-slate-400 print:text-black text-xs uppercase tracking-wider border-b border-slate-800 print:border-slate-300">
                                    <tr>
                                        <th className="py-3 px-3">N°</th>
                                        <th className="py-3 px-3">Placa / Código</th>
                                        <th className="py-3 px-3">Descripción del Bien</th>
                                        <th className="py-3 px-3">Marca / Modelo / Serie</th>
                                        <th className="py-3 px-3">Ubicación</th>
                                        <th className="py-3 px-3">Estado</th>
                                        <th className="py-3 px-3 text-right">Valor COP</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 print:divide-slate-300">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className="py-8 text-center text-slate-500">
                                                Cargando cartera del servidor...
                                            </td>
                                        </tr>
                                    ) : activosResponsable.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-8 text-center text-slate-500">
                                                Este servidor no tiene activos asignados actualmente.
                                            </td>
                                        </tr>
                                    ) : (
                                        activosResponsable.map((item, idx) => (
                                            <tr key={item.id} className="hover:bg-slate-800/40 print:hover:bg-transparent">
                                                <td className="py-3 px-3 text-slate-500 print:text-black">{idx + 1}</td>
                                                <td className="py-3 px-3 whitespace-nowrap">
                                                    <span className="font-mono font-bold text-blue-400 print:text-black block">{item.placa}</span>
                                                    <span className="text-[10px] text-slate-500 print:text-slate-600">{item.codigo_contable || 'S.C.'}</span>
                                                </td>
                                                <td className="py-3 px-3 font-medium text-slate-200 print:text-black max-w-xs">
                                                    {item.descripcion}
                                                </td>
                                                <td className="py-3 px-3 text-xs text-slate-400 print:text-slate-800 whitespace-nowrap">
                                                    <div>{item.marca || 'N/A'} {item.modelo ? `- ${item.modelo}` : ''}</div>
                                                    <div className="font-mono text-[10px] text-slate-500 print:text-slate-600">S/N: {item.serie || 'S.S.'}</div>
                                                </td>
                                                <td className="py-3 px-3 text-xs text-slate-400 print:text-slate-800 whitespace-nowrap">
                                                    {item.ubicacion_actual}
                                                </td>
                                                <td className="py-3 px-3 whitespace-nowrap">
                                                    <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-medium ${item.estado_activo === 'EN_SERVICIO' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 print:bg-transparent print:text-black' :
                                                            item.estado_activo === 'DEVOLUCION' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 print:bg-transparent print:text-black' :
                                                                'bg-amber-500/10 text-amber-400 border border-amber-500/20 print:bg-transparent print:text-black'
                                                        }`}>
                                                        {item.estado_activo === 'DEVOLUCION' ? 'Devolución' : item.estado_activo}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono text-slate-300 print:text-black whitespace-nowrap">
                                                    ${(item.valor || 0).toLocaleString('es-CO')}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Firmas en acta física */}
                        <div className="hidden print:grid grid-cols-2 gap-12 mt-16 pt-8 border-t border-slate-300 text-xs">
                            <div className="text-center">
                                <div className="border-b border-black mb-2 h-12"></div>
                                <p className="font-bold">{funcionarioActual.nombre_completo}</p>
                                <p className="text-slate-600">Servidor Responsable / Custodio</p>
                            </div>

                            <div className="text-center">
                                <div className="border-b border-black mb-2 h-12"></div>
                                <p className="font-bold">RUBÉN DARÍO MONROY LEÓN</p>
                                <p className="text-slate-600">División Académica / Inventarios</p>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Pie de Página */}
            <footer className="w-full py-6 border-t border-slate-800/80 bg-slate-950 text-slate-500 text-xs text-center print:border-slate-300 print:text-black print:bg-white">
                <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
                    <p className="font-medium">
                        Rama Judicial · Consejo Superior de la Judicatura · Escuela Judicial "Rodrigo Lara Bonilla"
                    </p>
                    <p className="font-mono text-[11px] text-slate-400 print:text-black">
                        © {new Date().getFullYear()} <strong className="text-slate-200 print:text-black">RubDev.net</strong> ®. Todos los derechos reservados.
                    </p>
                </div>
            </footer>
        </div>
    );
}