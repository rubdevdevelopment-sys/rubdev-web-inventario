'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseControlHoras as supabase } from '@/lib/supabaseControlHoras';
import { Mail, KeyRound, ShieldAlert, Sparkles } from 'lucide-react';

function FormularioLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next') || '/controlhoras';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
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
      email: email.trim().toLowerCase(),
      password: password,
    });

    if (error) {
      setErrorMessage(
        error.message === 'Invalid login credentials'
          ? 'Credenciales incorrectas. Verifica tu correo institucional y contraseña.'
          : error.message
      );
      setLoading(false);
    } else if (data.session) {
      router.push(nextParam);
      router.refresh();
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 mb-1">
          <Sparkles className="w-8 h-8 animate-pulse" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-wide">
          Control de Horas <span className="text-amber-400">Fin de Año</span>
        </h2>
        <p className="text-xs text-slate-400">
          Acceso exclusivo para servidores registrados en la compensación de tiempo
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
          <label className="block text-xs font-medium text-slate-400 mb-1">Correo Electrónico Institucional</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="rmonroyl@cendoj.ramajudicial.gov.co"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition"
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
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-amber-500/20 mt-2"
        >
          {loading ? 'Verificando credenciales...' : 'Iniciar Sesión'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between items-center p-4 font-sans">
      <div className="w-full bg-[#001f54] py-3 px-6 flex justify-center items-center border-b border-amber-500/30">
        <img src="/header-ejrlb.png" alt="Escuela Judicial" className="h-12 object-contain" />
      </div>

      <div className="max-w-md w-full my-auto">
        <Suspense fallback={<div className="text-center text-xs text-slate-500">Cargando módulo de autenticación...</div>}>
          <FormularioLoginContent />
        </Suspense>
      </div>

      <footer className="py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} <strong className="text-slate-300">RubDev.net</strong> ®. Todos los derechos reservados.
      </footer>
    </div>
  );
}