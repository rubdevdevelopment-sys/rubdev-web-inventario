'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Lock, Mail, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password,
        });

        if (error) {
            setErrorMsg('Credenciales inválidas. Verifique su correo institucional y contraseña.');
            setLoading(false);
        } else {
            router.push('/inventario');
            router.refresh();
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between items-center p-4">
            {/* Header Institucional */}
            <div className="w-full max-w-md py-4 text-center">
                <img
                    src="/header-ejrlb.png"
                    alt="Escuela Judicial Rodrigo Lara Bonilla"
                    className="h-12 object-contain mx-auto mb-2"
                />
            </div>

            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
                <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3 text-blue-400">
                        <Lock className="w-6 h-6" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-100">Acceso Administrativo</h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Módulo de Gestión de Inventarios y Devoluciones
                    </p>
                </div>

                {errorMsg && (
                    <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs text-center font-medium">
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                            Correo Institucional
                        </label>
                        <div className="relative">
                            <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="usuario@cendoj.ramajudicial.gov.co"
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                            Contraseña
                        </label>
                        <div className="relative">
                            <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 mt-2"
                    >
                        <ShieldCheck className="w-4 h-4" />
                        {loading ? 'Verificando Acceso...' : 'Iniciar Sesión'}
                    </button>
                </form>

                <div className="mt-6 pt-4 border-t border-slate-800 text-center">
                    <button
                        onClick={() => router.push('/inventario')}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Volver a la consulta pública
                    </button>
                </div>
            </div>

            <footer className="py-4 text-center text-[11px] text-slate-500 font-mono">
                © {new Date().getFullYear()} <strong>RubDev.net</strong> ®. Todos los derechos reservados.
            </footer>
        </div>
    );
}