'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getApplicationRole } from '@/lib/applicationAccess';
import { supabaseAutos } from '@/lib/supabaseAutos';
import { ArrowLeft, KeyRound, Lock, Mail, ShieldAlert } from 'lucide-react';

function AutosLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNext = searchParams.get('next');
  const nextPath = requestedNext?.startsWith('/autos') && !requestedNext.startsWith('//')
    ? requestedNext
    : '/autos';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: { session } } = await supabaseAutos.auth.getSession();
      if (!session) return;
      try {
        const role = await getApplicationRole(supabaseAutos, 'autos', session.user.id);
        if (active && role === 'admin') router.replace(nextPath);
        else if (active) await supabaseAutos.auth.signOut();
      } catch (error) {
        console.error('No se pudo verificar el acceso a Autos:', error);
        if (active) setErrorMessage('No se pudo verificar el permiso de Autos. Intenta de nuevo.');
      }
    })();
    return () => {
      active = false;
    };
  }, [nextPath, router]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabaseAutos.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setErrorMessage(
        error.message === 'Invalid login credentials'
          ? 'Credenciales incorrectas.'
          : error.message,
      );
      setLoading(false);
      return;
    }

    if (!data.user) {
      setErrorMessage('Supabase no devolvió un usuario autenticado.');
      setLoading(false);
      return;
    }

    try {
      const role = await getApplicationRole(supabaseAutos, 'autos', data.user.id);
      if (role !== 'admin') {
        await supabaseAutos.auth.signOut();
        setErrorMessage('Esta cuenta no está autorizada para administrar Autos.');
        setLoading(false);
        return;
      }
      router.replace(nextPath);
    } catch (error) {
      await supabaseAutos.auth.signOut();
      const message = error instanceof Error ? error.message : 'Error desconocido.';
      setErrorMessage(`No se pudo verificar el permiso de Autos: ${message}`);
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20 mb-1">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-wide">Acceso a Autos</h1>
        <p className="text-xs text-slate-400">Solo cuentas autorizadas para esta aplicación.</p>
      </div>

      {errorMessage && (
        <div className="bg-rose-950/40 border border-rose-500/30 p-3 rounded-xl text-xs text-rose-400 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Correo electrónico</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Contraseña</label>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition"
        >
          {loading ? 'Verificando permisos...' : 'Iniciar sesión'}
        </button>
      </form>
    </div>
  );
}

export default function AutosLoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 font-sans">
      <div className="absolute top-6 left-6">
        <Link href="/autos" className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition">
          <ArrowLeft className="w-4 h-4" />
          Volver a Autos
        </Link>
      </div>
      <div className="max-w-md w-full">
        <Suspense fallback={<div className="text-center text-xs text-slate-500">Cargando acceso...</div>}>
          <AutosLoginForm />
        </Suspense>
      </div>
    </main>
  );
}
