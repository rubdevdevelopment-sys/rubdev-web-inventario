'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
    Search, ShieldCheck, Wrench, Package,
    ArrowLeft, QrCode, RefreshCw, Undo2, Plus, X,
    FileSpreadsheet, Lock, LogOut
} from 'lucide-react';

interface Activo {
    id: string;
    codigo_contable: string;
    descripcion: string;
    placa: string;
    serie: string | null;
    marca: string | null;
    modelo: string | null;
    valor: number;
    ubicacion_actual: string;
    estado_activo: string;
    num_documento?: string;
    tipo_documento?: string;
    categorias?: { id: string; nombre: string };
    funcionarios?: { id: string; nombre_completo: string };
}

export default function InventarioDashboard() {
    const [session, setSession] = useState<any>(null);
    const [activos, setActivos] = useState<Activo[]>([]);
    const [categorias, setCategorias] = useState<any[]>([]);
    const [funcionarios, setFuncionarios] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoriaFilter, setCategoriaFilter] = useState('TODAS');
    const [estadoFilter, setEstadoFilter] = useState('TODOS');

    // Estados del Modal "Nuevo Activo"
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [savingNew, setSavingNew] = useState(false);

    // Formulario del nuevo activo
    const [newPlaca, setNewPlaca] = useState('');
    const [newCodigo, setNewCodigo] = useState('');
    const [newDescripcion, setNewDescripcion] = useState('');
    const [newMarca, setNewMarca] = useState('');
    const [newModelo, setNewModelo] = useState('');
    const [newSerie, setNewSerie] = useState('');
    const [newValor, setNewValor] = useState('');
    const [newCategoriaId, setNewCategoriaId] = useState('');
    const [newFuncionarioId, setNewFuncionarioId] = useState('');
    const [newUbicacion, setNewUbicacion] = useState('Escuela Judicial Rodrigo Lara Bonilla');
    const [newEstado, setNewEstado] = useState('EN_SERVICIO');
    const [newNumDoc, setNewNumDoc] = useState('');
    const [newTipoDoc, setNewTipoDoc] = useState('TC');

    // Validar Estado de Sesión en Supabase
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Cargar datos por lotes acumulativos (Paginación de 1000)
    const fetchActivos = async () => {
        setLoading(true);
        let todosLosActivos: Activo[] = [];
        let desde = 0;
        const paso = 1000;
        let hayMas = true;

        try {
            while (hayMas) {
                const { data, error } = await supabase
                    .from('activos')
                    .select(`
            *,
            categorias (id, nombre),
            funcionarios (id, nombre_completo)
          `)
                    .range(desde, desde + paso - 1)
                    .order('created_at', { ascending: false });

                if (error) break;

                if (data && data.length > 0) {
                    todosLosActivos = [...todosLosActivos, ...data];
                    desde += paso;
                    if (data.length < paso) hayMas = false;
                } else {
                    hayMas = false;
                }
            }

            setActivos(todosLosActivos);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Cargar Categorías y Funcionarios
    const fetchAuxiliares = async () => {
        const { data: catData } = await supabase.from('categorias').select('*').order('nombre');
        if (catData) {
            const catsUnicas = catData.filter((c, index, self) =>
                index === self.findIndex((t) => t.nombre === c.nombre)
            );
            setCategorias(catsUnicas);
            if (catsUnicas.length > 0) setNewCategoriaId(catsUnicas[0].id);
        }

        const { data: funcData } = await supabase.from('funcionarios').select('id, nombre_completo').order('nombre_completo');
        if (funcData) {
            const funcsUnicos = funcData.filter((f, index, self) =>
                index === self.findIndex((t) => t.nombre_completo === f.nombre_completo)
            );
            setFuncionarios(funcsUnicos);
            if (funcsUnicos.length > 0) setNewFuncionarioId(funcsUnicos[0].id);
        }
    };

    useEffect(() => {
        fetchActivos();
        fetchAuxiliares();
    }, []);

    // Guardar Nuevo Activo
    const handleCrearActivo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session) return alert('Debes iniciar sesión como administrador.');

        setSavingNew(true);

        try {
            const { data: placaExistente } = await supabase
                .from('activos')
                .select('id')
                .eq('placa', newPlaca.trim())
                .maybeSingle();

            if (placaExistente) {
                alert(`⚠️ La placa "${newPlaca.trim()}" ya se encuentra registrada.`);
                setSavingNew(false);
                return;
            }

            const { error } = await supabase.from('activos').insert({
                placa: newPlaca.trim(),
                codigo_contable: newCodigo.trim() || null,
                descripcion: newDescripcion.trim().toUpperCase(),
                marca: newMarca.trim().toUpperCase() || null,
                modelo: newModelo.trim().toUpperCase() || null,
                serie: newSerie.trim() || null,
                valor: newValor ? parseFloat(newValor) : 0,
                categoria_id: newCategoriaId || null,
                funcionario_id: newFuncionarioId || null,
                ubicacion_actual: newUbicacion.trim(),
                estado_activo: newEstado,
                num_documento: newNumDoc.trim() || null,
                tipo_documento: newTipoDoc
            });

            if (error) {
                alert(`Error al guardar el activo: ${error.message}`);
            } else {
                alert('✅ Nuevo activo registrado exitosamente.');
                setIsCreateModalOpen(false);
                setNewPlaca('');
                setNewCodigo('');
                setNewDescripcion('');
                setNewMarca('');
                setNewModelo('');
                setNewSerie('');
                setNewValor('');
                setNewNumDoc('');
                fetchActivos();
            }
        } catch (err: any) {
            alert(`Error inesperado: ${err.message}`);
        } finally {
            setSavingNew(false);
        }
    };

    const filteredActivos = activos.filter((item) => {
        const matchesSearch =
            item.placa.toLowerCase().includes(search.toLowerCase()) ||
            item.descripcion.toLowerCase().includes(search.toLowerCase()) ||
            (item.codigo_contable && item.codigo_contable.toLowerCase().includes(search.toLowerCase())) ||
            (item.funcionarios?.nombre_completo && item.funcionarios.nombre_completo.toLowerCase().includes(search.toLowerCase()));

        const matchesCat = categoriaFilter === 'TODAS' || item.categorias?.nombre === categoriaFilter;
        const matchesEstado = estadoFilter === 'TODOS' || item.estado_activo === estadoFilter;

        return matchesSearch && matchesCat && matchesEstado;
    });

    const totalActivos = activos.length;
    const enServicio = activos.filter(a => a.estado_activo === 'EN_SERVICIO').length;
    const enMantenimiento = activos.filter(a => a.estado_activo === 'MANTENIMIENTO').length;
    const devoluciones = activos.filter(a => a.estado_activo === 'DEVOLUCION').length;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
            {/* Header Institucional Superior Adaptable */}
            <div className="w-full bg-[#001f54] border-b border-slate-800 px-4 sm:px-6 py-3 flex justify-center items-center">
                <img
                    src="/header-ejrlb.png"
                    alt="Rama Judicial - Escuela Judicial Rodrigo Lara Bonilla"
                    className="h-9 sm:h-12 md:h-16 object-contain max-w-full"
                />
            </div>

            <header className="border-b border-slate-800 bg-slate-900/90 sticky top-0 z-40 backdrop-blur">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4">

                    <div className="flex items-center justify-between w-full md:w-auto gap-3">
                        <Link href="/" className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition shrink-0">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="text-left">
                            <h1 className="font-extrabold text-lg sm:text-2xl text-slate-100 tracking-tight">Software de gestión de inventario - RubDev</h1>
                            <p className="text-xs text-blue-400 font-medium">Gestión de Activos e Inventarios</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-3 w-full md:w-auto">
                        <Link
                            href="/inventarioescuela/reporte"
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 text-xs bg-emerald-600 hover:bg-emerald-500 font-semibold rounded-xl text-white transition shadow-lg shadow-emerald-500/20"
                        >
                            <FileSpreadsheet className="w-4 h-4 shrink-0" />
                            <span>Reporte por Responsable</span>
                        </Link>

                        {!session ? (
                            <Link
                                href="/inventarioescuela/login?next=/inventarioescuela"
                                className="flex items-center justify-center gap-2 px-3.5 py-2 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 font-semibold rounded-xl transition"
                            >
                                <Lock className="w-4 h-4 shrink-0" />
                                <span>Acceso Admin</span>
                            </Link>
                        ) : (
                            <>
                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 text-xs bg-blue-600 hover:bg-blue-500 font-semibold rounded-xl text-white transition shadow-lg shadow-blue-500/20"
                                >
                                    <Plus className="w-4 h-4 shrink-0" />
                                    <span>Nuevo Activo</span>
                                </button>

                                <button
                                    onClick={() => supabase.auth.signOut()}
                                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl transition"
                                    title="Cerrar Sesión"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Salir</span>
                                </button>
                            </>
                        )}

                        <button
                            onClick={fetchActivos}
                            className="flex items-center justify-center gap-2 px-3 py-2 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 transition"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                </div>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Tarjetas de Métricas */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                    <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl flex items-center gap-3 sm:gap-4">
                        <div className="p-2.5 sm:p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 shrink-0">
                            <Package className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div>
                            <p className="text-[11px] sm:text-xs text-slate-400 font-medium">Total Activos</p>
                            <p className="text-xl sm:text-2xl font-bold text-slate-100">{totalActivos}</p>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl flex items-center gap-3 sm:gap-4">
                        <div className="p-2.5 sm:p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shrink-0">
                            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div>
                            <p className="text-[11px] sm:text-xs text-slate-400 font-medium">En Servicio</p>
                            <p className="text-xl sm:text-2xl font-bold text-emerald-400">{enServicio}</p>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl flex items-center gap-3 sm:gap-4">
                        <div className="p-2.5 sm:p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 shrink-0">
                            <Wrench className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div>
                            <p className="text-[11px] sm:text-xs text-slate-400 font-medium">En Mantenimiento</p>
                            <p className="text-xl sm:text-2xl font-bold text-amber-400">{enMantenimiento}</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setEstadoFilter(estadoFilter === 'DEVOLUCION' ? 'TODOS' : 'DEVOLUCION')}
                        className={`p-4 sm:p-5 rounded-2xl border text-left transition flex items-center gap-3 sm:gap-4 ${estadoFilter === 'DEVOLUCION'
                                ? 'bg-rose-500/20 border-rose-500 text-rose-300 ring-2 ring-rose-500/30'
                                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                            }`}
                    >
                        <div className="p-2.5 sm:p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20 shrink-0">
                            <Undo2 className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div>
                            <p className="text-[11px] sm:text-xs text-slate-400 font-medium">Devoluciones</p>
                            <p className="text-xl sm:text-2xl font-bold text-rose-400">{devoluciones}</p>
                        </div>
                    </button>
                </div>

                {/* Buscador y Controles de Filtro */}
                <div className="flex flex-col md:flex-row gap-3 sm:gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar por placa, descripción, código o responsable..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:w-auto">
                        <select
                            value={estadoFilter}
                            onChange={(e) => setEstadoFilter(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition"
                        >
                            <option value="TODOS">Todos los Estados</option>
                            <option value="EN_SERVICIO">En Servicio</option>
                            <option value="MANTENIMIENTO">En Mantenimiento</option>
                            <option value="DEVOLUCION">Devoluciones</option>
                            <option value="ALMACEN">En Almacén</option>
                        </select>

                        <select
                            value={categoriaFilter}
                            onChange={(e) => setCategoriaFilter(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition"
                        >
                            <option value="TODAS">Todas las Categorías</option>
                            {categorias.map(c => (
                                <option key={c.id} value={c.nombre}>{c.nombre}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Tabla de Activos */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="w-full overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[650px]">
                            <thead className="bg-slate-950/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                                <tr>
                                    <th className="py-3.5 px-4">Placa / Código</th>
                                    <th className="py-3.5 px-4">Descripción del Activo</th>
                                    <th className="py-3.5 px-4">Categoría</th>
                                    <th className="py-3.5 px-4">Responsable / Custodio</th>
                                    <th className="py-3.5 px-4 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-slate-500">
                                            Cargando inventario desde Supabase...
                                        </td>
                                    </tr>
                                ) : filteredActivos.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-slate-500">
                                            No se encontraron activos que coincidan con la búsqueda.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredActivos.map((activo) => (
                                        <tr key={activo.id} className="hover:bg-slate-800/40 transition">
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <span className="font-mono font-bold text-blue-400 block">{activo.placa}</span>
                                                <span className="text-xs text-slate-500">{activo.codigo_contable || 'S.C.'}</span>
                                            </td>
                                            <td className="py-3.5 px-4 font-medium text-slate-200">
                                                {activo.descripcion}
                                            </td>
                                            <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                                                {activo.categorias?.nombre || 'General'}
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                                                {activo.funcionarios?.nombre_completo || 'Sin Asignar'}
                                            </td>
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                <Link
                                                    href={`/inventarioescuela/${encodeURIComponent(activo.placa)}`}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium transition"
                                                >
                                                    <QrCode className="w-3.5 h-3.5" />
                                                    Hoja de Vida
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Modal Registrar Nuevo Activo */}
            {session && isCreateModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl my-8">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                            <h3 className="text-base sm:text-lg font-bold text-slate-100">Registrar Nuevo Activo en Inventario</h3>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCrearActivo} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Placa del Activo *</label>
                                    <input
                                        type="text"
                                        value={newPlaca}
                                        onChange={(e) => setNewPlaca(e.target.value)}
                                        placeholder="Ej: 00-02-55990"
                                        required
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Código Contable</label>
                                    <input
                                        type="text"
                                        value={newCodigo}
                                        onChange={(e) => setNewCodigo(e.target.value)}
                                        placeholder="Ej: 110010101410.0"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Descripción del Bien *</label>
                                <input
                                    type="text"
                                    value={newDescripcion}
                                    onChange={(e) => setNewDescripcion(e.target.value)}
                                    placeholder="Ej: COMPUTADOR PORTATIL LENOVO THINKPAD T14"
                                    required
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 uppercase"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Marca</label>
                                    <input
                                        type="text"
                                        value={newMarca}
                                        onChange={(e) => setNewMarca(e.target.value)}
                                        placeholder="Ej: HP, LENOVO"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 uppercase"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Modelo</label>
                                    <input
                                        type="text"
                                        value={newModelo}
                                        onChange={(e) => setNewModelo(e.target.value)}
                                        placeholder="Ej: PROBOOK 440"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 uppercase"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Número de Serie</label>
                                    <input
                                        type="text"
                                        value={newSerie}
                                        onChange={(e) => setNewSerie(e.target.value)}
                                        placeholder="Ej: 5CD2104XYZ"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Categoría</label>
                                    <select
                                        value={newCategoriaId}
                                        onChange={(e) => setNewCategoriaId(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                                    >
                                        {categorias.map((c) => (
                                            <option key={c.id} value={c.id}>{c.nombre}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Funcionario Responsable</label>
                                    <select
                                        value={newFuncionarioId}
                                        onChange={(e) => setNewFuncionarioId(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                                    >
                                        {funcionarios.map((f) => (
                                            <option key={f.id} value={f.id}>{f.nombre_completo}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Ubicación</label>
                                    <input
                                        type="text"
                                        value={newUbicacion}
                                        onChange={(e) => setNewUbicacion(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                                        placeholder="Ej: Escuela Judicial Rodrigo Lara Bonilla"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Valor Comercial ($ COP)</label>
                                    <input
                                        type="number"
                                        value={newValor}
                                        onChange={(e) => setNewValor(e.target.value)}
                                        placeholder="Ej: 3500000"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Estado del Activo</label>
                                    <select
                                        value={newEstado}
                                        onChange={(e) => setNewEstado(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="EN_SERVICIO">En Servicio</option>
                                        <option value="MANTENIMIENTO">En Mantenimiento</option>
                                        <option value="DEVOLUCION">Devolución</option>
                                        <option value="ALMACEN">En Almacén</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Número de Documento</label>
                                    <input
                                        type="text"
                                        value={newNumDoc}
                                        onChange={(e) => setNewNumDoc(e.target.value)}
                                        placeholder="Ej: 6566"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Tipo de Documento</label>
                                    <input
                                        type="text"
                                        value={newTipoDoc}
                                        onChange={(e) => setNewTipoDoc(e.target.value)}
                                        placeholder="Ej: TC, AC"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 uppercase"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingNew}
                                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20"
                                >
                                    {savingNew ? 'Guardando Registro...' : 'Guardar Activo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Pie de Página */}
            <footer className="w-full mt-auto py-6 border-t border-slate-800/80 bg-slate-950 text-slate-500 text-xs text-center print:hidden">
                <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
                    <p className="font-medium">
                        Rama Judicial · Consejo Superior de la Judicatura · Escuela Judicial "Rodrigo Lara Bonilla"
                    </p>
                    <p className="font-mono text-[11px] text-slate-400">
                        © {new Date().getFullYear()} <strong className="text-slate-200">RubDev.net</strong> ®. Todos los derechos reservados.
                    </p>
                </div>
            </footer>
        </div>
    );
}