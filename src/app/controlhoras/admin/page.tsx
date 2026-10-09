'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseControlHoras as supabase } from '@/lib/supabaseControlHoras';
import { getApplicationRole } from '@/lib/applicationAccess';
import { 
  ShieldCheck, ArrowLeft, Users, Plus, Edit2, KeyRound, RefreshCw, Lock, UserPlus
} from 'lucide-react';

export default function AdminControlHoras() {
  const router = useRouter();
  const [metas, setMetas] = useState<any[]>([]);
  const [registros, setRegistros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Formulario Funcionario
  const [emailFunc, setEmailFunc] = useState('');
  const [nombreFunc, setNombreFunc] = useState('');
  const [horasReq, setHorasReq] = useState(40);
  const [fechaInicio, setFechaInicio] = useState('2026-10-01');
  const [esAdmin, setEsAdmin] = useState(false);

  // Formulario Contraseña
  const [targetEmailPass, setTargetEmailPass] = useState('');
  const [nuevaPass, setNuevaPass] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  // Formulario para crear una cuenta en Supabase Auth
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [targetEmailAccount, setTargetEmailAccount] = useState('');
  const [newAccountPassword, setNewAccountPassword] = useState('');
  const [accountLoading, setAccountLoading] = useState(false);

  const cargarDatosAdmin = async () => {
    setLoading(true);
    try {
      const { data: metasData } = await supabase
        .from('control_horas_metas')
        .select('*')
        .order('funcionario_nombre', { ascending: true });

      if (metasData) setMetas(metasData);

      const { data: regData } = await supabase
        .from('control_horas_registros')
        .select('*');

      if (regData) setRegistros(regData);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/controlhoras/login?next=/controlhoras/admin');
        return;
      }

      try {
        const role = await getApplicationRole(supabase, 'controlhoras', session.user.id);
        if (!active) return;
        if (role !== 'admin') {
          router.replace('/controlhoras');
          return;
        }
        await cargarDatosAdmin();
      } catch (error) {
        console.error('No se pudo verificar el acceso de administrador de Control Horas:', error);
        if (active) router.replace('/controlhoras');
      }
    })();

    return () => {
      active = false;
    };
  }, [router]);

  const guardarConfiguracion = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      funcionario_email: emailFunc.trim().toLowerCase(),
      funcionario_nombre: nombreFunc.trim(),
      periodo_anio: 2026,
      horas_totales_requeridas: Number(horasReq),
      fecha_inicio_periodo: fechaInicio,
      es_admin: esAdmin
    };

    const { error } = await supabase
      .from('control_horas_metas')
      .upsert(payload, { onConflict: 'funcionario_email,periodo_anio' });

    if (!error) {
      setIsModalOpen(false);
      cargarDatosAdmin();
    } else {
      alert('Error al guardar: ' + error.message);
    }
  };

  const cambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassLoading(true);

    try {
      const { error } = await supabase.functions.invoke('set-control-horas-password', {
        body: {
          email: targetEmailPass.trim().toLowerCase(),
          password: nuevaPass,
        },
      });

      if (error) {
        let message = error.message;
        if (error.context instanceof Response) {
          const responseBody = await error.context.json().catch(() => null);
          if (typeof responseBody?.error === 'string') message = responseBody.error;
        }
        alert('Error cambiando contraseña: ' + message);
        return;
      }

      alert(`Contraseña actualizada para ${targetEmailPass}.`);
      setIsPasswordModalOpen(false);
      setNuevaPass('');
    } catch (err: any) {
      alert('Error de ejecución: ' + err.message);
    } finally {
      setPassLoading(false);
    }
  };

  const crearCuentaAcceso = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountLoading(true);

    try {
      const { error } = await supabase.functions.invoke('create-control-horas-user', {
        body: {
          email: targetEmailAccount.trim().toLowerCase(),
          password: newAccountPassword,
        },
      });

      if (error) {
        let message = error.message;
        if (error.context instanceof Response) {
          const responseBody = await error.context.json().catch(() => null);
          if (typeof responseBody?.error === 'string') {
            message = responseBody.error;
          }
        }
        alert(`No se pudo crear la cuenta: ${message}`);
        return;
      }

      alert(`Cuenta de acceso creada para ${targetEmailAccount}.`);
      setIsCreateAccountOpen(false);
      setNewAccountPassword('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error de ejecución desconocido.';
      alert(`No se pudo crear la cuenta: ${message}`);
    } finally {
      setAccountLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <div className="w-full bg-[#001f54] py-3 px-6 flex justify-center items-center border-b border-amber-500/30">
        <img src="/header-ejrlb.png" alt="Escuela Judicial" className="h-12 object-contain" />
      </div>

      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/controlhoras" className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            Panel de Administración <ShieldCheck className="w-4 h-4 text-amber-400" />
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={cargarDatosAdmin}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
            title="Recargar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              setEmailFunc('');
              setNombreFunc('');
              setHorasReq(40);
              setFechaInicio('2026-10-01');
              setEsAdmin(false);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition"
          >
            <Plus className="w-4 h-4" /> Configurar Funcionario
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" /> Consolidado de Personal (2026)
            </h2>
            <span className="text-xs text-slate-500">{metas.length} funcionarios configurados</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3">Funcionario</th>
                  <th className="px-6 py-3">Fecha Inicio</th>
                  <th className="px-6 py-3">Meta Requerida</th>
                  <th className="px-6 py-3">Compensado</th>
                  <th className="px-6 py-3">Avance</th>
                  <th className="px-6 py-3">Rol</th>
                  <th className="px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {metas.map((m) => {
                  const comp = registros
                    .filter(r => r.funcionario_email === m.funcionario_email)
                    .reduce((acc, r) => acc + Number(r.horas_totales_dia || 0), 0);
                  const pct = Math.min(100, (comp / m.horas_totales_requeridas) * 100);

                  return (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4 font-medium text-white">
                        {m.funcionario_nombre}
                        <span className="block text-[10px] text-slate-500">{m.funcionario_email}</span>
                      </td>
                      <td className="px-6 py-4 font-mono">{m.fecha_inicio_periodo}</td>
                      <td className="px-6 py-4 font-bold">{m.horas_totales_requeridas} hrs</td>
                      <td className="px-6 py-4 font-bold text-emerald-400">{comp.toFixed(1)} hrs</td>
                      <td className="px-6 py-4">
                        <span className={`font-bold ${pct >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {pct.toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {m.es_admin ? (
                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full font-bold">Admin</span>
                        ) : (
                          <span className="text-slate-500">Usuario</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setTargetEmailAccount(m.funcionario_email);
                            setNewAccountPassword('');
                            setIsCreateAccountOpen(true);
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg transition"
                          title="Crear Cuenta de Acceso"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setTargetEmailPass(m.funcionario_email);
                            setIsPasswordModalOpen(true);
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg transition"
                          title="Cambiar Contraseña"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEmailFunc(m.funcionario_email);
                            setNombreFunc(m.funcionario_nombre);
                            setHorasReq(m.horas_totales_requeridas);
                            setFechaInicio(m.fecha_inicio_periodo);
                            setEsAdmin(m.es_admin);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                          title="Editar Datos Meta"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal 1: Crear / Editar Funcionario */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Configurar Funcionario</h3>
            <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              Esto solo registra los datos y metas del funcionario; no crea una cuenta para iniciar sesión.
              La cuenta debe crearse en Supabase, en Authentication &gt; Users.
            </p>

            <form onSubmit={guardarConfiguracion} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 mb-1 block">Correo Electrónico Institucional</label>
                <input
                  type="email"
                  value={emailFunc}
                  onChange={(e) => setEmailFunc(e.target.value)}
                  placeholder="usuario@cendoj.ramajudicial.gov.co"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Nombre Completo</label>
                <input
                  type="text"
                  value={nombreFunc}
                  onChange={(e) => setNombreFunc(e.target.value)}
                  placeholder="Nombre y Apellido"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 mb-1 block">Meta (32.0 o 40.0 hrs)</label>
                  <input
                    type="number"
                    value={horasReq}
                    onChange={(e) => setHorasReq(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 mb-1 block">Fecha Inicio</label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                    required
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300 pt-2">
                <input
                  type="checkbox"
                  checked={esAdmin}
                  onChange={(e) => setEsAdmin(e.target.checked)}
                />
                Otorgar privilegios de Administrador
              </label>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
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

      {/* Modal 2: Cambiar Contraseña */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" /> Cambiar Contraseña
            </h3>
            <p className="text-xs text-slate-400">
              Servidor: <strong className="text-amber-400">{targetEmailPass}</strong>
            </p>
            <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              Solo cambia la contraseña de cuentas autorizadas para Control Horas.
              Usa una contraseña temporal única de al menos 12 caracteres.
            </p>

            <form onSubmit={cambiarPassword} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 mb-1 block">Nueva Contraseña</label>
                <input
                  type="password"
                  value={nuevaPass}
                  onChange={(e) => setNuevaPass(e.target.value)}
                  minLength={12}
                  autoComplete="new-password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={passLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl"
                >
                  {passLoading ? 'Actualizando...' : 'Actualizar Clave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCreateAccountOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-400" /> Crear Cuenta de Acceso
            </h3>
            <p className="text-xs text-slate-400">
              Funcionario: <strong className="text-emerald-400">{targetEmailAccount}</strong>
            </p>
            <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              La cuenta se creará en Supabase Auth y el correo quedará confirmado para iniciar sesión.
              Usa una contraseña temporal única de al menos 12 caracteres y compártela por un canal seguro.
            </p>

            <form onSubmit={crearCuentaAcceso} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 mb-1 block">Contraseña temporal</label>
                <input
                  type="password"
                  value={newAccountPassword}
                  onChange={(e) => setNewAccountPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={12}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateAccountOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={accountLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl disabled:opacity-50"
                >
                  {accountLoading ? 'Creando...' : 'Crear Cuenta'}
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