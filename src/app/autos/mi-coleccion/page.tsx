'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft, RefreshCw, DollarSign,
  Package, Camera, Award, Calendar, Globe, Sparkles 
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
  const [items, setItems] = useState<MiColeccionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar elementos de la vitrina con join completo al catálogo maestro
  const fetchVitrina = async () => {
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
  };

  useEffect(() => {
    fetchVitrina();
  }, []);

  // Métricas Calculadas
  const totalInversion = items.reduce((sum, item) => sum + (item.precio_pagado_cop || 0), 0);
  const totalPiezas = items.length;
  const conFotoReal = items.filter(i => Boolean(i.foto_mi_pieza_url)).length;

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
              <p className="text-xs text-slate-400 font-medium">Fotos Reales de mi Pieza</p>
              <p className="text-2xl font-bold text-amber-400">{conFotoReal} / {totalPiezas}</p>
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

              return (
                <div 
                  key={item.id}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between hover:border-slate-700 transition"
                >
                  <div className="space-y-4">
                    
                    {/* Visualización Dual: Auto Real vs Mi Pieza */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-semibold mb-1 text-center uppercase tracking-wide">Auto Real</span>
                        <div className="h-36 w-full rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800">
                          {fotoReal ? (
                            <img src={fotoReal} alt="Auto Real" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] text-slate-600 text-center p-2">Sin foto real</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[10px] text-emerald-400 font-semibold mb-1 text-center uppercase tracking-wide">Mi Pieza</span>
                        <div className="h-36 w-full rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center border border-emerald-900/40">
                          {fotoPieza ? (
                            <img src={fotoPieza} alt="Mi Pieza" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] text-slate-600 text-center p-2">Pendiente foto</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Franquicia y Estado */}
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20">
                        {autoMaestro?.origen_franquicia || 'Colección'}
                      </span>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        item.estado === 'ADQUIRIDO' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        item.estado === 'BUSCANDO' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      }`}>
                        {item.estado}
                      </span>
                    </div>

                    {/* Nombre y Datos Técnicos del Catálogo */}
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        {autoMaestro?.modelo_nombre || 'Modelo Desconocido'}
                      </h3>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                        {autoMaestro?.anio_vehiculo_real && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" /> Año: {autoMaestro.anio_vehiculo_real}
                          </span>
                        )}
                        {autoMaestro?.pais_origen && (
                          <span className="flex items-center gap-1">
                            <Globe className="w-3.5 h-3.5 text-slate-500" /> {autoMaestro.pais_origen}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Resumen Histórico del Catálogo */}
                    {autoMaestro?.historia_resumen && (
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                        {autoMaestro.historia_resumen}
                      </p>
                    )}

                    {/* Dato Curioso si existe */}
                    {autoMaestro?.datos_curiosos && (
                      <div className="bg-slate-950/80 border border-slate-800/80 p-2.5 rounded-xl text-[11px] text-slate-400">
                        <strong className="text-red-400 block mb-0.5">Dato Curioso:</strong>
                        {autoMaestro.datos_curiosos}
                      </div>
                    )}

                    {/* Detalles Específicos de la Pieza Registrada */}
                    <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-xs space-y-1.5">
                      <div className="flex justify-between text-slate-400">
                        <span>Fabricante Diecast:</span>
                        <strong className="text-white">{item.fabricante_diecast} ({item.escala})</strong>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Estado de Empaque:</span>
                        <strong className="text-slate-200">{item.estado_empaque}</strong>
                      </div>
                      {item.observaciones && (
                        <div className="flex justify-between text-slate-400">
                          <span>Observaciones:</span>
                          <strong className="text-amber-400">{item.observaciones}</strong>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800/80">
                        <span>Valor Pagado/Estimado:</span>
                        <strong className="text-emerald-400">${item.precio_pagado_cop?.toLocaleString('es-CO')} COP</strong>
                      </div>
                    </div>

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