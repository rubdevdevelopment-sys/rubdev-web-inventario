'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseControlHoras as supabase } from '@/lib/supabaseControlHoras';
import { getApplicationRole } from '@/lib/applicationAccess';
import {
  Clock, Calendar, Plus, Edit2,
  ShieldCheck, LogOut, FileSpreadsheet, TrendingUp
} from 'lucide-react';

export default function ControlHorasDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [accessChecked, setAccessChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<any>(null);
  const [registros, setRegistros] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Formulario
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [manana, setManana] = useState(false);
  const [tarde, setTarde] = useState(false);
  const [esEspecial, setEsEspecial] = useState(false);
  const [horasEspeciales, setHorasEspeciales] = useState<number | string>(0);
  const [descripcion, setDescripcion] = useState('');

  useEffect(() => {
    let active = true;

    const verifyAccess = async (nextSession: typeof session) => {
      if (!active) return;
      setAccessChecked(false);
      if (!nextSession?.user.email) {
        setSession(null);
        setAccessChecked(true);
        router.replace('/controlhoras/login?next=/controlhoras');
        return;
      }

      try {
        const role = await getApplicationRole(supabase, 'controlhoras', nextSession.user.id);
        if (!active) return;
        if (!role) {
          await supabase.auth.signOut();
          setSession(null);
          router.replace('/controlhoras/login?next=/controlhoras');
          return;
        }
        setSession(nextSession);
        await cargarDatos(nextSession.user.email);
      } catch (error) {
        console.error('No se pudo verificar el acceso a Control Horas:', error);
        await supabase.auth.signOut();
        if (active) {
          setSession(null);
          router.replace('/controlhoras/login?next=/controlhoras');
        }
      } finally {
        if (active) setAccessChecked(true);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => verifyAccess(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void verifyAccess(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function cargarDatos(email: string) {
    setLoading(true);
    try {
      let { data: metaData } = await supabase
        .from('control_horas_metas')
        .select('*')
        .eq('funcionario_email', email)
        .eq('periodo_anio', 2026)
        .single();

      if (!metaData) {
        metaData = {
          funcionario_email: email,
          funcionario_nombre: email.split('@')[0],
          horas_totales_requeridas: 40,
          fecha_inicio_periodo: '2026-10-01',
          es_admin: email === 'rmonroyl@cendoj.ramajudicial.gov.co'
        }
      }
      setMeta(metaData);

      const { data: regData } = await supabase
        .from('control_horas_registros')
        .select('*')
        .eq('funcionario_email', email)
        .eq('periodo_anio', 2026)
        .order('fecha_registro', { ascending: false });

      if (regData) setRegistros(regData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalEditar = (reg: any) => {
    setEditId(reg.id);
    setFecha(reg.fecha_registro);
    setEsEspecial(reg.es_actividad_especial);
    setManana(reg.compensado_manana);
    setTarde(reg.compensado_tarde);
    setHorasEspeciales(reg.horas_especiales || 0);
    setDescripcion(reg.descripcion_actividad || '');
    setIsModalOpen(true);
  };

  const abrirModalNuevo = () => {
    setEditId(null);
    setFecha(new Date().toISOString().split('T')[0]);
    setEsEspecial(false);
    setManana(false);
    setTarde(false);
    setHorasEspeciales(0);
    setDescripcion('');
    setIsModalOpen(true);
  };

  const guardarRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    let horasTotales = 0;
    if (esEspecial) {
      horasTotales = Number(horasEspeciales);
    } else {
      if (manana) horasTotales += 1;
      if (tarde) horasTotales += 1;
    }

    const payload = {
      funcionario_email: session.user.email,
      periodo_anio: 2026,
      fecha_registro: fecha,
      compensado_manana: !esEspecial && manana,
      compensado_tarde: !esEspecial && tarde,
      es_actividad_especial: esEspecial,
      horas_especiales: esEspecial ? Number(horasEspeciales) : 0,
      descripcion_actividad: descripcion,
      horas_totales_dia: horasTotales,
      updated_at: new Date().toISOString()
    };

    let error;
    if (editId) {
      const res = await supabase.from('control_horas_registros').update(payload).eq('id', editId);
      error = res.error;
    } else {
      const res = await supabase.from('control_horas_registros').insert([payload]);
      error = res.error;
    }

    if (!error) {
      setIsModalOpen(false);
      cargarDatos(session.user.email);
    } else {
      alert("Error al guardar: " + error.message);
    }
  };

  const totalCompensado = registros.reduce((acc, curr) => acc + Number(curr.horas_totales_dia || 0), 0);
  const horasRequeridas = meta?.horas_totales_requeridas || 40;
  const pendientes = Math.max(0, horasRequeridas - totalCompensado);
  const porcentaje = Math.min(100, (totalCompensado / horasRequeridas) * 100);

  const calcularEstimadoFecha = () => {
    if (pendientes <= 0) return '¡Meta completada!';
    if (registros.length === 0) return 'Sin datos suficientes para calcular';
    const promedioHorasDia = totalCompensado / Math.max(1, registros.length);
    const diasHabilesNecesarios = Math.ceil(pendientes / promedioHorasDia);

    let fechaActual = new Date();
    let contDias = 0;
    while (contDias < diasHabilesNecesarios) {
      fechaActual.setDate(fechaActual.getDate() + 1);
      const diaSemana = fechaActual.getDay();
      if (diaSemana !== 0 && diaSemana !== 6) {
        contDias++;
      }
    }
    return fechaActual.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    if (!accessChecked || !session) {
      return (
        <main className="min-h-screen bg-slate-950 flex items-center justify-center text-sm text-slate-400">
          Verificando permisos de Control Horas...
        </main>
      );
    }

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans">
        <p className="text-xs text-slate-400 animate-pulse">Verificando sesión y cargando datos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <div className="w-full bg-[#001f54] py-3 px-6 flex justify-center items-center border-b border-amber-500/30">
        <img src="/header-ejrlb.png" alt="Escuela Judicial Rodrigo Lara Bonilla" className="h-12 md:h-14 object-contain" />
      </div>

      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <img src="/icohoras.png" alt="" className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              Control Horas <span className="text-amber-400">Diciembre</span>
            </h1>
            <p className="text-xs text-slate-400">Compensación Institucional 2026</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/controlhoras/reportes"
            className="flex items-center gap-1.5 px-3 py-2 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-semibold rounded-xl transition"
          >
            <FileSpreadsheet className="w-4 h-4" /> Reportes
          </Link>

          {meta?.es_admin && (
            <Link
              href="/controlhoras/admin"
              className="flex items-center gap-1.5 px-3 py-2 text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold rounded-xl transition"
            >
              <ShieldCheck className="w-4 h-4" /> Panel Admin
            </Link>
          )}

          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 border border-slate-700 rounded-xl transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Salir ({session?.user?.email?.split('@')[0]})
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Meta Asignada</span>
            <div className="text-2xl font-extrabold text-white mt-1">{horasRequeridas.toFixed(1)} hrs</div>
            <span className="text-[11px] text-amber-400/80">Periodo 2026</span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Horas Compensadas</span>
            <div className="text-2xl font-extrabold text-emerald-400 mt-1">{totalCompensado.toFixed(1)} hrs</div>
            <span className="text-[11px] text-emerald-400/80">Acumulado real</span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Horas Pendientes</span>
            <div className="text-2xl font-extrabold text-amber-400 mt-1">{pendientes.toFixed(1)} hrs</div>
            <span className="text-[11px] text-slate-400">Por reponer</span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Avance General</span>
            <div className="text-2xl font-extrabold text-blue-400 mt-1">{porcentaje.toFixed(1)}%</div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
              <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${porcentaje}%` }} />
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Estimado de terminación basado en tu ritmo actual:</span>
          </div>
          <strong className="capitalize text-white font-bold">{calcularEstimadoFecha()}</strong>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white">Registro de Compensaciones</h2>
            <p className="text-xs text-slate-400 mt-0.5">Reporta tus jornadas ordinarias (7-8 a.m. / 5-6 p.m.) o actividades especiales.</p>
          </div>
          <button
            onClick={abrirModalNuevo}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg shadow-amber-500/10"
          >
            <Plus className="w-4 h-4" /> + Registrar Horas
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" /> Historial Día a Día
            </h3>
            <span className="text-xs text-slate-500">{registros.length} registros</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3">Fecha</th>
                  <th className="px-6 py-3">Tipo / Jornada</th>
                  <th className="px-6 py-3">Horas</th>
                  <th className="px-6 py-3">Justificación / Descripción</th>
                  <th className="px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {registros.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500">
                      No has registrado horas compensadas todavía.
                    </td>
                  </tr>
                ) : (
                  registros.map((reg) => (
                    <tr key={reg.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4 font-mono text-slate-200">{reg.fecha_registro}</td>
                      <td className="px-6 py-4">
                        {reg.es_actividad_especial ? (
                          <span className="px-2.5 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full font-semibold">
                            Actividad Especial
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full font-semibold">
                            {[reg.compensado_manana && 'Mañana (7-8 a.m.)', reg.compensado_tarde && 'Tarde (5-6 p.m.)'].filter(Boolean).join(' + ')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-400">+{reg.horas_totales_dia} hrs</td>
                      <td className="px-6 py-4 text-slate-400 max-w-xs truncate">
                        {reg.descripcion_actividad || 'Jornada ordinaria de compensación'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => abrirModalEditar(reg)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                          title="Editar registro"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              {editId ? 'Editar Registro de Horas' : 'Registrar Horas Compensadas'}
            </h3>

            <form onSubmit={guardarRegistro} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 mb-1 block">Fecha de Compensación</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                  required
                />
              </div>

              <div className="flex items-center gap-4 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="radio"
                    name="tipoCompensacion"
                    checked={!esEspecial}
                    onChange={() => setEsEspecial(false)}
                  />
                  Jornada Ordinaria
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="radio"
                    name="tipoCompensacion"
                    checked={esEspecial}
                    onChange={() => setEsEspecial(true)}
                  />
                  Actividad Especial
                </label>
              </div>

              {!esEspecial ? (
                <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={manana}
                      onChange={(e) => setManana(e.target.checked)}
                    />
                    Mañana (7:00 a.m. - 8:00 a.m.) (+1h)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={tarde}
                      onChange={(e) => setTarde(e.target.checked)}
                    />
                    Tarde (5:00 p.m. - 6:00 p.m.) (+1h)
                  </label>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-slate-400 mb-1 block">Horas a Registrar</label>
                    <input
                      type="number"
                      step="0.5"
                      value={horasEspeciales}
                      onChange={(e) => setHorasEspeciales(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 mb-1 block">Descripción / Justificación</label>
                    <textarea
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      placeholder="Escriba la actividad realizada..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 h-20"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="w-full py-6 border-t border-slate-800 bg-slate-950 text-slate-500 text-xs text-center">
        <p>© {new Date().getFullYear()} <strong className="text-slate-300">RubDev.net</strong> ®. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}