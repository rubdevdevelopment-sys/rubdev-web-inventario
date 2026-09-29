'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import {
    ArrowLeft, Printer, ShieldCheck, Building, User,
    Calendar, Tag, RefreshCw, History, FileText, Lock
} from 'lucide-react';

export default function HojaDeVidaActivo() {
    const params = useParams();
    const placa = decodeURIComponent(params.placa as string);

    const [session, setSession] = useState<any>(null);
    const [activo, setActivo] = useState<any>(null);
    const [funcionarios, setFuncionarios] = useState<any[]>([]);
    const [movimientos, setMovimientos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Estados del Formulario de Movimiento
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [nuevoFuncionarioId, setNuevoFuncionarioId] = useState('');
    const [nuevaUbicacion, setNuevaUbicacion] = useState('');
    const [nuevoEstado, setNuevoEstado] = useState('');
    const [tipoMovimiento, setTipoMovimiento] = useState('TRASLADO');
    const [observaciones, setObservaciones] = useState('');

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchDetalle = async () => {
        setLoading(true);

        const { data: activoData } = await supabase
            .from('activos')
            .select(`
        *,
        categorias (nombre),
        funcionarios (*)
      `)
            .eq('placa', placa)
            .single();

        if (activoData) {
            setActivo(activoData);
            setNuevoFuncionarioId(activoData.funcionario_id || '');
            setNuevaUbicacion(activoData.ubicacion_actual || '');
            setNuevoEstado(activoData.estado_activo || 'EN_SERVICIO');

            const { data: movsData } = await supabase
                .from('movimientos_activos')
                .select(`
          *,
          f_anterior:funcionarios!movimientos_activos_funcionario_anterior_id_fkey(nombre_completo),
          f_nuevo:funcionarios!movimientos_activos_funcionario_nuevo_id_fkey(nombre_completo)
        `)
                .eq('activo_id', activoData.id)
                .order('fecha_movimiento', { ascending: false });

            if (movsData) setMovimientos(movsData);
        }

        const { data: funcsData } = await supabase
            .from('funcionarios')
            .select('id, nombre_completo')
            .order('nombre_completo', { ascending: true });

        if (funcsData) {
            const funcsUnicos = funcsData.filter((f, index, self) =>
                index === self.findIndex((t) => t.nombre_completo === f.nombre_completo)
            );
            setFuncionarios(funcsUnicos);
        }

        setLoading(false);
    };

    useEffect(() => {
        if (placa) fetchDetalle();
    }, [placa]);

    const handleGuardarMovimiento = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session) return alert('Debes iniciar sesión como administrador.');

        setSaving(true);

        try {
            const { error } = await supabase.rpc('registrar_movimiento_activo', {
                p_activo_id: activo.id,
                p_nuevo_funcionario_id: nuevoFuncionarioId,
                p_nueva_ubicacion: nuevaUbicacion,
                p_nuevo_estado: nuevoEstado,
                p_tipo_movimiento: tipoMovimiento,
                p_observaciones: observaciones
            });

            if (error) {
                alert(`Error al registrar el movimiento: ${error.message}`);
            } else {
                alert('✅ Movimiento registrado con éxito.');
                setIsModalOpen(false);
                setObservaciones('');
                fetchDetalle();
            }
        } catch (err: any) {
            alert(`Error inesperado: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center">Cargando Hoja de Vida y Trazabilidad...</div>;
    }

    if (!activo) {
        return <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center">Activo no encontrado.</div>;
    }

    const qrUrl = typeof window !== 'undefined' ? window.location.href : '';

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col print:bg-white print:text-black">
            {/* Header Institucional Superior */}
            <div className="w-full bg-[#001f54] border-b border-slate-800 px-6 py-2 flex items-center justify-between print:hidden">
                <img
                    src="/header-ejrlb.png"
                    alt="Rama Judicial - Escuela Judicial Rodrigo Lara Bonilla"
                    className="h-10 md:h-12 object-contain"
                />
            </div>

            {/* Topbar no imprimible */}
            <div className="border-b border-slate-800 bg-slate-900 px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3 print:hidden">
                <Link href="/inventarioescuela" className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
                    <ArrowLeft className="w-4 h-4" />
                    Volver al Inventario
                </Link>

                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                    {session ? (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-medium transition shadow-lg shadow-emerald-500/20"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Actualizar / Trasladar / Devolución
                        </button>
                    ) : (
                        <Link
                            href="/inventarioescuela/login"
                            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition border border-slate-700"
                        >
                            <Lock className="w-4 h-4 text-amber-400" />
                            Modo Consulta (Iniciar Sesión)
                        </Link>
                    )}

                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-medium transition shadow-lg shadow-blue-500/20"
                    >
                        <Printer className="w-4 h-4" />
                        Imprimir
                    </button>
                </div>
            </div>

            <main className="max-w-4xl mx-auto w-full p-4 sm:p-8 print:p-0 flex-1">
                {/* Banner imprimible */}
                <div className="hidden print:block mb-6">
                    <img
                        src="/header-ejrlb.png"
                        alt="Header Institucional"
                        className="w-full h-auto object-contain"
                    />
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl print:bg-white print:border-none print:shadow-none mb-8">
                    {/* Encabezado */}
                    <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-800 print:border-slate-300 pb-6 mb-6 gap-4">
                        <div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 print:text-blue-700">
                                RubDev Asset Manager · Hoja de Vida
                            </span>
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 print:text-slate-900 mt-1">{activo.descripcion}</h1>
                            <p className="text-sm text-slate-400 print:text-slate-600 mt-1">Placa: <strong className="text-slate-200 print:text-black">{activo.placa}</strong></p>
                        </div>

                        {/* Código QR */}
                        <div className="bg-white p-3 rounded-2xl shadow-md border border-slate-200 flex flex-col items-center self-center sm:self-auto">
                            <QRCodeSVG value={qrUrl} size={110} />
                            <span className="text-[10px] font-mono font-bold text-slate-800 mt-1">{activo.placa}</span>
                        </div>
                    </div>

                    {/* Detalles Técnicos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Tag className="w-5 h-5 text-blue-400 shrink-0" />
                                <div>
                                    <p className="text-xs text-slate-400">Código Contable</p>
                                    <p className="font-semibold">{activo.codigo_contable || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <User className="w-5 h-5 text-emerald-400 shrink-0" />
                                <div>
                                    <p className="text-xs text-slate-400">Funcionario Responsable Actual</p>
                                    <p className="font-semibold">{activo.funcionarios?.nombre_completo || 'Sin Asignar'}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Building className="w-5 h-5 text-indigo-400 shrink-0" />
                                <div>
                                    <p className="text-xs text-slate-400">Ubicación Actual</p>
                                    <p className="font-semibold">{activo.ubicacion_actual}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
                                <div>
                                    <p className="text-xs text-slate-400">Estado del Activo</p>
                                    <span className={`inline-flex items-center text-xs px-2.5 py-0.5 rounded-full font-medium ${activo.estado_activo === 'EN_SERVICIO' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                            activo.estado_activo === 'DEVOLUCION' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                                'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                        }`}>
                                        {activo.estado_activo === 'DEVOLUCION' ? 'Devolución' : activo.estado_activo}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-purple-400 shrink-0" />
                                <div>
                                    <p className="text-xs text-slate-400">Documento de Ingreso</p>
                                    <p className="font-semibold">{activo.num_documento || 'Sin Registro'} ({activo.tipo_documento || 'TC'})</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Historial de Trazabilidad */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl print:hidden">
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
                        <History className="w-5 h-5 text-blue-400" />
                        <h2 className="text-base sm:text-lg font-bold text-slate-100">Trazabilidad e Historial de Movimientos</h2>
                    </div>

                    {movimientos.length === 0 ? (
                        <p className="text-sm text-slate-500 italic text-center py-6">
                            No se han registrado movimientos o traslados posteriores para este activo.
                        </p>
                    ) : (
                        <div className="space-y-6 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-800">
                            {movimientos.map((mov) => (
                                <div key={mov.id} className="relative pl-8">
                                    <div className="absolute left-2 top-1.5 w-3 h-3 bg-blue-500 rounded-full ring-4 ring-slate-900" />
                                    <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                                {mov.tipo_movimiento === 'DEVOLUCION' ? 'DEVOLUCIÓN' : mov.tipo_movimiento}
                                            </span>
                                            <span className="text-xs text-slate-500">
                                                {new Date(mov.fecha_movimiento).toLocaleString('es-CO')}
                                            </span>
                                        </div>

                                        <p className="text-xs text-slate-300 mb-1">
                                            <strong>Responsable anterior:</strong> {mov.f_anterior?.nombre_completo || 'Sin registro'} →
                                            <strong className="text-emerald-400"> Nuevo:</strong> {mov.f_nuevo?.nombre_completo || 'Sin registro'}
                                        </p>

                                        <p className="text-xs text-slate-400 mb-2">
                                            <strong>Ubicación:</strong> {mov.ubicacion_anterior} → <span className="text-slate-200">{mov.ubicacion_nueva}</span>
                                        </p>

                                        {mov.observaciones && (
                                            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/80 text-xs text-slate-400 flex items-start gap-2">
                                                <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                                                <span>{mov.observaciones}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Modal de Actualización / Movimiento (Solo Administradores) */}
            {session && isModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-100 mb-4">Registrar Movimiento / Novedad</h3>

                        <form onSubmit={handleGuardarMovimiento} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Tipo de Movimiento</label>
                                <select
                                    value={tipoMovimiento}
                                    onChange={(e) => setTipoMovimiento(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                                >
                                    <option value="CONFIRMADO">Confirmado</option>
                                    <option value="TRASLADO">Traslado de Ubicación</option>
                                    <option value="CAMBIO_RESPONSABLE">Cambio de Responsable / Custodia</option>
                                    <option value="MANTENIMIENTO">Ingreso a Mantenimiento</option>
                                    <option value="PROCESO_DEVOLUCION">Proceso de Devolución</option>
                                    <option value="DEVOLUCION">Registrar Devolución</option>

                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Nuevo Funcionario Responsable</label>
                                <select
                                    value={nuevoFuncionarioId}
                                    onChange={(e) => setNuevoFuncionarioId(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                                >
                                    {funcionarios.map((f) => (
                                        <option key={f.id} value={f.id}>{f.nombre_completo}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Ubicación Actualizada</label>
                                <input
                                    type="text"
                                    value={nuevaUbicacion}
                                    onChange={(e) => setNuevaUbicacion(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                                    placeholder="Ej: Sala de Juntas 2, Piso 3"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Estado del Activo</label>
                                <select
                                    value={nuevoEstado}
                                    onChange={(e) => setNuevoEstado(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                                >
                                    <option value="CONFIRMADO">Confirmado</option>
                                    <option value="EN_SERVICIO">En Servicio</option>
                                    <option value="MANTENIMIENTO">En Mantenimiento</option>
                                    <option value="PROCESO_DEVOLUCION">Proceso de Devolución</option>
                                    <option value="DEVOLUCION">Devolución</option>
                                    <option value="ALMACEN">En Almacén</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Observaciones / Justificación</label>
                                <textarea
                                    value={observaciones}
                                    onChange={(e) => setObservaciones(e.target.value)}
                                    rows={3}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                                    placeholder="Escriba el motivo del traslado, número de acta de devolución o fallo presentado..."
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5"
                                >
                                    {saving ? 'Guardando...' : 'Confirmar Registro'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Pie de Página */}
            <footer className="w-full py-6 border-t border-slate-800/80 bg-slate-950 text-slate-500 text-xs text-center print:border-slate-300 print:text-black print:bg-white">
                <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
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