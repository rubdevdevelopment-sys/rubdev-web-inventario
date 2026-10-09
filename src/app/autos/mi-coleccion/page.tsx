'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getApplicationRole } from '@/lib/applicationAccess';
import { supabaseAutos as supabase } from '@/lib/supabaseAutos';
import {
  ArrowLeft, RefreshCw, DollarSign,
  Package, Camera, Award, Info, X
} from 'lucide-react';

interface AutoCatalogo {
  id: string;
  modelo_nombre: string;
  origen_franquicia: string;
  categoria: string;
  anio_vehiculo_real: number | null;
  pais_origen: string | null;
  historia_resumen: string;
  datos_curiosos: string | null;
  imagen_referencia_url: string | null;
}

interface MiColeccionItem {
  id: string;
  catalogo_id: string;
  fabricante_diecast: string;
  escala: string;
  estado: string;
  precio_pagado_cop: number;
  estado_empaque: string;
  foto_auto_real_url?: string | null;
  foto_mi_pieza_url?: string | null;
  fecha_adquisicion?: string | null;
  observaciones?: string | null;
  autos_catalogo_maestro?: AutoCatalogo;
}

export default function MiVitrinaColeccion() {
  const router = useRouter();
  const [items, setItems] = useState<MiColeccionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detalleItemAbierto, setDetalleItemAbierto] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user.id) {
        router.replace('/autos/login?next=/autos/mi-coleccion');
        return;
      }

      try {
        const role = await getApplicationRole(supabase, 'autos', session.user.id);
        if (!active) return;
        if (role !== 'admin') {
          await supabase.auth.signOut();
          router.replace('/autos/login?next=/autos/mi-coleccion');
          return;
        }
        await fetchVitrina();
      } catch (error) {
        console.error('No se pudo verificar el acceso a la colección de Autos:', error);
        if (active) router.replace('/autos/login?next=/autos/mi-coleccion');
      }
    })();

    return () => {
      active = false;
    };
  }, [router]);

  // Cargar elementos de la vitrina con join completo al catálogo maestro
  async function fetchVitrina() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('autos_mi_coleccion')
        .select(`
          *,
          autos_catalogo_maestro (*)
        `)
        .eq('estado', 'ADQUIRIDO')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error al cargar vitrina:", error);
      } else if (data) {
        setItems(data);
      }
    } catch (err) {
      console.error("Error inesperado:", err);
    } finally {
      setLoading(false);
    }
  }

  // Métricas Calculadas
  const totalInversion = items.reduce((sum, item) => sum + (item.precio_pagado_cop || 0), 0);
  const totalPiezas = items.length;
  const conFotoPieza = items.filter(i => Boolean(i.foto_mi_pieza_url)).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header Topbar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/autos" className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-red-500" />
            <h1 className="text-lg font-bold tracking-wider text-white">
              RubDev AutoCollection <span className="text-red-500">· Mi Vitrina Personal</span>
            </h1>
          </div>
        </div>

        <button
          onClick={fetchVitrina}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition flex items-center gap-2 text-xs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Actualizar Vitrina</span>
        </button>
      </header>

      <main className="max-w-7xl mx-auto w-full p-6 space-y-8 flex-1">
        {/* Panel de Métricas y Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-xl">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Inversión Estimada</p>
              <p className="text-xl font-black text-emerald-400">
                ${totalInversion.toLocaleString('es-CO')} <span className="text-[10px] text-slate-500">COP</span>
              </p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-xl">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Autos Adquiridos</p>
              <p className="text-2xl font-bold text-slate-100">{totalPiezas} piezas</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-xl">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Piezas con foto propia</p>
              <p className="text-2xl font-bold text-amber-400">{conFotoPieza} / {totalPiezas}</p>
            </div>
          </div>
        </div>

        {/* Grilla de Piezas en Vitrina con Información Completa del Catálogo + Datos de la Pieza */}
        {loading ? (
          <div className="text-center py-16 text-slate-500">Cargando vitrina personal...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-slate-500 bg-slate-900/50 rounded-3xl border border-slate-800">
            Aún no tienes autos adquiridos en tu vitrina personal.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => {
              const autoMaestro = item.autos_catalogo_maestro;

              const fotoReal = item.foto_auto_real_url || autoMaestro?.imagen_referencia_url;
              const fotoPieza = item.foto_mi_pieza_url;
              const imagenPrincipal = fotoPieza || fotoReal;
              const detallesAbiertos = detalleItemAbierto === item.id;

              return (
                <div
                  key={item.id}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl transition duration-300 hover:-translate-y-1 hover:border-slate-600"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950">
                    {imagenPrincipal ? (
                      <img
                        src={imagenPrincipal}
                        alt={autoMaestro?.modelo_nombre || 'Auto de colección'}
                        className="h-full w-full object-contain p-4 transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-slate-500">
                        <Camera className="h-7 w-7 text-slate-600" />
                        <span>Sin fotografía</span>
                      </div>
                    )}

                    <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                      <span className="rounded-md border border-white/10 bg-slate-950/85 px-2.5 py-1 text-[10px] font-semibold text-slate-200 backdrop-blur">
                        {fotoPieza ? 'Mi pieza' : 'Foto de referencia'}
                      </span>
                      {autoMaestro?.origen_franquicia && (
                        <span className="rounded-md border border-red-500/20 bg-slate-950/85 px-2.5 py-1 text-[10px] font-semibold text-red-300 backdrop-blur">
                          {autoMaestro.origen_franquicia}
                        </span>
                      )}
                    </div>

                    {fotoPieza && fotoReal && (
                      <div className="absolute bottom-4 left-4 h-16 w-24 overflow-hidden rounded-md border border-white/20 bg-slate-950 shadow-xl">
                        <img src={fotoReal} alt="Foto de referencia del auto real" className="h-full w-full object-contain p-1" />
                        <span className="absolute inset-x-0 bottom-0 bg-slate-950/85 py-0.5 text-center text-[9px] font-semibold text-slate-200">Auto real</span>
                      </div>
                    )}

                    <div className={`absolute inset-0 z-10 flex flex-col gap-3 overflow-y-auto bg-slate-950 p-4 transition-opacity duration-300 ${
                      detallesAbiertos
                        ? 'opacity-100'
                        : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100'
                    }`}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">Ficha del vehículo</p>
                      <h4 className="mt-1 text-xl font-bold text-white">{autoMaestro?.modelo_nombre || 'Modelo Desconocido'}</h4>
                      <p className="text-xs text-slate-300">
                        {autoMaestro?.anio_vehiculo_real || 'Año no registrado'} · {autoMaestro?.pais_origen || 'País no registrado'} · {autoMaestro?.categoria || 'Categoría no registrada'}
                      </p>
                      <p className="text-sm leading-relaxed text-slate-300">
                        {autoMaestro?.historia_resumen || 'Sin descripción disponible.'}
                      </p>
                      {autoMaestro?.datos_curiosos && (
                        <div className="border-l-2 border-red-500 pl-3 text-xs leading-relaxed text-slate-300">
                          <strong className="mb-1 block text-red-400">Dato curioso</strong>
                          {autoMaestro.datos_curiosos}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-800 pt-3 text-xs">
                        <span className="text-slate-400">Fabricante</span><strong className="text-right text-white">{item.fabricante_diecast}</strong>
                        <span className="text-slate-400">Escala</span><strong className="text-right text-white">{item.escala}</strong>
                        <span className="text-slate-400">Empaque</span><strong className="text-right text-white">{item.estado_empaque}</strong>
                        <span className="text-slate-400">Valor pagado</span><strong className="text-right text-emerald-400">${item.precio_pagado_cop?.toLocaleString('es-CO')} COP</strong>
                        {item.fecha_adquisicion && <><span className="text-slate-400">Adquirido</span><strong className="text-right text-white">{new Date(item.fecha_adquisicion).toLocaleDateString('es-CO')}</strong></>}
                      </div>
                      {item.observaciones && <p className="text-xs leading-relaxed text-amber-300">{item.observaciones}</p>}
                    </div>

                    <button
                      type="button"
                      onClick={() => setDetalleItemAbierto(detallesAbiertos ? null : item.id)}
                      aria-label={detallesAbiertos ? 'Cerrar detalles del vehículo' : 'Ver detalles del vehículo'}
                      aria-pressed={detallesAbiertos}
                      title={detallesAbiertos ? 'Cerrar ficha del vehículo' : 'Ver ficha del vehículo'}
                      className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-slate-900 text-white shadow-lg transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
                    >
                      {detallesAbiertos ? <X className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-2xl font-bold leading-tight text-white">
                          {autoMaestro?.modelo_nombre || 'Modelo Desconocido'}
                        </h3>
                        <p className="mt-2 text-xs font-medium text-slate-400">
                          {autoMaestro?.anio_vehiculo_real || 'Año no registrado'} <span className="px-1 text-red-400">·</span> {autoMaestro?.pais_origen || 'País no registrado'}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300">
                        Adquirido
                      </span>
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-300">
                      {autoMaestro?.historia_resumen || 'Sin descripción disponible.'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Pie de Página */}
      <footer className="w-full mt-auto py-6 border-t border-slate-800/80 bg-slate-950 text-slate-500 text-xs text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="font-medium">
            RubDev AutoCollection · Vitrina Personal & Catálogo Maestro
          </p>
          <p className="font-mono text-[11px] text-slate-400">
            © {new Date().getFullYear()} <strong className="text-slate-200">RubDev.net</strong> ®. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}