import Link from 'next/link';
import { Package, Car, ShieldCheck, ExternalLink } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Banner Institucional Superior */}
      <div className="w-full bg-[#001f54] border-b border-slate-800 px-4 sm:px-6 py-3 flex justify-center items-center">
        <img
          src="/header-ejrlb.png"
          alt="Rama Judicial - Escuela Judicial Rodrigo Lara Bonilla"
          className="h-9 sm:h-12 md:h-14 object-contain max-w-full"
        />
      </div>

      {/* Hero Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 sticky top-0 z-40 backdrop-blur px-6 py-8 text-center">
        <div className="max-w-4xl mx-auto space-y-2">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
            Plataforma Digital Multi-Módulo
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            RubDev<span className="text-blue-500">.net</span> ®
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Ecosistema de soluciones digitales para la gestión institucional de activos, control de bienes y colecciones especializadas.
          </p>
        </div>
      </header>

      {/* Contenido Principal / Tarjetas de Aplicativos */}
      <main className="max-w-6xl mx-auto w-full px-6 py-12 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Módulo Inventario Escuela Judicial */}
          <Link 
            href="/inventarioescuela" 
            className="group bg-slate-900 border border-slate-800 p-8 rounded-3xl hover:border-blue-500/50 transition-all duration-300 shadow-xl hover:shadow-blue-500/10 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="p-3.5 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20 group-hover:scale-105 transition-transform">
                  <Package className="w-8 h-8" />
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  En Servicio
                </span>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">
                  Inventario Escuela Judicial
                </h2>
                <p className="text-xs text-blue-400 font-medium mt-0.5">
                  Escuela Judicial "Rodrigo Lara Bonilla"
                </p>
              </div>

              <p className="text-sm text-slate-400 leading-relaxed">
                Gestión integral de activos institucionales, control de inventario por placas, generación de hojas de vida, actas por responsable y códigos QR.
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-blue-400 group-hover:text-blue-300">
              <span>Acceder al Módulo</span>
              <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Módulo RubDev AutoCollection */}
          <Link 
            href="/autos" 
            className="group bg-slate-900 border border-slate-800 p-8 rounded-3xl hover:border-red-500/50 transition-all duration-300 shadow-xl hover:shadow-red-500/10 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="p-3.5 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 group-hover:scale-105 transition-transform">
                  <Car className="w-8 h-8" />
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  Colección
                </span>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white group-hover:text-red-500 transition-colors">
                  RubDev AutoCollection
                </h2>
                <p className="text-xs text-red-400 font-medium mt-0.5">
                  Vitrina & Catálogo Maestro de Vehículos
                </p>
              </div>

              <p className="text-sm text-slate-400 leading-relaxed">
                Catálogo e historia de autos icónicos del cine, cómics y el mundo real. Registro de piezas coleccionables, escalas, fabricantes y vitrina fotográfica.
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-red-400 group-hover:text-red-300">
              <span>Explorar Catálogo</span>
              <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

        </div>
      </main>

      {/* Pie de Página */}
      <footer className="w-full py-6 border-t border-slate-800/80 bg-slate-950 text-slate-500 text-xs text-center">
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