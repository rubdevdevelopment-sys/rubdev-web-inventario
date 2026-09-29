'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Lock, ArrowLeft, KeyRound, Mail, ShieldAlert } from 'lucide-react';

function FormularioLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next') || '/inventarioescuela';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Si el usuario ya tiene sesión iniciada, redirigir inmediatamente
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push(nextParam);
      }
    });
  }, [router, nextParam]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message === 'Invalid login credentials' 
        ? 'Credenciales incorrectas. Verifica tu correo y contraseña.' 
        : error.message);
      setLoading(false);
    } else if (data.session) {
      router.push(nextParam);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 mb-2">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-wide">Acceso Administrador</h2>
        <p className="text-xs text-slate-400">
          Ingresa tus credenciales autorizadas de RubDev para gestionar el inventario y catálogo de autos.
        </p>
      </div>

      {errorMessage && (
        <div className="bg-rose-950/40 border border-rose-500/30 p-3 rounded-xl text-xs text-rose-400 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Correo Electrónico</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@rubdev.net"
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
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-xs transition shadow-lg shadow-red-600/20 mt-2"
        >
          {loading ? 'Verificando...' : 'Iniciar Sesión Admin'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 font-sans relative">
      <div className="absolute top-6 left-6">
        <Link href="/" className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition">
          <ArrowLeft className="w-4 h-4" />
          Volver al Inicio
        </Link>
      </div>

      <div className="max-w-md w-full">
        <Suspense fallback={
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-500 text-xs">
            Cargando módulo de seguridad...
          </div>
        }>
          <FormularioLoginContent />
        </Suspense>
      </div>
    </div>
  );
}